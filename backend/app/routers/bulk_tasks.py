"""
Bulk Task Creator Router - Week 2 Teacher Feature
Create tasks for multiple students at once with templates
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from app.db_config import (
    task_templates_collection,
    tasks_collection,
    users_collection,
    notifications_collection
)
from app.services.firebase_service import verify_firebase_token
from app.services.ollama_service import generate_ai_response
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/bulk-tasks", tags=["Bulk Tasks"])


class TaskTemplate(BaseModel):
    title: str
    description: str
    estimated_hours: float
    complexity_score: int
    subtasks: List[str]
    tags: List[str] = []


class BulkTaskCreate(BaseModel):
    title: str
    description: str
    deadline: str
    priority: str
    estimated_hours: float
    complexity_score: int
    subtasks: List[str]
    student_ids: List[str]
    save_as_template: bool = False
    template_name: Optional[str] = None


def get_current_user(authorization: str = Header(...)):
    """Get current authenticated user"""
    token = authorization.replace("Bearer ", "")
    decoded = verify_firebase_token(token)

    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_collection.find_one({"firebase_uid": decoded['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["id"] = str(user["_id"])
    return user


@router.post("/create")
async def create_bulk_tasks(
    bulk_task: BulkTaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create the same task for multiple students at once

    Features:
    - Assign to multiple students
    - Save as template for reuse
    - Automatic notifications
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can create bulk tasks")

    if not bulk_task.student_ids or len(bulk_task.student_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one student must be selected")

    # Parse deadline
    try:
        deadline = datetime.fromisoformat(bulk_task.deadline.replace('Z', '+00:00'))
    except:
        raise HTTPException(status_code=400, detail="Invalid deadline format")

    # Save as template if requested
    template_id = None
    if bulk_task.save_as_template and bulk_task.template_name:
        template = {
            "teacher_id": current_user['id'],
            "name": bulk_task.template_name,
            "title": bulk_task.title,
            "description": bulk_task.description,
            "estimated_hours": bulk_task.estimated_hours,
            "complexity_score": bulk_task.complexity_score,
            "subtasks": bulk_task.subtasks,
            "tags": [bulk_task.priority, f"{bulk_task.estimated_hours}h"],
            "usage_count": 0,
            "created_at": datetime.utcnow()
        }

        result = task_templates_collection.insert_one(template)
        template_id = str(result.inserted_id)

    # Create tasks for each student
    created_tasks = []
    failed_students = []

    for student_id in bulk_task.student_ids:
        try:
            # Verify student exists
            student = users_collection.find_one({"_id": ObjectId(student_id)})
            if not student:
                failed_students.append({"student_id": student_id, "reason": "Student not found"})
                continue

            # Prepare subtasks
            subtasks_list = [{"text": st, "completed": False} for st in bulk_task.subtasks]

            # Create task
            task_doc = {
                "title": bulk_task.title,
                "description": bulk_task.description,
                "deadline": deadline,
                "priority": bulk_task.priority,
                "status": "todo",
                "assigned_to": student_id,
                "created_by": current_user['id'],
                "estimated_hours": bulk_task.estimated_hours,
                "complexity_score": bulk_task.complexity_score,
                "subtasks": subtasks_list,
                "template_id": template_id,
                "created_at": datetime.utcnow(),
                "attachments": []
            }

            task_result = tasks_collection.insert_one(task_doc)
            created_task_id = str(task_result.inserted_id)

            created_tasks.append({
                "task_id": created_task_id,
                "student_id": student_id,
                "student_name": student.get('full_name', 'Unknown')
            })

            # Notify student
            notifications_collection.insert_one({
                "user_id": student_id,
                "type": "task_assigned",
                "title": "New Task Assigned",
                "message": f"Your teacher assigned you: '{bulk_task.title}'",
                "reference_id": created_task_id,
                "read": False,
                "created_at": datetime.utcnow()
            })

        except Exception as e:
            failed_students.append({"student_id": student_id, "reason": str(e)})

    # Update template usage count
    if template_id:
        task_templates_collection.update_one(
            {"_id": ObjectId(template_id)},
            {"$inc": {"usage_count": len(created_tasks)}}
        )

    return {
        "message": f"Successfully created {len(created_tasks)} tasks",
        "created_tasks": created_tasks,
        "failed_students": failed_students,
        "template_id": template_id,
        "total_created": len(created_tasks),
        "total_failed": len(failed_students)
    }


@router.get("/templates")
async def get_templates(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all task templates created by this teacher
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access templates")

    templates = list(task_templates_collection.find({
        "teacher_id": current_user['id']
    }).sort("usage_count", -1))

    template_list = []
    for template in templates:
        template_list.append({
            "id": str(template['_id']),
            "name": template.get('name', 'Untitled'),
            "title": template.get('title', ''),
            "description": template.get('description', ''),
            "estimated_hours": template.get('estimated_hours', 0),
            "complexity_score": template.get('complexity_score', 5),
            "subtasks": template.get('subtasks', []),
            "tags": template.get('tags', []),
            "usage_count": template.get('usage_count', 0),
            "created_at": template.get('created_at')
        })

    return {
        "templates": template_list,
        "total": len(template_list)
    }


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific template by ID
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access templates")

    template = task_templates_collection.find_one({
        "_id": ObjectId(template_id),
        "teacher_id": current_user['id']
    })

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "id": str(template['_id']),
        "name": template.get('name', 'Untitled'),
        "title": template.get('title', ''),
        "description": template.get('description', ''),
        "estimated_hours": template.get('estimated_hours', 0),
        "complexity_score": template.get('complexity_score', 5),
        "subtasks": template.get('subtasks', []),
        "tags": template.get('tags', []),
        "usage_count": template.get('usage_count', 0),
        "created_at": template.get('created_at')
    }


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a task template
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can delete templates")

    result = task_templates_collection.delete_one({
        "_id": ObjectId(template_id),
        "teacher_id": current_user['id']
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template deleted successfully"}


@router.get("/students")
async def get_students_for_assignment(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of students that can be assigned tasks
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access student list")

    # Get all students (users with role='student')
    students = list(users_collection.find({"role": "student"}))

    student_list = []
    for student in students:
        # Count tasks assigned to this student by current teacher
        task_count = tasks_collection.count_documents({
            "assigned_to": str(student['_id']),
            "created_by": current_user['id']
        })

        student_list.append({
            "id": str(student['_id']),
            "name": student.get('full_name', 'Unknown'),
            "email": student.get('email', ''),
            "tasks_assigned": task_count
        })

    # Sort by name
    student_list.sort(key=lambda x: x['name'])

    return {
        "students": student_list,
        "total": len(student_list)
    }
