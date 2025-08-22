"""
Configuration settings for the Stock Management Application
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./stock_management.db"
    
    # API
    api_title: str = "ELLES 224 by HikIrfane - Stock Management API"
    api_version: str = "1.0.0"
    
    # CORS
    cors_origins: list = ["http://localhost:3000"]
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    
    class Config:
        env_file = ".env"

# Create settings instance
settings = Settings()

# Database URL from environment or default
DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)
