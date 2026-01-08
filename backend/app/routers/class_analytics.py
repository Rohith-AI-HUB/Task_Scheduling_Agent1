"""
Class Analytics Router - Week 2 Teacher Feature
Provides class-wide performance insights and at-risk student detection
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from app.db_config import (
    class_analytics_collection,
    tasks_collection,
    users_collection,
    extension_requests_collection,
    stress_logs_collection,
    grade_suggestions_collection
)
from app.services.firebase_service import verify_firebase_token
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict
from collections import defaultdict

router = APIRouter(prefix="/api/class", tags=["Class Analytics"])


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


@router.get("/analytics")
async def get_class_analytics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive class performance analytics

    Returns:
    - Overall class metrics
    - At-risk students
    - Top performers
    - Common struggle areas
    - Grade distribution
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access class analytics")

    teacher_id = current_user['id']

    # Get all tasks created by this teacher
    all_tasks = list(tasks_collection.find({"created_by": teacher_id}))

    if not all_tasks:
        return {
            "message": "No tasks found. Create some tasks first!",
            "total_tasks": 0,
            "students": []
        }

    # Get unique students assigned to tasks
    student_ids = list(set(task.get('assigned_to') for task in all_tasks if task.get('assigned_to')))

    # Analyze each student
    student_analytics = []
    at_risk_students = []
    top_performers = []

    for student_id in student_ids:
        student = users_collection.find_one({"_id": ObjectId(student_id)})
        if not student:
            continue

        student_tasks = [t for t in all_tasks if t.get('assigned_to') == student_id]

        # Calculate metrics
        total_tasks = len(student_tasks)
        completed_tasks = [t for t in student_tasks if t.get('status') == 'completed']
        overdue_tasks = [
            t for t in student_tasks
            if t.get('status') != 'completed' and t.get('deadline', datetime.utcnow()) < datetime.utcnow()
        ]

        completion_rate = (len(completed_tasks) / total_tasks * 100) if total_tasks > 0 else 0

        # Calculate average grade
        graded_tasks = [t for t in completed_tasks if t.get('grade') is not None]
        avg_grade = sum(t.get('grade', 0) for t in graded_tasks) / len(graded_tasks) if graded_tasks else 0

        # Count extension requests
        extension_count = extension_requests_collection.count_documents({"user_id": student_id})

        # Get recent stress level
        recent_stress = stress_logs_collection.find_one(
            {"user_id": student_id},
            sort=[("timestamp", -1)]
        )
        stress_level = recent_stress.get('objective_score', 0) if recent_stress else 0

        # Calculate risk score
        risk_factors = []
        risk_score = 0

        if completion_rate < 60:
            risk_factors.append("Low completion rate")
            risk_score += 3

        if len(overdue_tasks) > 2:
            risk_factors.append(f"{len(overdue_tasks)} overdue tasks")
            risk_score += 2

        if extension_count > 3:
            risk_factors.append("Frequent extension requests")
            risk_score += 2

        if avg_grade > 0 and avg_grade < 65:
            risk_factors.append("Low average grade")
            risk_score += 3

        if stress_level > 7:
            risk_factors.append("High stress level")
            risk_score += 2

        # Grade trend (if we have multiple grades)
        if len(graded_tasks) >= 3:
            recent_grades = [t.get('grade', 0) for t in sorted(graded_tasks, key=lambda x: x.get('graded_at', datetime.min), reverse=True)[:3]]
            older_grades = [t.get('grade', 0) for t in sorted(graded_tasks, key=lambda x: x.get('graded_at', datetime.min), reverse=True)[3:6]]

            if older_grades:
                recent_avg = sum(recent_grades) / len(recent_grades)
                older_avg = sum(older_grades) / len(older_grades)

                if recent_avg < older_avg - 10:
                    risk_factors.append("Declining grades")
                    risk_score += 2

        student_data = {
            "student_id": str(student['_id']),
            "student_name": student.get('full_name', 'Unknown'),
            "email": student.get('email', ''),
            "total_tasks": total_tasks,
            "completed_tasks": len(completed_tasks),
            "overdue_tasks": len(overdue_tasks),
            "completion_rate": round(completion_rate, 1),
            "average_grade": round(avg_grade, 1) if avg_grade > 0 else None,
            "extension_requests": extension_count,
            "stress_level": round(stress_level, 1),
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "is_at_risk": risk_score >= 4
        }

        student_analytics.append(student_data)

        # Categorize students
        if risk_score >= 4:
            at_risk_students.append(student_data)
        elif avg_grade >= 85 and completion_rate >= 90:
            top_performers.append(student_data)

    # Sort
    at_risk_students.sort(key=lambda x: x['risk_score'], reverse=True)
    top_performers.sort(key=lambda x: x['average_grade'] or 0, reverse=True)

    # Calculate class-wide metrics
    total_students = len(student_analytics)
    class_completion_rate = sum(s['completion_rate'] for s in student_analytics) / total_students if total_students > 0 else 0
    class_avg_grade = sum(s['average_grade'] or 0 for s in student_analytics) / total_students if total_students > 0 else 0

    # Grade distribution
    grade_distribution = {
        "A (90-100)": sum(1 for s in student_analytics if s['average_grade'] and s['average_grade'] >= 90),
        "B (80-89)": sum(1 for s in student_analytics if s['average_grade'] and 80 <= s['average_grade'] < 90),
        "C (70-79)": sum(1 for s in student_analytics if s['average_grade'] and 70 <= s['average_grade'] < 80),
        "D (60-69)": sum(1 for s in student_analytics if s['average_grade'] and 60 <= s['average_grade'] < 70),
        "F (0-59)": sum(1 for s in student_analytics if s['average_grade'] and s['average_grade'] < 60),
        "Not Graded": sum(1 for s in student_analytics if not s['average_grade'])
    }

    # Common struggle areas (tasks with low completion rates)
    task_completion_rates = defaultdict(lambda: {"completed": 0, "total": 0, "title": ""})

    for task in all_tasks:
        task_id = str(task['_id'])
        task_completion_rates[task_id]["title"] = task.get('title', 'Untitled')
        task_completion_rates[task_id]["total"] += 1
        if task.get('status') == 'completed':
            task_completion_rates[task_id]["completed"] += 1

    struggle_areas = []
    for task_id, data in task_completion_rates.items():
        if data["total"] >= 3:  # Only consider tasks assigned to at least 3 students
            rate = (data["completed"] / data["total"] * 100) if data["total"] > 0 else 0
            if rate < 60:  # Less than 60% completion rate
                struggle_areas.append({
                    "task_title": data["title"],
                    "completion_rate": round(rate, 1),
                    "students_struggling": data["total"] - data["completed"]
                })

    struggle_areas.sort(key=lambda x: x['completion_rate'])

    # Save analytics snapshot
    analytics_snapshot = {
        "teacher_id": teacher_id,
        "total_students": total_students,
        "total_tasks": len(all_tasks),
        "class_completion_rate": round(class_completion_rate, 1),
        "class_average_grade": round(class_avg_grade, 1),
        "at_risk_count": len(at_risk_students),
        "top_performers_count": len(top_performers),
        "grade_distribution": grade_distribution,
        "timestamp": datetime.utcnow()
    }

    class_analytics_collection.insert_one(analytics_snapshot)

    return {
        "class_metrics": {
            "total_students": total_students,
            "total_tasks": len(all_tasks),
            "class_completion_rate": round(class_completion_rate, 1),
            "class_average_grade": round(class_avg_grade, 1) if class_avg_grade > 0 else None,
            "at_risk_count": len(at_risk_students),
            "top_performers_count": len(top_performers)
        },
        "grade_distribution": grade_distribution,
        "at_risk_students": at_risk_students[:10],  # Top 10 most at-risk
        "top_performers": top_performers[:10],  # Top 10 performers
        "struggle_areas": struggle_areas[:5],  # Top 5 struggling tasks
        "all_students": sorted(student_analytics, key=lambda x: x['student_name'])
    }


@router.get("/at-risk-students")
async def get_at_risk_students(
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed list of at-risk students with intervention recommendations
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    # Get analytics first
    analytics = await get_class_analytics(current_user)

    at_risk_students = analytics.get('at_risk_students', [])

    # Add intervention recommendations
    for student in at_risk_students:
        recommendations = []

        if "Low completion rate" in student['risk_factors']:
            recommendations.append("Schedule one-on-one meeting to discuss time management")

        if "overdue tasks" in str(student['risk_factors']):
            recommendations.append("Review current workload and consider extension")

        if "Low average grade" in student['risk_factors']:
            recommendations.append("Offer additional tutoring or study resources")

        if "High stress level" in student['risk_factors']:
            recommendations.append("Refer to counseling services or wellness resources")

        if "Declining grades" in student['risk_factors']:
            recommendations.append("Investigate recent changes affecting performance")

        if not recommendations:
            recommendations.append("Monitor progress and check in regularly")

        student['intervention_recommendations'] = recommendations

    return {
        "at_risk_students": at_risk_students,
        "total_at_risk": len(at_risk_students)
    }


@router.get("/trends")
async def get_class_trends(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    Get class performance trends over time
    """

    if current_user.get('role') != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    teacher_id = current_user['id']

    # Get historical analytics snapshots
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    snapshots = list(class_analytics_collection.find({
        "teacher_id": teacher_id,
        "timestamp": {"$gte": cutoff_date}
    }).sort("timestamp", 1))

    if not snapshots:
        # Generate current snapshot if none exist
        await get_class_analytics(current_user)

        snapshots = list(class_analytics_collection.find({
            "teacher_id": teacher_id,
            "timestamp": {"$gte": cutoff_date}
        }).sort("timestamp", 1))

    trend_data = []
    for snapshot in snapshots:
        trend_data.append({
            "date": snapshot['timestamp'].strftime('%Y-%m-%d'),
            "completion_rate": snapshot.get('class_completion_rate', 0),
            "average_grade": snapshot.get('class_average_grade', 0),
            "at_risk_count": snapshot.get('at_risk_count', 0),
            "total_students": snapshot.get('total_students', 0)
        })

    return {
        "trends": trend_data,
        "period_days": days
    }
