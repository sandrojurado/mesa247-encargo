from typing import Optional

from pydantic import BaseModel, Field


class LocationRead(BaseModel):
    id: int
    name: str


class WaitlistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^\+?[0-9\s().-]{7,20}$")
    party_size: int = Field(ge=1, le=12)


class WaitlistEntry(WaitlistCreate):
    id: int
    position: int
    status: str = "waiting"


class QueueCreate(WaitlistCreate):
    location_id: int = Field(gt=0)


class QueueRead(BaseModel):
    id: int
    location_id: int
    location_name: str
    customer_name: str
    phone: str
    party_size: int
    position: int
    status: str
    elapsed_seconds: int


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1)


class AuthUser(BaseModel):
    id: int
    username: str
    role: str
    location_id: Optional[int] = None
    location_name: Optional[str] = None


class AuthSession(BaseModel):
    token: str
    user: AuthUser


class HostQueueEntry(BaseModel):
    id: int
    location_id: int
    location_name: str
    customer_name: str
    phone: str
    party_size: int
    position: int
    status: str
    sort_order: int
    elapsed_seconds: int
    called_elapsed_seconds: Optional[int] = None
    is_frequent: bool


class QueueStatusUpdate(BaseModel):
    status: str


class QueueReorderRequest(BaseModel):
    queue_ids: list[int]
