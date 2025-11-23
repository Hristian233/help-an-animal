from sqlalchemy import Column, DateTime, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from datetime import datetime
import uuid
from .database import Base

class Marker(Base):
    __tablename__ = "markers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    animal = Column(String, nullable=False)
    note = Column(String)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    image_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())