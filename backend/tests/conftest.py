from pathlib import Path
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

TEST_DB_PATH = Path("./storage/test_autoaudit.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.resolve()}"

from backend.app.core.config import settings
settings.DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH.resolve()}"

import backend.app.db.session as db_module
from backend.app.models.base import Base
from backend.app.main import app

# Re-initialize engine with test path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

test_engine = create_async_engine(
    f"sqlite+aiosqlite:///{TEST_DB_PATH.resolve()}",
    connect_args={"check_same_thread": False},
    future=True,
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

db_module.engine = test_engine
db_module.AsyncSessionLocal = TestingSessionLocal


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
