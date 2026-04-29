from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_access_token
from app.db.session import get_db
from app.models.models import User, UserRole
from app.schemas.payment import PaymentCheckoutRequest, PaymentCheckoutResponse, PaymentResponse
from app.services.airwallex import verify_webhook_signature
from app.services.payment import (
    apply_webhook_event,
    cancel_payment,
    get_payment_by_booking,
    get_payment_with_context_by_booking,
    list_all_payments,
    list_payments_for_user,
    payment_expires_at,
    serialize_payment,
    serialize_payment_with_context,
    start_checkout,
    sync_payment_status,
)


router = APIRouter(prefix="/api", tags=["payment"])

_bearer = HTTPBearer()


PAYMENT_ERRORS = {
    "booking_not_found": (status.HTTP_404_NOT_FOUND, "Booking not found."),
    "method_not_found": (status.HTTP_400_BAD_REQUEST, "Booking session has no associated method/price."),
    "booking_cancelled": (status.HTTP_409_CONFLICT, "Cannot pay for a cancelled booking."),
    "already_paid": (status.HTTP_409_CONFLICT, "Booking has already been paid."),
    "invalid_amount": (status.HTTP_400_BAD_REQUEST, "Invalid payment amount."),
    "forbidden": (status.HTTP_403_FORBIDDEN, "You do not have access to this booking."),
}


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> UUID:
    try:
        payload = verify_access_token(credentials.credentials)
        return UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")


async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = verify_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    user = await db.get(User, user_id)
    if not user or user.role not in (UserRole.STAFF, UserRole.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def _to_checkout_response(payment) -> dict:
    expires = payment_expires_at(payment)
    return {
        "payment_id": str(payment.id),
        "booking_id": str(payment.booking_id),
        "payment_intent_id": payment.payment_intent_id,
        "client_secret": payment.client_secret,
        "amount": payment.amount,
        "currency": payment.currency,
        "status": payment.status,
        "expires_at": expires.isoformat() if expires else None,
    }


@router.post("/payments/checkout", response_model=PaymentCheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_checkout(
    data: PaymentCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    try:
        payment = await start_checkout(
            db,
            booking_id=data.booking_id,
            user_id=user_id,
            return_url=data.return_url,
        )
    except ValueError as e:
        err = PAYMENT_ERRORS.get(str(e))
        if err is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        raise HTTPException(status_code=err[0], detail=err[1])
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return _to_checkout_response(payment)


@router.get("/payments/booking/{booking_id}", response_model=PaymentResponse)
async def get_booking_payment(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    payment = await get_payment_by_booking(db, booking_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.user_id and payment.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    try:
        payment = await sync_payment_status(db, payment)
    except RuntimeError:
        pass
    return serialize_payment(payment)


@router.get("/payments/me")
async def list_my_payments(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    payments = await list_payments_for_user(db, user_id)
    return {"results": [serialize_payment(p) for p in payments]}


@router.get("/admin/payments")
async def admin_list_payments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    payments = await list_all_payments(db)
    return {"results": [serialize_payment_with_context(p) for p in payments]}


@router.get("/admin/payments/booking/{booking_id}")
async def admin_get_booking_payment(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    payment = await get_payment_with_context_by_booking(db, booking_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return serialize_payment_with_context(payment)


@router.post("/payments/booking/{booking_id}/cancel", response_model=PaymentResponse)
async def cancel_booking_payment(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    payment = await get_payment_by_booking(db, booking_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.user_id and payment.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    try:
        payment = await cancel_payment(db, payment)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return serialize_payment(payment)


@router.post("/payments/webhook")
async def airwallex_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_timestamp: str | None = Header(default=None, alias="x-timestamp"),
    x_signature: str | None = Header(default=None, alias="x-signature"),
):
    raw = await request.body()
    if not verify_webhook_signature(x_timestamp or "", raw, x_signature or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")
    await apply_webhook_event(db, event)
    return {"received": True}