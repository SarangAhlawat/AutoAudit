import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AutoAudit"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Primary Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autoaudit"

    # Authentication & Security
    JWT_SECRET_KEY: str = "autoaudit-super-secret-enterprise-key-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    STORAGE_DIR: str = "./storage"
    UPLOAD_DIR: str = "./storage/uploads"
    POLICY_DOCS_DIR: str = "./storage/policies"
    PROCESSED_DIR: str = "./storage/processed"
    EXPORT_DIR: str = "./storage/exports"
    CHROMA_PERSIST_DIR: str = "./storage/chroma"

    # Risk Engine Defaults
    RISK_THRESHOLD_HIGH: int = 75
    RISK_THRESHOLD_MEDIUM: int = 45
    UNCERTAINTY_THRESHOLD: float = 0.60

    # Max upload size (25 MB)
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def ensure_directories(self) -> None:
        for path_str in [
            self.STORAGE_DIR,
            self.UPLOAD_DIR,
            self.POLICY_DOCS_DIR,
            self.PROCESSED_DIR,
            self.EXPORT_DIR,
            self.CHROMA_PERSIST_DIR,
        ]:
            Path(path_str).mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
