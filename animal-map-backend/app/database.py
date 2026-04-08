import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

IS_CLOUD_RUN = bool(os.getenv("K_SERVICE"))

# Load local env file only when running locally
if not IS_CLOUD_RUN:
    load_dotenv(".env.local")

DATABASE_URL = os.getenv("DATABASE_URL")

user = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")
host = os.getenv("DB_HOST")
port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME", "animal_map")
instance = os.getenv("INSTANCE_CONNECTION_NAME")

safe_password = quote_plus(password) if password else ""

if IS_CLOUD_RUN:
    if not all([user, password, instance, db_name]):
        raise RuntimeError("Missing DB env vars in Cloud Run")

    DATABASE_URL = (
        f"postgresql+psycopg2://{user}:{safe_password}@/{db_name}?host=/cloudsql/{instance}"
    )
else:
    if all([user, password, host, port]):
        DATABASE_URL = f"postgresql+psycopg2://{user}:{safe_password}@{host}:{port}/{db_name}"
    elif not DATABASE_URL:
        raise RuntimeError("Missing DB env vars locally and no DATABASE_URL provided")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
