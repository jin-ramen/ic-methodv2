from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.models.models import Session, Booking, BookingStatus, NotificationType
from app.services.notification import create_notification, mark_notification_sent, mark_notification_failed
from app.core.email import send_booking_confirmation_email, send_booking_cancellation_email

async def _send_confirmation_after_booking(db: AsyncSession, booking: Booking) -> None:
    notification = None
    try:
        notification = await create_notification(
            db,
            booking_id=booking.id,
            notification_type=NotificationType.CONFIRMATION,
            send_at=datetime.now(timezone.utc),
        )

        to_email = booking.user.email if booking.user else booking.email
        first_name = booking.user.first_name if booking.user else (booking.first_name or "there")
        user_timezone = getattr(booking.user, "timezone", None) if booking.user else None

        if not to_email:
            await mark_notification_failed(db, notification.id, "Missing recipient email")
            return

        await send_booking_confirmation_email(
            to_email=to_email,
            first_name=first_name,
            session_start=booking.session.start_time if booking.session else None,
            session_end=booking.session.end_time if booking.session else None,
            method_name=booking.session.method.name if booking.session and booking.session.method else None,
            user_timezone=user_timezone,
        )
        await mark_notification_sent(db, notification.id)
    except Exception as e:
        if notification is not None:
            await mark_notification_failed(db, notification.id, str(e))



async def _send_cancellation_email(db: AsyncSession, booking: Booking) -> None:
    notification = None
    try:
        notification = await create_notification(
            db,
            booking_id=booking.id,
            notification_type=NotificationType.CANCELLATION,
            send_at=datetime.now(timezone.utc),
        )

        to_email = booking.user.email if booking.user else booking.email
        first_name = booking.user.first_name if booking.user else (booking.first_name or "there")
        user_timezone = getattr(booking.user, "timezone", None) if booking.user else None

        if not to_email:
            await mark_notification_failed(db, notification.id, "Missing recipient email")
            return

        await send_booking_cancellation_email(
            to_email=to_email,
            first_name=first_name,
            session_start=booking.session.start_time if booking.session else None,
            session_end=booking.session.end_time if booking.session else None,
            method_name=booking.session.method.name if booking.session and booking.session.method else None,
            cancellation_type=booking.cancellation_type,
            user_timezone=user_timezone,
        )
        await mark_notification_sent(db, notification.id)
    except Exception as e:
        await db.rollback()
        if notification is not None:
            try:
                await mark_notification_failed(db, notification.id, str(e))
            except Exception:
                pass


async def create_booking(
    db: AsyncSession,
    session_id: UUID,
    notes: str | None = None,
    user_id: UUID | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> Booking:
    session_result = await db.execute(select(Session).where(Session.id == session_id).with_for_update())
    session = session_result.scalar_one_or_none()
    if not session:
        raise ValueError("session_not_found")

    booked = await db.scalar(select(func.count()).where(Booking.session_id == session_id, Booking.status == BookingStatus.BOOKED))
    if booked >= session.capacity:
        raise ValueError("fully_booked")

    if user_id:
        existing = await db.scalar(select(func.count()).where(Booking.session_id == session_id, Booking.user_id == user_id, Booking.status == BookingStatus.BOOKED))
        if existing:
            raise ValueError("already_booked")
        booking = Booking(session_id=session_id, user_id=user_id, notes=notes)
    else:
        if email:
            existing = await db.scalar(select(func.count()).where(Booking.session_id == session_id, Booking.email == email, Booking.status == BookingStatus.BOOKED))
            if existing:
                raise ValueError("already_booked")
        booking = Booking(
            session_id=session_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            notes=notes,
        )

    db.add(booking)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if "uq_booking_active_session_user" in str(exc) or "uq_booking_session_user" in str(exc):
            raise ValueError("already_booked") from exc
        raise
    await db.refresh(booking)

    result = await db.execute(
        select(Booking).where(Booking.id == booking.id)
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    booking_obj = result.scalar_one()

    try:
        await _send_confirmation_after_booking(db, booking_obj)
    except Exception:
        pass

    try:
        if booking_obj.session:
            reminder_at = booking_obj.session.start_time - timedelta(hours=24)
            if reminder_at > datetime.now(timezone.utc):
                await create_notification(
                    db,
                    booking_id=booking_obj.id,
                    notification_type=NotificationType.REMINDER,
                    send_at=reminder_at,
                )
    except Exception:
        pass

    return booking_obj


async def list_bookings(db: AsyncSession, session_id: UUID | None = None, user_id: UUID | None = None) -> list[Booking]:
    q = (
        select(Booking)
        .join(Session, Booking.session_id == Session.id)
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    if session_id:
        q = q.where(Booking.session_id == session_id)
    if user_id:
        q = q.where(Booking.user_id == user_id)
    result = await db.execute(q.order_by(Session.start_time))
    return result.scalars().all()


async def update_booking(db: AsyncSession, id: UUID, notes: str | None) -> Booking | None:
    values = {"notes": notes} if notes is not None else {}
    if values:
        await db.execute(update(Booking).where(Booking.id == id).values(**values))
        await db.commit()
    result = await db.execute(
        select(Booking).where(Booking.id == id)
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    return result.scalar_one_or_none()


async def cancel_booking(db: AsyncSession, booking_id: UUID, user_id: UUID, cancellation_type: str) -> Booking | None:
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.user_id == user_id, Booking.status == BookingStatus.BOOKED)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        return None
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_type = cancellation_type
    await db.commit()

    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    booking = result.scalar_one()

    try:
        await _send_cancellation_email(db, booking)
    except Exception:
        pass

    return booking


async def delete_booking(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Booking).where(Booking.id == id))
    await db.commit()
    return result.rowcount > 0
