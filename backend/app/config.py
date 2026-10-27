from __future__ import annotations

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Core Application Settings
    app_name: str = "Multi-AI Workspace Backend"
    environment: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"

    # Database & Redis
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/multi_ai_workspace"
    redis_url: str = "redis://localhost:6379/0"

    # Security (AES-GCM Encryption Key for API Vault)
    vault_master_key: str = "dev-only-replace-in-production-32-byte-base64-key="

    # Default Modes & AI Cloud Credentials
    default_connection_mode: str = "mock"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434/v1"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


# Global singleton for backend configuration
settings = Settings()
