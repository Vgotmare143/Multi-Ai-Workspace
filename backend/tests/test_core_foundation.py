import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.exceptions import ProviderQuotaExhaustedError
from app.config import settings
from fastapi import APIRouter

# Inject a dummy route strictly for testing error handlers
test_router = APIRouter()

@test_router.get("/api/v1/test-error")
async def trigger_error():
    raise ProviderQuotaExhaustedError(provider="claude", reset_at="4:00 PM")

app.include_router(test_router)


@pytest.mark.asyncio
async def test_health_check_and_config():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["phase"] == "6"
    assert data["mode"] == settings.default_connection_mode


@pytest.mark.asyncio
async def test_workspace_exception_handler_returns_strict_json():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/test-error")
    
    # ProviderQuotaExhaustedError maps to 429
    assert response.status_code == 429
    data = response.json()
    
    assert data["error"] == "claude quota exhausted."
    assert data["details"]["error_code"] == "QUOTA_EXHAUSTED"
    assert data["details"]["provider"] == "claude"
    assert data["details"]["reset_at"] == "4:00 PM"
    assert data["path"] == "/api/v1/test-error"
