from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from app.models.models import Flow, Commitment


async def create_flow(db: AsyncSession, method_id: UUID | None, start_time: datetime, end_time: datetime, capacity: int, instructor: str | None) -> Flow:
    flow = Flow(method_id=method_id, start_time=start_time, end_time=end_time, capacity=capacity, instructor=instructor)
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return flow


async def list_flows(db: AsyncSession) -> list[tuple[Flow, int]]:
    booked = (
        select(func.count())
        .where(Commitment.flow_id == Flow.id)
        .correlate(Flow)
        .scalar_subquery()
    )
    remaining = (Flow.capacity - booked).label("spots_remaining")
    result = await db.execute(
        select(Flow, remaining)
        .where(remaining > 0)
        .options(selectinload(Flow.method))
        .order_by(Flow.start_time)
    )
    return result.all()


async def update_flow(db: AsyncSession, id: UUID, method_id: UUID | None, start_time: datetime | None, end_time: datetime | None, capacity: int | None, instructor: str | None) -> Flow | None:
    values = {k: v for k, v in {"method_id": method_id, "start_time": start_time, "end_time": end_time, "capacity": capacity, "instructor": instructor}.items() if v is not None}
    if values:
        await db.execute(update(Flow).where(Flow.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Flow).where(Flow.id == id).options(selectinload(Flow.method)))
    return result.scalar_one_or_none()


async def delete_flow(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Flow).where(Flow.id == id))
    await db.commit()
    return result.rowcount > 0
