from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID


class RecurrenceCreate(BaseModel):
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    interval: int = 1
    count: int | None = None
    until: datetime | None = None

    @model_validator(mode="after")
    def at_least_one_bound(self):
        if self.count is None and self.until is None:
            raise ValueError("count or until is required")
        if self.interval < 1:
            raise ValueError("interval must be >= 1")
        if self.count is not None and self.count < 1:
            raise ValueError("count must be >= 1")
        return self


class SessionCreate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = 1
    instructor: str | None = None
    recurrence: RecurrenceCreate | None = None

    @model_validator(mode="after")
    def validate_times(self):
        start = self.start_time.astimezone(timezone.utc)
        end = self.end_time.astimezone(timezone.utc)
        if end <= start:
            raise ValueError("end_time must be after start_time")
        return self


class SessionUpdate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    capacity: int | None = None
    instructor: str | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_time is not None and self.end_time is not None:
            start = self.start_time.astimezone(timezone.utc)
            end = self.end_time.astimezone(timezone.utc)
            if end <= start:
                raise ValueError("end_time must be after start_time")
        return self


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    method_id: UUID | None = None
    method_name: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int
    spots_remaining: int = 0
    instructor: str | None = None
    rule_id: UUID | None = None
    rule_index: int | None = None
    created_at: datetime
