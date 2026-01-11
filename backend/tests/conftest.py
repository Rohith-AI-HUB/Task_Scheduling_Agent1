"""
Pytest configuration and shared fixtures for all tests.

This file provides common setup, test users, and authentication fixtures.
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime
from unittest.mock import patch, Mock

from app.main import fastapi_app  # Import FastAPI app directly, not the Socket.IO wrapped version
from app.db_config import users_collection, groups_collection

# Test client
client = TestClient(fastapi_app)


# ==================== TEST USERS ====================

@pytest.fixture(scope="session", autouse=True)
def setup_test_users():
    """Create test users in database before any tests run."""
    # Clean up any existing test users first
    users_collection.delete_many({"email": {"$regex": "^test.*@example.com$"}})

    # Create test user 1
    test_user_1_data = {
        "email": "test@example.com",
        "name": "Test User",
        "firebase_uid": "test_firebase_uid_1",
        "usn": "TEST001",
        "role": "student",
        "created_at": datetime.utcnow()
    }
    result1 = users_collection.insert_one(test_user_1_data)
    test_user_1_id = str(result1.inserted_id)

    # Create test user 2
    test_user_2_data = {
        "email": "test2@example.com",
        "name": "Test User 2",
        "firebase_uid": "test_firebase_uid_2",
        "usn": "TEST002",
        "role": "student",
        "created_at": datetime.utcnow()
    }
    result2 = users_collection.insert_one(test_user_2_data)
    test_user_2_id = str(result2.inserted_id)

    print(f"\n✓ Created test users: {test_user_1_id}, {test_user_2_id}")

    yield

    # Cleanup after all tests
    users_collection.delete_many({"email": {"$regex": "^test.*@example.com$"}})
    print("\n✓ Cleaned up test users")


# ==================== AUTHENTICATION FIXTURES ====================

@pytest.fixture(scope="function", autouse=True)
def mock_firebase_auth():
    """Mock Firebase authentication for tests - applied automatically to all tests."""
    def mock_verify_token(token):
        # Handle both raw tokens and Bearer tokens
        if isinstance(token, str) and token.startswith("Bearer "):
            token = token.replace("Bearer ", "")

        if token == "test_token_1":
            return {"uid": "test_firebase_uid_1"}
        elif token == "test_token_2":
            return {"uid": "test_firebase_uid_2"}
        return None

    # Only patch the actual firebase_service module where the function exists
    with patch('app.services.firebase_service.verify_firebase_token', side_effect=mock_verify_token):
        yield


@pytest.fixture
def test_user_token():
    """Get authentication token for test user."""
    # Return the token that the mock will recognize
    return "test_token_1"


@pytest.fixture
def test_user_id():
    """Get test user ID from database."""
    user = users_collection.find_one({"email": "test@example.com"})
    if user:
        return str(user["_id"])
    return None


@pytest.fixture
def second_user_token():
    """Get authentication token for second test user."""
    return "test_token_2"


@pytest.fixture
def second_user_id():
    """Get second test user ID from database."""
    user = users_collection.find_one({"email": "test2@example.com"})
    if user:
        return str(user["_id"])
    return None


# ==================== COMMON DATA FIXTURES ====================

@pytest.fixture
def test_group(test_user_id):
    """Create a test group."""
    if not test_user_id:
        pytest.skip("Test user not available")

    group_data = {
        "name": "Test Group",
        "description": "Test group for tests",
        "members": [test_user_id],
        "created_by": test_user_id,
        "created_at": datetime.utcnow()
    }
    result = groups_collection.insert_one(group_data)
    group_id = str(result.inserted_id)

    yield {"id": group_id, "members": [test_user_id]}

    # Cleanup
    groups_collection.delete_one({"_id": ObjectId(group_id)})
