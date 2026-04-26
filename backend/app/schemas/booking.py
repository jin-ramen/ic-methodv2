from pydantic import BaseModel, model_validator
from uuid import UUID
from datetime import datetime


class BookingCreate(BaseModel):
    session_id: UUID
    notes: str | None = None


class AdminBookingCreate(BaseModel):
    session_id: UUID
    notes: str | None = None
    # Registered user
    user_id: UUID | None = None
    # Guest fields
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None

    @model_validator(mode='after')
    def check_user_or_guest(self):
        has_user = self.user_id is not None
        has_guest = self.first_name and self.last_name and self.email
        if not has_user and not has_guest:
            raise ValueError('Provide either user_id or guest details (first_name, last_name, email).')
        return self


class BookingUpdate(BaseModel):
    notes: str | None = None


class BookingResponse(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    is_guest: bool
    role: str | None = None
    created_at: datetime
    session_start: datetime | None = None
    session_end: datetime | None = None
