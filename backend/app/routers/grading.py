"""
Task Review Router - Teacher Feature
View and review student task submissions with attachments and notes
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from app.db_config import (
    tasks_collection,
    users_collection,
    notifications_collection
)
from app.services.firebase_service import verify_firebase_token
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/grading", tags=["Task Review"])


class TeacherFeedback(BaseModel):
    feedback: str
    grade: Optional[float] = None


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


def calculate_progress(subtasks: list) -> int:
    """Calculate task progress based on completed subtasks"""
    if not subtasks or len(subtasks) == 0:
        return 0

    completed = sum(
        1 for st in subtasks
        if st.get('completed', False) or st.get('status') == 'completed'
    )
    return int((completed / len(subtasks)) * 100)


@router.get("/assigned-tasks")
async def get_assigned_tasks(
    status: Optional[str] = Query(None, description="Filter by status: todo, in_progress, completed"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    search: Optional[str] = Query(None, description="Search by student name or USN"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all tasks assigned by this teacher with student details

    Returns list of tasks with:
    - Student name, USN
    - Subject
    - Task status and progress
    - Deadline
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Build query for tasks created by this teacher
    # Match tasks that are either:
    # 1. Created by this teacher with is_teacher_assigned=True, OR
    # 2. Created by this teacher (for backward compatibility with older tasks)
    query = {
        "created_by": current_user['id']
    }

    # Filter by status if provided
    if status and status in ['todo', 'in_progress', 'completed']:
        query["status"] = status

    # Filter by subject if provided
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}

    # Get all matching tasks
    tasks = list(tasks_collection.find(query).sort("created_at", -1))

    # Enrich with student info
    task_list = []
    for task in tasks:
        student = users_collection.find_one({"_id": ObjectId(task.get('assigned_to'))})

        if not student:
            continue

        student_name = student.get('full_name', 'Unknown')
        student_usn = student.get('usn', '')

        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            if (search_lower not in student_name.lower() and
                search_lower not in student_usn.lower()):
                continue

        # Calculate progress
        subtasks = task.get('subtasks', [])
        progress = calculate_progress(subtasks)

        # Format deadline
        deadline = task.get('deadline')
        if isinstance(deadline, datetime):
            deadline = deadline.isoformat()

        created_at = task.get('created_at')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()

        task_list.append({
            "id": str(task['_id']),
            "title": task.get('title', ''),
            "description": task.get('description', ''),
            "student_id": str(student['_id']),
            "student_name": student_name,
            "student_usn": student_usn,
            "student_email": student.get('email', ''),
            "subject": task.get('subject', ''),
            "status": task.get('status', 'todo'),
            "progress": progress,
            "priority": task.get('priority', 'medium'),
            "deadline": deadline,
            "created_at": created_at,
            "has_attachments": len(task.get('attachments', [])) > 0,
            "has_notes": len(task.get('student_notes', [])) > 0,
            "attachment_count": len(task.get('attachments', [])),
            "note_count": len(task.get('student_notes', [])),
            "teacher_feedback": task.get('teacher_feedback'),
            "grade": task.get('grade')
        })

    # Get unique subjects for filter dropdown
    all_subjects = list(tasks_collection.distinct("subject", {
        "created_by": current_user['id']
    }))
    # Filter out empty subjects
    all_subjects = [s for s in all_subjects if s]

    return {
        "tasks": task_list,
        "total": len(task_list),
        "subjects": all_subjects
    }


@router.get("/task/{task_id}/details")
async def get_task_details(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get full task details including attachments and notes

    Returns:
    - Complete task information
    - Student details
    - All subtasks with status
    - Attachments (files uploaded by student)
    - Notes (text notes from student)
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Validate task ID
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")

    # Get task
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify this task was created by the teacher
    if task.get('created_by') != current_user['id']:
        raise HTTPException(status_code=403, detail="You can only view tasks you created")

    # Get student info
    student = users_collection.find_one({"_id": ObjectId(task.get('assigned_to'))})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Calculate progress
    subtasks = task.get('subtasks', [])
    progress = calculate_progress(subtasks)

    # Format dates
    deadline = task.get('deadline')
    if isinstance(deadline, datetime):
        deadline = deadline.isoformat()

    created_at = task.get('created_at')
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    updated_at = task.get('updated_at')
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat()

    # Format subtasks
    formatted_subtasks = []
    for st in subtasks:
        formatted_subtasks.append({
            "title": st.get('title') or st.get('text', ''),
            "completed": st.get('completed', False) or st.get('status') == 'completed',
            "ai_generated": st.get('ai_generated', False)
        })

    # Format attachments
    attachments = task.get('attachments', [])
    formatted_attachments = []
    for att in attachments:
        if isinstance(att, dict):
            formatted_attachments.append(att)
        else:
            # Legacy string format
            formatted_attachments.append({
                "id": att,
                "filename": att,
                "url": att,
                "type": "unknown"
            })

    # Format notes
    notes = task.get('student_notes', [])
    formatted_notes = []
    for note in notes:
        if isinstance(note, dict):
            note_created = note.get('created_at')
            if isinstance(note_created, datetime):
                note_created = note_created.isoformat()
            formatted_notes.append({
                "id": note.get('id', ''),
                "content": note.get('content', ''),
                "created_at": note_created
            })
        else:
            formatted_notes.append({
                "id": "",
                "content": str(note),
                "created_at": None
            })

    return {
        "task": {
            "id": str(task['_id']),
            "title": task.get('title', ''),
            "description": task.get('description', ''),
            "status": task.get('status', 'todo'),
            "priority": task.get('priority', 'medium'),
            "progress": progress,
            "deadline": deadline,
            "created_at": created_at,
            "updated_at": updated_at,
            "subject": task.get('subject', ''),
            "estimated_hours": task.get('estimated_hours', 0),
            "complexity_score": task.get('complexity_score', 5),
            "teacher_feedback": task.get('teacher_feedback'),
            "grade": task.get('grade')
        },
        "student": {
            "id": str(student['_id']),
            "name": student.get('full_name', 'Unknown'),
            "usn": student.get('usn', ''),
            "email": student.get('email', '')
        },
        "subtasks": formatted_subtasks,
        "attachments": formatted_attachments,
        "notes": formatted_notes
    }


@router.post("/task/{task_id}/feedback")
async def add_teacher_feedback(
    task_id: str,
    feedback_data: TeacherFeedback,
    current_user: dict = Depends(get_current_user)
):
    """
    Add teacher feedback and optional grade to a task

    Args:
        task_id: Task ID
        feedback_data: Feedback text and optional grade
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can add feedback")

    # Validate task ID
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")

    # Get task
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify this task was created by the teacher
    if task.get('created_by') != current_user['id']:
        raise HTTPException(status_code=403, detail="You can only add feedback to tasks you created")

    # Validate grade if provided
    if feedback_data.grade is not None:
        if not (0 <= feedback_data.grade <= 100):
            raise HTTPException(status_code=400, detail="Grade must be between 0 and 100")

    # Update task with feedback
    update_data = {
        "teacher_feedback": feedback_data.feedback,
        "feedback_at": datetime.utcnow(),
        "feedback_by": current_user['id']
    }

    if feedback_data.grade is not None:
        update_data["grade"] = feedback_data.grade
        update_data["graded_at"] = datetime.utcnow()

    tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )

    # Notify student
    student_id = task.get('assigned_to')
    task_title = task.get('title', 'Your task')

    notification_message = f"Your teacher has provided feedback on '{task_title}'"
    if feedback_data.grade is not None:
        notification_message = f"Your task '{task_title}' has been graded: {feedback_data.grade}/100"

    notifications_collection.insert_one({
        "user_id": student_id,
        "type": "feedback_received",
        "title": "Teacher Feedback",
        "message": notification_message,
        "reference_id": task_id,
        "read": False,
        "created_at": datetime.utcnow()
    })

    return {
        "message": "Feedback added successfully",
        "task_id": task_id,
        "feedback": feedback_data.feedback,
        "grade": feedback_data.grade
    }


@router.get("/stats")
async def get_review_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics for the task review dashboard
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Count tasks by status
    base_query = {
        "created_by": current_user['id']
    }

    total_tasks = tasks_collection.count_documents(base_query)

    todo_count = tasks_collection.count_documents({**base_query, "status": "todo"})
    in_progress_count = tasks_collection.count_documents({**base_query, "status": "in_progress"})
    completed_count = tasks_collection.count_documents({**base_query, "status": "completed"})

    # Count tasks with feedback
    with_feedback = tasks_collection.count_documents({
        **base_query,
        "teacher_feedback": {"$exists": True, "$ne": None}
    })

    # Count tasks with attachments
    with_attachments = tasks_collection.count_documents({
        **base_query,
        "attachments": {"$exists": True, "$ne": []}
    })

    # Get unique students count
    student_ids = tasks_collection.distinct("assigned_to", base_query)
    unique_students = len(student_ids)

    return {
        "total_tasks": total_tasks,
        "by_status": {
            "todo": todo_count,
            "in_progress": in_progress_count,
            "completed": completed_count
        },
        "with_feedback": with_feedback,
        "with_attachments": with_attachments,
        "unique_students": unique_students,
        "pending_review": completed_count - with_feedback
    }
