import enum
import uuid

from geoalchemy2 import Geography
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class Marker(Base):
    __tablename__ = "markers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    public_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True,
        default=uuid.uuid4,
    )
    animal = Column(String, nullable=False)
    key_info = Column(String)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ReportType(enum.StrEnum):
    FEED = "FEED"
    WATER = "WATER"
    SEEN = "SEEN"
    PHOTO = "PHOTO"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marker_id = Column(Integer, ForeignKey("markers.id"), nullable=False, index=True)
    type = Column(Enum(ReportType, name="report_type", native_enum=False), nullable=False)
    text = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MarkerImage(Base):
    __tablename__ = "marker_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marker_id = Column(
        Integer,
        ForeignKey("markers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
