import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.email import send_payment_invoice_email
from app.models.models import Booking, BookingStatus, Method, Payment, PaymentStatus, Session, User
from app.services.airwallex import (
    cancel_payment_intent,
    create_payment_intent,
    map_intent_status,
    retrieve_payment_intent,
)
from app.services.booking import confirm_booking_after_payment, release_unpaid_booking


DEFAULT_CURRENCY = "AUD"


def _invoice_number(payment: Payment) -> str:
    return f"INV-{payment.id.hex[:12].upper()}"


async def _cascade_booking_state(
    db: AsyncSession, payment: Payment, *, user_cancelled: bool = False
) -> None:
    if payment.status == PaymentStatus.SUCCEEDED.value:
        await confirm_booking_after_payment(db, payment.booking_id)
    elif payment.status in (PaymentStatus.FAILED.value, PaymentStatus.CANCELLED.value):
        reason = "user_cancelled" if user_cancelled else "payment_failed"
        await release_unpaid_booking(db, payment.booking_id, reason=reason)


async def _send_invoice_if_needed(db: AsyncSession, payment: Payment) -> None:
    if payment.status != PaymentStatus.SUCCEEDED.value:
        return
    if payment.invoice_sent_at is not None:
        return

    result = await db.execute(
        select(Payment)
        .where(Payment.id == payment.id)
        .options(
            selectinload(Payment.user),
            selectinload(Payment.booking).selectinload(Booking.session).selectinload(Session.method),
            selectinload(Payment.booking).selectinload(Booking.user),
        )
    )
    full = result.scalar_one_or_none()
    if not full:
        return

    booking = full.booking
    user = full.user or (booking.user if booking else None)
    to_email = user.email if user else (booking.email if booking else None)
    first_name = (
        user.first_name if user else (booking.first_name if booking and booking.first_name else "there")
    )
    user_timezone = getattr(user, "timezone", None) if user else None
    method_name = booking.session.method.name if booking and booking.session and booking.session.method else None
    session_start = booking.session.start_time if booking and booking.session else None

    if not to_email:
        return

    try:
        await send_payment_invoice_email(
            to_email=to_email,
            first_name=first_name,
            invoice_number=_invoice_number(full),
            amount=str(full.amount),
            currency=full.currency,
            method_name=method_name,
            session_start=session_start,
            paid_at=full.updated_at or datetime.now(timezone.utc),
            user_timezone=user_timezone,
        )
    except Exception:
        return

    full.invoice_sent_at = datetime.now(timezone.utc)
    payment.invoice_sent_at = full.invoice_sent_at
    await db.commit()


async def _load_booking_with_method(db: AsyncSession, booking_id: UUID) -> Booking | None:
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.session).selectinload(Session.method))
    )
    return result.scalar_one_or_none()


async def get_payment_by_booking(db: AsyncSession, booking_id: UUID) -> Payment | None:
    result = await db.execute(select(Payment).where(Payment.booking_id == booking_id))
    return result.scalar_one_or_none()


async def get_payment_by_intent(db: AsyncSession, payment_intent_id: str) -> Payment | None:
    result = await db.execute(select(Payment).where(Payment.payment_intent_id == payment_intent_id))
    return result.scalar_one_or_none()


async def list_payments_for_user(db: AsyncSession, user_id: UUID) -> list[Payment]:
    result = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())


def _apply_intent_to_payment(
    payment: Payment,
    *,
    request_id: str,
    merchant_order_id: str,
    payment_intent_id: str | None,
    client_secret: str | None,
    amount: Decimal,
    currency: str,
    status: str,
    user_id: UUID | None,
) -> None:
    payment.request_id = request_id
    payment.merchant_order_id = merchant_order_id
    payment.payment_intent_id = payment_intent_id
    payment.client_secret = client_secret
    payment.amount = amount
    payment.currency = currency
    payment.status = status
    if user_id is not None:
        payment.user_id = user_id


async def start_checkout(
    db: AsyncSession,
    *,
    booking_id: UUID,
    user_id: UUID | None,
    return_url: str | None = None,
) -> Payment:
    # Serialize concurrent start_checkout calls for the same booking so two
    # requests can't both create a Payment row and trigger uq_payment_booking_id.
    locked = await db.execute(
        select(Booking).where(Booking.id == booking_id).with_for_update()
    )
    if not locked.scalar_one_or_none():
        raise ValueError("booking_not_found")

    booking = await _load_booking_with_method(db, booking_id)
    if not booking:
        raise ValueError("booking_not_found")
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("booking_cancelled")
    if user_id is not None and booking.user_id is not None and booking.user_id != user_id:
        raise ValueError("forbidden")
    if not booking.session or not booking.session.method:
        raise ValueError("method_not_found")

    method: Method = booking.session.method
    amount: Decimal = Decimal(method.price)
    if amount <= 0:
        raise ValueError("invalid_amount")

    existing = await get_payment_by_booking(db, booking_id)
    if existing and existing.status == PaymentStatus.SUCCEEDED.value:
        raise ValueError("already_paid")
    if existing and existing.payment_intent_id and existing.status == PaymentStatus.PENDING.value:
        return existing

    request_id = uuid.uuid4().hex
    merchant_order_id = f"booking-{booking_id.hex[:24]}"

    intent = await create_payment_intent(
        request_id=request_id,
        merchant_order_id=merchant_order_id,
        amount=amount,
        currency=DEFAULT_CURRENCY,
        return_url=return_url,
        metadata={
            "booking_id": str(booking_id),
            "method_id": str(method.id),
            "method_name": method.name,
        },
    )

    payment_intent_id = intent.get("id")
    client_secret = intent.get("client_secret")
    intent_status = map_intent_status(intent.get("status", ""))
    effective_user_id = user_id or booking.user_id

    if existing:
        _apply_intent_to_payment(
            existing,
            request_id=request_id,
            merchant_order_id=merchant_order_id,
            payment_intent_id=payment_intent_id,
            client_secret=client_secret,
            amount=amount,
            currency=DEFAULT_CURRENCY,
            status=intent_status,
            user_id=effective_user_id,
        )
        await db.commit()
        await db.refresh(existing)
        return existing

    payment = Payment(
        booking_id=booking_id,
        user_id=effective_user_id,
        request_id=request_id,
        merchant_order_id=merchant_order_id,
        payment_intent_id=payment_intent_id,
        client_secret=client_secret,
        amount=amount,
        currency=DEFAULT_CURRENCY,
        status=intent_status,
    )
    db.add(payment)
    try:
        await db.commit()
    except IntegrityError:
        # A concurrent caller raced us and created the row first.
        # Roll back, fetch the existing row, and update it instead.
        await db.rollback()
        existing = await get_payment_by_booking(db, booking_id)
        if not existing:
            raise
        _apply_intent_to_payment(
            existing,
            request_id=request_id,
            merchant_order_id=merchant_order_id,
            payment_intent_id=payment_intent_id,
            client_secret=client_secret,
            amount=amount,
            currency=DEFAULT_CURRENCY,
            status=intent_status,
            user_id=effective_user_id,
        )
        await db.commit()
        await db.refresh(existing)
        return existing

    await db.refresh(payment)
    return payment


async def sync_payment_status(db: AsyncSession, payment: Payment) -> Payment:
    if not payment.payment_intent_id:
        return payment
    intent = await retrieve_payment_intent(payment.payment_intent_id)
    new_status = map_intent_status(intent.get("status", ""))
    if new_status != payment.status:
        payment.status = new_status
        await db.commit()
        await db.refresh(payment)
        await _cascade_booking_state(db, payment)
    await _send_invoice_if_needed(db, payment)
    return payment


async def cancel_payment(db: AsyncSession, payment: Payment) -> Payment:
    if payment.status not in (PaymentStatus.PENDING.value,):
        return payment
    if not payment.payment_intent_id:
        payment.status = PaymentStatus.CANCELLED.value
        await db.commit()
        await db.refresh(payment)
        await _cascade_booking_state(db, payment, user_cancelled=True)
    else:
        await cancel_payment_intent(payment.payment_intent_id, request_id=uuid.uuid4().hex)
        payment.status = PaymentStatus.CANCELLED.value
        await db.commit()
        await db.refresh(payment)
        await _cascade_booking_state(db, payment, user_cancelled=True)
    return payment


async def apply_webhook_event(db: AsyncSession, event: dict[str, Any]) -> Payment | None:
    name = event.get("name") or ""
    if not name.startswith("payment_intent."):
        return None
    data = event.get("data") or {}
    obj = data.get("object") or {}
    intent_id = obj.get("id")
    if not intent_id:
        return None
    payment = await get_payment_by_intent(db, intent_id)
    if not payment:
        return None
    new_status = map_intent_status(obj.get("status", ""))
    if new_status != payment.status:
        payment.status = new_status
        await _cascade_booking_state(db, payment)
        await db.commit()
        await db.refresh(payment)
    await _send_invoice_if_needed(db, payment)
    return payment


PENDING_PAYMENT_TTL_MINUTES = 15


def payment_expires_at(payment: Payment) -> datetime | None:
    """When this payment hold lapses (None for terminal/non-pending payments)."""
    if payment.status != PaymentStatus.PENDING.value or not payment.created_at:
        return None
    created = payment.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created + timedelta(minutes=PENDING_PAYMENT_TTL_MINUTES)


async def release_stale_pending_payments(
    db: AsyncSession, max_age_minutes: int = PENDING_PAYMENT_TTL_MINUTES
) -> int:
    """Cancel payments stuck in 'pending' for too long and release their bookings.

    Returns the number of payments released. Used to recover from abandoned
    checkouts (browser closed, user navigated away) so the held session slot
    becomes available again.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    result = await db.execute(
        select(Payment).where(
            Payment.status == PaymentStatus.PENDING.value,
            Payment.created_at < cutoff,
        )
    )
    stale = list(result.scalars().all())
    released = 0
    for payment in stale:
        if payment.payment_intent_id:
            try:
                await cancel_payment_intent(payment.payment_intent_id, request_id=uuid.uuid4().hex)
            except Exception:
                # Intent might already be in a non-cancellable state; mark locally either way.
                pass
        payment.status = PaymentStatus.CANCELLED.value
        await db.commit()
        await db.refresh(payment)
        await _cascade_booking_state(db, payment)
        released += 1
    return released


def serialize_payment(payment: Payment) -> dict[str, Any]:
    expires_at = payment_expires_at(payment)
    return {
        "id": str(payment.id),
        "booking_id": str(payment.booking_id),
        "user_id": str(payment.user_id) if payment.user_id else None,
        "payment_intent_id": payment.payment_intent_id,
        "amount": str(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "invoice_sent_at": payment.invoice_sent_at.isoformat() if payment.invoice_sent_at else None,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
    }