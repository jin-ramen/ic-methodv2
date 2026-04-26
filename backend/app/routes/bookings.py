from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.core.security import verify_access_token
from app.db.session import get_db
from app.models.models import Booking, User, UserRole
from app.services.booking import create_booking, list_bookings, update_booking, delete_booking, cancel_booking
from app.schemas.booking import BookingCreate, AdminBookingCreate, BookingUpdate, BookingCancelRequest, BookingResponse

router = APIRouter(prefix="/api", tags=["booking"])

_bearer = HTTPBearer()

BOOKING_ERRORS = {
    "already_booked": (status.HTTP_409_CONFLICT, "This session already has a booking for that person."),
    "fully_booked": (status.HTTP_409_CONFLICT, "This session is fully booked."),
    "session_not_found": (status.HTTP_404_NOT_FOUND, "Session not found."),
}


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> UUID:
    try:
        payload = verify_access_token(credentials.credentials)
        return UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")


async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = verify_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    user = await db.get(User, user_id)
    if not user or user.role not in (UserRole.STAFF, UserRole.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def _serialize(booking: Booking) -> dict:
    is_guest = booking.user_id is None
    if is_guest:
        first_name = booking.first_name or ''
        last_name = booking.last_name or ''
        email = booking.email
        phone = booking.phone
        role = None
    else:
        first_name = booking.user.first_name
        last_name = booking.user.last_name
        email = booking.user.email
        phone = booking.user.phone
        role = booking.user.role.value if booking.user else None

    return {
        "id": str(booking.id),
        "session_id": str(booking.session_id),
        "user_id": str(booking.user_id) if booking.user_id else None,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "notes": booking.notes,
        "is_guest": is_guest,
        "role": role,
        "created_at": booking.created_at.isoformat(),
        "status": booking.status,
        "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
        "cancellation_type": booking.cancellation_type,
        "session_start": booking.session.start_time.isoformat() if booking.session else None,
        "session_end": booking.session.end_time.isoformat() if booking.session else None,
        "session_instructor": booking.session.instructor if booking.session else None,
        "session_method_name": booking.session.method.name if booking.session and booking.session.method else None,
    }


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def post_booking(
    request: Request,
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    try:
        booking = await create_booking(db, session_id=data.session_id, user_id=user_id, notes=data.notes)
        return _serialize(booking)
    except ValueError as e:
        if (err := BOOKING_ERRORS.get(str(e))) is None:
            raise
        raise HTTPException(status_code=err[0], detail=err[1])


@router.post("/admin/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def post_admin_booking(
    data: AdminBookingCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        booking = await create_booking(
            db,
            session_id=data.session_id,
            user_id=data.user_id,
            notes=data.notes,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
        )
        return _serialize(booking)
    except ValueError as e:
        if (err := BOOKING_ERRORS.get(str(e))) is None:
            raise
        raise HTTPException(status_code=err[0], detail=err[1])


@router.get("/bookings")
async def get_bookings(db: AsyncSession = Depends(get_db), session_id: UUID | None = None, user_id: UUID | None = None):
    bookings = await list_bookings(db, session_id=session_id, user_id=user_id)
    return {"results": [_serialize(b) for b in bookings]}


@router.patch("/bookings/{id}", response_model=BookingResponse)
async def patch_booking(id: UUID, data: BookingUpdate, db: AsyncSession = Depends(get_db)):
    booking = await update_booking(db, id, data.notes)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return _serialize(booking)


@router.post("/bookings/{id}/cancel")
async def cancel_user_booking(
    id: UUID,
    data: BookingCancelRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    booking = await cancel_booking(db, id, user_id, data.cancellation_type)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    return _serialize(booking)


@router.delete("/bookings/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_booking(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_booking(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
