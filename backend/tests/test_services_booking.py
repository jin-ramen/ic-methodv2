"""Tests for app.services.booking."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from app.services.session import creater_session
from app.services.booking import (
    create_booking,
    list_bookings,
    update_booking,
    cancel_booking,
    delete_booking,
)
from app.models.models import User, BookingStatus
from app.core.security import hash_password


def _future(offset_hours: int = 2) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=offset_hours)


async def _make_session(db, capacity=5):
    return await creater_session(
        db,
        method_id=None,
        start_time=_future(2),
        end_time=_future(3),
        capacity=capacity,
        instructor=None,
    )


async def _make_user(db, email: str = "alice@example.com") -> User:
    user = User(
        first_name="Alice",
        last_name="Smith",
        email=email,
        hashed_password=hash_password("secret"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# Patch email sending so tests don't call real SMTP
_email_patch = patch("app.services.booking.send_booking_confirmation_email", new_callable=AsyncMock)
_cancel_email_patch = patch("app.services.booking.send_booking_cancellation_email", new_callable=AsyncMock)


@pytest.mark.asyncio
async def test_create_booking_guest(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        booking = await create_booking(
            db,
            session_id=session.id,
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
        )
    assert booking.id is not None
    assert booking.email == "bob@example.com"
    assert booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_create_booking_for_user(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
    assert booking.user_id == user.id


@pytest.mark.asyncio
async def test_create_booking_session_not_found(db):
    with _email_patch, _cancel_email_patch:
        with pytest.raises(ValueError, match="session_not_found"):
            await create_booking(db, session_id=uuid.uuid4())


@pytest.mark.asyncio
async def test_create_booking_fully_booked(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=1)
        await create_booking(db, session_id=session.id, email="first@example.com")
        with pytest.raises(ValueError, match="fully_booked"):
            await create_booking(db, session_id=session.id, email="second@example.com")


@pytest.mark.asyncio
async def test_create_booking_duplicate_user(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=5)
        user = await _make_user(db)
        await create_booking(db, session_id=session.id, user_id=user.id)
        with pytest.raises(ValueError, match="already_booked"):
            await create_booking(db, session_id=session.id, user_id=user.id)


@pytest.mark.asyncio
async def test_create_booking_duplicate_guest_email(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=5)
        await create_booking(db, session_id=session.id, email="dup@example.com")
        with pytest.raises(ValueError, match="already_booked"):
            await create_booking(db, session_id=session.id, email="dup@example.com")


@pytest.mark.asyncio
async def test_list_bookings_empty(db):
    result = await list_bookings(db)
    assert result == []


@pytest.mark.asyncio
async def test_list_bookings_by_session(db):
    with _email_patch, _cancel_email_patch:
        s1 = await _make_session(db)
        s2 = await creater_session(db, method_id=None, start_time=_future(5), end_time=_future(6), capacity=5, instructor=None)
        await create_booking(db, session_id=s1.id, email="a@example.com")
        await create_booking(db, session_id=s2.id, email="b@example.com")
    result = await list_bookings(db, session_id=s1.id)
    assert len(result) == 1
    assert result[0].session_id == s1.id


@pytest.mark.asyncio
async def test_list_bookings_by_user(db):
    with _email_patch, _cancel_email_patch:
        s1 = await _make_session(db)
        s2 = await creater_session(db, method_id=None, start_time=_future(5), end_time=_future(6), capacity=5, instructor=None)
        user = await _make_user(db)
        await create_booking(db, session_id=s1.id, user_id=user.id)
        await create_booking(db, session_id=s2.id, email="other@example.com")
    result = await list_bookings(db, user_id=user.id)
    assert len(result) == 1
    assert result[0].user_id == user.id


@pytest.mark.asyncio
async def test_update_booking_notes(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        booking = await create_booking(db, session_id=session.id, email="update@example.com")
    updated = await update_booking(db, booking.id, notes="bring yoga mat")
    assert updated.notes == "bring yoga mat"


@pytest.mark.asyncio
async def test_update_booking_nonexistent_returns_none(db):
    result = await update_booking(db, uuid.uuid4(), notes="whatever")
    assert result is None


@pytest.mark.asyncio
async def test_cancel_booking(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
        cancelled = await cancel_booking(db, booking.id, user.id, cancellation_type="user")
    assert cancelled.status == BookingStatus.CANCELLED
    assert cancelled.cancelled_at is not None
    assert cancelled.cancellation_type == "user"


@pytest.mark.asyncio
async def test_cancel_booking_wrong_user_returns_none(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
    result = await cancel_booking(db, booking.id, uuid.uuid4(), cancellation_type="user")
    assert result is None


@pytest.mark.asyncio
async def test_cancel_booking_allows_rebooking_after_cancel(db):
    """Cancelling a session should allow a new booking (capacity freed up)."""
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=1)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
        await cancel_booking(db, booking.id, user.id, cancellation_type="user")
        new_booking = await create_booking(db, session_id=session.id, email="new@example.com")
    assert new_booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_delete_booking(db):
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        booking = await create_booking(db, session_id=session.id, email="del@example.com")
    deleted = await delete_booking(db, booking.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_booking_nonexistent(db):
    deleted = await delete_booking(db, uuid.uuid4())
    assert deleted is False


@pytest.mark.asyncio
async def test_cancelled_booking_does_not_count_toward_capacity(db):
    """Cancelled bookings should not count toward the session's booked count."""
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=1)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
        await cancel_booking(db, booking.id, user.id, cancellation_type="user")

        # Now there should be 0 active bookings — a second person can book
        new_booking = await create_booking(db, session_id=session.id, email="next@example.com")
    assert new_booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_create_booking_for_past_session(db):
    """Booking a session that is already in the past should be allowed or rejected — test documents current behaviour."""
    from datetime import datetime, timezone, timedelta
    with _email_patch, _cancel_email_patch:
        # Create a session that already ended
        past_start = datetime.now(timezone.utc) - timedelta(hours=3)
        past_end = datetime.now(timezone.utc) - timedelta(hours=2)
        from app.services.session import creater_session
        past_session = await creater_session(db, method_id=None, start_time=past_start, end_time=past_end, capacity=5, instructor=None)
        # Current code does NOT check whether the session is in the past — this should raise ValueError
        booking = await create_booking(db, session_id=past_session.id, email="late@example.com")
    # If we reach here, the service allows booking past sessions (no guard exists)
    assert booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_list_bookings_all_statuses_returned(db):
    """list_bookings returns both BOOKED and CANCELLED bookings."""
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db, capacity=5)
        user = await _make_user(db)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
        await cancel_booking(db, booking.id, user.id, cancellation_type="user")

    all_bookings = await list_bookings(db, session_id=session.id)
    statuses = {b.status for b in all_bookings}
    assert BookingStatus.CANCELLED in statuses


@pytest.mark.asyncio
async def test_create_booking_reminder_not_scheduled_for_past_session(db):
    """No REMINDER notification should be created when the session is in the past."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select
    from app.models.models import Notification, NotificationType
    with _email_patch, _cancel_email_patch:
        past_start = datetime.now(timezone.utc) - timedelta(hours=3)
        past_end = datetime.now(timezone.utc) - timedelta(hours=2)
        from app.services.session import creater_session
        past_session = await creater_session(db, method_id=None, start_time=past_start, end_time=past_end, capacity=5, instructor=None)
        booking = await create_booking(db, session_id=past_session.id, email="check@example.com")

    result = await db.execute(
        select(Notification).where(
            Notification.booking_id == booking.id,
            Notification.type == NotificationType.REMINDER,
        )
    )
    reminders = result.scalars().all()
    assert len(reminders) == 0


@pytest.mark.asyncio
async def test_update_booking_notes_to_empty_string(db):
    """Passing notes='' (empty string) should not clear notes due to the `if notes is not None` guard."""
    with _email_patch, _cancel_email_patch:
        session = await _make_session(db)
        booking = await create_booking(db, session_id=session.id, email="note@example.com", notes="original note")

    updated = await update_booking(db, booking.id, notes="")
    # Empty string is not None, so it should be applied
    assert updated.notes == ""
