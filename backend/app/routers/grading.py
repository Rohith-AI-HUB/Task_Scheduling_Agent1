"""
Grading Router - Week 2 Teacher Feature
Intelligent AI-powered grading assistant
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from app.db_config import (
    grade_suggestions_collection,
    tasks_collection,
    users_collection,
    extension_requests_collection,
    notifications_collection
)
from app.services.ai_grading_service import (
    generate_grading_explanation,
    calculate_grade_from_performance,
    analyze_student_performance_trend,
    identify_performance_strengths_weaknesses
)
from app.services.firebase_service import verify_firebase_token
from bson import ObjectId
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/grading", tags=["Grading"])


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


@router.post("/analyze-submission")
async def analyze_student_submission(
    task_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    AI analyzes a student's task completion and suggests a grade

    Analyzes:
    1. Time to completion vs estimated time
    2. Extension requests (penalize if excessive)
    3. Subtask completion rate
    4. Historical performance trend
    5. Task complexity adjustment

    Returns AI-suggested grade with detailed reasoning
    """

    # Only teachers can grade
    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access grading")

    # Get task details
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get student details
    student = users_collection.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if task is completed
    if task.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Task is not completed yet")

    # Gather performance data
    estimated_hours = task.get('estimated_hours', 4)
    actual_hours = task.get('time_spent_minutes', 0) / 60.0

    # Calculate days late (if any)
    completion_date = task.get('completion_date', task.get('updated_at', datetime.utcnow()))
    deadline = task.get('deadline', datetime.utcnow())

    if isinstance(completion_date, str):
        completion_date = datetime.fromisoformat(completion_date.replace('Z', '+00:00'))
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))

    days_late = max(0, (completion_date - deadline).days)
    completed_on_time = days_late == 0

    # Count subtasks
    subtasks = task.get('subtasks', [])
    total_subtasks = len(subtasks)
    subtasks_completed = sum(1 for st in subtasks if st.get('completed', False))

    # Count extension requests for this task
    extension_count = extension_requests_collection.count_documents({
        "task_id": task_id,
        "user_id": student_id
    })

    performance_data = {
        "estimated_hours": estimated_hours,
        "actual_hours": actual_hours,
        "completed_on_time": completed_on_time,
        "days_late": days_late,
        "subtasks_completed": subtasks_completed,
        "total_subtasks": total_subtasks,
        "extension_requests": extension_count,
        "complexity": task.get('complexity_score', 5)
    }

    # Calculate AI-suggested grade
    suggested_grade = calculate_grade_from_performance(performance_data, task)

    # Get student's historical performance
    historical_data = await analyze_student_performance_trend(student_id, tasks_collection)
    historical_average = historical_data.get('avg_grade', 75)

    # Identify strengths and weaknesses
    performance_analysis = identify_performance_strengths_weaknesses(performance_data)

    # AI generates detailed explanation
    ai_analysis = await generate_grading_explanation(
        task=task,
        student=student,
        performance_data=performance_data,
        suggested_grade=suggested_grade,
        historical_average=historical_average
    )

    # Save grade suggestion
    suggestion = {
        "task_id": task_id,
        "student_id": student_id,
        "teacher_id": current_user['id'],
        "ai_suggested_grade": suggested_grade,
        "ai_reasoning": ai_analysis.get('reasoning', ''),
        "performance_factors": performance_data,
        "strengths": performance_analysis.get('strength_areas', []),
        "weaknesses": performance_analysis.get('weakness_areas', []),
        "ai_strengths": ai_analysis.get('strengths', []),
        "ai_weaknesses": ai_analysis.get('weaknesses', []),
        "improvement_suggestions": ai_analysis.get('improvements', []),
        "encouragement": ai_analysis.get('encouragement', ''),
        "historical_context": {
            "average_grade": historical_average,
            "trend": historical_data.get('trend', 'no_data'),
            "recent_grades": historical_data.get('recent_performance', [])
        },
        "status": "pending",
        "created_at": datetime.utcnow()
    }

    result = grade_suggestions_collection.insert_one(suggestion)

    return {
        "suggestion_id": str(result.inserted_id),
        "suggested_grade": suggested_grade,
        "reasoning": ai_analysis.get('reasoning'),
        "strengths": ai_analysis.get('strengths', []),
        "weaknesses": ai_analysis.get('weaknesses', []),
        "improvements": ai_analysis.get('improvements', []),
        "encouragement": ai_analysis.get('encouragement', ''),
        "performance_summary": {
            "time_efficiency": f"{(actual_hours / max(estimated_hours, 0.5)):.1f}x estimated",
            "on_time": completed_on_time,
            "completion_rate": f"{(subtasks_completed / max(total_subtasks, 1)) * 100:.0f}%" if total_subtasks > 0 else "N/A",
            "extensions": extension_count
        },
        "historical_context": {
            "student_average": historical_average,
            "trend": historical_data.get('trend'),
            "performance_comparison": "above" if suggested_grade > historical_average else "below" if suggested_grade < historical_average else "consistent"
        }
    }


@router.put("/{suggestion_id}/finalize")
async def finalize_grade(
    suggestion_id: str,
    final_grade: float,
    teacher_comments: str,
    override_reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Teacher finalizes the grade (can override AI suggestion)

    Args:
        suggestion_id: Grade suggestion ID
        final_grade: Final grade (0-100)
        teacher_comments: Teacher's feedback for student
        override_reason: Reason if significantly different from AI suggestion
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can finalize grades")

    # Validate grade range
    if not (0 <= final_grade <= 100):
        raise HTTPException(status_code=400, detail="Grade must be between 0 and 100")

    # Get suggestion
    suggestion = grade_suggestions_collection.find_one({"_id": ObjectId(suggestion_id)})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Grade suggestion not found")

    ai_suggested_grade = suggestion.get('ai_suggested_grade', 0)
    grade_difference = abs(final_grade - ai_suggested_grade)

    # Require override reason if significantly different from AI
    if grade_difference > 10 and not override_reason:
        raise HTTPException(
            status_code=400,
            detail="Override reason required when grade differs significantly from AI suggestion"
        )

    # Update suggestion with final decision
    grade_suggestions_collection.update_one(
        {"_id": ObjectId(suggestion_id)},
        {
            "$set": {
                "final_grade": final_grade,
                "teacher_comments": teacher_comments,
                "teacher_override_reason": override_reason if grade_difference > 5 else None,
                "grade_difference": grade_difference,
                "status": "finalized",
                "finalized_at": datetime.utcnow(),
                "finalized_by": current_user['id']
            }
        }
    )

    # Update task with grade
    tasks_collection.update_one(
        {"_id": ObjectId(suggestion['task_id'])},
        {
            "$set": {
                "grade": final_grade,
                "teacher_feedback": teacher_comments,
                "graded_at": datetime.utcnow(),
                "graded_by": current_user['id']
            }
        }
    )

    # Notify student
    task = tasks_collection.find_one({"_id": ObjectId(suggestion['task_id'])})
    task_title = task.get('title', 'Your task') if task else 'Your task'

    notifications_collection.insert_one({
        "user_id": suggestion['student_id'],
        "type": "grade_received",
        "title": "Task Graded",
        "message": f"Your task '{task_title}' has been graded: {final_grade:.1f}/100",
        "reference_id": suggestion['task_id'],
        "read": False,
        "created_at": datetime.utcnow()
    })

    return {
        "message": "Grade finalized and student notified",
        "final_grade": final_grade,
        "ai_suggested_grade": ai_suggested_grade,
        "grade_difference": grade_difference,
        "ai_agreement": grade_difference <= 5,
        "override_applied": grade_difference > 5
    }


@router.get("/pending")
async def get_pending_grades(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all completed tasks pending grading for this teacher

    Returns list of student submissions awaiting grades
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Find completed tasks created by this teacher that don't have grades
    pending_tasks = list(tasks_collection.find({
        "created_by": current_user['id'],
        "status": "completed",
        "grade": {"$exists": False}
    }).sort("completion_date", -1).limit(50))

    # Enrich with student info
    submissions = []
    for task in pending_tasks:
        student = users_collection.find_one({"_id": ObjectId(task.get('assigned_to'))})

        if student:
            submissions.append({
                "id": str(task['_id']),
                "task_id": str(task['_id']),
                "task_title": task.get('title'),
                "student_id": str(student['_id']),
                "student_name": student.get('full_name', 'Unknown'),
                "completed_date": task.get('completion_date', task.get('updated_at')),
                "deadline": task.get('deadline'),
                "complexity": task.get('complexity_score', 5),
                "estimated_hours": task.get('estimated_hours', 0)
            })

    return {
        "submissions": submissions,
        "count": len(submissions)
    }


@router.get("/history")
async def get_grading_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Get teacher's grading history with AI agreement metrics
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Get finalized grades
    history = list(grade_suggestions_collection.find({
        "teacher_id": current_user['id'],
        "status": "finalized"
    }).sort("finalized_at", -1).limit(limit))

    # Calculate AI agreement stats
    total_graded = len(history)
    ai_agreements = sum(1 for h in history if h.get('grade_difference', 0) <= 5)
    agreement_rate = (ai_agreements / total_graded * 100) if total_graded > 0 else 0

    # Enrich history with task and student info
    enriched_history = []
    for grade in history:
        task = tasks_collection.find_one({"_id": ObjectId(grade['task_id'])})
        student = users_collection.find_one({"_id": ObjectId(grade['student_id'])})

        enriched_history.append({
            "id": str(grade['_id']),
            "task_title": task.get('title', 'Unknown') if task else 'Unknown',
            "student_name": student.get('full_name', 'Unknown') if student else 'Unknown',
            "ai_suggested_grade": grade.get('ai_suggested_grade'),
            "final_grade": grade.get('final_grade'),
            "grade_difference": grade.get('grade_difference', 0),
            "ai_agreement": grade.get('grade_difference', 0) <= 5,
            "graded_at": grade.get('finalized_at')
        })

    return {
        "history": enriched_history,
        "stats": {
            "total_graded": total_graded,
            "ai_agreements": ai_agreements,
            "agreement_rate": round(agreement_rate, 1)
        }
    }
