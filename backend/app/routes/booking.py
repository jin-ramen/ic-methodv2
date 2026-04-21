from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db.session import get_db
from app.services.flow import create_flow, list_flows, create_commitment

router = APIRouter(prefix="/api", tags=["booking"])


class FlowCreate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = 1
    instructor: str | None = None


class CommitmentCreate(BaseModel):
    flow_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    notes: str | None = None


@router.get("/flows")
async def get_flows(db: AsyncSession = Depends(get_db)):
    return await list_flows(db)


@router.post("/flows")
async def post_flow(data: FlowCreate, db: AsyncSession = Depends(get_db)):
    return await create_flow(
        db,
        method_id=data.method_id,
        start_time=data.start_time,
        end_time=data.end_time,
        capacity=data.capacity,
        instructor=data.instructor,
    )


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
