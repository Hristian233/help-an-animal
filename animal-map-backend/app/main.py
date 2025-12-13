from fastapi import FastAPI
from app.routers import markers, upload
from app.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(upload.router, prefix="/files", tags=["files"])

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markers.router)

@app.get("/")
def root():
    return {"message": "Animal Map API is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}

