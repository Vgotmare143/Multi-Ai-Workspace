from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.files import router as files_router
from app.api.v1.terminal import router as terminal_router

app = FastAPI(
    title="Multi-AI Development Workspace API",
    version="0.5.0",
    description="Local-First Multi-AI Orchestration & Project State Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspaces_router)
app.include_router(files_router)
app.include_router(terminal_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "phase": "5"}
