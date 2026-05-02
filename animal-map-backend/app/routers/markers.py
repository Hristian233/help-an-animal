import os
from datetime import datetime, timezone

from app import models, schemas
from app.database import SessionLocal
from app.validation import validate_animal_image, validate_description
from fastapi import APIRouter, Depends, HTTPException, Query
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
        validate_description(marker.key_info, marker.animal)

    # Only create marker if validation passes
    db_marker = models.Marker(
        animal=marker.animal,
        key_info=marker.key_info,
        location=f"SRID=4326;POINT({marker.lng} {marker.lat})",
        image_url=marker.image_url,
    )
    db.add(db_marker)
    db.commit()
    db.refresh(db_marker)

    # Return JSON-safe response
    return {
        "id": str(db_marker.public_id),
        "animal": db_marker.animal,
        "key_info": db_marker.key_info,
        "lat": marker.lat,
        "lng": marker.lng,
        "image_url": db_marker.image_url,
        "created_at": (db_marker.created_at.isoformat() if db_marker.created_at else None),
        "updated_at": (db_marker.updated_at.isoformat() if db_marker.updated_at else None),
    }


@router.patch("/{marker_id}")
def update_marker(
    marker_id: str,
    payload: schemas.MarkerUpdate,
    db: Session = get_db_dep,
):
    db_marker = db.query(models.Marker).filter(models.Marker.public_id == marker_id).first()
    if not db_marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    # Validate description if provided
    # If animal isn't supplied on PATCH, use the existing marker's animal.
    if VALIDATE_DESCRIPTIONS and payload.key_info is not None:
        validate_description(payload.key_info, payload.animal or db_marker.animal)

    if payload.animal is not None:
        db_marker.animal = payload.animal
    if payload.key_info is not None:
        db_marker.key_info = payload.key_info
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
            .filter(models.Marker.public_id == marker_id)
            .first()
        )
        lat = row.lat if row else 0.0
        lng = row.lng if row else 0.0

    return {
        "id": str(db_marker.public_id),
        "animal": db_marker.animal,
        "key_info": db_marker.key_info,
        "lat": lat or 0,
        "lng": lng or 0,
        "image_url": db_marker.image_url,
        "created_at": (db_marker.created_at.isoformat() if db_marker.created_at else None),
        "updated_at": (db_marker.updated_at.isoformat() if db_marker.updated_at else None),
    }


@router.get("/all", response_model=list[schemas.Marker])
def get_all_markers(db: Session = get_db_dep):
    rows = db.query(
        models.Marker.public_id,
        models.Marker.animal,
        models.Marker.key_info,
        func.ST_Y(cast(models.Marker.location, Geometry)).label("lat"),
        func.ST_X(cast(models.Marker.location, Geometry)).label("lng"),
        models.Marker.image_url,
        models.Marker.created_at,
        models.Marker.updated_at,
    ).all()

    return [
        {
            "id": str(r.public_id),
            "animal": r.animal,
            "key_info": r.key_info,
            "lat": r.lat,
            "lng": r.lng,
            "image_url": r.image_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.get("/{marker_id}/reports")
def get_marker_reports(
    marker_id: str,
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = None,
    db: Session = get_db_dep,
):
    marker = db.query(models.Marker).filter(models.Marker.public_id == marker_id).first()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    q = db.query(models.Report).filter(models.Report.marker_id == marker.id)

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid cursor timestamp") from exc
        q = q.filter(models.Report.created_at < cursor_dt)

    rows = (
        q.order_by(models.Report.created_at.desc(), models.Report.id.desc()).limit(limit + 1).all()
    )
    has_more = len(rows) > limit
    reports = rows[:limit]

    items = [
        {
            "id": r.id,
            "marker_id": r.marker_id,
            "type": r.type.value if hasattr(r.type, "value") else str(r.type),
            "text": r.text,
            "image_url": r.image_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]
    next_cursor = items[-1]["created_at"] if has_more and items else None
    return {"items": items, "next_cursor": next_cursor}


# Reports of these types contribute their image to the marker's gallery.
# Other report types (e.g. PHOTO) do not, and marker creation never does.
GALLERY_REPORT_TYPES = {
    models.ReportType.FEED,
    models.ReportType.WATER,
    models.ReportType.SEEN,
}


@router.get("/{marker_id}/images")
def get_marker_images(
    marker_id: str,
    limit: int | None = Query(default=None, ge=1, le=50),
    db: Session = get_db_dep,
):
    marker = db.query(models.Marker).filter(models.Marker.public_id == marker_id).first()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    base_q = db.query(models.MarkerImage).filter(models.MarkerImage.marker_id == marker.id)
    total = base_q.count()

    rows_q = base_q.order_by(
        models.MarkerImage.created_at.desc(), models.MarkerImage.id.desc()
    )
    if limit is not None:
        rows_q = rows_q.limit(limit)
    rows = rows_q.all()

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "image_url": r.image_url,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/{marker_id}/images")
def create_marker_image(
    marker_id: str,
    payload: schemas.MarkerImageCreate,
    db: Session = get_db_dep,
):
    marker = db.query(models.Marker).filter(models.Marker.public_id == marker_id).first()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    image = models.MarkerImage(marker_id=marker.id, image_url=payload.image_url)
    db.add(image)
    db.commit()
    db.refresh(image)

    return {
        "id": image.id,
        "image_url": image.image_url,
        "created_at": image.created_at.isoformat() if image.created_at else None,
    }


@router.post("/{marker_id}/reports")
def create_marker_report(marker_id: str, payload: schemas.ReportCreate, db: Session = get_db_dep):
    marker = db.query(models.Marker).filter(models.Marker.public_id == marker_id).first()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    try:
        report_type = models.ReportType(payload.type)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid report type. Allowed: FEED, WATER, SEEN, PHOTO",
        ) from exc

    report = models.Report(
        marker_id=marker.id,
        type=report_type,
        text=payload.text,
        image_url=payload.image_url,
    )
    db.add(report)

    # Only FEED/WATER/SEEN reports contribute images to the gallery.
    if payload.image_url and report_type in GALLERY_REPORT_TYPES:
        db.add(models.MarkerImage(marker_id=marker.id, image_url=payload.image_url))

    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "marker_id": report.marker_id,
        "type": report.type.value if hasattr(report.type, "value") else str(report.type),
        "text": report.text,
        "image_url": report.image_url,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
