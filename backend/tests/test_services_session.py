"""Tests for app.services.session."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError

from app.services.session import creater_session, list_sessions, update_session, delete_session
from app.models.models import Method


def _future(offset_hours: int = 1) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=offset_hours)


@pytest.mark.asyncio
async def test_create_session_basic(db):
    session = await creater_session(
        db,
        method_id=None,
        start_time=_future(1),
        end_time=_future(2),
        capacity=5,
        instructor="Alice",
    )
    assert session.id is not None
    assert session.capacity == 5
    assert session.instructor == "Alice"


@pytest.mark.asyncio
async def test_create_session_no_instructor(db):
    session = await creater_session(
        db,
        method_id=None,
        start_time=_future(1),
        end_time=_future(2),
        capacity=3,
        instructor=None,
    )
    assert session.instructor is None


@pytest.mark.asyncio
async def test_list_sessions_empty(db):
    result = await list_sessions(db)
    assert result == []


@pytest.mark.asyncio
async def test_list_sessions_returns_spots_remaining(db):
    await creater_session(db, method_id=None, start_time=_future(1), end_time=_future(2), capacity=10, instructor="Bob")
    rows = await list_sessions(db)
    assert len(rows) == 1
    session_obj, spots = rows[0]
    assert spots == 10


@pytest.mark.asyncio
async def test_create_two_sessions_same_instructor_different_times(db):
    s1 = await creater_session(db, method_id=None, start_time=_future(1), end_time=_future(2), capacity=1, instructor="Carol")
    s2 = await creater_session(db, method_id=None, start_time=_future(3), end_time=_future(4), capacity=1, instructor="Carol")
    assert s1.id != s2.id


@pytest.mark.asyncio
async def test_create_session_duplicate_instructor_time_raises(db):
    t = _future(5)
    await creater_session(db, method_id=None, start_time=t, end_time=_future(6), capacity=1, instructor="Dave")
    with pytest.raises(ValueError, match="Dave"):
        await creater_session(db, method_id=None, start_time=t, end_time=_future(6), capacity=1, instructor="Dave")


@pytest.mark.asyncio
async def test_update_session_capacity(db):
    s = await creater_session(db, method_id=None, start_time=_future(1), end_time=_future(2), capacity=4, instructor=None)
    updated = await update_session(db, s.id, method_id=None, start_time=None, end_time=None, capacity=8, instructor=None)
    assert updated.capacity == 8


@pytest.mark.asyncio
async def test_update_session_nonexistent_returns_none(db):
    import uuid
    result = await update_session(db, uuid.uuid4(), method_id=None, start_time=None, end_time=None, capacity=5, instructor=None)
    assert result is None


@pytest.mark.asyncio
async def test_delete_session(db):
    s = await creater_session(db, method_id=None, start_time=_future(1), end_time=_future(2), capacity=1, instructor=None)
    deleted = await delete_session(db, s.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_session_nonexistent(db):
    import uuid
    deleted = await delete_session(db, uuid.uuid4())
    assert deleted is False


@pytest.mark.asyncio
async def test_list_sessions_ordered_by_start_time(db):
    t1 = _future(10)
    t2 = _future(5)
    await creater_session(db, method_id=None, start_time=t1, end_time=_future(11), capacity=1, instructor=None)
    await creater_session(db, method_id=None, start_time=t2, end_time=_future(6), capacity=1, instructor=None)
    rows = await list_sessions(db)
    start_times = [r[0].start_time for r in rows]
    assert start_times == sorted(start_times)


@pytest.mark.asyncio
async def test_list_sessions_spots_remaining_decrements_on_booking(db):
    from unittest.mock import AsyncMock, patch
    from app.services.booking import create_booking

    _ep = patch("app.services.booking.send_booking_confirmation_email", new_callable=AsyncMock)
    _cp = patch("app.services.booking.send_booking_cancellation_email", new_callable=AsyncMock)

    with _ep, _cp:
        s = await creater_session(db, method_id=None, start_time=_future(1), end_time=_future(2), capacity=3, instructor=None)
        await create_booking(db, session_id=s.id, email="a@example.com")

    rows = await list_sessions(db)
    _, spots = rows[0]
    assert spots == 2


@pytest.mark.asyncio
async def test_update_session_instructor_conflict_raises(db):
    t = _future(8)
    await creater_session(db, method_id=None, start_time=t, end_time=_future(9), capacity=1, instructor="Eve")
    s2 = await creater_session(db, method_id=None, start_time=_future(10), end_time=_future(11), capacity=1, instructor="Eve")
    with pytest.raises(ValueError, match="Eve"):
        await update_session(db, s2.id, method_id=None, start_time=t, end_time=None, capacity=None, instructor=None)


@pytest.mark.asyncio
async def test_update_session_same_session_no_conflict(db):
    """Updating a session's own time should not trigger a self-conflict."""
    t = _future(6)
    s = await creater_session(db, method_id=None, start_time=t, end_time=_future(7), capacity=1, instructor="Frank")
    new_end = _future(8)
    updated = await update_session(db, s.id, method_id=None, start_time=None, end_time=new_end, capacity=None, instructor=None)
    assert updated is not None
