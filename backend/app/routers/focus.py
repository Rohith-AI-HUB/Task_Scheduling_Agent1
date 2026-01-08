from fastapi import APIRouter, Depends, HTTPException
from app.db_config import db, tasks_collection
from app.routers.auth import get_current_user
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/api/focus", tags=["Focus Mode"])

focus_sessions_collection = db["focus_sessions"]

# MongoDB Schema: focus_sessions
# {
#     "_id": ObjectId,
#     "user_id": str,
#     "task_id": str,  # Optional
#     "session_type": str,  # "pomodoro", "deep_work", "short_burst"
#     "planned_duration_minutes": int,
#     "actual_duration_minutes": int,
#     "start_time": datetime,
#     "end_time": datetime,
#     "completed": bool,
#     "interruptions": int,
#     "interruption_log": [{
#         "type": str,  # "notification", "distraction", "break"
#         "timestamp": datetime
#     }],
#     "productivity_rating": int,  # 1-5, user-reported
#     "notes": str
# }


class StartSessionRequest(BaseModel):
    task_id: Optional[str] = None
    session_type: str = "pomodoro"  # "pomodoro", "deep_work", "short_burst"
    planned_duration_minutes: int = 25


class InterruptionRequest(BaseModel):
    interruption_type: str  # "notification", "distraction", "break"


class CompleteSessionRequest(BaseModel):
    productivity_rating: Optional[int] = None  # 1-5
    notes: Optional[str] = None


@router.post("/start-session")
async def start_focus_session(
    request: StartSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new focus session

    Session types:
    - pomodoro: 25 min work + 5 min break
    - deep_work: 90 min focused work
    - short_burst: 15 min quick task
    """

    user_id = str(current_user["_id"])

    # Check if there's an active session
    active_session = focus_sessions_collection.find_one({
        "user_id": user_id,
        "completed": False
    })

    if active_session:
        raise HTTPException(400, "You already have an active focus session. Complete or cancel it first.")

    # Validate session type
    valid_types = ["pomodoro", "deep_work", "short_burst"]
    if request.session_type not in valid_types:
        raise HTTPException(400, f"Invalid session type. Must be one of: {', '.join(valid_types)}")

    # Set duration based on type if not provided
    if request.session_type == "pomodoro" and request.planned_duration_minutes == 25:
        duration = 25
    elif request.session_type == "deep_work":
        duration = 90
    elif request.session_type == "short_burst":
        duration = 15
    else:
        duration = request.planned_duration_minutes

    # Verify task exists if provided
    if request.task_id:
        task = tasks_collection.find_one({"_id": ObjectId(request.task_id)})
        if not task:
            raise HTTPException(404, "Task not found")
        if task.get("assigned_to") != user_id:
            raise HTTPException(403, "Task not assigned to you")
        task_title = task.get("title", "Untitled")
    else:
        task_title = None

    now = datetime.now()
    end_time = now + timedelta(minutes=duration)

    # Create session
    session = {
        "user_id": user_id,
        "task_id": request.task_id,
        "task_title": task_title,
        "session_type": request.session_type,
        "planned_duration_minutes": duration,
        "actual_duration_minutes": 0,
        "start_time": now,
        "end_time": None,
        "expected_end_time": end_time,
        "completed": False,
        "interruptions": 0,
        "interruption_log": [],
        "productivity_rating": None,
        "notes": None
    }

    result = focus_sessions_collection.insert_one(session)

    return {
        "session_id": str(result.inserted_id),
        "message": f"🎯 Focus session started! Stay focused for {duration} minutes.",
        "session_type": request.session_type,
        "planned_duration_minutes": duration,
        "start_time": now.isoformat(),
        "expected_end_time": end_time.isoformat(),
        "task_title": task_title,
        "tips": get_session_tips(request.session_type)
    }


@router.post("/{session_id}/interrupt")
async def log_interruption(
    session_id: str,
    request: InterruptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Log an interruption during the focus session"""

    user_id = str(current_user["_id"])

    session = focus_sessions_collection.find_one({
        "_id": ObjectId(session_id),
        "user_id": user_id
    })

    if not session:
        raise HTTPException(404, "Session not found")

    if session.get("completed"):
        raise HTTPException(400, "Session already completed")

    # Add interruption
    interruption = {
        "type": request.interruption_type,
        "timestamp": datetime.now()
    }

    focus_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$inc": {"interruptions": 1},
            "$push": {"interruption_log": interruption}
        }
    )

    return {
        "message": "Interruption logged",
        "total_interruptions": session.get("interruptions", 0) + 1,
        "tip": "Try to minimize interruptions for better focus! Consider turning off notifications."
    }


@router.post("/{session_id}/complete")
async def complete_focus_session(
    session_id: str,
    request: CompleteSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Complete a focus session and log productivity"""

    user_id = str(current_user["_id"])

    session = focus_sessions_collection.find_one({
        "_id": ObjectId(session_id),
        "user_id": user_id
    })

    if not session:
        raise HTTPException(404, "Session not found")

    if session.get("completed"):
        raise HTTPException(400, "Session already completed")

    now = datetime.now()
    actual_duration = (now - session["start_time"]).total_seconds() / 60

    # Update session
    focus_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "completed": True,
                "end_time": now,
                "actual_duration_minutes": round(actual_duration, 2),
                "productivity_rating": request.productivity_rating,
                "notes": request.notes
            }
        }
    )

    # Update task time tracking if task_id exists
    if session.get("task_id"):
        tasks_collection.update_one(
            {"_id": ObjectId(session["task_id"])},
            {
                "$inc": {"time_spent_minutes": round(actual_duration, 2)}
            }
        )

    # Generate completion message
    planned = session["planned_duration_minutes"]
    if actual_duration >= planned * 0.9:
        message = f"🎉 Great job! You completed the full {planned}-minute session!"
    elif actual_duration >= planned * 0.5:
        message = f"👍 Good effort! You focused for {round(actual_duration)} minutes."
    else:
        message = f"💪 You focused for {round(actual_duration)} minutes. Keep building that focus muscle!"

    return {
        "message": message,
        "session_summary": {
            "planned_duration": planned,
            "actual_duration": round(actual_duration, 2),
            "completion_rate": round((actual_duration / planned) * 100, 1),
            "interruptions": session.get("interruptions", 0),
            "productivity_rating": request.productivity_rating
        },
        "stats": await get_user_focus_stats(user_id)
    }


@router.delete("/{session_id}")
async def cancel_focus_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an active focus session"""

    user_id = str(current_user["_id"])

    session = focus_sessions_collection.find_one({
        "_id": ObjectId(session_id),
        "user_id": user_id
    })

    if not session:
        raise HTTPException(404, "Session not found")

    if session.get("completed"):
        raise HTTPException(400, "Cannot cancel completed session")

    # Mark as cancelled (we'll keep the data for analytics)
    focus_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "completed": True,
                "cancelled": True,
                "end_time": datetime.now()
            }
        }
    )

    return {"message": "Focus session cancelled"}


@router.get("/active")
async def get_active_session(current_user: dict = Depends(get_current_user)):
    """Get current active focus session"""

    user_id = str(current_user["_id"])

    session = focus_sessions_collection.find_one({
        "user_id": user_id,
        "completed": False
    })

    if not session:
        return {"active_session": None}

    now = datetime.now()
    elapsed = (now - session["start_time"]).total_seconds() / 60
    remaining = max(0, session["planned_duration_minutes"] - elapsed)

    return {
        "active_session": {
            "session_id": str(session["_id"]),
            "task_id": session.get("task_id"),
            "task_title": session.get("task_title"),
            "session_type": session["session_type"],
            "planned_duration_minutes": session["planned_duration_minutes"],
            "elapsed_minutes": round(elapsed, 2),
            "remaining_minutes": round(remaining, 2),
            "start_time": session["start_time"].isoformat(),
            "expected_end_time": session["expected_end_time"].isoformat(),
            "interruptions": session.get("interruptions", 0)
        }
    }


@router.get("/stats")
async def get_focus_statistics(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get focus session statistics"""

    user_id = str(current_user["_id"])
    stats = await get_user_focus_stats(user_id, days)

    return stats


async def get_user_focus_stats(user_id: str, days: int = 7) -> dict:
    """Calculate user's focus statistics"""

    cutoff_date = datetime.now() - timedelta(days=days)

    sessions = list(focus_sessions_collection.find({
        "user_id": user_id,
        "completed": True,
        "start_time": {"$gte": cutoff_date},
        "cancelled": {"$ne": True}
    }))

    if not sessions:
        return {
            "total_sessions": 0,
            "total_focus_time": 0,
            "average_session_length": 0,
            "total_interruptions": 0,
            "average_productivity_rating": 0,
            "completion_rate": 0,
            "sessions_by_type": {}
        }

    total_sessions = len(sessions)
    total_focus_time = sum(s.get("actual_duration_minutes", 0) for s in sessions)
    total_interruptions = sum(s.get("interruptions", 0) for s in sessions)

    # Calculate average productivity rating
    rated_sessions = [s for s in sessions if s.get("productivity_rating")]
    avg_productivity = (
        sum(s["productivity_rating"] for s in rated_sessions) / len(rated_sessions)
        if rated_sessions else 0
    )

    # Calculate completion rate
    completed_full = sum(
        1 for s in sessions
        if s.get("actual_duration_minutes", 0) >= s.get("planned_duration_minutes", 0) * 0.9
    )
    completion_rate = (completed_full / total_sessions * 100) if total_sessions > 0 else 0

    # Sessions by type
    sessions_by_type = {}
    for session in sessions:
        stype = session.get("session_type", "unknown")
        sessions_by_type[stype] = sessions_by_type.get(stype, 0) + 1

    return {
        "total_sessions": total_sessions,
        "total_focus_time": round(total_focus_time, 2),
        "average_session_length": round(total_focus_time / total_sessions, 2) if total_sessions > 0 else 0,
        "total_interruptions": total_interruptions,
        "average_interruptions_per_session": round(total_interruptions / total_sessions, 2) if total_sessions > 0 else 0,
        "average_productivity_rating": round(avg_productivity, 2),
        "completion_rate": round(completion_rate, 1),
        "sessions_by_type": sessions_by_type,
        "days_analyzed": days
    }


def get_session_tips(session_type: str) -> List[str]:
    """Get tips for different session types"""

    tips = {
        "pomodoro": [
            "Turn off all notifications",
            "Have water and snacks ready",
            "Tell others you're in focus mode",
            "Plan a small reward for after the session"
        ],
        "deep_work": [
            "This is a long session - take a quick stretch break at 45 minutes",
            "Make sure you won't be interrupted for 90 minutes",
            "Close all unnecessary browser tabs",
            "Put your phone in another room"
        ],
        "short_burst": [
            "Perfect for quick tasks!",
            "Focus on ONE thing only",
            "No multitasking for these 15 minutes"
        ]
    }

    return tips.get(session_type, ["Stay focused!", "You've got this!"])
