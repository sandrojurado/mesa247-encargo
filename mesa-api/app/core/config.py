import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Mesa API"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://mesa_user:mesa_password@127.0.0.1:3306/mesa247",
    )


settings = Settings()
