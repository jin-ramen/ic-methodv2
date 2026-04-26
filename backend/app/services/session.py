from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from app.models.models import Session, Booking


async def _check_instructor_conflict(db: AsyncSession, instructor: str, start_time: datetime, exclude_id: UUID | None = None) -> None:
    if not instructor:
        return
    q = select(Session.id).where(Session.instructor == instructor, Session.start_time == start_time)
    if exclude_id:
        q = q.where(Session.id != exclude_id)
    result = await db.execute(q)
    if result.scalar_one_or_none():
        raise ValueError(f"{instructor} already has a session at this time.")


async def creater_session(db: AsyncSession, method_id: UUID | None, start_time: datetime, end_time: datetime, capacity: int, instructor: str | None) -> Session:
    await _check_instructor_conflict(db, instructor or '', start_time)
    session = Session(method_id=method_id, start_time=start_time, end_time=end_time, capacity=capacity, instructor=instructor)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(db: AsyncSession) -> list[tuple[Session, int]]:
    remaining = (Session.capacity - func.count(Booking.id)).label("spots_remaining")
    result = await db.execute(
        select(Session, remaining)
        .outerjoin(Booking, (Booking.session_id == Session.id) & (Booking.status == 'booked'))
        .group_by(Session.id)
        .options(selectinload(Session.method))
        .order_by(Session.start_time)
    )
    return result.all()


async def update_session(db: AsyncSession, id: UUID, method_id: UUID | None, start_time: datetime | None, end_time: datetime | None, capacity: int | None, instructor: str | None) -> Session | None:
    values = {k: v for k, v in {"method_id": method_id, "start_time": start_time, "end_time": end_time, "capacity": capacity, "instructor": instructor}.items() if v is not None}
    if values:
        # Resolve the effective instructor and start_time for conflict check
        existing = await db.get(Session, id)
        if existing is None:
            return None
        effective_instructor = values.get("instructor", existing.instructor) or ''
        effective_start = values.get("start_time", existing.start_time)
        await _check_instructor_conflict(db, effective_instructor, effective_start, exclude_id=id)
        await db.execute(update(Session).where(Session.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Session).where(Session.id == id).options(selectinload(Session.method)))
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Session).where(Session.id == id))
    await db.commit()
    return result.rowcount > 0
