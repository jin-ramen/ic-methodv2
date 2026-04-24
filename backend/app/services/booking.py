from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from app.models.models import Session, Booking


async def create_booking(db: AsyncSession, session_id: UUID, first_name: str, last_name: str, email: str, phone: str | None, notes: str | None) -> Booking:
    # Lock the session row so concurrent requests queue up rather than racing
    session_result = await db.execute(select(Session).where(Session.id == session_id).with_for_update())
    session = session_result.scalar_one_or_none()
    if not session:
        raise ValueError("session_not_found")

    booked = await db.scalar(select(func.count()).where(Booking.session_id == session_id))
    if booked >= session.capacity:
        raise ValueError("fully_booked")

    existing = await db.execute(select(Booking).where(Booking.session_id == session_id, Booking.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("already_booked")

    booking = Booking(session_id=session_id, first_name=first_name, last_name=last_name, email=email, phone=phone, notes=notes)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


async def list_bookings(db: AsyncSession, session_id: UUID | None = None) -> list[Booking]:
    q = select(Booking).join(Session, Booking.session_id == Session.id)
    if session_id:
        q = q.where(Booking.session_id == session_id)
    result = await db.execute(q.order_by(Session.start_time))
    return result.scalars().all()


async def update_booking(db: AsyncSession, id: UUID, first_name: str | None, last_name: str | None, email: str | None, phone: str | None, notes: str | None) -> Booking | None:
    values = {k: v for k, v in {"first_name": first_name, "last_name": last_name, "email": email, "phone": phone, "notes": notes}.items() if v is not None}
    if values:
        await db.execute(update(Booking).where(Booking.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Booking).where(Booking.id == id))
    return result.scalar_one_or_none()


async def delete_booking(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Booking).where(Booking.id == id))
    await db.commit()
    return result.rowcount > 0
