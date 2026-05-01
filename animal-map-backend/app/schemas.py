from pydantic import BaseModel


class MarkerCreate(BaseModel):
    animal: str
    key_info: str | None = None
    lat: float
    lng: float
    image_url: str | None = None


class MarkerUpdate(BaseModel):
    animal: str | None = None
    key_info: str | None = None
    lat: float | None = None
    lng: float | None = None
    image_url: str | None = None


class Marker(BaseModel):
    id: str
    animal: str
    key_info: str | None
    lat: float
    lng: float
    image_url: str | None
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    type: str
    text: str | None = None
    image_url: str | None = None


class Report(BaseModel):
    id: int
    marker_id: int
    type: str
    text: str | None = None
    image_url: str | None = None
    created_at: str | None = None


class MarkerImage(BaseModel):
    id: int
    image_url: str
    created_at: str | None = None

    class Config:
        from_attributes = True


class MarkerImageList(BaseModel):
    items: list[MarkerImage]


class MarkerImageCreate(BaseModel):
    image_url: str
