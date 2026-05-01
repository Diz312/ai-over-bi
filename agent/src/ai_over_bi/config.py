import os
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to the SQLite database — always relative to this file's package root
_DB_DEFAULT = Path(__file__).parent / "data" / "store_data.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Required
    ANTHROPIC_API_KEY: str

    @model_validator(mode="after")
    def export_to_environ(self) -> "Settings":
        """LiteLLM reads keys directly from os.environ."""
        os.environ.setdefault("ANTHROPIC_API_KEY", self.ANTHROPIC_API_KEY)
        return self

    # Models
    ORCHESTRATOR_MODEL: str = "claude-sonnet-4-6"
    ANALYST_MODEL: str = "claude-sonnet-4-6"
    QUERY_MODEL: str = "claude-haiku-4-5-20251001"

    # Database
    DB_PATH: str = str(_DB_DEFAULT)

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    SESSION_TIMEOUT_SECONDS: int = 3600


settings = Settings()
