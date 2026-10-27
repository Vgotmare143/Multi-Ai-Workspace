from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.files import router as files_router
from app.api.v1.terminal import router as terminal_router
from app.config import settings
from app.core.logger import logger
from app.core.exceptions import WorkspaceBaseException, workspace_exception_handler


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.6.0",
        description="Local-First Multi-AI Orchestration & Project State Engine",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    app.add_exception_handler(WorkspaceBaseException, workspace_exception_handler)

    # Request Logging Middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000
        
        # Skip noisy logging for high-frequency polling/health routes
        if request.url.path not in ["/health", "/api/v1/terminal/ws"]:
            logger.info(
                f"{request.method} {request.url.path}",
                extra={
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time, 2)
                }
            )
        return response

    # Routers
    app.include_router(workspaces_router)
    app.include_router(files_router)
    app.include_router(terminal_router)

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {
            "status": "healthy",
            "phase": "6",
            "environment": settings.environment,
            "mode": settings.default_connection_mode
        }

    return app

app = create_app()
