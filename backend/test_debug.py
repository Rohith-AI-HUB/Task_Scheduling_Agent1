"""Quick debug script to test API endpoints."""
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.db_config import users_collection
from datetime import datetime

client = TestClient(app)

# Create test user if doesn't exist
test_user = users_collection.find_one({"email": "test@example.com"})
if not test_user:
    users_collection.insert_one({
        "email": "test@example.com",
        "name": "Test User",
        "firebase_uid": "test_firebase_uid_1",
        "usn": "TEST001",
        "role": "student",
        "created_at": datetime.utcnow()
    })
    print("Created test user")
else:
    print(f"Test user exists with ID: {test_user['_id']}")

# Mock Firebase auth
def mock_verify_token(token):
    if isinstance(token, str) and token.startswith("Bearer "):
        token = token.replace("Bearer ", "")
    if token == "test_token_1":
        return {"uid": "test_firebase_uid_1"}
    return None

with patch('app.services.firebase_service.verify_firebase_token', side_effect=mock_verify_token):
    # Test task creation
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": "Bearer test_token_1"},
        json={
            "title": "Debug Test Task",
            "description": "Testing",
            "deadline": datetime.utcnow().isoformat(),
            "priority": "high"
        }
    )

    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {response.json()}")
