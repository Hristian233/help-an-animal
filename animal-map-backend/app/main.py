from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.rate_limit import RateLimitMiddleware
from app.routers import markers, upload

# In production, schema changes are managed outside runtime startup.

app = FastAPI()

app.include_router(upload.router, prefix="/files", tags=["files"])

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://animal-map-95a3a.web.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(markers.router)


@app.get("/")
def root():
    return {"message": "Animal Map API is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}
