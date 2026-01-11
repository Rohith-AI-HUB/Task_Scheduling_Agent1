from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.mongodb_uri)
db = client.get_database()

# Collections
users_collection = db["users"]
tasks_collection = db["tasks"]
extension_requests_collection = db["extension_requests"]
notifications_collection = db["notifications"]
groups_collection = db["groups"]
chat_history_collection = db["chat_history"]

# Week 1 Feature Collections
stress_logs_collection = db["stress_logs"]
focus_sessions_collection = db["focus_sessions"]
resources_collection = db["resources"]

# Week 2 Teacher Feature Collections
grade_suggestions_collection = db["grade_suggestions"]
class_analytics_collection = db["class_analytics"]
task_templates_collection = db["task_templates"]

# Week 3 Smart Study Planner Collections
study_plans_collection = db["study_plans"]
user_preferences_collection = db["user_preferences"]

# Week 4 Calendar Integration Collections
calendar_sync_collection = db["calendar_sync"]
calendar_event_mappings_collection = db["calendar_event_mappings"]

# Aliases for test compatibility
calendar_tokens_collection = calendar_sync_collection
calendar_mappings_collection = calendar_event_mappings_collection

# Create indexes
users_collection.create_index("email", unique=True)
users_collection.create_index("firebase_uid", unique=True)
tasks_collection.create_index("assigned_to")
tasks_collection.create_index("created_by")
extension_requests_collection.create_index("task_id")

# Week 1 Feature Indexes
stress_logs_collection.create_index("user_id")
stress_logs_collection.create_index("timestamp")
focus_sessions_collection.create_index("user_id")
focus_sessions_collection.create_index([("user_id", 1), ("completed", 1)])
resources_collection.create_index("user_id")
resources_collection.create_index([("user_id", 1), ("type", 1)])
resources_collection.create_index([("title", "text"), ("content", "text"), ("tags", "text")])

# Week 2 Teacher Feature Indexes
grade_suggestions_collection.create_index("task_id")
grade_suggestions_collection.create_index("student_id")
grade_suggestions_collection.create_index("teacher_id")
grade_suggestions_collection.create_index([("teacher_id", 1), ("task_id", 1)])
class_analytics_collection.create_index("teacher_id")
class_analytics_collection.create_index("timestamp")
task_templates_collection.create_index("teacher_id")
task_templates_collection.create_index([("teacher_id", 1), ("tags", 1)])

# Week 3 Smart Study Planner Indexes
study_plans_collection.create_index("user_id")
study_plans_collection.create_index([("user_id", 1), ("date", 1)], unique=True)
user_preferences_collection.create_index("user_id", unique=True)

# Week 4 Calendar Integration Indexes
calendar_sync_collection.create_index("user_id", unique=True)
calendar_event_mappings_collection.create_index("user_id")
calendar_event_mappings_collection.create_index([("user_id", 1), ("local_entity_id", 1)])
calendar_event_mappings_collection.create_index([("user_id", 1), ("google_event_id", 1)])
calendar_event_mappings_collection.create_index("sync_status")
