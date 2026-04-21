from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Notion
    notion_token: str
    people_db_id: str
    studio_db_id: str

    # Database
    database_url: str = "postgresql+psycopg://postgres:dev@localhost:5432/booking"

    # App
    cors_origins: list[str] = ["http://localhost:5173"]
    cache_ttl_seconds: int = 300

settings = Settings()