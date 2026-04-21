from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.models import Commitment
from app.services.commitment import create_commitment, list_commitments
from app.schemas.commitment import CommitmentResponse, CommitmentCreate

router = APIRouter(prefix="/api", tags=["commitment"])

@router.get("/commitments")
async def get_commitments(db: AsyncSession = Depends(get_db)):
    commitments = await list_commitments(db)
    return {"results": [CommitmentResponse.model_validate(c).model_dump(mode="json") for c in commitments]}


@router.post("/commitments")
async def post_commitment(data: CommitmentCreate, db: AsyncSession = Depends(get_db)):
    return await create_commitment(
        db,
        flow_id=data.flow_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        notes=data.notes,
    )

@router.delete("/commitments/{$id}")
async def delete_commitment(id: UUID, db: AsyncSession = Depends(get_db)): 
    stmt = delete(Commitment).where(Commitment.id == id)
    result = await db.execute(stmt)
    await db.commit()
    return {"message": "Successfully deleted"}
