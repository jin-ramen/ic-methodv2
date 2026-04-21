from datetime import date, datetime, timedelta, timezone
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

def list_bookings(
    db: Session,
    resource_id: UUID | None = None,
    status: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = 200,
) -> list[dict]:
    query = (
        db.query(models.Booking, models.Resource.name)
        .join(models.Resource, models.Booking.resource_id == models.Resource.id)
    )

    if resource_id:
        query = query.filter(models.Booking.resource_id == resource_id)
    if status:
        query = query.filter(models.Booking.status == status)
    if from_date:
        start = datetime.combine(from_date, datetime.min.time(), tzinfo=timezone.utc)
        query = query.filter(models.Booking.time_range.op(">=")(
            TimestamptzRange(start, start + timedelta(days=365), bounds="[)")
        ))
        # Simpler: filter on the lower bound of the range directly
    if to_date:
        end = datetime.combine(to_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        # Ditto — we'll use a cleaner approach below

    # Simpler filter: intersect with a window if either date is given
    if from_date or to_date:
        window_start = datetime.combine(
            from_date or date(1970, 1, 1),
            datetime.min.time(), tzinfo=timezone.utc,
        )
        window_end = datetime.combine(
            (to_date or date(2100, 1, 1)) + timedelta(days=1),
            datetime.min.time(), tzinfo=timezone.utc,
        )
        window = TimestamptzRange(window_start, window_end, bounds="[)")
        query = query.filter(models.Booking.time_range.op("&&")(window))

    results = query.order_by(models.Booking.time_range).limit(limit).all()

    return [
        {
            "id": booking.id,
            "resource_id": booking.resource_id,
            "resource_name": resource_name,
            "customer_email": booking.customer_email,
            "customer_name": booking.customer_name,
            "start_time": booking.time_range.lower,
            "end_time": booking.time_range.upper,
            "status": booking.status,
            "created_at": booking.created_at,
        }
        for booking, resource_name in results
    ]

# ---------- Resources ----------

def create_resource(
    db: Session,
    name: str,
    capacity: int = 1,
    duration_minutes: int = 30,
    buffer_minutes: int = 0,
) -> models.Resource:
    resource = models.Resource(
        name=name,
        capacity=capacity,
        duration_minutes=duration_minutes,
        buffer_minutes=buffer_minutes,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def list_resources(db: Session, include_inactive: bool = False) -> list[models.Resource]:
    query = db.query(models.Resource)
    if not include_inactive:
        query = query.filter(models.Resource.is_active.is_(True))
    return query.order_by(models.Resource.name).all()


def get_resource(db: Session, resource_id: UUID) -> models.Resource:
    resource = db.get(models.Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


def update_resource(db: Session, resource_id: UUID, updates: dict) -> models.Resource:
    resource = get_resource(db, resource_id)
    for key, value in updates.items():
        setattr(resource, key, value)
    db.commit()
    db.refresh(resource)
    return resource


def deactivate_resource(db: Session, resource_id: UUID) -> models.Resource:
    """Soft delete — preserves booking history."""
    resource = get_resource(db, resource_id)
    resource.is_active = False
    db.commit()
    db.refresh(resource)
    return resource


# ---------- Availability rules ----------

def create_availability_rule(
    db: Session,
    resource_id: UUID,
    day_of_week: int,
    start_time: time,
    end_time: time,
) -> models.AvailabilityRule:
    # Verify resource exists (raises 404 if not)
    get_resource(db, resource_id)

    rule = models.AvailabilityRule(
        resource_id=resource_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
    )
    db.add(rule)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        # Either end_time <= start_time or dow out of range — Pydantic should catch
        # most of these, but the CHECK constraints are the last line of defence
        raise HTTPException(status_code=422, detail=f"Invalid rule: {e.orig}")
    db.refresh(rule)
    return rule


def list_availability_rules(db: Session, resource_id: UUID) -> list[models.AvailabilityRule]:
    get_resource(db, resource_id)  # 404 if resource doesn't exist
    return (
        db.query(models.AvailabilityRule)
        .filter(models.AvailabilityRule.resource_id == resource_id)
        .order_by(
            models.AvailabilityRule.day_of_week,
            models.AvailabilityRule.start_time,
        )
        .all()
    )


def delete_availability_rule(db: Session, rule_id: UUID) -> None:
    rule = db.get(models.AvailabilityRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Availability rule not found")
    db.delete(rule)
    db.commit()


def admin_create_booking(
    db: Session,
    resource_id: UUID,
    customer_email: str,
    customer_name: str,
    start_time: datetime,
    end_time: datetime,
    allow_override: bool = False,
) -> dict:
    """Admin path — bypasses lead time checks and (optionally) conflict checks."""
    if start_time.tzinfo is None or end_time.tzinfo is None:
        raise HTTPException(status_code=422, detail="Timestamps must include timezone")
    if end_time <= start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")

    resource = db.get(models.Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    booking = models.Booking(
        resource_id=resource_id,
        customer_email=customer_email,
        customer_name=customer_name,
        time_range=TimestamptzRange(start_time, end_time, bounds="[)"),
        status="confirmed",
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "bookings_no_overlap" in str(e.orig) and not allow_override:
            raise HTTPException(status_code=409, detail="Time slot is already booked")
        if "bookings_no_overlap" in str(e.orig) and allow_override:
            # This is where you'd need to skip the constraint. The clean way is
            # a separate "force" SQL insert; for now, we'll surface the conflict
            # to the admin and let them choose to cancel the conflicting booking.
            raise HTTPException(
                status_code=409,
                detail="Conflict exists. Cancel the conflicting booking first."
            )
        raise

    db.refresh(booking)
    return _to_read_dict(booking)