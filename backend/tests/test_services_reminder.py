"""Tests for app.services.reminder — process_due_reminders."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from app.services.session import creater_session
from app.services.booking import create_booking, confirm_booking_after_payment
from app.services.notification import create_notification, get_notification
from app.services.reminder import process_due_reminders
from app.models.models import NotificationType, NotificationStatus


def _future(h=2):
    return datetime.now(timezone.utc) + timedelta(hours=h)


def _past(h=1):
    return datetime.now(timezone.utc) - timedelta(hours=h)


_email_patch = patch("app.services.booking.send_booking_confirmation_email", new_callable=AsyncMock)
_cancel_email_patch = patch("app.services.booking.send_booking_cancellation_email", new_callable=AsyncMock)
_reminder_email_patch = patch("app.services.reminder.send_booking_reminder_email", new_callable=AsyncMock)


async def _make_booking(db, email="remind@example.com"):
    with _email_patch, _cancel_email_patch:
        session = await creater_session(
            db, method_id=None, start_time=_future(2), end_time=_future(3), capacity=5, instructor=None
        )
        booking = await create_booking(db, session_id=session.id, email=email)
        booking = await confirm_booking_after_payment(db, booking.id)
    return booking


@pytest.mark.asyncio
async def test_process_due_reminders_sends_email(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        mock_send.assert_called_once()

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.SENT


@pytest.mark.asyncio
async def test_process_due_reminders_skips_future_notifications(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_future(10)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        mock_send.assert_not_called()

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.PENDING


@pytest.mark.asyncio
async def test_process_due_reminders_skips_non_reminder_types(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.CONFIRMATION, send_at=_past(1)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        mock_send.assert_not_called()

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.PENDING


@pytest.mark.asyncio
async def test_process_due_reminders_marks_failed_on_email_error(db):
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1)
    )

    with patch("app.services.reminder.send_booking_reminder_email", side_effect=Exception("SMTP error")):
        await process_due_reminders(db)

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.FAILED
    assert "SMTP error" in refreshed.error_message


@pytest.mark.asyncio
async def test_process_due_reminders_skips_cancelled_booking(db):
    with _email_patch, _cancel_email_patch:
        session = await creater_session(
            db, method_id=None, start_time=_future(2), end_time=_future(3), capacity=5, instructor=None
        )
        from app.models.models import User
        from app.core.security import hash_password
        user = User(first_name="Skip", last_name="Me", email="skip@example.com", hashed_password=hash_password("x"))
        db.add(user)
        await db.commit()
        await db.refresh(user)
        booking = await create_booking(db, session_id=session.id, user_id=user.id)
        await confirm_booking_after_payment(db, booking.id)
        from app.services.booking import cancel_booking
        await cancel_booking(db, booking.id, user.id, cancellation_type="user")

    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        mock_send.assert_not_called()

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.FAILED


@pytest.mark.asyncio
async def test_process_due_reminders_no_email_marks_failed(db):
    """A booking with no email address should be marked failed, not raise."""
    with _email_patch, _cancel_email_patch:
        session = await creater_session(
            db, method_id=None, start_time=_future(2), end_time=_future(3), capacity=5, instructor=None
        )
        # Guest booking with no email
        booking = await create_booking(db, session_id=session.id, first_name="NoEmail", last_name="Guest")
        await confirm_booking_after_payment(db, booking.id)

    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        mock_send.assert_not_called()

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.FAILED


@pytest.mark.asyncio
async def test_process_due_reminders_idempotent(db):
    """Running process_due_reminders twice should not re-send or re-fail a SENT notification."""
    booking = await _make_booking(db)
    notif = await create_notification(
        db, booking_id=booking.id, notification_type=NotificationType.REMINDER, send_at=_past(1)
    )

    with _reminder_email_patch as mock_send:
        await process_due_reminders(db)
        await process_due_reminders(db)
        assert mock_send.call_count == 1

    refreshed = await get_notification(db, notif.id)
    assert refreshed.status == NotificationStatus.SENT
