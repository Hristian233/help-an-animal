from fastapi import FastAPI
from app.routers import markers
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(markers.router)

@app.get("/")
def root():
    return {"message": "Animal Map API is running!"}
