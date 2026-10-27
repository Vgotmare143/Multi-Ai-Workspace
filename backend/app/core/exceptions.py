from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import Request
from fastapi.responses import JSONResponse


class WorkspaceBaseException(Exception):
    """Base exception for all domain-specific errors in the Workspace."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ProviderConfigurationError(WorkspaceBaseException):
    """Raised when an AI provider is missing API keys or invalid settings."""
    def __init__(self, message: str):
        super().__init__(message, status_code=401, details={"error_code": "AUTH_INVALID"})


class ProviderQuotaExhaustedError(WorkspaceBaseException):
    """Raised when a provider hits an absolute billing limit or usage cap."""
    def __init__(self, provider: str, reset_at: Optional[str] = None):
        super().__init__(
            message=f"{provider} quota exhausted.",
            status_code=429,
            details={"error_code": "QUOTA_EXHAUSTED", "provider": provider, "reset_at": reset_at},
        )


class ProviderRateLimitError(WorkspaceBaseException):
    """Raised on transient TPM/RPM burst limits."""
    def __init__(self, provider: str, retry_after_seconds: int = 5):
        super().__init__(
            message=f"{provider} rate limit exceeded. Retry in {retry_after_seconds}s.",
            status_code=429,
            details={"error_code": "RATE_LIMITED", "retry_after": retry_after_seconds},
        )


class ContextLengthExceededError(WorkspaceBaseException):
    """Raised when the compiled prompt exceeds the model's maximum window."""
    def __init__(self, requested: int, maximum: int):
        super().__init__(
            message=f"Context budget exceeded: {requested} > {maximum} tokens.",
            status_code=400,
            details={"error_code": "CONTEXT_LENGTH_EXCEEDED", "requested": requested, "maximum": maximum},
        )


class SecurityGuardError(WorkspaceBaseException):
    """Raised when the system blocks a destructive shell command or secret leakage."""
    def __init__(self, message: str):
        super().__init__(message, status_code=403, details={"error_code": "SECURITY_BLOCK"})


async def workspace_exception_handler(request: Request, exc: WorkspaceBaseException) -> JSONResponse:
    """FastAPI Exception Handler for custom domain exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "path": request.url.path,
        },
    )
