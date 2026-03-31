import os
import uuid
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
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


def ensure_marker_public_id_column():
    """Create/backfill markers.public_id when migration tooling is absent."""
    with engine.begin() as conn:
        has_table = conn.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'markers'
                )
                """
            )
        ).scalar()
        if not has_table:
            return

        has_public_id = conn.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'markers'
                      AND column_name = 'public_id'
                )
                """
            )
        ).scalar()

        if not has_public_id:
            conn.execute(text("ALTER TABLE markers ADD COLUMN public_id UUID"))

        null_rows = conn.execute(
            text("SELECT id FROM markers WHERE public_id IS NULL")
        ).fetchall()
        for row in null_rows:
            conn.execute(
                text("UPDATE markers SET public_id = :public_id WHERE id = :id"),
                {"public_id": uuid.uuid4(), "id": row.id},
            )

        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ix_markers_public_id
                ON markers (public_id)
                """
            )
        )
        conn.execute(text("ALTER TABLE markers ALTER COLUMN public_id SET NOT NULL"))
