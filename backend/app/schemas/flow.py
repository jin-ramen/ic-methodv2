from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class FlowCreate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = 1
    instructor: str | None = None


class FlowUpdate(BaseModel):
    method_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    capacity: int | None = None
    instructor: str | None = None


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
