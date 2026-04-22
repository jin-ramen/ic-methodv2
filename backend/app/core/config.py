from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    notion_token: Optional[str] = None
    people_db_id: Optional[str] = None
    studio_db_id: Optional[str] = None
    database_url: Optional[str] = None

    # App
    cors_origins: list[str] = ["http://localhost:5173"]
    cache_ttl_seconds: int = 300

settings = Settings()