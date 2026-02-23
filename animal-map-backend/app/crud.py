from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from app import models, schemas


def create_marker(db: Session, marker: schemas.MarkerCreate):
    point = WKTElement(f"POINT({marker.lng} {marker.lat})", srid=4326)

    db_marker = models.Marker(
        animal=marker.animal, note=marker.note, location=point, image_url=marker.image_url
    )

    db.add(db_marker)
    db.commit()
    db.refresh(db_marker)
    return db_marker


def get_markers_in_bounds(db: Session, min_lat, max_lat, min_lng, max_lng):
    return db.query(models.Marker).filter(
        models.Marker.location.ST_Within(
            f"POLYGON(({min_lng} {min_lat}, {min_lng} {max_lat}, {max_lng} {max_lat}, {max_lng} {min_lat}, {min_lng} {min_lat}))"
        )
    )
