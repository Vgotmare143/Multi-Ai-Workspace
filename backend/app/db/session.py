from __future__ import annotations

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Create Async Engine
engine = create_async_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative Base"""
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI route injection."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
