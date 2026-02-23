from geoalchemy2 import Geography
from sqlalchemy import Column, DateTime, Integer, String, func

from .database import Base


class Marker(Base):
    __tablename__ = "markers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    animal = Column(String, nullable=False)
    note = Column(String)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
