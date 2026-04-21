from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.flow import create_flow, list_flows
from app.schemas.flow import FlowResponse, FlowCreate

router = APIRouter(prefix="/api", tags=["flow"])

@router.get("/flows")
async def get_flows(db: AsyncSession = Depends(get_db)):
    results = []
    for flow, spots_remaining in await list_flows(db):
        data = FlowResponse.model_validate(flow).model_dump(mode="json")
        data["method_name"] = flow.method.name if flow.method else None
        data["spots_remaining"] = spots_remaining
        results.append(data)
    return {"results": results}


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
