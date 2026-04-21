from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class FlowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    method_id: UUID | None = None
    method_name: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int
    instructor: str | None = None
    created_at: datetime
