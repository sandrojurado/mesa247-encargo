import os

from pydantic import BaseModel


def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


class Settings(BaseModel):
    app_name: str = "Mesa API"
    api_prefix: str = "/api"
    cors_origins: list[str] = get_cors_origins()
    auth_secret: str = os.getenv("AUTH_SECRET", "mesa247-dev-secret")
    auth_session_minutes: int = int(os.getenv("AUTH_SESSION_MINUTES", "720"))
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://mesa_user:mesa_password@127.0.0.1:3306/mesa247",
    )


settings = Settings()
