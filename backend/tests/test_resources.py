"""
Tests for Resource Library API

Tests cover:
- Note creation, update, deletion
- File upload and management
- Resource search and filtering
- Flashcard generation (AI)
- Resource tagging
- Authorization checks
- Input validation and security
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime
import io
from unittest.mock import patch, Mock

from app.main import fastapi_app as app
from app.db_config import resources_collection, users_collection, tasks_collection

client = TestClient(app)


# ==================== FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean test data before each test."""
    yield
    # Cleanup after test
    resources_collection.delete_many({"title": {"$regex": "^Test"}})


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
def test_task(test_user_token, test_user_id):
    """Create a test task."""
    task_data = {
        "title": "Test Task for Resources",
        "created_by": test_user_id,
        "assigned_to": test_user_id,
        "status": "pending",
        "deadline": datetime.utcnow()
    }
    result = tasks_collection.insert_one(task_data)
    task_id = str(result.inserted_id)

    yield {"id": task_id}

    # Cleanup
    tasks_collection.delete_one({"_id": ObjectId(task_id)})


# ==================== NOTE CREATION TESTS ====================

def test_create_note(test_user_token, test_user_id):
    """Test creating a basic note."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Note - Basic",
            "content": "This is a test note with some content.",
            "tags": ["test", "note"]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Note - Basic"
    assert data["content"] == "This is a test note with some content."
    assert data["type"] == "note"
    assert "test" in data["tags"]
    assert "id" in data

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(data["id"])})


def test_create_note_with_task_link(test_user_token, test_task):
    """Test creating note linked to a task."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Note - Task Linked",
            "content": "Note linked to a task",
            "task_id": test_task["id"],
            "tags": ["task-related"]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == test_task["id"]

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(data["id"])})


def test_create_note_empty_title(test_user_token):
    """Test that notes with empty title are rejected."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "   ",  # Only whitespace
            "content": "Content here"
        }
    )

    assert response.status_code == 422  # Validation error


def test_create_note_empty_content(test_user_token):
    """Test that notes with empty content are rejected."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Title",
            "content": ""
        }
    )

    assert response.status_code == 422


def test_create_note_too_many_tags(test_user_token):
    """Test that notes with excessive tags are rejected."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Note",
            "content": "Content",
            "tags": [f"tag{i}" for i in range(25)]  # More than max allowed (20)
        }
    )

    assert response.status_code == 422


def test_create_note_title_too_long(test_user_token):
    """Test that notes with excessively long titles are rejected."""
    response = client.post(
        "/api/resources/notes",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "A" * 250,  # Longer than max allowed (200)
            "content": "Content"
        }
    )

    assert response.status_code == 422


# ==================== NOTE UPDATE TESTS ====================

def test_update_note(test_user_token, test_user_id):
    """Test updating a note."""
    # Create note
    note_result = resources_collection.insert_one({
        "title": "Test Original Note",
        "content": "Original content",
        "type": "note",
        "created_by": test_user_id,
        "tags": ["original"],
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    # Update note
    response = client.put(
        f"/api/resources/notes/{note_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "title": "Test Updated Note",
            "content": "Updated content",
            "tags": ["updated", "modified"]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Updated Note"
    assert data["content"] == "Updated content"
    assert "updated" in data["tags"]

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(note_id)})


def test_update_note_unauthorized(test_user_token):
    """Test that users cannot update others' notes."""
    other_user_id = str(ObjectId())
    note_result = resources_collection.insert_one({
        "title": "Test Other User Note",
        "content": "Content",
        "type": "note",
        "created_by": other_user_id,
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    response = client.put(
        f"/api/resources/notes/{note_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"title": "Hacked Title"}
    )

    assert response.status_code == 403

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(note_id)})


# ==================== NOTE DELETION TESTS ====================

def test_delete_note(test_user_token, test_user_id):
    """Test deleting a note."""
    note_result = resources_collection.insert_one({
        "title": "Test Note to Delete",
        "content": "Content",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    response = client.delete(
        f"/api/resources/notes/{note_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200

    # Verify deletion
    deleted_note = resources_collection.find_one({"_id": ObjectId(note_id)})
    assert deleted_note is None


def test_delete_note_unauthorized(test_user_token):
    """Test that users cannot delete others' notes."""
    other_user_id = str(ObjectId())
    note_result = resources_collection.insert_one({
        "title": "Test Other User Note",
        "content": "Content",
        "type": "note",
        "created_by": other_user_id,
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    response = client.delete(
        f"/api/resources/notes/{note_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 403

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(note_id)})


# ==================== FILE UPLOAD TESTS ====================

def test_upload_file_pdf(test_user_token):
    """Test uploading a PDF file."""
    # Create mock PDF file
    pdf_content = b"%PDF-1.4\n%Test PDF content"
    file = io.BytesIO(pdf_content)

    response = client.post(
        "/api/resources/upload",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("test_document.pdf", file, "application/pdf")},
        data={
            "title": "Test PDF Upload",
            "description": "Test PDF file",
            "tags": "pdf,test"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test PDF Upload"
    assert data["type"] == "file"
    assert data["file_name"] == "test_document.pdf"
    assert "file_path" in data

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(data["id"])})


def test_upload_file_text(test_user_token):
    """Test uploading a text file."""
    txt_content = b"This is a test text file with some content."
    file = io.BytesIO(txt_content)

    response = client.post(
        "/api/resources/upload",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("test_notes.txt", file, "text/plain")},
        data={
            "title": "Test Text Upload",
            "tags": "text,notes"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["file_name"] == "test_notes.txt"

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(data["id"])})


def test_upload_file_invalid_extension(test_user_token):
    """Test that files with invalid extensions are rejected."""
    exe_content = b"MZ\x90\x00"  # Fake executable
    file = io.BytesIO(exe_content)

    response = client.post(
        "/api/resources/upload",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("malicious.exe", file, "application/octet-stream")},
        data={"title": "Test Malicious File"}
    )

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()


def test_upload_file_path_traversal(test_user_token):
    """Test that path traversal attempts are blocked."""
    file = io.BytesIO(b"test content")

    response = client.post(
        "/api/resources/upload",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("../../etc/passwd", file, "text/plain")},
        data={"title": "Test Path Traversal"}
    )

    # Should sanitize filename and succeed (or reject dangerous filenames)
    if response.status_code == 200:
        data = response.json()
        # Filename should be sanitized
        assert ".." not in data["file_name"]
        assert "/" not in data["file_name"]
        resources_collection.delete_one({"_id": ObjectId(data["id"])})
    else:
        assert response.status_code == 400


@patch('app.routers.resources.MAX_FILE_SIZE', 100)  # Set to 100 bytes for test
def test_upload_file_too_large(test_user_token):
    """Test that oversized files are rejected."""
    large_content = b"A" * 200  # 200 bytes, exceeds limit
    file = io.BytesIO(large_content)

    response = client.post(
        "/api/resources/upload",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("large_file.txt", file, "text/plain")},
        data={"title": "Test Large File"}
    )

    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()


# ==================== RESOURCE RETRIEVAL TESTS ====================

def test_get_all_resources(test_user_token, test_user_id):
    """Test retrieving all user resources."""
    # Create test resources
    resource_ids = []
    for i in range(3):
        result = resources_collection.insert_one({
            "title": f"Test Resource {i}",
            "content": f"Content {i}",
            "type": "note",
            "created_by": test_user_id,
            "created_at": datetime.utcnow()
        })
        resource_ids.append(result.inserted_id)

    response = client.get(
        "/api/resources/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3

    # Cleanup
    resources_collection.delete_many({"_id": {"$in": resource_ids}})


def test_get_resources_by_type(test_user_token, test_user_id):
    """Test filtering resources by type."""
    # Create different resource types
    note_result = resources_collection.insert_one({
        "title": "Test Note Resource",
        "content": "Note content",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    file_result = resources_collection.insert_one({
        "title": "Test File Resource",
        "type": "file",
        "file_name": "test.pdf",
        "file_path": "/uploads/test.pdf",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    # Get only notes
    response = client.get(
        "/api/resources/?type=note",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # All returned resources should be notes
    for resource in data:
        if resource.get("id") in [str(note_result.inserted_id), str(file_result.inserted_id)]:
            assert resource["type"] == "note"

    # Cleanup
    resources_collection.delete_many({"_id": {"$in": [note_result.inserted_id, file_result.inserted_id]}})


def test_get_resources_by_task(test_user_token, test_user_id, test_task):
    """Test filtering resources by task."""
    # Create resources linked to task
    resource_result = resources_collection.insert_one({
        "title": "Test Task-Linked Resource",
        "content": "Content",
        "type": "note",
        "task_id": test_task["id"],
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    response = client.get(
        f"/api/resources/?task_id={test_task['id']}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should have at least one resource
    task_resources = [r for r in data if r.get("task_id") == test_task["id"]]
    assert len(task_resources) >= 1

    # Cleanup
    resources_collection.delete_one({"_id": resource_result.inserted_id})


def test_get_single_resource(test_user_token, test_user_id):
    """Test retrieving a single resource."""
    resource_result = resources_collection.insert_one({
        "title": "Test Single Resource",
        "content": "Single resource content",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    resource_id = str(resource_result.inserted_id)

    response = client.get(
        f"/api/resources/{resource_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == resource_id
    assert data["title"] == "Test Single Resource"

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(resource_id)})


# ==================== SEARCH TESTS ====================

def test_search_resources(test_user_token, test_user_id):
    """Test searching resources by keyword."""
    # Create searchable resources
    resource_ids = []

    result1 = resources_collection.insert_one({
        "title": "Test Python Programming",
        "content": "Learn Python basics",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    resource_ids.append(result1.inserted_id)

    result2 = resources_collection.insert_one({
        "title": "Test JavaScript Guide",
        "content": "JavaScript tutorial",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    resource_ids.append(result2.inserted_id)

    # Search for "Python"
    response = client.get(
        "/api/resources/search?query=Python",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) >= 1

    # At least one result should contain "Python"
    python_results = [r for r in data["results"] if "Python" in r.get("title", "") or "Python" in r.get("content", "")]
    assert len(python_results) >= 1

    # Cleanup
    resources_collection.delete_many({"_id": {"$in": resource_ids}})


def test_search_resources_with_type_filter(test_user_token, test_user_id):
    """Test searching with type filter."""
    # Create resources
    note_result = resources_collection.insert_one({
        "title": "Test Search Note with Keyword",
        "content": "Special keyword here",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    file_result = resources_collection.insert_one({
        "title": "Test Search File with Keyword",
        "type": "file",
        "file_name": "keyword.pdf",
        "file_path": "/uploads/keyword.pdf",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })

    # Search only in notes
    response = client.get(
        "/api/resources/search?query=keyword&type_filter=note",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # All results should be notes
    for result in data["results"]:
        if result["id"] in [str(note_result.inserted_id), str(file_result.inserted_id)]:
            assert result["type"] == "note"

    # Cleanup
    resources_collection.delete_many({"_id": {"$in": [note_result.inserted_id, file_result.inserted_id]}})


def test_search_resources_invalid_type(test_user_token):
    """Test that invalid type filters are rejected."""
    response = client.get(
        "/api/resources/search?query=test&type_filter=malicious_type",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 400


def test_search_resources_sql_injection_attempt(test_user_token):
    """Test that SQL injection attempts are sanitized."""
    # Attempt regex injection
    response = client.get(
        "/api/resources/search?query=.*",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    # Should not error, query should be escaped
    assert response.status_code == 200


# ==================== FLASHCARD GENERATION TESTS ====================

@patch('app.routers.resources.ollama.chat')
def test_generate_flashcards(mock_ollama, test_user_token, test_user_id):
    """Test AI flashcard generation."""
    # Create note with sufficient content
    note_result = resources_collection.insert_one({
        "title": "Test Note for Flashcards",
        "content": "Python is a high-level programming language. It was created by Guido van Rossum. Python emphasizes code readability and uses significant whitespace. It supports multiple programming paradigms including procedural, object-oriented, and functional programming.",
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    # Mock Ollama response
    mock_ollama.return_value = {
        'message': {
            'content': '''[
                {"question": "Who created Python?", "answer": "Guido van Rossum"},
                {"question": "What does Python emphasize?", "answer": "Code readability"},
                {"question": "What paradigms does Python support?", "answer": "Procedural, object-oriented, and functional programming"}
            ]'''
        }
    }

    response = client.post(
        f"/api/resources/notes/{note_id}/flashcards",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["flashcards"]) >= 1
    assert "question" in data["flashcards"][0]
    assert "answer" in data["flashcards"][0]

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(note_id)})


def test_generate_flashcards_content_too_short(test_user_token, test_user_id):
    """Test flashcard generation with insufficient content."""
    # Create note with very short content
    note_result = resources_collection.insert_one({
        "title": "Test Short Note",
        "content": "Too short",  # Less than 50 chars
        "type": "note",
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    })
    note_id = str(note_result.inserted_id)

    response = client.post(
        f"/api/resources/notes/{note_id}/flashcards",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 400
    assert "too short" in response.json()["detail"].lower()

    # Cleanup
    resources_collection.delete_one({"_id": ObjectId(note_id)})


# ==================== AUTHORIZATION TESTS ====================

def test_resource_operations_without_auth():
    """Test that unauthenticated requests are rejected."""
    # Create note
    response = client.post("/api/resources/notes", json={
        "title": "Unauthorized Note",
        "content": "Content"
    })
    assert response.status_code == 401

    # Get resources
    response = client.get("/api/resources/")
    assert response.status_code == 401

    # Search
    response = client.get("/api/resources/search?query=test")
    assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
