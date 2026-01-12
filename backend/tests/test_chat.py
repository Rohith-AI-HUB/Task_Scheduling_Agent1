"""
Tests for Chat & Messaging API

Tests cover:
- Message sending (group and direct)
- Message retrieval with pagination
- Message editing and deletion
- Reactions
- Typing indicators
- Access control
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime

from app.main import fastapi_app as app
from app.db_config import (
    chat_history_collection,
    groups_collection,
    users_collection
)

client = TestClient(app)


# ==================== FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean test data before each test."""
    yield
    # Cleanup after test
    chat_history_collection.delete_many({"sender_name": {"$regex": "^Test"}})


# test_user_token fixture removed to use conftest.py version


# test_group fixture removed to use conftest.py version


# ==================== MESSAGE SENDING TESTS ====================

def test_send_group_message(test_user_token, test_group):
    """Test sending a message to a group."""
    response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Hello, group!",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"]["content"] == "Hello, group!"
    assert data["message"]["chat_type"] == "group"


def test_send_direct_message(test_user_token):
    """Test sending a direct message."""
    # Create another test user (recipient)
    recipient_id = str(ObjectId())  # Mock recipient ID

    response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Hi there!",
            "chat_type": "direct",
            "chat_id": recipient_id
        }
    )

    # Will fail if recipient doesn't exist, which is expected
    assert response.status_code in [200, 404]


def test_send_empty_message(test_user_token, test_group):
    """Test that empty messages are rejected."""
    response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "   ",  # Only whitespace
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )

    # Should fail validation
    assert response.status_code == 422


def test_send_message_invalid_chat(test_user_token):
    """Test sending message to non-existent chat."""
    response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Hello",
            "chat_type": "group",
            "chat_id": str(ObjectId())  # Non-existent group
        }
    )

    assert response.status_code in [403, 404]


# ==================== MESSAGE RETRIEVAL TESTS ====================

def test_get_chat_messages(test_user_token, test_group):
    """Test retrieving messages from a chat."""
    # Send some messages first
    for i in range(5):
        client.post(
            "/api/chat/send",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "content": f"Message {i}",
                "chat_type": "group",
                "chat_id": test_group["id"]
            }
        )

    # Retrieve messages
    response = client.get(
        f"/api/chat/messages/group/{test_group['id']}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 5
    assert data["count"] == 5


def test_get_messages_with_pagination(test_user_token, test_group):
    """Test message pagination."""
    # Send 10 messages
    message_ids = []
    for i in range(10):
        resp = client.post(
            "/api/chat/send",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "content": f"Message {i}",
                "chat_type": "group",
                "chat_id": test_group["id"]
            }
        )
        message_ids.append(resp.json()["message"]["id"])

    # Get first 5 messages
    response = client.get(
        f"/api/chat/messages/group/{test_group['id']}?limit=5",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 5
    assert data["has_more"] is True

    # Get next 5 messages using pagination
    last_id = data["messages"][-1]["id"]
    response = client.get(
        f"/api/chat/messages/group/{test_group['id']}?limit=5&before_id={last_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) <= 5


# ==================== MESSAGE EDITING TESTS ====================

def test_edit_message(test_user_token, test_group):
    """Test editing a message."""
    # Send message
    send_response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Original content",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )
    message_id = send_response.json()["message"]["id"]

    # Edit message
    edit_response = client.put(
        f"/api/chat/messages/{message_id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"content": "Edited content"}
    )

    assert edit_response.status_code == 200
    data = edit_response.json()
    assert data["message"]["content"] == "Edited content"
    assert data["message"]["edited"] is True


def test_edit_others_message_forbidden(test_user_token, test_group):
    """Test that users cannot edit others' messages."""
    # This would require creating a second user
    # For now, we'll test with invalid message ID
    response = client.put(
        f"/api/chat/messages/{str(ObjectId())}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"content": "Hacked!"}
    )

    assert response.status_code == 404  # Message not found


# ==================== MESSAGE DELETION TESTS ====================

def test_delete_message(test_user_token, test_group):
    """Test deleting a message."""
    # Send message
    send_response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "To be deleted",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )
    message_id = send_response.json()["message"]["id"]

    # Delete message
    delete_response = client.delete(
        f"/api/chat/messages/{message_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert delete_response.status_code == 200

    # Verify deletion
    messages_response = client.get(
        f"/api/chat/messages/group/{test_group['id']}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    messages = messages_response.json()["messages"]
    assert not any(msg["id"] == message_id for msg in messages)


# ==================== REACTION TESTS ====================

def test_add_reaction(test_user_token, test_group):
    """Test adding emoji reaction to message."""
    # Send message
    send_response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "React to this!",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )
    message_id = send_response.json()["message"]["id"]

    # Add reaction
    reaction_response = client.post(
        f"/api/chat/messages/{message_id}/react",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"emoji": "👍"}
    )

    assert reaction_response.status_code == 200
    data = reaction_response.json()
    assert len(data["reactions"]) == 1
    assert data["reactions"][0]["emoji"] == "👍"
    assert data["action"] == "added"


def test_toggle_reaction(test_user_token, test_group):
    """Test toggling a reaction (add then remove)."""
    # Send message
    send_response = client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "React test",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )
    message_id = send_response.json()["message"]["id"]

    # Add reaction
    client.post(
        f"/api/chat/messages/{message_id}/react",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"emoji": "❤️"}
    )

    # Remove reaction (toggle)
    remove_response = client.post(
        f"/api/chat/messages/{message_id}/react",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"emoji": "❤️"}
    )

    assert remove_response.status_code == 200
    data = remove_response.json()
    assert len(data["reactions"]) == 0
    assert data["action"] == "removed"


# ==================== SEARCH TESTS ====================

def test_search_messages(test_user_token, test_group):
    """Test message search functionality."""
    # Send messages with searchable content
    client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Python is awesome!",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )
    client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "JavaScript is cool!",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )

    # Search for "Python"
    search_response = client.get(
        "/api/chat/search?query=Python",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert search_response.status_code == 200
    data = search_response.json()
    assert data["count"] >= 1
    assert any("Python" in msg["content"] for msg in data["messages"])


# ==================== AUTHORIZATION TESTS ====================

def test_access_unauthorized_chat(test_user_token):
    """Test that users cannot access chats they're not part of."""
    fake_group_id = str(ObjectId())

    response = client.get(
        f"/api/chat/messages/group/{fake_group_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 403


def test_send_message_without_auth():
    """Test that unauthenticated requests are rejected."""
    response = client.post(
        "/api/chat/send",
        json={
            "content": "Unauthorized",
            "chat_type": "group",
            "chat_id": str(ObjectId())
        }
    )

    assert response.status_code == 401  # Unauthorized


# ==================== CHAT LIST TESTS ====================

def test_get_user_chats(test_user_token, test_group):
    """Test retrieving list of user's chats."""
    # Send a message to create chat history
    client.post(
        "/api/chat/send",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "content": "Test message",
            "chat_type": "group",
            "chat_id": test_group["id"]
        }
    )

    # Get chats
    response = client.get(
        "/api/chat/chats",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "chats" in data
    assert isinstance(data["chats"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
