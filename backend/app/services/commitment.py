from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.models import Flow, Commitment


async def list_commitments(db: AsyncSession) -> list[Commitment]:
    result = await db.execute(
        select(Commitment)
        .join(Flow, Commitment.flow_id == Flow.id)
        .options(joinedload(Commitment.flow))
        .order_by(Flow.start_time)
    )
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
