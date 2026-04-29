from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class PaymentCheckoutRequest(BaseModel):
    booking_id: UUID
    return_url: str | None = None


class PaymentCheckoutResponse(BaseModel):
    payment_id: UUID
    booking_id: UUID
    payment_intent_id: str
    client_secret: str
    amount: Decimal
    currency: str
    status: str
    expires_at: datetime | None = None


class PaymentResponse(BaseModel):
    id: UUID
    booking_id: UUID
    user_id: UUID | None = None
    payment_intent_id: str | None = None
    amount: Decimal
    currency: str
    status: str
    expires_at: datetime | None = None
    invoice_sent_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
