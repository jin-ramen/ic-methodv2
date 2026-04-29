from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from app.models.models import Session, Booking, SessionRule


VALID_FREQUENCIES = {"daily", "weekly", "monthly", "yearly"}
MAX_OCCURRENCES = 365  # safety cap


def _add_months(dt: datetime, months: int) -> datetime:
    """Add `months` to dt, clamping the day-of-month to the new month's last day."""
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    # day-of-month clamp
    if month == 2:
        last = 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
    elif month in (4, 6, 9, 11):
        last = 30
    else:
        last = 31
    day = min(dt.day, last)
    return dt.replace(year=year, month=month, day=day)


def expand_rule_dates(
    start_time: datetime,
    end_time: datetime,
    *,
    frequency: str,
    interval: int,
    count: int | None = None,
    until: datetime | None = None,
) -> list[tuple[datetime, datetime]]:
    """Generate (start, end) pairs for a recurrence rule.

    Always includes the original start as the first occurrence (index 0).
    """
    if frequency not in VALID_FREQUENCIES:
        raise ValueError("invalid_frequency")
    if interval < 1:
        raise ValueError("invalid_interval")
    if count is None and until is None:
        raise ValueError("count_or_until_required")

    duration = end_time - start_time
    occurrences: list[tuple[datetime, datetime]] = []
    cursor = start_time
    i = 0
    cap = min(count or MAX_OCCURRENCES, MAX_OCCURRENCES)
    while True:
        if i >= cap:
            break
        if until is not None and cursor > until:
            break
        occurrences.append((cursor, cursor + duration))
        i += 1
        if frequency == "daily":
            cursor = cursor + timedelta(days=interval)
        elif frequency == "weekly":
            cursor = cursor + timedelta(weeks=interval)
        elif frequency == "monthly":
            cursor = _add_months(cursor, interval)
        elif frequency == "yearly":
            cursor = _add_months(cursor, 12 * interval)
    return occurrences


async def _check_instructor_conflict(db: AsyncSession, instructor: str, start_time: datetime, exclude_id: UUID | None = None) -> None:
    if not instructor:
        return
    q = select(Session.id).where(Session.instructor == instructor, Session.start_time == start_time)
    if exclude_id:
        q = q.where(Session.id != exclude_id)
    result = await db.execute(q)
    if result.scalar_one_or_none():
        raise ValueError(f"{instructor} already has a session at this time.")


async def creater_session(
    db: AsyncSession,
    method_id: UUID | None,
    start_time: datetime,
    end_time: datetime,
    capacity: int,
    instructor: str | None,
    *,
    recurrence: dict | None = None,
) -> Session:
    """Create a session, optionally as the first of a recurring series.

    `recurrence`: {"frequency": str, "interval": int, "count": int|None, "until": datetime|None}
    When given, expands into N sessions tied to a single SessionRule and returns the
    first session.
    """
    if not recurrence:
        await _check_instructor_conflict(db, instructor or '', start_time)
        session = Session(method_id=method_id, start_time=start_time, end_time=end_time, capacity=capacity, instructor=instructor)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    occurrences = expand_rule_dates(
        start_time,
        end_time,
        frequency=recurrence["frequency"],
        interval=int(recurrence.get("interval", 1) or 1),
        count=recurrence.get("count"),
        until=recurrence.get("until"),
    )
    if not occurrences:
        raise ValueError("no_occurrences")

    # Conflict-check every occurrence for the same instructor before committing anything.
    if instructor:
        for occ_start, _ in occurrences:
            await _check_instructor_conflict(db, instructor, occ_start)

    rule = SessionRule(
        frequency=recurrence["frequency"],
        interval=int(recurrence.get("interval", 1) or 1),
        count=recurrence.get("count"),
        until=recurrence.get("until"),
    )
    db.add(rule)
    await db.flush()

    first: Session | None = None
    for idx, (occ_start, occ_end) in enumerate(occurrences):
        s = Session(
            method_id=method_id,
            start_time=occ_start,
            end_time=occ_end,
            capacity=capacity,
            instructor=instructor,
            rule_id=rule.id,
            rule_index=idx,
        )
        db.add(s)
        if idx == 0:
            first = s

    await db.commit()
    assert first is not None
    await db.refresh(first)
    return first


async def list_sessions(db: AsyncSession) -> list[tuple[Session, int]]:
    remaining = (Session.capacity - func.count(Booking.id)).label("spots_remaining")
    result = await db.execute(
        select(Session, remaining)
        .outerjoin(Booking, (Booking.session_id == Session.id) & (Booking.status.in_(('booked', 'pending_payment'))))
        .group_by(*Session.__table__.columns)
        .options(selectinload(Session.method))
        .order_by(Session.start_time)
    )
    return result.all()


async def update_session(db: AsyncSession, id: UUID, method_id: UUID | None, start_time: datetime | None, end_time: datetime | None, capacity: int | None, instructor: str | None) -> Session | None:
    values = {k: v for k, v in {"method_id": method_id, "start_time": start_time, "end_time": end_time, "capacity": capacity, "instructor": instructor}.items() if v is not None}
    if values:
        # Resolve the effective instructor and start_time for conflict check
        existing = await db.get(Session, id)
        if existing is None:
            return None
        effective_instructor = values.get("instructor", existing.instructor) or ''
        effective_start = values.get("start_time", existing.start_time)
        await _check_instructor_conflict(db, effective_instructor, effective_start, exclude_id=id)
        await db.execute(update(Session).where(Session.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Session).where(Session.id == id).options(selectinload(Session.method)))
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Session).where(Session.id == id))
    await db.commit()
    return result.rowcount > 0


async def delete_session_and_following(db: AsyncSession, id: UUID) -> int:
    """Delete this session plus every later sibling in the same rule.

    Returns the number of sessions deleted. If the session has no rule, behaves
    like delete_session (deletes one row).
    """
    target = await db.get(Session, id)
    if target is None:
        return 0
    if target.rule_id is None or target.rule_index is None:
        result = await db.execute(delete(Session).where(Session.id == id))
        await db.commit()
        return result.rowcount or 0

    result = await db.execute(
        delete(Session).where(
            Session.rule_id == target.rule_id,
            Session.rule_index >= target.rule_index,
        )
    )
    deleted = result.rowcount or 0

    # If no sessions remain on the rule, clean it up too.
    remaining = await db.scalar(
        select(func.count(Session.id)).where(Session.rule_id == target.rule_id)
    )
    if not remaining:
        await db.execute(delete(SessionRule).where(SessionRule.id == target.rule_id))

    await db.commit()
    return deleted
