from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from app.models.models import Session, Booking, BookingStatus


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
    await db.commit()

    result = await db.execute(
        select(Booking).where(Booking.id == booking.id)
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    return result.scalar_one()


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
        .options(selectinload(Booking.user), selectinload(Booking.session).selectinload(Session.method))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        return None
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_type = cancellation_type
    await db.commit()
    await db.refresh(booking)
    return booking


async def delete_booking(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Booking).where(Booking.id == id))
    await db.commit()
    return result.rowcount > 0
