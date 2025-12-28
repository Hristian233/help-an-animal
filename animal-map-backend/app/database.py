import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Environment Detection
# If K_SERVICE is NOT set, we are running locally.
if not os.getenv("K_SERVICE"):
    load_dotenv(".env.local")
# If K_SERVICE IS set, we skip load_dotenv() because Cloud Run 
# injects variables directly into the environment.

# 2. Variable Retrieval
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found. Ensure it is set in .env.local (local) or Cloud Run Vars (prod).")

# 3. Engine Setup
# 'pool_pre_ping' is highly recommended for Cloud Run to handle 
# database connections that might have timed out.
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True if you want to see SQL logs in your terminal
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True
)

# 4. Session and Base setup
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 5. Dependency (Helper for FastAPI or scripts)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()