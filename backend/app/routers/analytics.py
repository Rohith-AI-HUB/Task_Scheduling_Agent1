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

    # Upcoming deadlines (next 5 non-completed tasks with future deadlines, sorted by deadline)
    now = datetime.utcnow()
    upcoming_tasks = [
        t for t in user_tasks
        if t['status'] != 'completed' and t.get('deadline') and t['deadline'] >= now
    ]
    upcoming = [
        {
            "id": str(t['_id']),
            "title": t['title'],
            "deadline": t['deadline'].isoformat() if hasattr(t['deadline'], 'isoformat') else str(t['deadline']),
            "priority": t['priority']
        }
        for t in sorted(upcoming_tasks, key=lambda x: x['deadline'])[:5]
    ]

    # Completion rate
    completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0

    # Average complexity
    avg_complexity = sum(t.get('complexity_score', 5) for t in user_tasks) / total_tasks if total_tasks > 0 else 0

    # Generate strategic insights based on actual data
    insights = []

    # Insight 1: Task completion pattern
    if completion_rate >= 80:
        insights.append({
            "type": "productivity",
            "title": "High Performer",
            "description": f"Excellent work! You've completed {completion_rate:.0f}% of your tasks. Keep up the momentum!"
        })
    elif completion_rate >= 50:
        insights.append({
            "type": "productivity",
            "title": "Steady Progress",
            "description": f"You're at {completion_rate:.0f}% completion. Focus on clearing your backlog to boost productivity."
        })
    else:
        insights.append({
            "type": "productivity",
            "title": "Room for Growth",
            "description": f"Your completion rate is {completion_rate:.0f}%. Try tackling smaller tasks first to build momentum."
        })

    # Insight 2: Complexity analysis
    high_complexity_tasks = [t for t in user_tasks if t.get('complexity_score', 5) >= 7 and t['status'] != 'completed']
    if len(high_complexity_tasks) > 0:
        insights.append({
            "type": "complexity",
            "title": "Complexity Alert",
            "description": f"You have {len(high_complexity_tasks)} high-complexity task{'s' if len(high_complexity_tasks) > 1 else ''} pending. Consider breaking them into smaller subtasks."
        })
    else:
        insights.append({
            "type": "complexity",
            "title": "Balanced Workload",
            "description": "Your task complexity is well-distributed. Great job managing your workload!"
        })

    # Insight 3: Urgent tasks warning
    urgent_tasks = [t for t in user_tasks if t.get('priority') == 'urgent' and t['status'] != 'completed']
    if len(urgent_tasks) > 0:
        insights.append({
            "type": "urgent",
            "title": "Urgent Attention Needed",
            "description": f"You have {len(urgent_tasks)} urgent task{'s' if len(urgent_tasks) > 1 else ''} that need{'s' if len(urgent_tasks) == 1 else ''} immediate attention."
        })

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "in_progress": in_progress,
        "todo": todo,
        "total_hours_remaining": total_hours,
        "priority_distribution": dict(priority_dist),
        "upcoming_deadlines": upcoming,
        "completion_rate": round(completion_rate, 2),
        "average_complexity": round(avg_complexity, 2),
        "insights": insights
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

@router.get("/extended-workload")
async def get_extended_workload(days: int = 30, user_id: str = Depends(get_current_user_id)):
    """Get extended workload data for heat map calendar (30 days default)"""
    user_tasks = list(tasks_collection.find({"assigned_to": user_id}))

    # Get activity for the last N days
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    activity_by_day = []

    for i in range(days):
        day = today - timedelta(days=(days - 1 - i))
        next_day = day + timedelta(days=1)

        # Count tasks with deadlines on this day (including completed)
        tasks_on_day = [
            t for t in user_tasks
            if t.get('deadline') and day <= t['deadline'] < next_day
        ]

        activity_by_day.append({
            "date": day.isoformat(),
            "task_count": len(tasks_on_day),
            "total_hours": sum(t.get('estimated_hours', 0) for t in tasks_on_day),
            "completed_count": len([t for t in tasks_on_day if t['status'] == 'completed'])
        })

    return {
        "activity_by_day": activity_by_day,
        "total_days": days
    }

@router.get("/productivity-metrics")
async def get_productivity_metrics(user_id: str = Depends(get_current_user_id)):
    """Calculate productivity score and related metrics"""
    user_tasks = list(tasks_collection.find({"assigned_to": user_id}))

    total_tasks = len(user_tasks)
    if total_tasks == 0:
        return {
            "productivity_score": 0,
            "on_time_completion_rate": 0,
            "average_time_per_task": 0,
            "focus_efficiency": 0,
            "weekly_trend": []
        }

    completed_tasks = [t for t in user_tasks if t['status'] == 'completed']
    completed_count = len(completed_tasks)

    # Calculate on-time completion rate
    on_time_count = 0
    for task in completed_tasks:
        if task.get('completion_date') and task.get('deadline'):
            completion_date = task['completion_date']
            deadline = task['deadline']
            if completion_date <= deadline:
                on_time_count += 1

    on_time_rate = (on_time_count / completed_count * 100) if completed_count > 0 else 0

    # Average time per task (from estimated hours)
    avg_time = sum(t.get('estimated_hours', 0) for t in completed_tasks) / completed_count if completed_count > 0 else 0

    # Focus efficiency (placeholder - would integrate with focus sessions in production)
    # For now, use completion rate as proxy
    completion_rate = (completed_count / total_tasks * 100) if total_tasks > 0 else 0
    focus_efficiency = completion_rate  # Simplified

    # Calculate productivity score using weighted formula
    # completion_rate (40%) + focus_efficiency (30%) + on_time_rate (30%)
    productivity_score = (completion_rate * 0.4) + (focus_efficiency * 0.3) + (on_time_rate * 0.3)

    # Weekly trend (last 4 weeks)
    weekly_trend = []
    for week in range(4):
        week_start = datetime.utcnow() - timedelta(days=7 * (week + 1))
        week_end = datetime.utcnow() - timedelta(days=7 * week)

        week_tasks = [
            t for t in completed_tasks
            if t.get('completion_date') and week_start <= t['completion_date'] < week_end
        ]

        weekly_trend.insert(0, {
            "week": f"Week {4 - week}",
            "completed": len(week_tasks)
        })

    return {
        "productivity_score": round(productivity_score, 1),
        "on_time_completion_rate": round(on_time_rate, 1),
        "average_time_per_task": round(avg_time, 1),
        "focus_efficiency": round(focus_efficiency, 1),
        "weekly_trend": weekly_trend
    }
