"""
Tests for Google Calendar Integration

Tests cover:
- Calendar connection and authentication
- Task sync to Google Calendar
- Study block sync to Google Calendar
- Conflict detection and resolution
- Event deletion
- Calendar listing
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

from app.main import fastapi_app as app
from app.db_config import (
    tasks_collection,
    study_plans_collection,
    calendar_mappings_collection,
    calendar_tokens_collection,
    users_collection
)

client = TestClient(app)


# ==================== FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean test data before each test."""
    yield
    # Cleanup after test
    calendar_mappings_collection.delete_many({"test_data": True})
    calendar_tokens_collection.delete_many({"test_data": True})


@pytest.fixture
def test_user_token():
    """Get authentication token for test user."""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    return response.json().get("token")


@pytest.fixture
def test_user_id(test_user_token):
    """Get test user ID from database."""
    user = users_collection.find_one({"email": "test@example.com"})
    return str(user["_id"]) if user else None


@pytest.fixture
def mock_google_credentials():
    """Mock Google OAuth credentials."""
    mock_creds = Mock()
    mock_creds.valid = True
    mock_creds.expired = False
    mock_creds.to_json.return_value = '{"token": "mock_token"}'
    return mock_creds


# ==================== CALENDAR CONNECTION TESTS ====================

def test_get_calendar_auth_url(test_user_token):
    """Test getting Google Calendar OAuth URL."""
    response = client.get(
        "/api/calendar/auth-url",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "auth_url" in data
    assert "https://accounts.google.com" in data["auth_url"]
    assert "oauth2" in data["auth_url"]


def test_calendar_auth_callback_missing_code(test_user_token):
    """Test calendar callback without authorization code."""
    response = client.get(
        "/api/calendar/callback",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 400
    assert "code" in response.json()["detail"].lower()


@patch('app.routers.calendar.get_calendar_client')
def test_get_calendar_status_connected(mock_get_client, test_user_token, test_user_id):
    """Test calendar status when connected."""
    # Insert mock calendar token
    calendar_tokens_collection.insert_one({
        "user_id": test_user_id,
        "encrypted_token": "mock_encrypted_token",
        "test_data": True
    })

    mock_get_client.return_value = Mock()

    response = client.get(
        "/api/calendar/status",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True


def test_get_calendar_status_not_connected(test_user_token):
    """Test calendar status when not connected."""
    response = client.get(
        "/api/calendar/status",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is False


def test_disconnect_calendar(test_user_token, test_user_id):
    """Test disconnecting Google Calendar."""
    # Insert mock calendar token
    calendar_tokens_collection.insert_one({
        "user_id": test_user_id,
        "encrypted_token": "mock_encrypted_token",
        "test_data": True
    })

    response = client.post(
        "/api/calendar/disconnect",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify token was deleted
    token = calendar_tokens_collection.find_one({"user_id": test_user_id})
    assert token is None


# ==================== CALENDAR LISTING TESTS ====================

@patch('app.routers.calendar.get_calendar_client')
def test_list_calendars(mock_get_client, test_user_token):
    """Test listing user's Google Calendars."""
    # Mock calendar list
    mock_calendar_service = Mock()
    mock_calendar_list = Mock()
    mock_calendar_list.list.return_value.execute.return_value = {
        "items": [
            {
                "id": "primary",
                "summary": "Test Calendar",
                "primary": True,
                "backgroundColor": "#9fe1e7"
            },
            {
                "id": "calendar_2",
                "summary": "Work Calendar",
                "primary": False,
                "backgroundColor": "#f83a22"
            }
        ]
    }
    mock_calendar_service.calendarList.return_value = mock_calendar_list
    mock_get_client.return_value = mock_calendar_service

    response = client.get(
        "/api/calendar/calendars",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["calendars"]) == 2
    assert data["calendars"][0]["id"] == "primary"
    assert data["calendars"][0]["primary"] is True


# ==================== TASK SYNC TESTS ====================

@patch('app.routers.calendar.get_calendar_client')
def test_sync_task_to_calendar(mock_get_client, test_user_token, test_user_id):
    """Test syncing a task to Google Calendar."""
    # Create a test task
    task_data = {
        "title": "Test Task for Calendar",
        "description": "This task should sync to calendar",
        "deadline": datetime.utcnow() + timedelta(days=1),
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending"
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    # Mock calendar event creation
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.insert.return_value.execute.return_value = {
        "id": "google_event_123",
        "htmlLink": "https://calendar.google.com/event?eid=123"
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.post(
        f"/api/calendar/sync/task/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "google_event_123" in data["event_id"]

    # Verify mapping was created
    mapping = calendar_mappings_collection.find_one({
        "user_id": test_user_id,
        "local_entity_id": task_id
    })
    assert mapping is not None
    assert mapping["google_event_id"] == "google_event_123"

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


@patch('app.routers.calendar.get_calendar_client')
def test_sync_task_already_synced(mock_get_client, test_user_token, test_user_id):
    """Test syncing a task that's already synced (should update)."""
    # Create task
    task_data = {
        "title": "Already Synced Task",
        "deadline": datetime.utcnow() + timedelta(days=2),
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending"
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    # Create existing mapping
    calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": task_id,
        "google_event_id": "existing_event_123",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow(),
        "test_data": True
    })

    # Mock calendar update
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.update.return_value.execute.return_value = {
        "id": "existing_event_123",
        "htmlLink": "https://calendar.google.com/event?eid=123"
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.post(
        f"/api/calendar/sync/task/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_sync_task_not_found(test_user_token):
    """Test syncing non-existent task."""
    fake_task_id = str(ObjectId())

    response = client.post(
        f"/api/calendar/sync/task/{fake_task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 404


def test_sync_task_invalid_id(test_user_token):
    """Test syncing with invalid task ID format."""
    response = client.post(
        f"/api/calendar/sync/task/invalid_id",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 400


# ==================== STUDY BLOCK SYNC TESTS ====================

@patch('app.routers.calendar.get_calendar_client')
def test_sync_study_plan_to_calendar(mock_get_client, test_user_token, test_user_id):
    """Test syncing study plan blocks to Google Calendar."""
    # Create test study plan
    study_plan_data = {
        "user_id": test_user_id,
        "date": datetime.utcnow().date().isoformat(),
        "study_blocks": [
            {
                "id": "block_1",
                "task_id": str(ObjectId()),
                "subject": "Mathematics",
                "start_time": "09:00",
                "end_time": "10:30",
                "priority": "high"
            },
            {
                "id": "block_2",
                "task_id": str(ObjectId()),
                "subject": "Physics",
                "start_time": "11:00",
                "end_time": "12:00",
                "priority": "medium"
            }
        ]
    }
    plan_result = study_plans_collection.insert_one(study_plan_data)
    plan_id = str(plan_result.inserted_id)

    # Mock calendar event creation
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.insert.return_value.execute.return_value = {
        "id": "google_event_study",
        "htmlLink": "https://calendar.google.com/event?eid=study"
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.post(
        f"/api/calendar/sync/study-plan/{plan_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["synced_blocks"] == 2

    # Cleanup
    study_plans_collection.delete_one({"_id": ObjectId(plan_id)})


# ==================== CONFLICT DETECTION TESTS ====================

@patch('app.routers.calendar.get_calendar_client')
def test_detect_conflicts(mock_get_client, test_user_token, test_user_id):
    """Test conflict detection between local and Google Calendar."""
    # Create task
    task_data = {
        "title": "Conflicted Task",
        "deadline": datetime.utcnow() + timedelta(hours=2),
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "updated_at": datetime.utcnow() - timedelta(hours=1)  # Updated 1 hour ago locally
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    # Create mapping
    calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": task_id,
        "google_event_id": "event_123",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow() - timedelta(hours=2),  # Synced 2 hours ago
        "test_data": True
    })

    # Mock Google Calendar event (modified more recently than local)
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.get.return_value.execute.return_value = {
        "id": "event_123",
        "summary": "Different Title",  # Changed on Google
        "start": {
            "dateTime": (datetime.utcnow() + timedelta(hours=3)).isoformat() + "Z"
        },
        "updated": datetime.utcnow().isoformat() + "Z"  # Modified just now on Google
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.get(
        "/api/calendar/conflicts",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["conflicts"]) > 0

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== CONFLICT RESOLUTION TESTS ====================

def test_resolve_conflict_use_local(test_user_token, test_user_id):
    """Test resolving conflict by using local version."""
    # Create task
    task_data = {
        "title": "Local Version",
        "deadline": datetime.utcnow() + timedelta(days=1),
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending"
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    # Create mapping
    mapping_result = calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": task_id,
        "google_event_id": "event_conflict",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow() - timedelta(hours=2),
        "test_data": True
    })
    mapping_id = str(mapping_result.inserted_id)

    with patch('app.routers.calendar.sync_task_to_calendar') as mock_sync:
        mock_sync.return_value = {"success": True}

        response = client.post(
            f"/api/calendar/conflicts/{mapping_id}/resolve",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"resolution": "use_local"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert mock_sync.called

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


@patch('app.routers.calendar.get_calendar_client')
def test_resolve_conflict_use_google(mock_get_client, test_user_token, test_user_id):
    """Test resolving conflict by using Google version."""
    # Create task
    task_data = {
        "title": "Old Local Title",
        "deadline": datetime.utcnow() + timedelta(days=1),
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending"
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    # Create mapping
    mapping_result = calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": task_id,
        "google_event_id": "event_google_wins",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow() - timedelta(hours=2),
        "test_data": True
    })
    mapping_id = str(mapping_result.inserted_id)

    # Mock Google Calendar event
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.get.return_value.execute.return_value = {
        "id": "event_google_wins",
        "summary": "Updated Google Title",
        "start": {
            "dateTime": (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z"
        }
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.post(
        f"/api/calendar/conflicts/{mapping_id}/resolve",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"resolution": "use_google"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify task was updated
    updated_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    assert updated_task["title"] == "Updated Google Title"

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== EVENT DELETION TESTS ====================

@patch('app.routers.calendar.get_calendar_client')
def test_delete_calendar_event(mock_get_client, test_user_token, test_user_id):
    """Test deleting a calendar event."""
    # Create mapping
    mapping_result = calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": str(ObjectId()),
        "google_event_id": "event_to_delete",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow(),
        "test_data": True
    })
    mapping_id = str(mapping_result.inserted_id)

    # Mock calendar delete
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.delete.return_value.execute.return_value = None
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    response = client.delete(
        f"/api/calendar/events/{mapping_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify mapping was deleted
    mapping = calendar_mappings_collection.find_one({"_id": ObjectId(mapping_id)})
    assert mapping is None


# ==================== AUTHORIZATION TESTS ====================

def test_sync_task_unauthorized(test_user_token):
    """Test that users cannot sync others' tasks."""
    # Create task owned by different user
    other_user_id = str(ObjectId())
    task_data = {
        "title": "Other User's Task",
        "deadline": datetime.utcnow() + timedelta(days=1),
        "created_by": other_user_id,
        "assigned_to": other_user_id,
        "status": "pending"
    }
    task_result = tasks_collection.insert_one(task_data)
    task_id = str(task_result.inserted_id)

    response = client.post(
        f"/api/calendar/sync/task/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 403

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_calendar_operations_without_auth():
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/calendar/status")
    assert response.status_code == 401

    response = client.get("/api/calendar/calendars")
    assert response.status_code == 401

    response = client.post("/api/calendar/disconnect")
    assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
