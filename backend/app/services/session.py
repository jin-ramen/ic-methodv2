from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from app.models.models import Session, Booking


async def creater_session(db: AsyncSession, method_id: UUID | None, start_time: datetime, end_time: datetime, capacity: int, instructor: str | None) -> Session:
    session = Session(method_id=method_id, start_time=start_time, end_time=end_time, capacity=capacity, instructor=instructor)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(db: AsyncSession) -> list[tuple[Session, int]]:
    remaining = (Session.capacity - func.count(Booking.id)).label("spots_remaining")
    result = await db.execute(
        select(Session, remaining)
        .outerjoin(Booking, Booking.session_id == Session.id)
        .group_by(Session.id)
        .options(selectinload(Session.method))
        .order_by(Session.start_time)
    )
    return result.all()


async def update_session(db: AsyncSession, id: UUID, method_id: UUID | None, start_time: datetime | None, end_time: datetime | None, capacity: int | None, instructor: str | None) -> Session | None:
    values = {k: v for k, v in {"method_id": method_id, "start_time": start_time, "end_time": end_time, "capacity": capacity, "instructor": instructor}.items() if v is not None}
    if values:
        await db.execute(update(Session).where(Session.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Session).where(Session.id == id).options(selectinload(Session.method)))
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Session).where(Session.id == id))
    await db.commit()
    return result.rowcount > 0
