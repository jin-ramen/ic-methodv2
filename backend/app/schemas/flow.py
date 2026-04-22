from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime


class FlowCreate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = 1
    instructor: str | None = None

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class FlowUpdate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    capacity: int | None = None
    instructor: str | None = None

    @model_validator(mode="after")
    def end_after_start(self):
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class FlowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    method_id: UUID | None = None
    method_name: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int
    spots_remaining: int = 0
    instructor: str | None = None
    created_at: datetime
