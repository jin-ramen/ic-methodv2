from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.session import get_db
from app.services.commitment import create_commitment, list_commitments, update_commitment, delete_commitment
from app.schemas.commitment import CommitmentCreate, CommitmentUpdate, CommitmentResponse

router = APIRouter(prefix="/api", tags=["commitment"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/commitments", response_model=CommitmentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def post_commitment(request: Request, data: CommitmentCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_commitment(db, flow_id=data.flow_id, first_name=data.first_name, last_name=data.last_name, email=data.email, phone=data.phone, notes=data.notes)
    except ValueError as e:
        match str(e):
            case "already_booked":
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email has already been used to book this session.")
            case "fully_booked":
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session is fully booked.")
            case "flow_not_found":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
            case _:
                raise


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
