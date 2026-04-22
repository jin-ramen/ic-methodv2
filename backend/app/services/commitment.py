from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import joinedload
from app.models.models import Flow, Commitment


async def create_commitment(db: AsyncSession, flow_id: UUID, first_name: str, last_name: str, email: str, phone: str | None, notes: str | None) -> Commitment:
    commitment = Commitment(flow_id=flow_id, first_name=first_name, last_name=last_name, email=email, phone=phone, notes=notes)
    db.add(commitment)
    await db.commit()
    await db.refresh(commitment)
    return commitment


async def list_commitments(db: AsyncSession) -> list[Commitment]:
    result = await db.execute(
        select(Commitment)
        .join(Flow, Commitment.flow_id == Flow.id)
        .options(joinedload(Commitment.flow))
        .order_by(Flow.start_time)
    )
    return result.scalars().all()


async def update_commitment(db: AsyncSession, id: UUID, first_name: str | None, last_name: str | None, email: str | None, phone: str | None, notes: str | None) -> Commitment | None:
    values = {k: v for k, v in {"first_name": first_name, "last_name": last_name, "email": email, "phone": phone, "notes": notes}.items() if v is not None}
    if values:
        await db.execute(update(Commitment).where(Commitment.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Commitment).where(Commitment.id == id))
    return result.scalar_one_or_none()


async def delete_commitment(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Commitment).where(Commitment.id == id))
    await db.commit()
    return result.rowcount > 0
