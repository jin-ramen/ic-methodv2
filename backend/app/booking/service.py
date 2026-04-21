from datetime import datetime
from uuid import UUID
from psycopg.types.range import TimestamptzRange
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.booking import models


def _to_read_dict(booking: models.Booking) -> dict:
    return {
        "id": booking.id,
        "resource_id": booking.resource_id,
        "customer_email": booking.customer_email,
        "customer_name": booking.customer_name,
        "start_time": booking.time_range.lower,
        "end_time": booking.time_range.upper,
        "status": booking.status,
        "created_at": booking.created_at,
    }


def create_booking(
    db: Session,
    resource_id: UUID,
    customer_email: str,
    customer_name: str,
    start_time: datetime,
    end_time: datetime,
    idempotency_key: str | None = None,
) -> dict:
    if idempotency_key:
        existing = (
            db.query(models.Booking)
            .filter(models.Booking.idempotency_key == idempotency_key)
            .first()
        )
        if existing:
            return _to_read_dict(existing)

    if start_time.tzinfo is None or end_time.tzinfo is None:
        raise HTTPException(status_code=422, detail="Timestamps must include timezone")
    if end_time <= start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")

    resource = db.get(models.Resource, resource_id)
    if not resource or not resource.is_active:
        raise HTTPException(status_code=404, detail="Resource not found")

    booking = models.Booking(
        resource_id=resource_id,
        customer_email=customer_email,
        customer_name=customer_name,
        time_range=TimestamptzRange(start_time, end_time, bounds="[)"),
        status="confirmed",
        idempotency_key=idempotency_key,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "bookings_no_overlap" in str(e.orig):
            raise HTTPException(status_code=409, detail="Time slot is already booked")
        raise

    db.refresh(booking)
    return _to_read_dict(booking)


def cancel_booking(db: Session, booking_id: UUID) -> dict:
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == "cancelled":
        return _to_read_dict(booking)
    if booking.status == "completed":
        raise HTTPException(status_code=409, detail="Cannot cancel a completed booking")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return _to_read_dict(booking)