from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.booking import schemas, service, availability
from app.core.deps import get_db

router = APIRouter(tags=["bookings"])


@router.post("/bookings", response_model=schemas.BookingRead, status_code=201)
def create_booking_route(payload: schemas.BookingCreate, db: Session = Depends(get_db)):
    return service.create_booking(
        db,
        resource_id=payload.resource_id,
        customer_email=payload.customer_email,
        customer_name=payload.customer_name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        idempotency_key=payload.idempotency_key,
    )


@router.post("/bookings/{booking_id}/cancel", response_model=schemas.BookingRead)
def cancel_booking_route(booking_id: UUID, db: Session = Depends(get_db)):
    return service.cancel_booking(db, booking_id)


@router.get(
    "/resources/{resource_id}/availability",
    response_model=schemas.AvailabilityResponse,
)
def get_availability_route(
    resource_id: UUID,
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    if (to_date - from_date).days > 90:
        raise HTTPException(status_code=400, detail="Date range too large (max 90 days)")
    slots = availability.compute_availability(db, resource_id, from_date, to_date)
    return {"resource_id": resource_id, "slots": slots}