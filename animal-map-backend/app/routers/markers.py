from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud, schemas

router = APIRouter(prefix="/markers", tags=["markers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.Marker)
def create_marker(marker: schemas.MarkerCreate, db: Session = Depends(get_db)):
    return crud.create_marker(db, marker)


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
