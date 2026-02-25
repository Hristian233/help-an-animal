from pydantic import BaseModel


class MarkerCreate(BaseModel):
    animal: str
    note: str | None = None
    lat: float
    lng: float
    image_url: str | None = None


class MarkerUpdate(BaseModel):
    animal: str | None = None
    note: str | None = None
    lat: float | None = None
    lng: float | None = None
    image_url: str | None = None


class Marker(BaseModel):
    id: int
    animal: str
    note: str | None
    lat: float
    lng: float
    image_url: str | None

    class Config:
        from_attributes = True
