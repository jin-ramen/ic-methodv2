from datetime import datetime, date, time
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

class BookingListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    resource_id: UUID
    resource_name: str
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

class AvailabilityRuleCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0=Monday
    start_time: time
    end_time: time


class AvailabilityRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    resource_id: UUID
    day_of_week: int
    start_time: time
    end_time: time

class ResourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    capacity: int = Field(default=1, ge=1)
    duration_minutes: int = Field(default=30, gt=0)
    buffer_minutes: int = Field(default=0, ge=0)


class ResourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    capacity: int | None = Field(default=None, ge=1)
    duration_minutes: int | None = Field(default=None, gt=0)
    buffer_minutes: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ResourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    capacity: int
    duration_minutes: int
    buffer_minutes: int
    is_active: bool


class AdminBookingCreate(BaseModel):
    resource_id: UUID
    customer_email: EmailStr
    customer_name: str = Field(min_length=1, max_length=200)
    start_time: datetime
    end_time: datetime
    allow_override: bool = False