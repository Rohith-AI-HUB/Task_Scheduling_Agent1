from fastapi import APIRouter, Depends, HTTPException
from app.db_config import db, tasks_collection
from app.routers.auth import get_current_user
from app.services.ollama_service import generate_ai_response
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Optional
import json

router = APIRouter(prefix="/api/stress", tags=["Stress Management"])

stress_logs_collection = db["stress_logs"]

# MongoDB Schema: stress_logs
# {
#     "_id": ObjectId,
#     "user_id": str,
#     "objective_score": float,  # AI-calculated (0-10)
#     "subjective_score": float,  # User-reported (0-10)
#     "breakdown": {
#         "complexity_contribution": float,
#         "time_pressure": float,
#         "deadline_overlap": float,
#         "historical_pattern": float
#     },
#     "recommendations": List[str],
#     "notes": str,
#     "timestamp": datetime
# }


@router.get("/current")
async def get_current_stress_level(current_user: dict = Depends(get_current_user)):
    """
    Calculate real-time stress level based on:
    1. Upcoming deadlines (time pressure)
    2. Task complexity
    3. Number of overlapping deadlines
    4. Historical completion patterns
    """

    user_id = str(current_user["_id"])

    # Get active tasks
    active_tasks = list(tasks_collection.find({
        "assigned_to": user_id,
        "status": {"$in": ["todo", "in_progress"]}
    }))

    if not active_tasks:
        return {
            "objective_score": 0,
            "level": "relaxed",
            "message": "No active tasks! You're stress-free! 🎉",
            "breakdown": {
                "complexity_contribution": 0,
                "time_pressure": 0,
                "deadline_overlap": 0,
                "historical_pattern": 0
            },
            "recommendations": ["Great job staying on top of things!"]
        }

    # Calculate stress factors
    now = datetime.now()

    # 1. Time Pressure (0-4 points)
    urgent_tasks = 0
    for task in active_tasks:
        deadline = task.get("deadline")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            hours_until = (deadline - now).total_seconds() / 3600
            if hours_until < 24:
                urgent_tasks += 2
            elif hours_until < 72:
                urgent_tasks += 1

    time_pressure = min(urgent_tasks, 4)

    # 2. Complexity (0-3 points)
    avg_complexity = sum(task.get("complexity_score", 5) for task in active_tasks) / len(active_tasks)
    complexity_contribution = (avg_complexity / 10) * 3

    # 3. Deadline Overlap (0-2 points)
    deadlines_this_week = 0
    week_later = now + timedelta(days=7)
    for task in active_tasks:
        deadline = task.get("deadline")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            if now <= deadline <= week_later:
                deadlines_this_week += 1

    deadline_overlap = min(deadlines_this_week / 3, 2)

    # 4. Historical Pattern (0-1 point)
    # Check recent stress logs
    recent_logs = list(stress_logs_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": now - timedelta(days=7)}
    }).sort("timestamp", -1).limit(5))

    if recent_logs:
        avg_recent_stress = sum(log.get("objective_score", 5) for log in recent_logs) / len(recent_logs)
        historical_pattern = (avg_recent_stress / 10) * 1
    else:
        historical_pattern = 0

    # Calculate total (0-10 scale)
    objective_score = time_pressure + complexity_contribution + deadline_overlap + historical_pattern

    # Generate AI recommendations
    ai_recommendations = await generate_stress_recommendations(
        objective_score,
        active_tasks,
        urgent_tasks,
        current_user
    )

    # Determine stress level
    if objective_score <= 3:
        level = "relaxed"
        color = "green"
        emoji = "😊"
    elif objective_score <= 6:
        level = "moderate"
        color = "yellow"
        emoji = "😐"
    elif objective_score <= 8:
        level = "high"
        color = "orange"
        emoji = "😰"
    else:
        level = "critical"
        color = "red"
        emoji = "🔥"

    # Save stress log
    stress_log = {
        "user_id": user_id,
        "objective_score": round(objective_score, 2),
        "subjective_score": None,  # User can update later
        "breakdown": {
            "complexity_contribution": round(complexity_contribution, 2),
            "time_pressure": round(time_pressure, 2),
            "deadline_overlap": round(deadline_overlap, 2),
            "historical_pattern": round(historical_pattern, 2)
        },
        "recommendations": ai_recommendations,
        "timestamp": now
    }

    stress_logs_collection.insert_one(stress_log)

    return {
        "objective_score": round(objective_score, 2),
        "level": level,
        "color": color,
        "emoji": emoji,
        "message": f"{emoji} You're currently at {level} stress level",
        "breakdown": stress_log["breakdown"],
        "recommendations": ai_recommendations,
        "active_tasks_count": len(active_tasks),
        "urgent_tasks_count": urgent_tasks,
        "deadlines_this_week": deadlines_this_week
    }


@router.post("/log-feeling")
async def log_subjective_stress(
    subjective_score: float,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Allow user to log how they're actually feeling (1-10)"""

    user_id = str(current_user["_id"])

    if not 0 <= subjective_score <= 10:
        raise HTTPException(400, "Score must be between 0 and 10")

    # Get latest objective score
    latest_log = stress_logs_collection.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )

    if latest_log and (datetime.now() - latest_log["timestamp"]).seconds < 3600:
        # Update existing log if within 1 hour
        stress_logs_collection.update_one(
            {"_id": latest_log["_id"]},
            {"$set": {
                "subjective_score": subjective_score,
                "notes": notes
            }}
        )
        log_id = latest_log["_id"]
    else:
        # Create new log
        new_log = {
            "user_id": user_id,
            "objective_score": None,
            "subjective_score": subjective_score,
            "breakdown": {},
            "recommendations": [],
            "notes": notes,
            "timestamp": datetime.now()
        }
        result = stress_logs_collection.insert_one(new_log)
        log_id = result.inserted_id

    return {
        "message": "Stress feeling logged successfully",
        "log_id": str(log_id),
        "subjective_score": subjective_score
    }


@router.get("/history")
async def get_stress_history(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get stress history for visualization"""

    user_id = str(current_user["_id"])
    cutoff_date = datetime.now() - timedelta(days=days)

    logs = list(stress_logs_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": cutoff_date}
    }).sort("timestamp", 1))

    # Format for frontend
    history = []
    for log in logs:
        history.append({
            "timestamp": log["timestamp"].isoformat(),
            "objective_score": log.get("objective_score"),
            "subjective_score": log.get("subjective_score"),
            "breakdown": log.get("breakdown", {}),
            "recommendations": log.get("recommendations", [])
        })

    return {
        "history": history,
        "days": days,
        "total_logs": len(history)
    }


async def generate_stress_recommendations(
    stress_score: float,
    active_tasks: list,
    urgent_count: int,
    user: dict
) -> List[str]:
    """Use AI to generate personalized stress management recommendations"""

    try:
        prompt = f"""You are a supportive AI assistant helping a student manage their workload stress.

Student: {user.get('full_name', 'Student')}
Current Stress Score: {stress_score:.1f}/10
Active Tasks: {len(active_tasks)}
Urgent Deadlines: {urgent_count}

Task Overview:
{chr(10).join([f"- {task.get('title', 'Untitled')} (Deadline: {task.get('deadline', 'No deadline')}, Complexity: {task.get('complexity_score', 'N/A')}/10)" for task in active_tasks[:5]])}

Based on this information, provide 3-5 specific, actionable recommendations to help reduce stress and improve productivity.

Format your response as a JSON array of strings:
["recommendation 1", "recommendation 2", ...]

Keep recommendations:
- Specific and actionable
- Encouraging and supportive
- Practical for a student
- Focused on time management and prioritization

Example recommendations:
- "Start with the most urgent task (due in 24h) to reduce immediate pressure"
- "Break down complex tasks into smaller 30-minute chunks"
- "Consider requesting an extension for the lowest-priority task"
- "Schedule a 15-minute break between tasks to avoid burnout"
"""

        response = await generate_ai_response(prompt)

        # Try to parse JSON from response
        try:
            # Find JSON array in response
            start = response.find('[')
            end = response.rfind(']') + 1
            if start != -1 and end > start:
                recommendations = json.loads(response[start:end])
                return recommendations[:5]  # Max 5 recommendations
        except:
            pass

        # Fallback recommendations
        return [
            f"Focus on your {urgent_count} urgent task(s) first",
            "Break large tasks into smaller, manageable chunks",
            "Take regular 5-minute breaks to maintain focus",
            "Consider using the Pomodoro technique for better time management",
            "Don't hesitate to ask for help if you're struggling"
        ]

    except Exception as e:
        print(f"AI recommendation error: {e}")
        return [
            "Prioritize tasks by deadline",
            "Break tasks into smaller steps",
            "Take breaks to avoid burnout",
            "Focus on one task at a time"
        ]
