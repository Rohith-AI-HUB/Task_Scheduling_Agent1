# Test Suite Documentation

This directory contains comprehensive test coverage for the Task Scheduling Agent application.

## Test Files Overview

### 1. `test_chat.py` - Chat & Messaging Tests
**Coverage:** 15+ test cases

Tests for the complete chat/messaging system including:
- Message sending (group and direct)
- Message retrieval with pagination
- Message editing and deletion
- Emoji reactions (add/toggle)
- Message search functionality
- Typing indicators
- Authorization checks
- Chat list retrieval

**Key Features Tested:**
- Real-time messaging
- Group chat vs direct messages
- Message CRUD operations
- Access control
- WebSocket integration points

---

### 2. `test_calendar.py` - Google Calendar Integration Tests
**Coverage:** 20+ test cases

Tests for bidirectional Google Calendar sync:
- Calendar authentication and connection
- Task sync to Google Calendar
- Study block sync to Google Calendar
- Conflict detection between local and Google
- Conflict resolution (use_local vs use_google)
- Calendar event deletion
- Calendar listing
- Authorization checks

**Key Features Tested:**
- OAuth flow
- Event creation and updates
- Bidirectional synchronization
- Conflict handling
- Mapping management

---

### 3. `test_tasks.py` - Task Management Tests
**Coverage:** 25+ test cases

Tests for core task management functionality:
- Task creation (individual and bulk)
- Task retrieval with filtering (status, priority, etc.)
- Task updates (status, subtasks, dependencies)
- Task deletion
- Subtask management
- Task dependencies
- Task statistics
- Overdue task detection
- Authorization checks

**Key Features Tested:**
- CRUD operations
- Complex task structures
- Filtering and search
- Access control
- Input validation

---

### 4. `test_resources.py` - Resource Library Tests
**Coverage:** 25+ test cases

Tests for resource management and AI features:
- Note creation, update, deletion
- File upload with security validation
- Resource retrieval and filtering
- Resource search across all content
- AI flashcard generation
- Resource tagging
- Task-resource linking
- Security validations

**Key Features Tested:**
- Input sanitization (XSS prevention)
- File upload security (extension whitelist, path traversal prevention)
- File size limits
- AI integration (Ollama)
- Cross-resource search

---

### 5. `test_integration.py` - Integration Tests
**Coverage:** 10+ cross-feature workflow tests

Tests for end-to-end user workflows:
- **Task → Calendar Sync → Conflict Resolution**
  - Create task → Sync to Google → Detect conflicts → Resolve

- **Task → Resources → AI Flashcards**
  - Create task → Add notes → Generate flashcards

- **Group → Bulk Tasks → Chat**
  - Create group → Assign tasks → Discuss via chat

- **Study Planner → Calendar Sync**
  - Generate AI study plan → Sync blocks to calendar

- **Task Updates → Notifications**
  - Update task → Verify notifications sent

- **Stress Tracking + Analytics**
  - High task load → Log stress → View analytics

- **Cross-task Resource Search**
  - Multiple tasks with resources → Search across all

**Key Features Tested:**
- Multi-system interactions
- Data flow across features
- Real-world user scenarios
- WebSocket notifications
- AI-powered features

---

## Running the Tests

### Prerequisites

1. **Install test dependencies:**
   ```bash
   cd backend
   pip install pytest pytest-asyncio
   ```

2. **Set up test environment:**
   - Ensure MongoDB is running
   - Configure `.env` file with test credentials
   - Create test users in database (test@example.com, test2@example.com)

3. **Optional: Mock external services:**
   - Google Calendar API (mocked in tests)
   - Ollama AI (mocked in tests)

### Running All Tests

```bash
# From backend directory
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_chat.py -v

# Run specific test
pytest tests/test_chat.py::test_send_group_message -v
```

### Test Options

```bash
# Run tests in parallel (faster)
pytest tests/ -n auto

# Stop on first failure
pytest tests/ -x

# Show print statements
pytest tests/ -s

# Run only integration tests
pytest tests/test_integration.py -v

# Run tests matching pattern
pytest tests/ -k "calendar" -v
```

## Test Database Setup

The tests use the same database as the application but with automatic cleanup. Each test:

1. **Setup:** Creates necessary test data
2. **Execute:** Runs the test
3. **Cleanup:** Removes test data via fixtures

**Important:** Use a separate test database in production to avoid data loss.

### Creating Test Users

Before running tests, create test users:

```python
# In Python shell or setup script
from app.db_config import users_collection
from app.services.firebase_service import create_user

# Create test user 1
test_user_1 = {
    "email": "test@example.com",
    "name": "Test User",
    "firebase_uid": "test_firebase_uid_1"
}
users_collection.insert_one(test_user_1)

# Create test user 2 (for collaboration tests)
test_user_2 = {
    "email": "test2@example.com",
    "name": "Test User 2",
    "firebase_uid": "test_firebase_uid_2"
}
users_collection.insert_one(test_user_2)
```

## Test Coverage Summary

| Module | Test File | Coverage |
|--------|-----------|----------|
| Chat System | `test_chat.py` | 15+ tests |
| Calendar Sync | `test_calendar.py` | 20+ tests |
| Task Management | `test_tasks.py` | 25+ tests |
| Resource Library | `test_resources.py` | 25+ tests |
| Integration Flows | `test_integration.py` | 10+ tests |
| **Total** | **5 files** | **95+ tests** |

## Mocking Strategy

### External Services Mocked:
- **Google Calendar API** - All calendar operations use mocks
- **Ollama AI** - AI responses are mocked with sample data
- **WebSocket connections** - Real connections in integration tests

### Why Mock?
- Tests run faster without network calls
- Tests are deterministic (no API rate limits)
- Tests work offline
- No dependency on external service availability

## Common Issues and Solutions

### Issue: Test user not found
**Solution:** Create test users in database (see "Creating Test Users" above)

### Issue: Import errors
**Solution:**
```bash
# Ensure you're in backend directory
cd backend

# Install in development mode
pip install -e .
```

### Issue: MongoDB connection failed
**Solution:**
- Start MongoDB: `mongod --dbpath /path/to/data`
- Check `MONGODB_URI` in `.env`

### Issue: Firebase authentication errors
**Solution:**
- Ensure Firebase credentials file exists
- Mock Firebase auth in tests if needed

### Issue: Tests fail due to existing data
**Solution:**
- Cleanup fixtures should handle this
- Manually clean test data: Delete documents matching "Test" or "Integration Test" in title/name fields

## Test Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Use fixtures to clean up after tests
3. **Mocking:** Mock external services (Google, Ollama, etc.)
4. **Naming:** Use descriptive test names (test_feature_scenario_expectedResult)
5. **Assertions:** Include meaningful assertion messages
6. **Documentation:** Add docstrings explaining test workflows

## CI/CD Integration

To integrate tests into CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=app
```

## Extending the Test Suite

### Adding New Tests

1. **Choose appropriate test file:**
   - Feature-specific → existing test file
   - New feature → new test file
   - Cross-feature → `test_integration.py`

2. **Follow existing patterns:**
   ```python
   def test_new_feature(test_user_token, test_user_id):
       """Test description explaining what this tests."""
       # Arrange: Set up test data

       # Act: Execute the feature

       # Assert: Verify expected behavior

       # Cleanup: Remove test data
   ```

3. **Use fixtures for common setup:**
   - `test_user_token` - Authentication token
   - `test_user_id` - User ID
   - `test_task` - Sample task
   - `test_group` - Sample group

### Test Naming Convention

- `test_feature_scenario_expectedResult`
- Examples:
  - `test_create_task_with_subtasks`
  - `test_update_task_unauthorized`
  - `test_search_resources_invalid_type`

## Support

For issues or questions:
1. Check this README
2. Review existing test examples
3. Check application logs
4. Consult main project documentation

---

**Last Updated:** January 2026
**Test Framework:** pytest 7.x
**Python Version:** 3.11+
