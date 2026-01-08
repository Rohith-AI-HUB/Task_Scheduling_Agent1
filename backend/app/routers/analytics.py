from fastapi import APIRouter, Depends
from app.db_config import tasks_collection, users_collection
from app.routers.tasks import get_current_user_id
from datetime import datetime, timedelta
from collections import Counter

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(user_id: str = Depends(get_current_user_id)):
    """Get comprehensive dashboard statistics for the current user"""
    user_tasks = list(tasks_collection.find({"assigned_to": user_id}))

    total_tasks = len(user_tasks)
    completed = len([t for t in user_tasks if t['status'] == 'completed'])
    in_progress = len([t for t in user_tasks if t['status'] == 'in_progress'])
    todo = len([t for t in user_tasks if t['status'] == 'todo'])

    # Calculate total hours remaining (exclude completed tasks)
    total_hours = sum(t.get('estimated_hours', 0) for t in user_tasks if t['status'] != 'completed')

    # Priority distribution
    priority_dist = Counter(t['priority'] for t in user_tasks)

    # Upcoming deadlines (next 5 tasks sorted by deadline)
    upcoming = [
        {
            "id": str(t['_id']),
            "title": t['title'],
            "deadline": t['deadline'].isoformat() if hasattr(t['deadline'], 'isoformat') else str(t['deadline']),
            "priority": t['priority']
        }
        for t in sorted(user_tasks, key=lambda x: x['deadline'] if x.get('deadline') else datetime.max)[:5]
    ]

    # Completion rate
    completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0

    # Average complexity
    avg_complexity = sum(t.get('complexity_score', 5) for t in user_tasks) / total_tasks if total_tasks > 0 else 0

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "in_progress": in_progress,
        "todo": todo,
        "total_hours_remaining": total_hours,
        "priority_distribution": dict(priority_dist),
        "upcoming_deadlines": upcoming,
        "completion_rate": round(completion_rate, 2),
        "average_complexity": round(avg_complexity, 2)
    }

@router.get("/workload")
async def get_workload_analysis(user_id: str = Depends(get_current_user_id)):
    """Get detailed workload analysis"""
    user_tasks = list(tasks_collection.find({"assigned_to": user_id}))

    # Tasks by day for the next 7 days
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    workload_by_day = []

    for i in range(7):
        day = today + timedelta(days=i)
        next_day = day + timedelta(days=1)

        tasks_on_day = [
            t for t in user_tasks
            if t.get('deadline') and day <= t['deadline'] < next_day and t['status'] != 'completed'
        ]

        workload_by_day.append({
            "date": day.isoformat(),
            "task_count": len(tasks_on_day),
            "total_hours": sum(t.get('estimated_hours', 0) for t in tasks_on_day),
            "tasks": [{"title": t['title'], "priority": t['priority']} for t in tasks_on_day]
        })

    return {
        "workload_by_day": workload_by_day,
        "peak_day": max(workload_by_day, key=lambda x: x['total_hours'])['date'] if workload_by_day else None,
        "total_upcoming_hours": sum(d['total_hours'] for d in workload_by_day)
    }
