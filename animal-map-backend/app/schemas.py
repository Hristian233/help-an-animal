from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class MarkerCreate(BaseModel):
    animal: str
    note: Optional[str] = None
    lat: float
    lng: float
    image_url: Optional[str] = None

class Marker(BaseModel):
    id: int
    animal: str
    note: Optional[str]
    lat: float
    lng: float
    image_url: Optional[str]

    class Config:
        from_attributes = True
