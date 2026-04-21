from datetime import date, datetime, timedelta, time, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_
from psycopg.types.range import TimestamptzRange

from app.booking import models


def compute_availability(
    db: Session,
    resource_id: UUID,
    from_date: date,
    to_date: date,
) -> list[dict]:
    resource = db.get(models.Resource, resource_id)
    if not resource or not resource.is_active:
        return []

    rules = (
        db.query(models.AvailabilityRule)
        .filter(models.AvailabilityRule.resource_id == resource_id)
        .all()
    )
    rules_by_dow: dict[int, list[models.AvailabilityRule]] = {}
    for r in rules:
        rules_by_dow.setdefault(r.day_of_week, []).append(r)

    window_start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
    window_end = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
    window_range = TimestamptzRange(window_start, window_end, bounds="[)")

    bookings = (
        db.query(models.Booking)
        .filter(
            and_(
                models.Booking.resource_id == resource_id,
                models.Booking.status.in_(["pending", "confirmed"]),
                models.Booking.time_range.op("&&")(window_range),
            )
        )
        .all()
    )

    slots = []
    duration = timedelta(minutes=resource.duration_minutes)
    buffer = timedelta(minutes=resource.buffer_minutes)

    current = from_date
    while current <= to_date:
        dow = current.weekday()
        for rule in rules_by_dow.get(dow, []):
            slot_start = datetime.combine(current, rule.start_time, tzinfo=timezone.utc)
            window_end_dt = datetime.combine(current, rule.end_time, tzinfo=timezone.utc)

            while slot_start + duration <= window_end_dt:
                slot_end = slot_start + duration
                conflict = any(
                    _overlaps(
                        slot_start - buffer, slot_end + buffer,
                        b.time_range.lower, b.time_range.upper,
                    )
                    for b in bookings
                )
                if not conflict:
                    slots.append({"start_time": slot_start, "end_time": slot_end})
                slot_start = slot_end

        current += timedelta(days=1)

    return slots


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end