from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from datetime import datetime
import uuid
from .database import Base

class Marker(Base):
    __tablename__ = "markers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    animal = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    image_url = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    user_id = Column(UUID(as_uuid=True), nullable=True)
