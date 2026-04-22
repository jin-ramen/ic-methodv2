from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.flow import create_flow, list_flows, update_flow, delete_flow
from app.schemas.flow import FlowCreate, FlowUpdate, FlowResponse

router = APIRouter(prefix="/api", tags=["flow"])


@router.post("/flows", response_model=FlowResponse, status_code=status.HTTP_201_CREATED)
async def post_flow(data: FlowCreate, db: AsyncSession = Depends(get_db)):
    return await create_flow(db, method_id=data.method_id, start_time=data.start_time, end_time=data.end_time, capacity=data.capacity, instructor=data.instructor)


@router.get("/flows")
async def get_flows(db: AsyncSession = Depends(get_db)):
    def serialize(flow, spots_remaining):
        data = FlowResponse.model_validate(flow).model_dump(mode="json")
        data["method_name"] = flow.method.name if flow.method else None
        data["spots_remaining"] = spots_remaining
        return data

    return {"results": [serialize(f, s) for f, s in await list_flows(db)]}


@router.patch("/flows/{id}", response_model=FlowResponse)
async def patch_flow(id: UUID, data: FlowUpdate, db: AsyncSession = Depends(get_db)):
    flow = await update_flow(db, id, data.method_id, data.start_time, data.end_time, data.capacity, data.instructor)
    if not flow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flow not found")
    return flow


@router.delete("/flows/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_flow(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_flow(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flow not found")
