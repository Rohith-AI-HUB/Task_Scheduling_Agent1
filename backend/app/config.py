from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationError
import sys
import os

class Settings(BaseSettings):
    # Required settings - must be provided
    mongodb_uri: str
    firebase_credentials_path: str
    secret_key: str

    # Optional settings with defaults
    ollama_model: str = "deepseek-coder:1.3b-instruct"
    ollama_chat_model: str = "llama3.2:3b"  # Model for chat/conversation
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/api/calendar/oauth/callback"
    calendar_encryption_key: str = ""

    # AI Assistant settings
    tesseract_path: str = ""  # Path to Tesseract OCR executable (auto-detected on Windows)
    ai_context_cache_ttl: int = 300  # Cache TTL in seconds (5 minutes)
    ai_max_document_size: int = 10 * 1024 * 1024  # 10MB max document size
    ai_max_context_length: int = 8000  # Max characters for AI context

    @field_validator('mongodb_uri')
    @classmethod
    def validate_mongodb_uri(cls, v):
        if not v or not v.strip():
            raise ValueError('MONGODB_URI cannot be empty')
        if not v.startswith(('mongodb://', 'mongodb+srv://')):
            raise ValueError('MONGODB_URI must start with mongodb:// or mongodb+srv://')
        return v.strip()

    @field_validator('firebase_credentials_path')
    @classmethod
    def validate_firebase_path(cls, v):
        if not v or not v.strip():
            raise ValueError('FIREBASE_CREDENTIALS_PATH cannot be empty')
        # Path existence will be checked in firebase_service.py
        return v.strip()

    @field_validator('secret_key')
    @classmethod
    def validate_secret_key(cls, v):
        if not v or not v.strip():
            raise ValueError('SECRET_KEY cannot be empty')
        if len(v.strip()) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters for security')
        return v.strip()

    @field_validator('calendar_encryption_key')
    @classmethod
    def validate_encryption_key(cls, v):
        # Only validate if provided (optional setting)
        if v and len(v.strip()) < 32:
            raise ValueError('CALENDAR_ENCRYPTION_KEY must be at least 32 characters if provided')
        return v.strip() if v else ""

    class Config:
        env_file = ".env"


# Initialize settings with proper error handling
try:
    settings = Settings()
    print("[OK] Configuration loaded successfully")

except ValidationError as e:
    print("\n" + "="*60)
    print("[ERROR] CONFIGURATION ERROR - Missing or invalid environment variables")
    print("="*60)

    for error in e.errors():
        field = error['loc'][0]
        msg = error['msg']
        print(f"\n  Field: {field}")
        print(f"  Error: {msg}")

    print("\n" + "="*60)
    print("Please check your .env file and ensure all required variables are set.")
    print("Required variables:")
    print("  - MONGODB_URI (e.g., mongodb://localhost:27017/taskdb)")
    print("  - FIREBASE_CREDENTIALS_PATH (path to Firebase JSON file)")
    print("  - SECRET_KEY (minimum 32 characters)")
    print("="*60 + "\n")

    sys.exit(1)

except Exception as e:
    print(f"\n[ERROR] Failed to load configuration: {e}")
    sys.exit(1)
