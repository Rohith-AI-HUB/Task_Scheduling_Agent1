from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["student", "teacher"]
    usn: Optional[str] = None  # University Serial Number (e.g., 1ms25scs032 or 1ms25scs032-t)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    firebase_uid: str
    usn: Optional[str] = None
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    assigned_to: str  # user_id
    attachments: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Complete project documentation",
                "description": "Write comprehensive docs",
                "deadline": "2026-01-10T12:00:00Z",
                "priority": "medium",
                "assigned_to": "user_id_here"
            }
        }

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None
    status: Optional[Literal["todo", "in_progress", "completed"]] = None
    attachments: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated task title",
                "status": "in_progress",
                "priority": "high"
            }
        }

class ExtensionRequestCreate(BaseModel):
    task_id: str
    requested_deadline: str  # Accept as string, will be converted to datetime
    reason: str
    reason_category: Literal["medical", "technical", "overlapping", "personal", "other"]

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "507f1f77bcf86cd799439011",
                "requested_deadline": "2026-01-15T12:00:00Z",
                "reason": "I need more time due to overlapping deadlines",
                "reason_category": "overlapping"
            }
        }

class ExtensionRequest(BaseModel):
    task_id: str
    requested_deadline: datetime
    reason: str
    reason_category: Literal["medical", "technical", "overlapping", "personal", "other"]
