from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.session import creater_session, list_sessions, update_session, delete_session
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse

router = APIRouter(prefix="/api", tags=["session"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def post_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await creater_session(db, method_id=data.method_id, start_time=data.start_time, end_time=data.end_time, capacity=data.capacity, instructor=data.instructor)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    def serialize(session, spots_remaining):
        data = SessionResponse.model_validate(session).model_dump(mode="json")
        data["method_name"] = session.method.name if session.method else None
        data["spots_remaining"] = spots_remaining
        return data

    return {"results": [serialize(f, s) for f, s in await list_sessions(db)]}


@router.patch("/sessions/{id}", response_model=SessionResponse)
async def patch_session(id: UUID, data: SessionUpdate, db: AsyncSession = Depends(get_db)):
    try:
        session = await update_session(db, id, data.method_id, data.start_time, data.end_time, data.capacity, data.instructor)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.delete("/sessions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_session(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_session(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
