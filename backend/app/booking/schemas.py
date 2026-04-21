from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class BookingCreate(BaseModel):
    resource_id: UUID
    customer_email: EmailStr
    customer_name: str = Field(min_length=1, max_length=200)
    start_time: datetime  # must be timezone-aware
    end_time: datetime
    idempotency_key: str | None = Field(default=None, max_length=100)


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    resource_id: UUID
    customer_email: str
    customer_name: str
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime


class AvailabilitySlot(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilityResponse(BaseModel):
    resource_id: UUID
    slots: list[AvailabilitySlot]