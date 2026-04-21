from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.models import Flow, Commitment

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
    await db.execute(
        update(Flow)
        .where(Flow.id == flow_id, Flow.capacity > 0)
        .values(capacity=Flow.capacity - 1)
    )
    await db.commit()
    await db.refresh(commitment)
    return commitment
