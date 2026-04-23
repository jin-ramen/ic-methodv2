from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.limiter import limiter
from app.db.session import get_db
from app.services.commitment import create_commitment, list_commitments, update_commitment, delete_commitment
from app.schemas.commitment import CommitmentCreate, CommitmentUpdate, CommitmentResponse

router = APIRouter(prefix="/api", tags=["commitment"])

COMMITMENT_ERRORS = {
    "already_booked": (status.HTTP_409_CONFLICT, "This email has already been used to book this session."),
    "fully_booked": (status.HTTP_409_CONFLICT, "This session is fully booked."),
    "flow_not_found": (status.HTTP_404_NOT_FOUND, "Session not found."),
}


@router.post("/commitments", response_model=CommitmentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def post_commitment(request: Request, data: CommitmentCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_commitment(db, flow_id=data.flow_id, first_name=data.first_name, last_name=data.last_name, email=data.email, phone=data.phone, notes=data.notes)
    except ValueError as e:
        if (err := COMMITMENT_ERRORS.get(str(e))) is None:
            raise
        raise HTTPException(status_code=err[0], detail=err[1])


@router.get("/commitments")
async def get_commitments(db: AsyncSession = Depends(get_db), flow_id: UUID | None = None):
    commitments = await list_commitments(db, flow_id=flow_id)
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
