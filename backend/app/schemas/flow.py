from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from uuid import UUID
from datetime import timezone



class FlowCreate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = 1
    instructor: str | None = None

    @model_validator(mode="after")
    def validate_times(self):
        start = self.start_time.astimezone(timezone.utc)
        end = self.end_time.astimezone(timezone.utc)
        if end <= start:
            raise ValueError("end_time must be after start_time")
        return self


class FlowUpdate(BaseModel):
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
