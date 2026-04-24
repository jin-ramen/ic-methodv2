from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.limiter import limiter
from app.db.session import get_db
from app.services.booking import create_booking, list_bookings, update_booking, delete_booking
from app.schemas.booking import BookingCreate, BookingUpdate, BookingResponse

router = APIRouter(prefix="/api", tags=["booking"])

BOOKING_ERRORS = {
    "already_booked": (status.HTTP_409_CONFLICT, "This email has already been used to book this session."),
    "fully_booked": (status.HTTP_409_CONFLICT, "This session is fully booked."),
    "session_not_found": (status.HTTP_404_NOT_FOUND, "Session not found."),
}


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def post_booking(request: Request, data: BookingCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_booking(db, session_id=data.session_id, first_name=data.first_name, last_name=data.last_name, email=data.email, phone=data.phone, notes=data.notes)
    except ValueError as e:
        if (err := BOOKING_ERRORS.get(str(e))) is None:
            raise
        raise HTTPException(status_code=err[0], detail=err[1])


@router.get("/bookings")
async def get_bookings(db: AsyncSession = Depends(get_db), session_id: UUID | None = None):
    bookings = await list_bookings(db, session_id=session_id)
    return {"results": [BookingResponse.model_validate(c).model_dump(mode="json") for c in bookings]}


@router.patch("/bookings/{id}", response_model=BookingResponse)
async def patch_booking(id: UUID, data: BookingUpdate, db: AsyncSession = Depends(get_db)):
    booking = await update_booking(db, id, data.first_name, data.last_name, data.email, data.phone, data.notes)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


@router.delete("/bookings/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_booking(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_booking(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
