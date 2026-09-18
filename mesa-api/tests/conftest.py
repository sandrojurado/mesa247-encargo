from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import get_db
from app.db.base import Base
from app.main import app
from app.models import Location


@compiles(BIGINT, "sqlite")
def compile_bigint_for_sqlite(element: BIGINT, compiler, **kw) -> str:
    return "INTEGER"


@compiles(TINYINT, "sqlite")
def compile_tinyint_for_sqlite(element: TINYINT, compiler, **kw) -> str:
    return "INTEGER"


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as db:
        db.add_all(
            [
                Location(name="La Terraza Azul"),
                Location(name="Cuatro Vientos"),
                Location(name="Casa Mediterránea"),
            ]
        )
        db.commit()

    def override_get_db() -> Iterator[Session]:
        with TestingSessionLocal() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
