from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_uri: str
    firebase_credentials_path: str
    secret_key: str
    ollama_model: str = "deepseek-coder:1.3b-instruct"
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/api/calendar/oauth/callback"
    calendar_encryption_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
