from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class CommitmentCreate(BaseModel):
    flow_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    notes: str | None = None


class CommitmentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class CommitmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    flow_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    notes: str | None = None
    created_at: datetime
