from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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


async def list_flows(db: AsyncSession) -> list[Flow]:
    result = await db.execute(select(Flow).order_by(Flow.start_time))
    return result.scalars().all()


async def create_commitment(
    db: AsyncSession,
    flow_id: UUID,
    first_name: str,
    last_name: str,
    email: str,
    phone: str | None,
    notes: str | None,
) -> Commitment:
    commitment = Commitment(
        flow_id=flow_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        notes=notes,
    )
    db.add(commitment)
    await db.commit()
    await db.refresh(commitment)
    return commitment
