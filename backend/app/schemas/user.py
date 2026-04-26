from pydantic import BaseModel, EmailStr, ConfigDict
from pydantic_extra_types.phone_numbers import PhoneNumber
from uuid import UUID
from app.models.models import UserRole

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole = UserRole.MEMBER
    phone: PhoneNumber | None = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel): 
    identifier: str
    password: str

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: PhoneNumber | None = None

class UserRead(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
