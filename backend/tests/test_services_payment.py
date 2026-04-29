"""Tests for app.services.payment."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.core.security import hash_password
from app.models.models import (
    Booking,
    BookingStatus,
    Method,
    Payment,
    PaymentStatus,
    Session,
    User,
)
from app.services import payment as payment_service


# ----- helpers -----------------------------------------------------------

def _future(hours: int = 2) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours)


async def _make_user(db, email="alice@example.com") -> User:
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


async def _make_method(db, price: Decimal | float = Decimal("100.00")) -> Method:
    method = Method(name="Pilates 101", price=Decimal(price), description=None)
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return method


async def _make_session(db, method_id=None) -> Session:
    session = Session(
        method_id=method_id,
        start_time=_future(2),
        end_time=_future(3),
        capacity=5,
        instructor=None,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def _make_booking(db, session_id, user_id=None, status=BookingStatus.BOOKED) -> Booking:
    booking = Booking(session_id=session_id, user_id=user_id, status=status)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


# ----- start_checkout ----------------------------------------------------

@pytest.mark.asyncio
async def test_start_checkout_creates_payment_with_method_price(db):
    user = await _make_user(db)
    method = await _make_method(db, Decimal("75.50"))
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)

    intent_response = {
        "id": "int_abc",
        "client_secret": "cs_xyz",
        "status": "REQUIRES_PAYMENT_METHOD",
    }
    with patch.object(payment_service, "create_payment_intent", AsyncMock(return_value=intent_response)) as create_mock:
        payment = await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)

    assert payment.amount == Decimal("75.50")
    assert payment.currency == "AUD"
    assert payment.payment_intent_id == "int_abc"
    assert payment.client_secret == "cs_xyz"
    assert payment.status == PaymentStatus.PENDING.value
    assert payment.user_id == user.id
    # Verify the call sent the right amount/currency
    kwargs = create_mock.call_args.kwargs
    assert kwargs["amount"] == Decimal("75.50")
    assert kwargs["currency"] == "AUD"
    assert kwargs["metadata"]["booking_id"] == str(booking.id)
    assert kwargs["metadata"]["method_id"] == str(method.id)


@pytest.mark.asyncio
async def test_start_checkout_includes_return_url(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)

    with patch.object(
        payment_service,
        "create_payment_intent",
        AsyncMock(return_value={"id": "int_1", "client_secret": "cs", "status": "REQUIRES_PAYMENT_METHOD"}),
    ) as create_mock:
        await payment_service.start_checkout(
            db, booking_id=booking.id, user_id=user.id, return_url="https://example.com/return"
        )
    assert create_mock.call_args.kwargs["return_url"] == "https://example.com/return"


@pytest.mark.asyncio
async def test_start_checkout_booking_not_found(db):
    with pytest.raises(ValueError, match="booking_not_found"):
        await payment_service.start_checkout(db, booking_id=uuid.uuid4(), user_id=None)


@pytest.mark.asyncio
async def test_start_checkout_method_not_found(db):
    user = await _make_user(db)
    session = await _make_session(db, method_id=None)  # no method
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    with pytest.raises(ValueError, match="method_not_found"):
        await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)


@pytest.mark.asyncio
async def test_start_checkout_cancelled_booking(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id, status=BookingStatus.CANCELLED)
    with pytest.raises(ValueError, match="booking_cancelled"):
        await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)


@pytest.mark.asyncio
async def test_start_checkout_forbidden_for_other_user(db):
    owner = await _make_user(db, email="owner@example.com")
    other = await _make_user(db, email="other@example.com")
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=owner.id)
    with pytest.raises(ValueError, match="forbidden"):
        await payment_service.start_checkout(db, booking_id=booking.id, user_id=other.id)


@pytest.mark.asyncio
async def test_start_checkout_zero_price_invalid(db):
    user = await _make_user(db)
    method = await _make_method(db, Decimal("0.00"))
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    with pytest.raises(ValueError, match="invalid_amount"):
        await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)


@pytest.mark.asyncio
async def test_start_checkout_already_paid(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)

    db.add(Payment(
        booking_id=booking.id,
        user_id=user.id,
        request_id="req_x",
        merchant_order_id="ord_x",
        payment_intent_id="int_paid",
        amount=Decimal("100.00"),
        currency="AUD",
        status=PaymentStatus.SUCCEEDED.value,
    ))
    await db.commit()

    with pytest.raises(ValueError, match="already_paid"):
        await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)


@pytest.mark.asyncio
async def test_start_checkout_idempotent_returns_existing_pending(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)

    create_mock = AsyncMock(return_value={
        "id": "int_first",
        "client_secret": "cs_first",
        "status": "REQUIRES_PAYMENT_METHOD",
    })
    with patch.object(payment_service, "create_payment_intent", create_mock):
        first = await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)
        second = await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)

    # Second call returns same record without hitting Airwallex again
    assert first.id == second.id
    assert first.payment_intent_id == second.payment_intent_id
    assert create_mock.call_count == 1


# ----- stale payment sweeper --------------------------------------------

@pytest.mark.asyncio
async def test_release_stale_pending_payments_releases_old_pending(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_stale", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(payment)
    await db.commit()

    cancel_mock = AsyncMock(return_value={"id": "int_stale", "status": "CANCELLED"})
    with patch.object(payment_service, "cancel_payment_intent", cancel_mock):
        released = await payment_service.release_stale_pending_payments(db, max_age_minutes=15)

    assert released == 1
    cancel_mock.assert_awaited_once()
    await db.refresh(payment)
    await db.refresh(booking)
    assert payment.status == PaymentStatus.CANCELLED.value
    assert booking.status == BookingStatus.PAYMENT_FAILED


@pytest.mark.asyncio
async def test_release_stale_pending_payments_skips_recent_pending(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_recent", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
        created_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    await db.commit()

    cancel_mock = AsyncMock()
    with patch.object(payment_service, "cancel_payment_intent", cancel_mock):
        released = await payment_service.release_stale_pending_payments(db, max_age_minutes=15)

    assert released == 0
    cancel_mock.assert_not_awaited()
    await db.refresh(booking)
    assert booking.status == BookingStatus.PENDING_PAYMENT


@pytest.mark.asyncio
async def test_release_stale_pending_payments_ignores_terminal(db):
    """Already-succeeded or already-cancelled payments shouldn't be touched."""
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.BOOKED
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_done", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.SUCCEEDED.value,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(payment)
    await db.commit()

    released = await payment_service.release_stale_pending_payments(db, max_age_minutes=15)
    assert released == 0
    await db.refresh(booking)
    assert booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_release_stale_pending_payments_swallows_airwallex_errors(db):
    """If Airwallex cancel fails, we still mark locally and release the booking."""
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_borked", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(payment)
    await db.commit()

    failing = AsyncMock(side_effect=RuntimeError("network"))
    with patch.object(payment_service, "cancel_payment_intent", failing):
        released = await payment_service.release_stale_pending_payments(db, max_age_minutes=15)

    assert released == 1
    await db.refresh(payment)
    await db.refresh(booking)
    assert payment.status == PaymentStatus.CANCELLED.value
    assert booking.status == BookingStatus.PAYMENT_FAILED


# ----- booking-state cascade --------------------------------------------

@pytest.mark.asyncio
async def test_payment_succeeded_confirms_booking(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    # Booking starts as pending_payment (real flow)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_ok", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    # Stub email sends so we don't hit SMTP in cascade
    with patch("app.services.booking.send_booking_confirmation_email", AsyncMock()), \
         patch.object(payment_service, "send_payment_invoice_email", AsyncMock()):
        event = {"name": "payment_intent.succeeded", "data": {"object": {"id": "int_ok", "status": "SUCCEEDED"}}}
        await payment_service.apply_webhook_event(db, event)

    await db.refresh(booking)
    assert booking.status == BookingStatus.BOOKED


@pytest.mark.asyncio
async def test_payment_failed_releases_booking(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_bad", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    event = {"name": "payment_intent.failed", "data": {"object": {"id": "int_bad", "status": "FAILED"}}}
    await payment_service.apply_webhook_event(db, event)

    await db.refresh(booking)
    assert booking.status == BookingStatus.PAYMENT_FAILED
    assert booking.cancellation_type == "payment_failed"


@pytest.mark.asyncio
async def test_payment_cancelled_releases_booking(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(
        db, session_id=session.id, user_id=user.id, status=BookingStatus.PENDING_PAYMENT
    )
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    with patch.object(payment_service, "cancel_payment_intent",
                      AsyncMock(return_value={"id": "int_x", "status": "CANCELLED"})):
        await payment_service.cancel_payment(db, payment)

    await db.refresh(booking)
    assert booking.status == BookingStatus.CANCELLED


# ----- invoice email -----------------------------------------------------

@pytest.mark.asyncio
async def test_invoice_sent_when_status_transitions_to_succeeded_via_sync(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    invoice_mock = AsyncMock()
    with patch.object(payment_service, "retrieve_payment_intent",
                      AsyncMock(return_value={"id": "int_x", "status": "SUCCEEDED"})), \
         patch.object(payment_service, "send_payment_invoice_email", invoice_mock):
        result = await payment_service.sync_payment_status(db, payment)

    assert result.status == PaymentStatus.SUCCEEDED.value
    invoice_mock.assert_awaited_once()
    kwargs = invoice_mock.await_args.kwargs
    assert kwargs["to_email"] == "alice@example.com"
    assert kwargs["amount"] == "100.00"
    assert kwargs["currency"] == "AUD"
    assert kwargs["method_name"] == "Pilates 101"
    assert kwargs["invoice_number"].startswith("INV-")
    assert result.invoice_sent_at is not None


@pytest.mark.asyncio
async def test_invoice_sent_via_webhook_event(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_hook", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    invoice_mock = AsyncMock()
    event = {
        "name": "payment_intent.succeeded",
        "data": {"object": {"id": "int_hook", "status": "SUCCEEDED"}},
    }
    with patch.object(payment_service, "send_payment_invoice_email", invoice_mock):
        result = await payment_service.apply_webhook_event(db, event)

    assert result.status == PaymentStatus.SUCCEEDED.value
    invoice_mock.assert_awaited_once()
    assert result.invoice_sent_at is not None


@pytest.mark.asyncio
async def test_invoice_not_resent_on_repeat_succeeded_event(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_h", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    invoice_mock = AsyncMock()
    event = {"name": "payment_intent.succeeded", "data": {"object": {"id": "int_h", "status": "SUCCEEDED"}}}
    with patch.object(payment_service, "send_payment_invoice_email", invoice_mock):
        await payment_service.apply_webhook_event(db, event)
        await payment_service.apply_webhook_event(db, event)

    invoice_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_invoice_not_sent_when_payment_fails(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_f", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    invoice_mock = AsyncMock()
    event = {"name": "payment_intent.failed", "data": {"object": {"id": "int_f", "status": "FAILED"}}}
    with patch.object(payment_service, "send_payment_invoice_email", invoice_mock):
        await payment_service.apply_webhook_event(db, event)

    invoice_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_invoice_falls_back_to_guest_email(db):
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = Booking(
        session_id=session.id,
        first_name="Guest",
        last_name="User",
        email="guest@example.com",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    payment = Payment(
        booking_id=booking.id, user_id=None, request_id="r", merchant_order_id="o",
        payment_intent_id="int_g", amount=Decimal("75.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    invoice_mock = AsyncMock()
    event = {"name": "payment_intent.succeeded", "data": {"object": {"id": "int_g", "status": "SUCCEEDED"}}}
    with patch.object(payment_service, "send_payment_invoice_email", invoice_mock):
        await payment_service.apply_webhook_event(db, event)

    invoice_mock.assert_awaited_once()
    assert invoice_mock.await_args.kwargs["to_email"] == "guest@example.com"


@pytest.mark.asyncio
async def test_invoice_guard_persists_when_email_send_fails(db):
    """If send fails, invoice_sent_at stays None so a later retry can succeed."""
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("100.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    failing = AsyncMock(side_effect=RuntimeError("smtp down"))
    with patch.object(payment_service, "retrieve_payment_intent",
                      AsyncMock(return_value={"id": "int_x", "status": "SUCCEEDED"})), \
         patch.object(payment_service, "send_payment_invoice_email", failing):
        result = await payment_service.sync_payment_status(db, payment)

    assert result.status == PaymentStatus.SUCCEEDED.value
    assert result.invoice_sent_at is None  # not marked sent on failure


@pytest.mark.asyncio
async def test_start_checkout_reuses_existing_cancelled_payment_row(db):
    """A previous failed/cancelled payment row must be updated, not duplicated."""
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)

    # Pre-existing CANCELLED payment for this booking (e.g. user backed out earlier)
    db.add(Payment(
        booking_id=booking.id,
        user_id=user.id,
        request_id="old_req",
        merchant_order_id="old_order",
        payment_intent_id="int_old",
        client_secret="cs_old",
        amount=Decimal("100.00"),
        currency="AUD",
        status=PaymentStatus.CANCELLED.value,
    ))
    await db.commit()

    new_intent = {"id": "int_new", "client_secret": "cs_new", "status": "REQUIRES_PAYMENT_METHOD"}
    with patch.object(payment_service, "create_payment_intent", AsyncMock(return_value=new_intent)):
        payment = await payment_service.start_checkout(db, booking_id=booking.id, user_id=user.id)

    # Updated in place — only one row, with the fresh intent
    assert payment.payment_intent_id == "int_new"
    assert payment.status == PaymentStatus.PENDING.value
    rows = (await db.execute(select(Payment).where(Payment.booking_id == booking.id))).scalars().all()
    assert len(rows) == 1


# ----- sync_payment_status -----------------------------------------------

@pytest.mark.asyncio
async def test_sync_payment_status_updates_when_changed(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id,
        user_id=user.id,
        request_id="r",
        merchant_order_id="o",
        payment_intent_id="int_x",
        amount=Decimal("50.00"),
        currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    with patch.object(
        payment_service, "retrieve_payment_intent",
        AsyncMock(return_value={"id": "int_x", "status": "SUCCEEDED"}),
    ):
        updated = await payment_service.sync_payment_status(db, payment)
    assert updated.status == PaymentStatus.SUCCEEDED.value


@pytest.mark.asyncio
async def test_sync_payment_status_no_change(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    with patch.object(
        payment_service, "retrieve_payment_intent",
        AsyncMock(return_value={"id": "int_x", "status": "REQUIRES_PAYMENT_METHOD"}),
    ):
        updated = await payment_service.sync_payment_status(db, payment)
    assert updated.status == PaymentStatus.PENDING.value


@pytest.mark.asyncio
async def test_sync_payment_status_no_intent_id(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id=None, amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    retrieve_mock = AsyncMock()
    with patch.object(payment_service, "retrieve_payment_intent", retrieve_mock):
        result = await payment_service.sync_payment_status(db, payment)
    assert result.status == PaymentStatus.PENDING.value
    retrieve_mock.assert_not_awaited()


# ----- cancel_payment ----------------------------------------------------

@pytest.mark.asyncio
async def test_cancel_payment_calls_airwallex_and_updates_status(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    cancel_mock = AsyncMock(return_value={"id": "int_x", "status": "CANCELLED"})
    with patch.object(payment_service, "cancel_payment_intent", cancel_mock):
        result = await payment_service.cancel_payment(db, payment)
    assert result.status == PaymentStatus.CANCELLED.value
    cancel_mock.assert_awaited_once()
    args = cancel_mock.await_args.args
    assert args[0] == "int_x"


@pytest.mark.asyncio
async def test_cancel_payment_skips_if_already_terminal(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_x", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.SUCCEEDED.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    cancel_mock = AsyncMock()
    with patch.object(payment_service, "cancel_payment_intent", cancel_mock):
        result = await payment_service.cancel_payment(db, payment)
    assert result.status == PaymentStatus.SUCCEEDED.value
    cancel_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_cancel_payment_without_intent_id_marks_cancelled(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id=None, amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    cancel_mock = AsyncMock()
    with patch.object(payment_service, "cancel_payment_intent", cancel_mock):
        result = await payment_service.cancel_payment(db, payment)
    assert result.status == PaymentStatus.CANCELLED.value
    cancel_mock.assert_not_awaited()


# ----- apply_webhook_event ----------------------------------------------

@pytest.mark.asyncio
async def test_apply_webhook_event_updates_status(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    booking = await _make_booking(db, session_id=session.id, user_id=user.id)
    payment = Payment(
        booking_id=booking.id, user_id=user.id, request_id="r", merchant_order_id="o",
        payment_intent_id="int_hook", amount=Decimal("50.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
    )
    db.add(payment)
    await db.commit()

    event = {
        "name": "payment_intent.succeeded",
        "data": {"object": {"id": "int_hook", "status": "SUCCEEDED"}},
    }
    result = await payment_service.apply_webhook_event(db, event)
    assert result is not None
    assert result.status == PaymentStatus.SUCCEEDED.value


@pytest.mark.asyncio
async def test_apply_webhook_event_unknown_intent(db):
    event = {
        "name": "payment_intent.succeeded",
        "data": {"object": {"id": "int_missing", "status": "SUCCEEDED"}},
    }
    result = await payment_service.apply_webhook_event(db, event)
    assert result is None


@pytest.mark.asyncio
async def test_apply_webhook_event_ignores_non_payment_events(db):
    event = {
        "name": "refund.succeeded",
        "data": {"object": {"id": "rfd_1"}},
    }
    result = await payment_service.apply_webhook_event(db, event)
    assert result is None


@pytest.mark.asyncio
async def test_apply_webhook_event_missing_intent_id(db):
    event = {"name": "payment_intent.succeeded", "data": {"object": {}}}
    result = await payment_service.apply_webhook_event(db, event)
    assert result is None


# ----- list / get helpers -----------------------------------------------

@pytest.mark.asyncio
async def test_list_payments_for_user_orders_by_created_desc(db):
    user = await _make_user(db)
    method = await _make_method(db)
    session = await _make_session(db, method_id=method.id)
    b1 = await _make_booking(db, session_id=session.id, user_id=user.id)

    s2 = await _make_session(db, method_id=method.id)
    b2 = await _make_booking(db, session_id=s2.id, user_id=user.id)

    older = Payment(
        booking_id=b1.id, user_id=user.id, request_id="r1", merchant_order_id="o1",
        payment_intent_id="int_old", amount=Decimal("10.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    newer = Payment(
        booking_id=b2.id, user_id=user.id, request_id="r2", merchant_order_id="o2",
        payment_intent_id="int_new", amount=Decimal("10.00"), currency="AUD",
        status=PaymentStatus.PENDING.value,
        created_at=datetime.now(timezone.utc),
    )
    db.add_all([older, newer])
    await db.commit()

    result = await payment_service.list_payments_for_user(db, user.id)
    assert [p.payment_intent_id for p in result] == ["int_new", "int_old"]


@pytest.mark.asyncio
async def test_get_payment_by_booking_returns_none_when_missing(db):
    result = await payment_service.get_payment_by_booking(db, uuid.uuid4())
    assert result is None


# ----- serialize_payment ------------------------------------------------

def test_serialize_payment_shape():
    pid = uuid.uuid4()
    bid = uuid.uuid4()
    uid = uuid.uuid4()
    now = datetime.now(timezone.utc)
    payment = Payment(
        id=pid, booking_id=bid, user_id=uid, request_id="r", merchant_order_id="o",
        payment_intent_id="int_1", amount=Decimal("12.34"), currency="AUD",
        status=PaymentStatus.PENDING.value, created_at=now, updated_at=now,
    )
    out = payment_service.serialize_payment(payment)
    assert out["id"] == str(pid)
    assert out["booking_id"] == str(bid)
    assert out["user_id"] == str(uid)
    assert out["payment_intent_id"] == "int_1"
    assert out["amount"] == "12.34"
    assert out["currency"] == "AUD"
    assert out["status"] == "pending"
    assert out["created_at"] == now.isoformat()
