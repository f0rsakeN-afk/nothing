from __future__ import annotations

from functools import lru_cache
from typing import Annotated
from pathlib import Path

from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "Auth Service"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str

    DATABASE_URL: str

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Security
    MAX_FAILED_ATTEMPTS: int = 5
    IP_BLOCK_THRESHOLD: int = 15
    IP_BLOCK_MINUTES: int = 60
    LOCKOUT_DURATION_MINUTES: int = 15

    SESSION_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7
    COOKIE_SECURE: bool = True
    COOKIE_DOMAIN: str | None = None
    
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "Auth Service"
    SMTP_STARTTLS: bool = True

    EMAIL_VERIFICATION_TTL_HOURS: int = 24
    PASSWORD_RESET_TTL_HOURS: int = 1

    FRONTEND_URL: str = "http://localhost:3000"

    ALLOWED_ORIGINS: list[str] | str = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
