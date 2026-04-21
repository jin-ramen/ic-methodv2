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

# ---------- Resource CRUD ----------

@router.post("/resources", response_model=schemas.ResourceRead, status_code=201)
def create_resource_route(
    payload: schemas.ResourceCreate,
    db: Session = Depends(get_db),
):
    return service.create_resource(
        db,
        name=payload.name,
        capacity=payload.capacity,
        duration_minutes=payload.duration_minutes,
        buffer_minutes=payload.buffer_minutes,
    )


@router.get("/resources", response_model=list[schemas.ResourceRead])
def list_resources_route(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return service.list_resources(db, include_inactive=include_inactive)


@router.get("/resources/{resource_id}", response_model=schemas.ResourceRead)
def get_resource_route(resource_id: UUID, db: Session = Depends(get_db)):
    return service.get_resource(db, resource_id)


@router.patch("/resources/{resource_id}", response_model=schemas.ResourceRead)
def update_resource_route(
    resource_id: UUID,
    payload: schemas.ResourceUpdate,
    db: Session = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return service.update_resource(db, resource_id, updates)


@router.delete("/resources/{resource_id}", response_model=schemas.ResourceRead)
def deactivate_resource_route(resource_id: UUID, db: Session = Depends(get_db)):
    """Soft delete — sets is_active to false."""
    return service.deactivate_resource(db, resource_id)


# ---------- Availability rules ----------

@router.post(
    "/resources/{resource_id}/availability-rules",
    response_model=schemas.AvailabilityRuleRead,
    status_code=201,
)
def create_availability_rule_route(
    resource_id: UUID,
    payload: schemas.AvailabilityRuleCreate,
    db: Session = Depends(get_db),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")
    return service.create_availability_rule(
        db,
        resource_id=resource_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )


@router.get(
    "/resources/{resource_id}/availability-rules",
    response_model=list[schemas.AvailabilityRuleRead],
)
def list_availability_rules_route(
    resource_id: UUID,
    db: Session = Depends(get_db),
):
    return service.list_availability_rules(db, resource_id)


@router.delete("/availability-rules/{rule_id}", status_code=204)
def delete_availability_rule_route(rule_id: UUID, db: Session = Depends(get_db)):
    service.delete_availability_rule(db, rule_id)
    return None