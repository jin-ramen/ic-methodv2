from pydantic import BaseModel, ConfigDict
from uuid import UUID


class MethodCreate(BaseModel):
    name: str
    price: float
    description: str | None = None


class MethodUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    description: str | None = None


class MethodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    price: float
    description: str | None = None
