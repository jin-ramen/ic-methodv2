"""Tests for app.services.notification."""
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
from app.services.booking import create_booking
from app.services.notification import (
    create_notification,
    get_notification,
    list_notifications,
    list_due_notifications,
    mark_notification_sent,
    mark_notification_failed,
)
from app.models.models import NotificationStatus, NotificationType


def _future(hours: int = 1) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def _past(hours: int = 1) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


_email_patch = patch("app.services.booking.send_booking_confirmation_email", new_callable=AsyncMock)
_cancel_email_patch = patch("app.services.booking.send_booking_cancellation_email", new_callable=AsyncMock)


async def _make_booking(db):
    with _email_patch, _cancel_email_patch:
        session = await creater_session(
            db,
            method_id=None,
            start_time=_future(2),
            end_time=_future(3),
            capacity=5,
            instructor=None,
        )
        booking = await create_booking(db, session_id=session.id, email="test@example.com")
    return booking


@pytest.mark.asyncio
async def test_create_notification(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db,
        booking_id=booking.id,
        notification_type=NotificationType.CONFIRMATION,
        send_at=_future(1),
    )
    assert notif.id is not None
    assert notif.status == NotificationStatus.PENDING
    assert notif.type == NotificationType.CONFIRMATION


@pytest.mark.asyncio
async def test_get_notification(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_future(1)
    )
    fetched = await get_notification(db, notif.id)
    assert fetched.id == notif.id


@pytest.mark.asyncio
async def test_get_notification_nonexistent_returns_none(db):
    result = await get_notification(db, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_list_notifications_empty(db):
    result = await list_notifications(db)
    assert result == []


@pytest.mark.asyncio
async def test_list_notifications_filter_by_status(db):
    booking = await _make_booking(db)
    n1 = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_future(1))
    n2 = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(2))
    await mark_notification_sent(db, n1.id)

    pending = await list_notifications(db, status=NotificationStatus.PENDING)
    sent = await list_notifications(db, status=NotificationStatus.SENT)
    assert all(n.status == NotificationStatus.PENDING for n in pending)
    assert all(n.status == NotificationStatus.SENT for n in sent)


@pytest.mark.asyncio
async def test_list_notifications_filter_due_before(db):
    booking = await _make_booking(db)
    past_notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1))
    future_notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(1))

    due = await list_notifications(db, due_before=datetime.now(timezone.utc))
    ids = [n.id for n in due]
    assert past_notif.id in ids
    assert future_notif.id not in ids


@pytest.mark.asyncio
async def test_list_due_notifications(db):
    booking = await _make_booking(db)
    past_notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1))
    future_notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(1))

    due = await list_due_notifications(db, now=datetime.now(timezone.utc))
    ids = [n.id for n in due]
    assert past_notif.id in ids
    assert future_notif.id not in ids


@pytest.mark.asyncio
async def test_mark_notification_sent(db):
    booking = await _make_booking(db)
    notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(1))
    updated = await mark_notification_sent(db, notif.id)
    assert updated.status == NotificationStatus.SENT
    assert updated.sent_at is not None


@pytest.mark.asyncio
async def test_mark_notification_sent_nonexistent_returns_none(db):
    result = await mark_notification_sent(db, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_mark_notification_failed(db):
    booking = await _make_booking(db)
    notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(1))
    updated = await mark_notification_failed(db, notif.id, error_message="SMTP timeout")
    assert updated.status == NotificationStatus.FAILED
    assert updated.error_message == "SMTP timeout"


@pytest.mark.asyncio
async def test_mark_notification_failed_nonexistent_returns_none(db):
    result = await mark_notification_failed(db, uuid.uuid4(), error_message="nope")
    assert result is None


@pytest.mark.asyncio
async def test_list_due_notifications_excludes_sent(db):
    """Already-sent notifications must not appear in due list."""
    booking = await _make_booking(db)
    notif = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1))
    await mark_notification_sent(db, notif.id)

    due = await list_due_notifications(db, now=datetime.now(timezone.utc))
    ids = [n.id for n in due]
    assert notif.id not in ids


@pytest.mark.asyncio
async def test_notifications_ordered_by_send_at(db):
    booking = await _make_booking(db)
    n1 = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_future(3))
    n2 = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_future(1))
    n3 = await create_notification(db, booking_id=booking.id, notification_type=NotificationType.OTHERS, send_at=_future(2))

    all_notifs = await list_notifications(db)
    send_ats = [n.send_at for n in all_notifs]
    assert send_ats == sorted(send_ats)
