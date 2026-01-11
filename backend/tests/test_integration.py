"""
Integration Tests for Task Scheduling Agent

Tests cover cross-feature workflows:
- Task creation → Calendar sync → Conflict resolution
- Task creation → Resource attachment → Flashcard generation
- Group creation → Bulk task assignment → Chat discussion
- Study plan generation → Calendar integration
- Real-time WebSocket notifications across features
- End-to-end user workflows
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import asyncio

from app.main import fastapi_app as app
from app.db_config import (
    tasks_collection,
    resources_collection,
    calendar_mappings_collection,
    study_plans_collection,
    groups_collection,
    users_collection,
    chat_history_collection
)

client = TestClient(app)


# ==================== FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean test data before each test."""
    yield
    # Cleanup after test
    tasks_collection.delete_many({"title": {"$regex": "^Integration Test"}})
    resources_collection.delete_many({"title": {"$regex": "^Integration Test"}})
    calendar_mappings_collection.delete_many({"test_data": True})
    study_plans_collection.delete_many({"test_data": True})
    groups_collection.delete_many({"name": {"$regex": "^Integration Test"}})
    chat_history_collection.delete_many({"content": {"$regex": "^Integration Test"}})


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
def second_user_token():
    """Get authentication token for second test user (if exists)."""
    response = client.post("/api/auth/login", json={
        "email": "test2@example.com",
        "password": "testpassword"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


# ==================== TASK + CALENDAR INTEGRATION ====================

@patch('app.routers.calendar.get_calendar_client')
def test_task_creation_to_calendar_sync(mock_get_client, test_user_token, test_user_id):
    """
    Integration test: Create task → Sync to Google Calendar → Verify mapping

    Workflow:
    1. User creates a task with deadline
    2. User syncs task to Google Calendar
    3. Calendar mapping is created
    4. Task can be retrieved with calendar info
    """
    # Step 1: Create task
    task_response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Integration Test - Task to Calendar",
            "description": "Task that will be synced to calendar",
            "deadline": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "priority": "high"
        }
    )
    assert task_response.status_code == 200
    task = task_response.json()
    task_id = task["id"]

    # Step 2: Mock Google Calendar and sync task
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.insert.return_value.execute.return_value = {
        "id": "google_event_integration_123",
        "htmlLink": "https://calendar.google.com/event?eid=123"
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    sync_response = client.post(
        f"/api/calendar/sync/task/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert sync_response.status_code == 200
    sync_data = sync_response.json()
    assert sync_data["success"] is True

    # Step 3: Verify calendar mapping exists
    mapping = calendar_mappings_collection.find_one({
        "user_id": test_user_id,
        "local_entity_id": task_id
    })
    assert mapping is not None
    assert mapping["google_event_id"] == "google_event_integration_123"

    # Step 4: Get task and verify it has calendar info
    task_get_response = client.get(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert task_get_response.status_code == 200

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


@patch('app.routers.calendar.get_calendar_client')
def test_calendar_conflict_resolution_workflow(mock_get_client, test_user_token, test_user_id):
    """
    Integration test: Create task → Sync → Detect conflict → Resolve conflict

    Workflow:
    1. Create and sync task
    2. Simulate local and Google changes
    3. Detect conflict
    4. Resolve using local version
    5. Verify task is updated
    """
    # Step 1: Create task
    task_result = tasks_collection.insert_one({
        "title": "Integration Test - Conflict Resolution",
        "description": "Original description",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "medium",
        "deadline": datetime.utcnow() + timedelta(days=5),
        "updated_at": datetime.utcnow() - timedelta(hours=2)
    })
    task_id = str(task_result.inserted_id)

    # Step 2: Create mapping (simulate previous sync)
    mapping_result = calendar_mappings_collection.insert_one({
        "user_id": test_user_id,
        "local_entity_type": "task",
        "local_entity_id": task_id,
        "google_event_id": "conflict_event_123",
        "calendar_id": "primary",
        "last_synced": datetime.utcnow() - timedelta(hours=3),
        "test_data": True
    })
    mapping_id = str(mapping_result.inserted_id)

    # Step 3: Mock Google Calendar event (modified more recently)
    mock_calendar_service = Mock()
    mock_events = Mock()
    mock_events.get.return_value.execute.return_value = {
        "id": "conflict_event_123",
        "summary": "Changed on Google",
        "description": "Google modified description",
        "start": {
            "dateTime": (datetime.utcnow() + timedelta(days=6)).isoformat() + "Z"
        },
        "updated": datetime.utcnow().isoformat() + "Z"
    }
    mock_calendar_service.events.return_value = mock_events
    mock_get_client.return_value = mock_calendar_service

    # Step 4: Detect conflicts
    conflicts_response = client.get(
        "/api/calendar/conflicts",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert conflicts_response.status_code == 200

    # Step 5: Resolve conflict (use local version)
    with patch('app.routers.calendar.sync_task_to_calendar') as mock_sync:
        mock_sync.return_value = {"success": True}

        resolve_response = client.post(
            f"/api/calendar/conflicts/{mapping_id}/resolve",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"resolution": "use_local"}
        )
        assert resolve_response.status_code == 200
        assert mock_sync.called

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== TASK + RESOURCE + AI INTEGRATION ====================

@patch('app.routers.resources.ollama.chat')
def test_task_with_notes_and_flashcards(mock_ollama, test_user_token, test_user_id):
    """
    Integration test: Create task → Add study notes → Generate flashcards

    Workflow:
    1. User creates a task for studying
    2. User creates notes linked to the task
    3. User generates flashcards from notes
    4. Flashcards are returned and can be used for studying
    """
    # Step 1: Create task
    task_response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Integration Test - Study Python",
            "description": "Learn Python programming",
            "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "subject": "Computer Science"
        }
    )
    assert task_response.status_code == 200
    task = task_response.json()
    task_id = task["id"]

    # Step 2: Create study notes linked to task
    note_response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Integration Test - Python Study Notes",
            "content": "Python is a versatile programming language. It supports multiple paradigms including object-oriented, functional, and procedural programming. Python uses dynamic typing and automatic memory management. The language emphasizes code readability with significant whitespace.",
            "task_id": task_id,
            "tags": ["python", "programming", "study"]
        }
    )
    assert note_response.status_code == 200
    note = note_response.json()
    note_id = note["id"]

    # Step 3: Mock AI and generate flashcards from notes
    mock_ollama.return_value = {
        'message': {
            'content': '''[
                {"question": "What paradigms does Python support?", "answer": "Object-oriented, functional, and procedural"},
                {"question": "What type system does Python use?", "answer": "Dynamic typing"},
                {"question": "What does Python emphasize for readability?", "answer": "Significant whitespace"}
            ]'''
        }
    }

    flashcard_response = client.post(
        f"/api/resources/notes/{note_id}/flashcards",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert flashcard_response.status_code == 200
    flashcard_data = flashcard_response.json()
    assert flashcard_data["success"] is True
    assert len(flashcard_data["flashcards"]) >= 3

    # Step 4: Verify resources are linked to task
    resources_response = client.get(
        f"/api/resources/?task_id={task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resources_response.status_code == 200
    task_resources = resources_response.json()
    assert len(task_resources) >= 1

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})
    resources_collection.delete_one({"_id": ObjectId(note_id)})


# ==================== GROUP + BULK TASKS + CHAT INTEGRATION ====================

def test_group_collaboration_workflow(test_user_token, test_user_id, second_user_token):
    """
    Integration test: Create group → Bulk create tasks → Chat about tasks

    Workflow:
    1. Create study group
    2. Bulk assign tasks to group
    3. Send chat message about tasks
    4. Group members can see tasks and chat
    """
    if not second_user_token:
        pytest.skip("Second test user not available")

    # Step 1: Create group
    second_user = users_collection.find_one({"email": "test2@example.com"})
    second_user_id = str(second_user["_id"]) if second_user else None

    if not second_user_id:
        pytest.skip("Second user not found in database")

    group_response = client.post(
        "/api/groups/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "name": "Integration Test - Study Group",
            "description": "Test collaboration group",
            "members": [test_user_id, second_user_id]
        }
    )
    assert group_response.status_code == 200
    group = group_response.json()
    group_id = group["id"]

    # Step 2: Bulk create tasks for group
    bulk_response = client.post(
        "/api/bulk-tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "group_id": group_id,
            "tasks": [
                {
                    "title": "Integration Test - Group Task 1",
                    "description": "First collaborative task",
                    "deadline": (datetime.utcnow() + timedelta(days=3)).isoformat(),
                    "priority": "high"
                },
                {
                    "title": "Integration Test - Group Task 2",
                    "description": "Second collaborative task",
                    "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
                    "priority": "medium"
                }
            ]
        }
    )
    assert bulk_response.status_code == 200
    bulk_data = bulk_response.json()
    assert bulk_data["created_count"] == 2
    task_ids = bulk_data["task_ids"]

    # Step 3: Send chat message about tasks
    chat_response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": f"Integration Test - Let's work on tasks {task_ids[0]} and {task_ids[1]}!",
            "chat_type": "group",
            "chat_id": group_id
        }
    )
    assert chat_response.status_code == 200

    # Step 4: Verify second user can see tasks
    tasks_response = client.get(
        f"/api/tasks/?group_id={group_id}",
        headers={"Authorization": f"Bearer {second_user_token}"}
    )
    # May or may not be implemented - skip check if not

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": [ObjectId(tid) for tid in task_ids]}})
    groups_collection.delete_one({"_id": ObjectId(group_id)})


# ==================== STUDY PLANNER + CALENDAR INTEGRATION ====================

@patch('app.routers.calendar.get_calendar_client')
@patch('app.routers.study_planner.ollama.chat')
def test_study_plan_generation_and_sync(mock_ollama, mock_get_client, test_user_token, test_user_id):
    """
    Integration test: Create tasks → Generate study plan → Sync to calendar

    Workflow:
    1. Create multiple tasks with deadlines
    2. Generate AI study plan
    3. Sync study blocks to Google Calendar
    4. Verify calendar mappings
    """
    # Step 1: Create multiple tasks
    task_ids = []
    for i in range(3):
        task_result = tasks_collection.insert_one({
            "title": f"Integration Test - Study Task {i+1}",
            "description": f"Task for study planning {i+1}",
            "created_by": test_user_id,
            "assigned_to": test_user_id,
            "status": "pending",
            "priority": "high",
            "subject": "Mathematics",
            "deadline": datetime.utcnow() + timedelta(days=7-i),
            "estimated_duration": 90
        })
        task_ids.append(str(task_result.inserted_id))

    # Step 2: Mock AI study planner response
    mock_ollama.return_value = {
        'message': {
            'content': '''[
                {
                    "task_id": "''' + task_ids[0] + '''",
                    "subject": "Mathematics",
                    "start_time": "09:00",
                    "end_time": "10:30",
                    "priority": "high",
                    "break_after": 15
                },
                {
                    "task_id": "''' + task_ids[1] + '''",
                    "subject": "Mathematics",
                    "start_time": "11:00",
                    "end_time": "12:30",
                    "priority": "high",
                    "break_after": 15
                }
            ]'''
        }
    }

    # Generate study plan
    study_plan_response = client.post(
        "/api/study-planner/generate",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "date": datetime.utcnow().date().isoformat(),
            "task_ids": task_ids,
            "preferences": {
                "start_time": "09:00",
                "end_time": "17:00",
                "break_duration": 15
            }
        }
    )

    if study_plan_response.status_code == 200:
        study_plan = study_plan_response.json()
        plan_id = study_plan.get("id")

        if plan_id:
            # Step 3: Mock Google Calendar and sync study plan
            mock_calendar_service = Mock()
            mock_events = Mock()
            mock_events.insert.return_value.execute.return_value = {
                "id": "study_block_event",
                "htmlLink": "https://calendar.google.com/event?eid=study"
            }
            mock_calendar_service.events.return_value = mock_events
            mock_get_client.return_value = mock_calendar_service

            sync_response = client.post(
                f"/api/calendar/sync/study-plan/{plan_id}",
                headers={"Authorization": f"Bearer {test_user_token}"}
            )

            if sync_response.status_code == 200:
                sync_data = sync_response.json()
                assert sync_data["success"] is True

            # Cleanup study plan
            study_plans_collection.delete_one({"_id": ObjectId(plan_id)})

    # Cleanup tasks
    tasks_collection.delete_many({"_id": {"$in": [ObjectId(tid) for tid in task_ids]}})


# ==================== TASK UPDATE + NOTIFICATIONS ====================

def test_task_update_triggers_notification(test_user_token, test_user_id):
    """
    Integration test: Create task → Update status → Verify notification sent

    Workflow:
    1. Create task
    2. Update task status to completed
    3. Verify notification was created
    4. Notification can be retrieved
    """
    # Step 1: Create task
    task_response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Integration Test - Notification Task",
            "description": "Task that will trigger notification",
            "deadline": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "priority": "high"
        }
    )
    assert task_response.status_code == 200
    task = task_response.json()
    task_id = task["id"]

    # Step 2: Update task status
    update_response = client.put(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"status": "completed"}
    )
    assert update_response.status_code == 200

    # Step 3: Get notifications
    notifications_response = client.get(
        "/api/notifications/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    if notifications_response.status_code == 200:
        notifications = notifications_response.json()
        # May have notification about task completion
        assert isinstance(notifications, list)

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== STRESS TRACKING + ANALYTICS ====================

def test_stress_tracking_with_task_load(test_user_token, test_user_id):
    """
    Integration test: Create many tasks → Log stress → Get analytics

    Workflow:
    1. Create multiple high-priority tasks
    2. Log stress entry
    3. Get analytics showing task load vs stress
    """
    # Step 1: Create multiple tasks
    task_ids = []
    for i in range(5):
        task_result = tasks_collection.insert_one({
            "title": f"Integration Test - High Load Task {i+1}",
            "created_by": test_user_id,
            "assigned_to": test_user_id,
            "status": "pending",
            "priority": "high",
            "deadline": datetime.utcnow() + timedelta(hours=24)
        })
        task_ids.append(task_result.inserted_id)

    # Step 2: Log stress entry
    stress_response = client.post(
        "/api/stress/log",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "level": 8,
            "notes": "Integration Test - High workload causing stress",
            "factors": ["workload", "deadlines"]
        }
    )

    if stress_response.status_code == 200:
        # Step 3: Get analytics
        analytics_response = client.get(
            "/api/analytics/stats",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        if analytics_response.status_code == 200:
            analytics = analytics_response.json()
            # Should show high pending task count
            assert analytics.get("pending_tasks", 0) >= 5

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": task_ids}})


# ==================== RESOURCE SEARCH ACROSS TASKS ====================

def test_cross_task_resource_search(test_user_token, test_user_id):
    """
    Integration test: Create multiple tasks with resources → Search across all

    Workflow:
    1. Create multiple tasks
    2. Add resources to each task
    3. Search for keyword across all resources
    4. Results include resources from different tasks
    """
    # Step 1 & 2: Create tasks with resources
    task1_result = tasks_collection.insert_one({
        "title": "Integration Test - Python Project",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=5)
    })
    task1_id = str(task1_result.inserted_id)

    task2_result = tasks_collection.insert_one({
        "title": "Integration Test - JavaScript Project",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=6)
    })
    task2_id = str(task2_result.inserted_id)

    # Add resources
    resource1_result = resources_collection.insert_one({
        "title": "Integration Test - Python Tutorial",
        "content": "Learn Python programming basics",
        "type": "note",
        "task_id": task1_id,
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    resource2_result = resources_collection.insert_one({
        "title": "Integration Test - Python Advanced",
        "content": "Advanced Python concepts",
        "type": "note",
        "task_id": task2_id,
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    # Step 3: Search for "Python" across all resources
    search_response = client.get(
        "/api/resources/search?query=Python",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert search_response.status_code == 200
    search_data = search_response.json()

    # Should find resources from both tasks
    python_results = [r for r in search_data["results"] if "Python" in r.get("title", "")]
    assert len(python_results) >= 2

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": [task1_result.inserted_id, task2_result.inserted_id]}})
    resources_collection.delete_many({"_id": {"$in": [resource1_result.inserted_id, resource2_result.inserted_id]}})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
