import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings
from app.utils.logger import get_logger
import os
import sys

logger = get_logger(__name__)

# Initialize Firebase with error handling
try:
    # Verify credentials file exists
    if not os.path.exists(settings.firebase_credentials_path):
        logger.error(f"Firebase credentials file not found: {settings.firebase_credentials_path}")
        logger.error("Application cannot start without valid Firebase credentials")
        raise FileNotFoundError(f"Firebase credentials file not found: {settings.firebase_credentials_path}")

    # Load credentials
    cred = credentials.Certificate(settings.firebase_credentials_path)

    # Initialize Firebase app
    firebase_admin.initialize_app(cred)
    logger.info("Firebase Admin SDK initialized successfully")

except FileNotFoundError as e:
    logger.critical(f"Firebase initialization failed: {e}")
    logger.critical("Please ensure FIREBASE_CREDENTIALS_PATH is set correctly in .env")
    sys.exit(1)

except ValueError as e:
    logger.critical(f"Invalid Firebase credentials file: {e}")
    logger.critical("Please check the Firebase credentials JSON file is valid")
    sys.exit(1)

except Exception as e:
    logger.critical(f"Firebase initialization failed with unexpected error: {e}", exc_info=True)
    sys.exit(1)


def verify_firebase_token(id_token: str):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid Firebase token: {e}")
        return None
    except auth.ExpiredIdTokenError as e:
        logger.warning(f"Expired Firebase token: {e}")
        return None
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}", exc_info=True)
        return None

def create_firebase_user(email: str, password: str):
    try:
        user = auth.create_user(email=email, password=password)
        return user.uid
    except Exception as e:
        raise Exception(f"Firebase user creation failed: {str(e)}")
