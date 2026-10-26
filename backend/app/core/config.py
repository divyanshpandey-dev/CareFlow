from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "CareFlow"
    API_V1_STR: str = "/api/v1"
    
    # Cryptography & JWT
    SECRET_KEY: str = "careflow-super-secret-key-production-ready-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for dev/demo convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Platform & Demo Mode Configuration
    DEMO_MODE: bool = True

    # Database
    # Defaults to async SQLite for immediate local execution without external DB installation
    DATABASE_URL: str = "sqlite+aiosqlite:///./careflow.db"

    # Optional Redis
    REDIS_URL: str = ""

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # AI Configuration (100% Local Terminal Inference via Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_TIMEOUT: float = 30.0

    # Public URLs
    NEXT_PUBLIC_APP_URL: str = "http://localhost:3000"
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    # Super Admin Security Allowlist (comma-separated, normalized)
    SUPER_ADMIN_EMAILS: str = "edure6377@gmail.com,superadmin@careflow.com"

    # SMTP / Gmail Email Service for 2FA Verification Codes
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "CareFlow Security <no-reply@careflow.com>"
    SMTP_USE_TLS: bool = True

    @property
    def super_admin_email_list(self) -> List[str]:
        """Returns normalized (trimmed, lowercased) list of allowlisted super admin emails."""
        return [
            email.strip().lower()
            for email in self.SUPER_ADMIN_EMAILS.split(",")
            if email.strip()
        ]


settings = Settings()
