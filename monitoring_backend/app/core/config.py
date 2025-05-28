# app/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Default Project Name"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/db")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "a_very_default_secret_key_please_change_in_env") # Повинен бути в .env
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    class Config:
        case_sensitive = True

settings = Settings()