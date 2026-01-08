"""
Google Calendar Integration Service

Handles OAuth 2.0 authentication, bidirectional sync between tasks/study blocks
and Google Calendar events, conflict detection and resolution.
"""

import hashlib
import json
import base64
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from bson import ObjectId

from app.config import settings
from app.db_config import (
    calendar_sync_collection,
    calendar_event_mappings_collection,
    tasks_collection,
    study_plans_collection
)

# Encryption for storing tokens securely
ENCRYPTION_KEY = settings.calendar_encryption_key.encode() if settings.calendar_encryption_key else Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

# Google Calendar API scopes
# Note: Google may automatically add OpenID Connect scopes (openid, userinfo.profile, userinfo.email)
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
]

# OAuth configuration
CLIENT_CONFIG = {
    "web": {
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [settings.google_oauth_redirect_uri]
    }
}


# ==================== ENCRYPTION/DECRYPTION ====================

def encrypt_token(token: str) -> str:
    """Encrypt a token using Fernet encryption."""
    return cipher_suite.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt an encrypted token."""
    return cipher_suite.decrypt(encrypted_token.encode()).decode()


# ==================== OAUTH AUTHENTICATION ====================

def get_oauth_authorization_url(user_id: str) -> Dict:
    """
    Generate OAuth 2.0 authorization URL for user to grant calendar access.

    Args:
        user_id: MongoDB user ID

    Returns:
        dict with 'url' and 'state' for OAuth flow
    """
    # Encode user_id in state parameter for callback
    state_data = json.dumps({"user_id": user_id, "timestamp": datetime.utcnow().isoformat()})
    encoded_state = base64.urlsafe_b64encode(state_data.encode()).decode()

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=settings.google_oauth_redirect_uri,
        state=encoded_state  # Use our custom state with user_id
    )

    # Generate authorization URL with state parameter for CSRF protection
    authorization_url, state = flow.authorization_url(
        access_type='offline',  # Get refresh token
        include_granted_scopes='true',
        prompt='consent'  # Force consent to get refresh token
    )

    return {
        "url": authorization_url,
        "state": state
    }


def exchange_code_for_tokens(code: str, user_id: str) -> Dict:
    """
    Exchange authorization code for access and refresh tokens.

    Args:
        code: Authorization code from OAuth callback
        user_id: MongoDB user ID

    Returns:
        dict with success status and message
    """
    try:
        # Create flow without strict scope validation
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=settings.google_oauth_redirect_uri
        )

        # Exchange code for credentials
        # Note: Google may return additional scopes (OpenID Connect), which is expected
        try:
            flow.fetch_token(code=code)
        except Exception as token_error:
            # If there's a scope mismatch, try manual token exchange
            print(f"Token fetch with standard flow failed: {token_error}")
            print(f"Attempting manual token exchange...")

            # Manually exchange the authorization code
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                'code': code,
                'client_id': CLIENT_CONFIG['web']['client_id'],
                'client_secret': CLIENT_CONFIG['web']['client_secret'],
                'redirect_uri': settings.google_oauth_redirect_uri,
                'grant_type': 'authorization_code'
            }
            response = requests.post(token_url, data=data)
            token_data = response.json()

            if 'error' in token_data:
                raise Exception(f"Token exchange failed: {token_data.get('error_description', token_data['error'])}")

            # Create credentials from token response
            credentials = Credentials(
                token=token_data['access_token'],
                refresh_token=token_data.get('refresh_token'),
                token_uri=token_url,
                client_id=CLIENT_CONFIG['web']['client_id'],
                client_secret=CLIENT_CONFIG['web']['client_secret'],
                scopes=token_data.get('scope', '').split()
            )
            flow.credentials = credentials

        credentials = flow.credentials

        # Encrypt tokens before storing
        encrypted_credentials = {
            "access_token": encrypt_token(credentials.token),
            "refresh_token": encrypt_token(credentials.refresh_token) if credentials.refresh_token else None,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes),
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }

        # Get primary calendar ID
        calendar_service = build('calendar', 'v3', credentials=credentials)
        calendar = calendar_service.calendars().get(calendarId='primary').execute()

        # Store in database
        sync_doc = {
            "user_id": user_id,
            "google_calendar_id": calendar['id'],
            "google_credentials": encrypted_credentials,
            "sync_enabled": True,
            "sync_preferences": {
                "sync_tasks": True,
                "sync_study_plans": True,
                "sync_direction": "bidirectional",
                "auto_sync_interval": 15  # minutes
            },
            "last_sync_at": None,
            "last_sync_token": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        calendar_sync_collection.update_one(
            {"user_id": user_id},
            {"$set": sync_doc},
            upsert=True
        )

        return {
            "success": True,
            "message": "Google Calendar connected successfully",
            "calendar_id": calendar['id']
        }

    except Exception as e:
        print(f"Error exchanging code for tokens: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to connect calendar: {str(e)}"
        }


def refresh_access_token(user_id: str) -> Optional[str]:
    """
    Refresh expired access token using refresh token.

    Args:
        user_id: MongoDB user ID

    Returns:
        New access token or None if refresh fails
    """
    try:
        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        if not sync_doc:
            return None

        creds_data = sync_doc["google_credentials"]

        # Decrypt tokens
        credentials = Credentials(
            token=decrypt_token(creds_data["access_token"]),
            refresh_token=decrypt_token(creds_data["refresh_token"]) if creds_data["refresh_token"] else None,
            token_uri=creds_data["token_uri"],
            client_id=creds_data["client_id"],
            client_secret=creds_data["client_secret"],
            scopes=creds_data["scopes"]
        )

        # Refresh the token
        if credentials.expired and credentials.refresh_token:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())

            # Update stored credentials with new access token
            creds_data["access_token"] = encrypt_token(credentials.token)
            creds_data["expiry"] = credentials.expiry.isoformat() if credentials.expiry else None

            calendar_sync_collection.update_one(
                {"user_id": user_id},
                {"$set": {
                    "google_credentials": creds_data,
                    "updated_at": datetime.utcnow()
                }}
            )

            return credentials.token

        return decrypt_token(creds_data["access_token"])

    except Exception as e:
        print(f"Error refreshing token: {str(e)}")
        return None


def disconnect_calendar(user_id: str) -> bool:
    """
    Disconnect Google Calendar and remove all sync data.

    Args:
        user_id: MongoDB user ID

    Returns:
        True if successful
    """
    try:
        # Remove sync config
        calendar_sync_collection.delete_one({"user_id": user_id})

        # Remove all event mappings
        calendar_event_mappings_collection.delete_many({"user_id": user_id})

        return True
    except Exception as e:
        print(f"Error disconnecting calendar: {str(e)}")
        return False


def get_calendar_client(user_id: str):
    """
    Get authenticated Google Calendar API client.

    Args:
        user_id: MongoDB user ID

    Returns:
        Google Calendar API service object or None
    """
    try:
        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        if not sync_doc:
            return None

        creds_data = sync_doc["google_credentials"]

        # Decrypt and create credentials
        credentials = Credentials(
            token=decrypt_token(creds_data["access_token"]),
            refresh_token=decrypt_token(creds_data["refresh_token"]) if creds_data["refresh_token"] else None,
            token_uri=creds_data["token_uri"],
            client_id=creds_data["client_id"],
            client_secret=creds_data["client_secret"],
            scopes=creds_data["scopes"]
        )

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            refresh_access_token(user_id)

        return build('calendar', 'v3', credentials=credentials)

    except Exception as e:
        print(f"Error getting calendar client: {str(e)}")
        return None


def is_sync_enabled(user_id: str) -> bool:
    """Check if calendar sync is enabled for user."""
    sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
    return sync_doc and sync_doc.get("sync_enabled", False)


# ==================== EVENT MAPPING ====================

def get_priority_color(priority: str) -> str:
    """Map task priority to Google Calendar color ID."""
    color_map = {
        "low": "2",      # Sage green
        "medium": "5",   # Yellow
        "high": "6",     # Orange
        "urgent": "11"   # Red
    }
    return color_map.get(priority, "5")


def get_session_color(session_type: str) -> str:
    """Map study session type to Google Calendar color ID."""
    color_map = {
        "pomodoro": "11",      # Red (tomato)
        "deep_work": "9",      # Blue
        "short_burst": "10"    # Green
    }
    return color_map.get(session_type, "9")


def get_session_emoji(session_type: str) -> str:
    """Get emoji for study session type."""
    emoji_map = {
        "pomodoro": "🍅",
        "deep_work": "🧠",
        "short_burst": "⚡"
    }
    return emoji_map.get(session_type, "📚")


def task_to_calendar_event(task: Dict) -> Dict:
    """
    Convert task document to Google Calendar event format.

    Args:
        task: Task document from MongoDB

    Returns:
        Google Calendar event dict
    """
    # Calculate event end time based on estimated hours
    deadline = task.get("deadline")
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))

    estimated_hours = task.get("estimated_hours", 1)
    end_time = deadline + timedelta(hours=estimated_hours)

    event = {
        "summary": task.get("title", "Untitled Task"),
        "description": f"{task.get('description', '')}\n\n[Task ID: {task.get('id', task.get('_id'))}]",
        "start": {
            "dateTime": deadline.isoformat(),
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": end_time.isoformat(),
            "timeZone": "UTC"
        },
        "colorId": get_priority_color(task.get("priority", "medium")),
        "extendedProperties": {
            "private": {
                "task_id": str(task.get("id", task.get("_id"))),
                "entity_type": "task",
                "complexity_score": str(task.get("complexity_score", 5)),
                "priority": task.get("priority", "medium")
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 24 * 60},  # 1 day before
                {"method": "popup", "minutes": 60}         # 1 hour before
            ]
        }
    }

    return event


def study_block_to_calendar_event(block: Dict, date: str, user_id: str) -> Dict:
    """
    Convert study block to Google Calendar event format.

    Args:
        block: Study block dict from study plan
        date: Date string (YYYY-MM-DD)
        user_id: MongoDB user ID

    Returns:
        Google Calendar event dict
    """
    session_type = block.get("session_type", "pomodoro")
    task_title = block.get("task_title", "Study Session")

    # Get task details if task_id exists
    task_id = block.get("task_id")
    priority = "medium"
    complexity = block.get("complexity", 5)

    if task_id:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if task:
            priority = task.get("priority", "medium")
            complexity = task.get("complexity_score", 5)

    event = {
        "summary": f"{get_session_emoji(session_type)} {task_title}",
        "description": f"Study Session\nType: {session_type}\nComplexity: {complexity}/10\nPriority: {priority}",
        "start": {
            "dateTime": f"{date}T{block.get('start_time')}:00",
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": f"{date}T{block.get('end_time')}:00",
            "timeZone": "UTC"
        },
        "colorId": get_session_color(session_type),
        "extendedProperties": {
            "private": {
                "study_block_id": block.get("id", str(ObjectId())),
                "entity_type": "study_block",
                "session_type": session_type,
                "task_id": task_id if task_id else ""
            }
        },
        "transparency": "opaque",  # Blocks time
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 5}  # 5 min before
            ]
        }
    }

    return event


def calculate_version_hash(entity: Dict) -> str:
    """Calculate MD5 hash of entity for change detection."""
    # Extract key fields for hashing
    if entity.get("entity_type") == "task":
        key_fields = {
            "title": entity.get("title", ""),
            "deadline": str(entity.get("deadline", "")),
            "priority": entity.get("priority", ""),
            "status": entity.get("status", "")
        }
    else:  # study_block
        key_fields = {
            "task_title": entity.get("task_title", ""),
            "start_time": entity.get("start_time", ""),
            "end_time": entity.get("end_time", ""),
            "session_type": entity.get("session_type", "")
        }

    hash_str = json.dumps(key_fields, sort_keys=True)
    return hashlib.md5(hash_str.encode()).hexdigest()


# ==================== SYNC OPERATIONS ====================

def sync_task_to_calendar(task_id: str, user_id: str) -> Dict:
    """
    Sync a single task to Google Calendar.

    Args:
        task_id: MongoDB task ID
        user_id: MongoDB user ID

    Returns:
        dict with success status and event_id
    """
    try:
        # Check if sync is enabled
        if not is_sync_enabled(user_id):
            return {"success": False, "message": "Calendar sync not enabled"}

        # Get calendar client
        calendar = get_calendar_client(user_id)
        if not calendar:
            return {"success": False, "message": "Failed to get calendar client"}

        # Get task
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not task:
            return {"success": False, "message": "Task not found"}

        task["id"] = task_id

        # Check if task already has a mapping
        existing_mapping = calendar_event_mappings_collection.find_one({
            "user_id": user_id,
            "local_entity_id": task_id,
            "local_entity_type": "task"
        })

        # Convert task to event
        event_body = task_to_calendar_event(task)

        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        calendar_id = sync_doc.get("google_calendar_id", "primary")

        if existing_mapping:
            # Update existing event
            event_id = existing_mapping["google_event_id"]
            event = calendar.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event_body
            ).execute()

            # Update mapping
            calendar_event_mappings_collection.update_one(
                {"_id": existing_mapping["_id"]},
                {"$set": {
                    "last_synced_at": datetime.utcnow(),
                    "last_modified_local": datetime.utcnow(),
                    "sync_status": "synced",
                    "version_hash": calculate_version_hash(task)
                }}
            )
        else:
            # Create new event
            event = calendar.events().insert(
                calendarId=calendar_id,
                body=event_body
            ).execute()

            # Create mapping
            mapping_doc = {
                "user_id": user_id,
                "local_entity_type": "task",
                "local_entity_id": task_id,
                "google_event_id": event["id"],
                "google_calendar_id": calendar_id,
                "last_synced_at": datetime.utcnow(),
                "last_modified_local": datetime.utcnow(),
                "last_modified_google": datetime.utcnow(),
                "sync_status": "synced",
                "version_hash": calculate_version_hash(task),
                "created_at": datetime.utcnow()
            }
            calendar_event_mappings_collection.insert_one(mapping_doc)

        return {
            "success": True,
            "message": "Task synced to calendar",
            "event_id": event["id"]
        }

    except HttpError as e:
        print(f"Google Calendar API error: {str(e)}")
        return {"success": False, "message": f"Calendar API error: {str(e)}"}
    except Exception as e:
        print(f"Error syncing task to calendar: {str(e)}")
        return {"success": False, "message": str(e)}


def sync_study_block_to_calendar(block: Dict, date: str, user_id: str) -> Dict:
    """
    Sync a single study block to Google Calendar.

    Args:
        block: Study block dict
        date: Date string (YYYY-MM-DD)
        user_id: MongoDB user ID

    Returns:
        dict with success status
    """
    try:
        if not is_sync_enabled(user_id):
            return {"success": False, "message": "Calendar sync not enabled"}

        calendar = get_calendar_client(user_id)
        if not calendar:
            return {"success": False, "message": "Failed to get calendar client"}

        block_id = block.get("id", str(ObjectId()))

        # Check existing mapping
        existing_mapping = calendar_event_mappings_collection.find_one({
            "user_id": user_id,
            "local_entity_id": block_id,
            "local_entity_type": "study_block"
        })

        event_body = study_block_to_calendar_event(block, date, user_id)

        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        calendar_id = sync_doc.get("google_calendar_id", "primary")

        if existing_mapping:
            # Update existing event
            event_id = existing_mapping["google_event_id"]
            event = calendar.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event_body
            ).execute()

            calendar_event_mappings_collection.update_one(
                {"_id": existing_mapping["_id"]},
                {"$set": {
                    "last_synced_at": datetime.utcnow(),
                    "last_modified_local": datetime.utcnow(),
                    "sync_status": "synced"
                }}
            )
        else:
            # Create new event
            event = calendar.events().insert(
                calendarId=calendar_id,
                body=event_body
            ).execute()

            mapping_doc = {
                "user_id": user_id,
                "local_entity_type": "study_block",
                "local_entity_id": block_id,
                "google_event_id": event["id"],
                "google_calendar_id": calendar_id,
                "last_synced_at": datetime.utcnow(),
                "last_modified_local": datetime.utcnow(),
                "last_modified_google": datetime.utcnow(),
                "sync_status": "synced",
                "created_at": datetime.utcnow()
            }
            calendar_event_mappings_collection.insert_one(mapping_doc)

        return {"success": True, "event_id": event["id"]}

    except Exception as e:
        print(f"Error syncing study block: {str(e)}")
        return {"success": False, "message": str(e)}


def delete_calendar_event(google_event_id: str, user_id: str) -> bool:
    """Delete event from Google Calendar and remove mapping."""
    try:
        calendar = get_calendar_client(user_id)
        if not calendar:
            return False

        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        calendar_id = sync_doc.get("google_calendar_id", "primary")

        # Delete from Google Calendar
        calendar.events().delete(
            calendarId=calendar_id,
            eventId=google_event_id
        ).execute()

        # Remove mapping
        calendar_event_mappings_collection.delete_one({
            "user_id": user_id,
            "google_event_id": google_event_id
        })

        return True

    except Exception as e:
        print(f"Error deleting calendar event: {str(e)}")
        return False


# ==================== SYNC STATUS ====================

def get_sync_status(user_id: str) -> Dict:
    """Get calendar sync status for user."""
    sync_doc = calendar_sync_collection.find_one({"user_id": user_id})

    if not sync_doc:
        return {
            "connected": False,
            "sync_enabled": False
        }

    # Count mappings
    total_synced = calendar_event_mappings_collection.count_documents({"user_id": user_id})
    pending_conflicts = calendar_event_mappings_collection.count_documents({
        "user_id": user_id,
        "sync_status": "conflict"
    })

    return {
        "connected": True,
        "sync_enabled": sync_doc.get("sync_enabled", False),
        "calendar_id": sync_doc.get("google_calendar_id"),
        "last_sync_at": sync_doc.get("last_sync_at"),
        "sync_preferences": sync_doc.get("sync_preferences", {}),
        "total_synced": total_synced,
        "pending_conflicts": pending_conflicts
    }
