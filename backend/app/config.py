from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    admin_email: str = ""
    # Raw service-account JSON, or a path to the JSON file.
    firebase_service_account_json: str = ""
    allowed_origins: str = "http://localhost:5173"
    # When true, upstream error details are returned to the client. Keep false in production.
    debug: bool = False

    @property
    def clean_groq_key(self) -> str:
        # Tolerates stray spaces/quotes pasted into .env
        return self.groq_api_key.strip().strip("\"'").strip()

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
