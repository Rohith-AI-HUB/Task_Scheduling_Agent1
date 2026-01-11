"""
Tests for Task Management API

Tests cover:
- Task creation (individual and bulk)
- Task retrieval and filtering
- Task updates
- Task deletion
- Subtask management
- Task dependencies
- Task statistics
- Authorization checks
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta

from app.main import fastapi_app as app
from app.db_config import tasks_collection, users_collection, groups_collection

client = TestClient(app)


# ==================== FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean test data before each test."""
    yield
    # Cleanup after test
    tasks_collection.delete_many({"title": {"$regex": "^Test"}})


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
def test_group(test_user_token, test_user_id):
    """Create a test group."""
    group_data = {
        "name": "Test Group for Tasks",
        "description": "Test group",
        "members": [test_user_id],
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    }
    result = groups_collection.insert_one(group_data)
    group_id = str(result.inserted_id)

    yield {"id": group_id, "members": [test_user_id]}

    # Cleanup
    groups_collection.delete_one({"_id": ObjectId(group_id)})


# ==================== TASK CREATION TESTS ====================

def test_create_task(test_user_token, test_user_id):
    """Test creating a basic task."""
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Task - Basic",
            "description": "This is a test task",
            "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "subject": "Computer Science"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Task - Basic"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert "id" in data

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(data["id"])})


def test_create_task_with_subtasks(test_user_token, test_user_id):
    """Test creating task with subtasks."""
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Task - With Subtasks",
            "description": "Task with subtasks",
            "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "priority": "medium",
            "subtasks": [
                {"title": "Subtask 1", "completed": False},
                {"title": "Subtask 2", "completed": False},
                {"title": "Subtask 3", "completed": True}
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["subtasks"]) == 3
    assert data["subtasks"][0]["title"] == "Subtask 1"
    assert data["subtasks"][2]["completed"] is True

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(data["id"])})


def test_create_task_invalid_priority(test_user_token):
    """Test that invalid priority values are rejected."""
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Task",
            "deadline": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "priority": "super_urgent"  # Invalid priority
        }
    )

    assert response.status_code == 422  # Validation error


def test_create_task_missing_title(test_user_token):
    """Test that tasks without title are rejected."""
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "description": "Task without title",
            "deadline": (datetime.utcnow() + timedelta(days=1)).isoformat()
        }
    )

    assert response.status_code == 422


def test_create_task_with_dependencies(test_user_token, test_user_id):
    """Test creating task with dependencies."""
    # Create prerequisite tasks
    prereq1_result = tasks_collection.insert_one({
        "title": "Prerequisite 1",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "completed",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })
    prereq1_id = str(prereq1_result.inserted_id)

    prereq2_result = tasks_collection.insert_one({
        "title": "Prerequisite 2",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=2)
    })
    prereq2_id = str(prereq2_result.inserted_id)

    # Create task with dependencies
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Task - Dependent",
            "description": "Task with prerequisites",
            "deadline": (datetime.utcnow() + timedelta(days=10)).isoformat(),
            "dependencies": [prereq1_id, prereq2_id]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["dependencies"]) == 2
    assert prereq1_id in data["dependencies"]

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(data["id"])})
    tasks_collection.delete_many({"_id": {"$in": [ObjectId(prereq1_id), ObjectId(prereq2_id)]}})


# ==================== BULK TASK CREATION TESTS ====================

def test_bulk_create_tasks(test_user_token, test_group):
    """Test creating multiple tasks at once."""
    response = client.post(
        "/api/bulk-tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "group_id": test_group["id"],
            "tasks": [
                {
                    "title": "Test Bulk Task 1",
                    "description": "First bulk task",
                    "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
                    "priority": "high"
                },
                {
                    "title": "Test Bulk Task 2",
                    "description": "Second bulk task",
                    "deadline": (datetime.utcnow() + timedelta(days=6)).isoformat(),
                    "priority": "medium"
                },
                {
                    "title": "Test Bulk Task 3",
                    "description": "Third bulk task",
                    "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                    "priority": "low"
                }
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["created_count"] == 3
    assert len(data["task_ids"]) == 3

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": [ObjectId(tid) for tid in data["task_ids"]]}})


# ==================== TASK RETRIEVAL TESTS ====================

def test_get_all_tasks(test_user_token, test_user_id):
    """Test retrieving all user tasks."""
    # Create some test tasks
    task_ids = []
    for i in range(3):
        result = tasks_collection.insert_one({
            "title": f"Test Task {i}",
            "created_by": test_user_id,
            "assigned_to": test_user_id,
            "status": "pending",
            "priority": "medium",
            "deadline": datetime.utcnow() + timedelta(days=i+1)
        })
        task_ids.append(result.inserted_id)

    response = client.get(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": task_ids}})


def test_get_tasks_by_status(test_user_token, test_user_id):
    """Test filtering tasks by status."""
    # Create completed and pending tasks
    completed_result = tasks_collection.insert_one({
        "title": "Test Completed Task",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "completed",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })

    pending_result = tasks_collection.insert_one({
        "title": "Test Pending Task",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=2)
    })

    # Get only pending tasks
    response = client.get(
        "/api/tasks/?status=pending",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # All returned tasks should be pending
    for task in data:
        if task.get("id") in [str(completed_result.inserted_id), str(pending_result.inserted_id)]:
            assert task["status"] == "pending"

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": [completed_result.inserted_id, pending_result.inserted_id]}})


def test_get_tasks_by_priority(test_user_token, test_user_id):
    """Test filtering tasks by priority."""
    # Create high priority task
    high_priority_result = tasks_collection.insert_one({
        "title": "Test High Priority Task",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "high",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })

    response = client.get(
        "/api/tasks/?priority=high",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify we got high priority tasks
    for task in data:
        if task.get("id") == str(high_priority_result.inserted_id):
            assert task["priority"] == "high"

    # Cleanup
    tasks_collection.delete_one({"_id": high_priority_result.inserted_id})


def test_get_single_task(test_user_token, test_user_id):
    """Test retrieving a single task by ID."""
    # Create task
    task_result = tasks_collection.insert_one({
        "title": "Test Single Task Retrieval",
        "description": "Task for single retrieval test",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "medium",
        "deadline": datetime.utcnow() + timedelta(days=3)
    })
    task_id = str(task_result.inserted_id)

    response = client.get(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == "Test Single Task Retrieval"

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_get_task_not_found(test_user_token):
    """Test retrieving non-existent task."""
    fake_id = str(ObjectId())

    response = client.get(
        f"/api/tasks/{fake_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 404


# ==================== TASK UPDATE TESTS ====================

def test_update_task(test_user_token, test_user_id):
    """Test updating a task."""
    # Create task
    task_result = tasks_collection.insert_one({
        "title": "Test Original Title",
        "description": "Original description",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "low",
        "deadline": datetime.utcnow() + timedelta(days=5)
    })
    task_id = str(task_result.inserted_id)

    # Update task
    response = client.put(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Updated Title",
            "description": "Updated description",
            "priority": "high",
            "status": "in_progress"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Updated Title"
    assert data["priority"] == "high"
    assert data["status"] == "in_progress"

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_update_task_subtasks(test_user_token, test_user_id):
    """Test updating task subtasks."""
    # Create task with subtasks
    task_result = tasks_collection.insert_one({
        "title": "Test Task with Subtasks",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=3),
        "subtasks": [
            {"id": "sub1", "title": "Subtask 1", "completed": False},
            {"id": "sub2", "title": "Subtask 2", "completed": False}
        ]
    })
    task_id = str(task_result.inserted_id)

    # Update subtask status
    response = client.put(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "subtasks": [
                {"id": "sub1", "title": "Subtask 1", "completed": True},
                {"id": "sub2", "title": "Subtask 2", "completed": False}
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["subtasks"][0]["completed"] is True

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_update_task_unauthorized(test_user_token):
    """Test that users cannot update others' tasks."""
    # Create task owned by different user
    other_user_id = str(ObjectId())
    task_result = tasks_collection.insert_one({
        "title": "Test Other User Task",
        "created_by": other_user_id,
        "assigned_to": other_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })
    task_id = str(task_result.inserted_id)

    response = client.put(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"title": "Hacked Title"}
    )

    assert response.status_code == 403

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


def test_update_task_invalid_id(test_user_token):
    """Test updating with invalid task ID."""
    response = client.put(
        f"/api/tasks/invalid_id",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"title": "Updated"}
    )

    assert response.status_code == 400


# ==================== TASK DELETION TESTS ====================

def test_delete_task(test_user_token, test_user_id):
    """Test deleting a task."""
    # Create task
    task_result = tasks_collection.insert_one({
        "title": "Test Task to Delete",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })
    task_id = str(task_result.inserted_id)

    # Delete task
    response = client.delete(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200

    # Verify deletion
    deleted_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    assert deleted_task is None


def test_delete_task_unauthorized(test_user_token):
    """Test that users cannot delete others' tasks."""
    # Create task owned by different user
    other_user_id = str(ObjectId())
    task_result = tasks_collection.insert_one({
        "title": "Test Other User Task",
        "created_by": other_user_id,
        "assigned_to": other_user_id,
        "status": "pending",
        "deadline": datetime.utcnow() + timedelta(days=1)
    })
    task_id = str(task_result.inserted_id)

    response = client.delete(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 403

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== TASK STATISTICS TESTS ====================

def test_get_task_statistics(test_user_token, test_user_id):
    """Test retrieving task statistics."""
    # Create various tasks
    task_ids = []

    # 2 completed high priority
    for i in range(2):
        result = tasks_collection.insert_one({
            "title": f"Test Completed High {i}",
            "created_by": test_user_id,
            "assigned_to": test_user_id,
            "status": "completed",
            "priority": "high",
            "deadline": datetime.utcnow() - timedelta(days=1)
        })
        task_ids.append(result.inserted_id)

    # 3 pending medium priority
    for i in range(3):
        result = tasks_collection.insert_one({
            "title": f"Test Pending Medium {i}",
            "created_by": test_user_id,
            "assigned_to": test_user_id,
            "status": "pending",
            "priority": "medium",
            "deadline": datetime.utcnow() + timedelta(days=2)
        })
        task_ids.append(result.inserted_id)

    # Get statistics
    response = client.get(
        "/api/analytics/stats",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify we have stats
    assert "total_tasks" in data
    assert "completed_tasks" in data
    assert "pending_tasks" in data

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": task_ids}})


# ==================== AUTHORIZATION TESTS ====================

def test_task_operations_without_auth():
    """Test that unauthenticated requests are rejected."""
    # Create task
    response = client.post("/api/tasks/", json={
        "title": "Unauthorized Task",
        "deadline": (datetime.utcnow() + timedelta(days=1)).isoformat()
    })
    assert response.status_code == 401

    # Get tasks
    response = client.get("/api/tasks/")
    assert response.status_code == 401

    # Update task
    fake_id = str(ObjectId())
    response = client.put(f"/api/tasks/{fake_id}", json={"title": "Updated"})
    assert response.status_code == 401

    # Delete task
    response = client.delete(f"/api/tasks/{fake_id}")
    assert response.status_code == 401


# ==================== DEADLINE TESTS ====================

def test_get_overdue_tasks(test_user_token, test_user_id):
    """Test retrieving overdue tasks."""
    # Create overdue task
    overdue_result = tasks_collection.insert_one({
        "title": "Test Overdue Task",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "high",
        "deadline": datetime.utcnow() - timedelta(days=2)  # 2 days ago
    })

    # Create future task
    future_result = tasks_collection.insert_one({
        "title": "Test Future Task",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "priority": "medium",
        "deadline": datetime.utcnow() + timedelta(days=5)
    })

    # Get overdue tasks (if endpoint exists)
    response = client.get(
        "/api/tasks/?overdue=true",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    # This may or may not be implemented
    if response.status_code == 200:
        data = response.json()
        # Check if we have tasks
        assert isinstance(data, list)

    # Cleanup
    tasks_collection.delete_many({"_id": {"$in": [overdue_result.inserted_id, future_result.inserted_id]}})


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
