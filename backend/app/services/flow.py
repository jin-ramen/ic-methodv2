from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.models import Flow, Commitment


async def create_flow(
    db: AsyncSession,
    method_id: UUID,
    start_time: datetime,
    end_time: datetime,
    capacity: int,
    instructor: str,
) -> Flow:
    flow = Flow(
        method_id=method_id,
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
        instructor=instructor,
    )
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

