from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class MarkerCreate(BaseModel):
    animal: str
    note: Optional[str] = None
    lat: float
    lng: float
    image_url: Optional[str] = None
    user_id: Optional[UUID] = None

class Marker(BaseModel):
    id: UUID
    animal: str
    note: Optional[str]
    lat: float
    lng: float
    image_url: Optional[str]
    user_id: Optional[UUID]

    class Config:
        orm_mode = True
