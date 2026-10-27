import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings


class CredentialVault:
    """
    Encrypts and decrypts provider API credentials at rest.
    Never exposes plaintext keys to logs, disk artifacts, or API responses.
    """

    def __init__(self, master_key: Optional[str] = None) -> None:
        raw_key = (master_key or getattr(settings, "VAULT_MASTER_KEY", "")).strip()
        self._fernet = self._build_fernet(raw_key)

    @staticmethod
    def _build_fernet(raw_key: str) -> Fernet:
        # Derive a deterministic 32-byte URL-safe base64 key if a raw passphrase is provided
        try:
            if len(raw_key) == 44 and raw_key.endswith("="):
                return Fernet(raw_key.encode("utf-8"))
        except Exception:
            pass
        digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
        derived_key = base64.urlsafe_b64encode(digest)
        return Fernet(derived_key)

    def encrypt(self, plaintext_secret: str) -> bytes:
        if not plaintext_secret:
            return b""
        return self._fernet.encrypt(plaintext_secret.encode("utf-8"))

    def decrypt(self, encrypted_payload: bytes) -> Optional[str]:
        if not encrypted_payload:
            return None
        try:
            return self._fernet.decrypt(encrypted_payload).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("Failed to decrypt account credentials: invalid master key or corrupted ciphertext") from exc

    @staticmethod
    def fingerprint(plaintext_secret: Optional[str]) -> str:
        """Returns a safe, non-reversible preview (e.g., 'sk-a...9f2a' or 'mock-mode')."""
        if not plaintext_secret:
            return "no-key-configured"
        cleaned = plaintext_secret.strip()
        if len(cleaned) <= 8:
            return "***"
        digest = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:6]
        return f"{cleaned[:4]}...{cleaned[-4:]} (sha256:{digest})"


vault = CredentialVault()
