from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.commitment import create_commitment, list_commitments, update_commitment, delete_commitment
from app.schemas.commitment import CommitmentCreate, CommitmentUpdate, CommitmentResponse

router = APIRouter(prefix="/api", tags=["commitment"])


@router.post("/commitments", response_model=CommitmentResponse, status_code=status.HTTP_201_CREATED)
async def post_commitment(data: CommitmentCreate, db: AsyncSession = Depends(get_db)):
    return await create_commitment(db, flow_id=data.flow_id, first_name=data.first_name, last_name=data.last_name, email=data.email, phone=data.phone, notes=data.notes)


@router.get("/commitments")
async def get_commitments(db: AsyncSession = Depends(get_db)):
    commitments = await list_commitments(db)
    return {"results": [CommitmentResponse.model_validate(c).model_dump(mode="json") for c in commitments]}


@router.patch("/commitments/{id}", response_model=CommitmentResponse)
async def patch_commitment(id: UUID, data: CommitmentUpdate, db: AsyncSession = Depends(get_db)):
    commitment = await update_commitment(db, id, data.first_name, data.last_name, data.email, data.phone, data.notes)
    if not commitment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commitment not found")
    return commitment


@router.delete("/commitments/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_commitment(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_commitment(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commitment not found")
