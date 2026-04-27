from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # database 
    notion_token: Optional[str] = None
    people_db_id: Optional[str] = None
    studio_db_id: Optional[str] = None
    database_url: Optional[str] = None

    # security
    jwt_secret: str
    algorithm: str = "HS256"
    access_token_expire_days: int = 30

    # App
    cors_origins: list[str] = ["http://localhost:5173"]
    cache_ttl_seconds: int = 300
    app_timezone: str = Field(default="Australia/Melbourne", validation_alias="TZ")

    # Mail
    mail_username: str
    mail_password: str
    mail_from: str
    mail_server: str
    mail_port: int = 587
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

settings = Settings()