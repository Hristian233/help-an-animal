import os
from datetime import datetime, timezone

from app import models, schemas
from app.database import SessionLocal
from app.validation import validate_animal_image, validate_description
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2 import Geometry
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/markers", tags=["markers"])
BUCKET_NAME = "help-an-animal-inbox"


def _env_truthy(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "y", "on"}


# Default OFF unless explicitly enabled (tests/local should not call external APIs).
VALIDATE_IMAGES = _env_truthy("VALIDATE_IMAGES", default=False)
VALIDATE_DESCRIPTIONS = _env_truthy("VALIDATE_DESCRIPTIONS", default=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


get_db_dep = Depends(get_db)


@router.post("")
def create_marker(marker: schemas.MarkerCreate, db: Session = get_db_dep):
    # Validate image if provided
    if VALIDATE_IMAGES and marker.image_url:
        validate_animal_image(marker.image_url)

    # Validate description if provided
    if VALIDATE_DESCRIPTIONS:
        validate_description(marker.note, marker.animal)

    # Only create marker if validation passes
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
        "created_at": (db_marker.created_at.isoformat() if db_marker.created_at else None),
        "updated_at": (db_marker.updated_at.isoformat() if db_marker.updated_at else None),
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

    # Validate description if provided
    # If animal isn't supplied on PATCH, use the existing marker's animal.
    if VALIDATE_DESCRIPTIONS and payload.note is not None:
        validate_description(payload.note, payload.animal or db_marker.animal)

    if payload.animal is not None:
        db_marker.animal = payload.animal
    if payload.note is not None:
        db_marker.note = payload.note
    if payload.image_url is not None:
        db_marker.image_url = payload.image_url
    if payload.lat is not None and payload.lng is not None:
        db_marker.location = f"SRID=4326;POINT({payload.lng} {payload.lat})"

    db_marker.updated_at = datetime.now(timezone.utc)  # noqa: UP017
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
        "created_at": (db_marker.created_at.isoformat() if db_marker.created_at else None),
        "updated_at": (db_marker.updated_at.isoformat() if db_marker.updated_at else None),
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
        models.Marker.created_at,
        models.Marker.updated_at,
    ).all()

    return [
        {
            "id": r.id,
            "animal": r.animal,
            "note": r.note,
            "lat": r.lat,
            "lng": r.lng,
            "image_url": r.image_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]
