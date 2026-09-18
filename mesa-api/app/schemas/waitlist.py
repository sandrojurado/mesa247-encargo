from pydantic import BaseModel, Field


class WaitlistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^\+?[0-9\s().-]{7,20}$")
    party_size: int = Field(ge=1, le=6)


class WaitlistEntry(WaitlistCreate):
    id: int
    position: int
    status: str = "waiting"
