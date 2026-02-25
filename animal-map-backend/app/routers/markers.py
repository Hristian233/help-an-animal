from app import models, schemas
from app.database import SessionLocal
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2 import Geometry
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

# from app.utils.image_validation import validate_uploaded_image


router = APIRouter(prefix="/markers", tags=["markers"])
BUCKET_NAME = "help-an-animal-inbox"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


get_db_dep = Depends(get_db)


@router.post("")
def create_marker(marker: schemas.MarkerCreate, db: Session = get_db_dep):
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
        "image_url": db_marker.image_url,
    }


@router.patch("/{marker_id}")
def update_marker(
    marker_id: int,
    payload: schemas.MarkerUpdate,
    db: Session = get_db_dep,
):
    db_marker = db.get(models.Marker, marker_id)
    if not db_marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    if payload.animal is not None:
        db_marker.animal = payload.animal
    if payload.note is not None:
        db_marker.note = payload.note
    if payload.image_url is not None:
        db_marker.image_url = payload.image_url
    if payload.lat is not None and payload.lng is not None:
        db_marker.location = f"SRID=4326;POINT({payload.lng} {payload.lat})"

    db.commit()
    db.refresh(db_marker)

    lat = payload.lat if payload.lat is not None else None
    lng = payload.lng if payload.lng is not None else None
    if lat is None or lng is None:
        row = (
            db.query(
                func.ST_Y(cast(models.Marker.location, Geometry)).label("lat"),
                func.ST_X(cast(models.Marker.location, Geometry)).label("lng"),
            )
            .filter(models.Marker.id == marker_id)
            .first()
        )
        lat = row.lat if row else 0.0
        lng = row.lng if row else 0.0

    return {
        "id": db_marker.id,
        "animal": db_marker.animal,
        "note": db_marker.note,
        "lat": lat or 0,
        "lng": lng or 0,
        "image_url": db_marker.image_url,
    }


@router.get("/all", response_model=list[schemas.Marker])
def get_all_markers(db: Session = get_db_dep):
    rows = db.query(
        models.Marker.id,
        models.Marker.animal,
        models.Marker.note,
        func.ST_Y(cast(models.Marker.location, Geometry)).label("lat"),
        func.ST_X(cast(models.Marker.location, Geometry)).label("lng"),
        models.Marker.image_url,
    ).all()

    return [
        {
            "id": r.id,
            "animal": r.animal,
            "note": r.note,
            "lat": r.lat,
            "lng": r.lng,
            "image_url": r.image_url,
        }
        for r in rows
    ]
