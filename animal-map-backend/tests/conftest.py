import pytest
from app.database import Base, engine
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Tests run against a dedicated test database in CI/local.
    # Keep schema creation in tests (not in production app startup).
    Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)
