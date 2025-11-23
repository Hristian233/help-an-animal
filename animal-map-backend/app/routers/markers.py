from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud, schemas, models
from sqlalchemy import func
from geoalchemy2 import Geometry
from sqlalchemy import cast

router = APIRouter(prefix="/markers", tags=["markers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_marker(marker: schemas.MarkerCreate, db: Session = Depends(get_db)):
    db_marker = models.Marker(
        animal=marker.animal,
        note=marker.note,
        location=f"SRID=4326;POINT({marker.lng} {marker.lat})",
        image_url=marker.image_url,
    )
    db.add(db_marker)
    db.commit()
    db.refresh(db_marker)

    # Return JSON-safe response
    return {
        "id": db_marker.id,
        "animal": db_marker.animal,
        "note": db_marker.note,
        "lat": marker.lat,
        "lng": marker.lng,
        "image_url": db_marker.image_url
    }



@router.get("/")
def get_markers(
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
    db: Session = Depends(get_db)
):
    markers = crud.get_markers_in_bounds(db, min_lat, max_lat, min_lng, max_lng)
    return markers

@router.get("/all", response_model=list[schemas.Marker])
def get_all_markers(db: Session = Depends(get_db)):
    rows = db.query(
        models.Marker.id,
        models.Marker.animal,
        models.Marker.note,
        func.ST_Y(cast(models.Marker.location, Geometry)).label("lat"),
        func.ST_X(cast(models.Marker.location, Geometry)).label("lng"), 
        models.Marker.image_url
    ).all()

    return [
        {
            "id": r.id,
            "animal": r.animal,
            "note": r.note,
            "lat": r.lat,
            "lng": r.lng,
            "image_url": r.image_url
        }
        for r in rows
    ]