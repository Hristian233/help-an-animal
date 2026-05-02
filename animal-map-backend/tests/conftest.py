import os

# Disable rate limiting during tests. Must be set before importing the app
# because `app.rate_limit` reads this flag at module load time.
os.environ.setdefault("TESTING", "1")

import pytest  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Tests run against a dedicated test database in CI/local.
    # Keep schema creation in tests (not in production app startup).
    Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)
