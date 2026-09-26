from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "FinTech API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://fintech:fintech@db:5432/fintech"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    # Listas separadas por comas
    cors_origins: str = "http://localhost:3500,http://localhost:5173"
    supported_currencies: str = "USD,EUR,MXN,COP,PEN,CLP,ARS"
    max_transaction_amount: Decimal = Decimal("1000000.00")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def currency_list(self) -> list[str]:
        return [c.strip().upper() for c in self.supported_currencies.split(",") if c.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
