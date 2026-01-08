from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_config import db, tasks_collection, stress_logs_collection
from app.routers.auth import get_current_user
from app.services.ai_scheduling_service import generate_study_schedule
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List, Literal
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/api/study-planner", tags=["Study Planner"])

study_plans_collection = db["study_plans"]
user_preferences_collection = db["user_preferences"]


# Pydantic Models
class StudyHours(BaseModel):
    start: str = "09:00"
    end: str = "21:00"


class BlockedTime(BaseModel):
    day: str  # "monday", "tuesday", etc. or "daily"
    start_time: str
    end_time: str
    reason: Optional[str] = ""


class UserPreferences(BaseModel):
    study_hours: Optional[StudyHours] = StudyHours()
    preferred_session_length: Optional[int] = 25
    break_duration_short: Optional[int] = 5
    break_duration_long: Optional[int] = 15
    max_daily_study_hours: Optional[float] = 8.0
    preferred_complexity_pattern: Optional[Literal["hard_first", "easy_first", "alternating"]] = "alternating"
    blocked_times: Optional[List[BlockedTime]] = []
    stress_sensitivity: Optional[Literal["low", "medium", "high"]] = "medium"


class StudyBlockCreate(BaseModel):
    task_id: str
    start_time: str
    end_time: str
    session_type: Optional[Literal["pomodoro", "deep_work", "short_burst"]] = "pomodoro"


class StudyBlockUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None


# Default preferences
DEFAULT_PREFERENCES = {
    "study_hours": {"start": "09:00", "end": "21:00"},
    "preferred_session_length": 25,
    "break_duration_short": 5,
    "break_duration_long": 15,
    "max_daily_study_hours": 8.0,
    "preferred_complexity_pattern": "alternating",
    "blocked_times": [],
    "stress_sensitivity": "medium"
}


# ==================== User Preferences Endpoints ====================

@router.get("/preferences")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's study scheduling preferences"""
    user_id = str(current_user["_id"])

    prefs = user_preferences_collection.find_one({"user_id": user_id})

    if not prefs:
        return {
            "message": "Using default preferences",
            "preferences": DEFAULT_PREFERENCES,
            "is_default": True
        }

    # Remove MongoDB _id
    prefs.pop("_id", None)
    prefs.pop("user_id", None)

    return {
        "message": "Preferences retrieved successfully",
        "preferences": prefs,
        "is_default": False
    }


@router.put("/preferences")
async def update_user_preferences(
    preferences: UserPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update user's study scheduling preferences"""
    user_id = str(current_user["_id"])

    prefs_dict = preferences.model_dump()
    prefs_dict["user_id"] = user_id
    prefs_dict["updated_at"] = datetime.utcnow()

    # Convert nested models to dict
    if prefs_dict.get("study_hours"):
        prefs_dict["study_hours"] = {
            "start": prefs_dict["study_hours"].start if hasattr(prefs_dict["study_hours"], 'start') else prefs_dict["study_hours"]["start"],
            "end": prefs_dict["study_hours"].end if hasattr(prefs_dict["study_hours"], 'end') else prefs_dict["study_hours"]["end"]
        }

    if prefs_dict.get("blocked_times"):
        prefs_dict["blocked_times"] = [
            bt.model_dump() if hasattr(bt, 'model_dump') else bt
            for bt in prefs_dict["blocked_times"]
        ]

    # Upsert preferences
    user_preferences_collection.update_one(
        {"user_id": user_id},
        {"$set": prefs_dict},
        upsert=True
    )

    return {
        "message": "Preferences updated successfully",
        "preferences": prefs_dict
    }


# ==================== Schedule Generation Endpoints ====================

@router.post("/generate")
async def generate_daily_schedule(
    target_date: Optional[str] = None,
    regenerate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI-powered daily study schedule"""
    user_id = str(current_user["_id"])

    # Parse target date
    if target_date:
        try:
            date = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
        except:
            date = datetime.strptime(target_date, "%Y-%m-%d")
    else:
        date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    date_str = date.strftime("%Y-%m-%d")

    # Check if schedule already exists for this date
    existing = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date_str
    })

    if existing and not regenerate:
        existing["_id"] = str(existing["_id"])
        return {
            "message": "Schedule already exists for this date",
            "schedule": existing,
            "is_new": False
        }

    # Get user preferences
    prefs = user_preferences_collection.find_one({"user_id": user_id})
    preferences = prefs if prefs else DEFAULT_PREFERENCES

    # Get current stress level
    latest_stress = stress_logs_collection.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    stress_data = {
        "objective_score": latest_stress.get("objective_score", 5) if latest_stress else 5,
        "breakdown": latest_stress.get("breakdown", {}) if latest_stress else {}
    }

    # Generate schedule using AI service
    schedule = generate_study_schedule(user_id, date, preferences, stress_data)

    # Prepare document for storage
    schedule_doc = {
        "user_id": user_id,
        "date": date_str,
        "generated_at": datetime.utcnow(),
        "stress_level_at_generation": stress_data["objective_score"],
        "study_blocks": schedule.get("study_blocks", []),
        "break_blocks": schedule.get("break_blocks", []),
        "total_study_hours": schedule.get("total_study_hours", 0),
        "ai_reasoning": schedule.get("ai_reasoning", ""),
        "user_approved": False,
        "modifications": []
    }

    # Delete existing and insert new if regenerating
    if existing:
        study_plans_collection.delete_one({"_id": existing["_id"]})

    result = study_plans_collection.insert_one(schedule_doc)
    schedule_doc["_id"] = str(result.inserted_id)

    return {
        "message": "Schedule generated successfully",
        "schedule": schedule_doc,
        "is_new": True
    }


@router.post("/generate-week")
async def generate_weekly_schedule(
    start_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate schedule for the next 7 days"""
    user_id = str(current_user["_id"])

    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except:
            start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get preferences and stress once
    prefs = user_preferences_collection.find_one({"user_id": user_id})
    preferences = prefs if prefs else DEFAULT_PREFERENCES

    latest_stress = stress_logs_collection.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    stress_data = {
        "objective_score": latest_stress.get("objective_score", 5) if latest_stress else 5
    }

    weekly_schedules = []

    for i in range(7):
        date = start + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")

        # Check if exists
        existing = study_plans_collection.find_one({
            "user_id": user_id,
            "date": date_str
        })

        if existing:
            existing["_id"] = str(existing["_id"])
            weekly_schedules.append(existing)
        else:
            schedule = generate_study_schedule(user_id, date, preferences, stress_data)

            schedule_doc = {
                "user_id": user_id,
                "date": date_str,
                "generated_at": datetime.utcnow(),
                "stress_level_at_generation": stress_data["objective_score"],
                "study_blocks": schedule.get("study_blocks", []),
                "break_blocks": schedule.get("break_blocks", []),
                "total_study_hours": schedule.get("total_study_hours", 0),
                "ai_reasoning": schedule.get("ai_reasoning", ""),
                "user_approved": False,
                "modifications": []
            }

            result = study_plans_collection.insert_one(schedule_doc)
            schedule_doc["_id"] = str(result.inserted_id)
            weekly_schedules.append(schedule_doc)

    return {
        "message": f"Generated schedules for {len(weekly_schedules)} days",
        "schedules": weekly_schedules,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": (start + timedelta(days=6)).strftime("%Y-%m-%d")
    }


# ==================== Schedule Retrieval Endpoints ====================

@router.get("/schedule/{date}")
async def get_daily_schedule(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get schedule for a specific date"""
    user_id = str(current_user["_id"])

    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date
    })

    if not schedule:
        return {
            "message": "No schedule found for this date",
            "schedule": None,
            "exists": False
        }

    schedule["_id"] = str(schedule["_id"])

    return {
        "message": "Schedule retrieved successfully",
        "schedule": schedule,
        "exists": True
    }


@router.get("/schedules")
async def get_schedules_range(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get schedules for a date range"""
    user_id = str(current_user["_id"])

    schedules = list(study_plans_collection.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", 1))

    for s in schedules:
        s["_id"] = str(s["_id"])

    return {
        "message": f"Retrieved {len(schedules)} schedules",
        "schedules": schedules,
        "start_date": start_date,
        "end_date": end_date
    }


# ==================== Schedule Modification Endpoints ====================

@router.put("/schedule/{date}/blocks/{block_id}")
async def update_study_block(
    date: str,
    block_id: str,
    updates: StudyBlockUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific study block"""
    user_id = str(current_user["_id"])

    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date
    })

    if not schedule:
        raise HTTPException(404, "Schedule not found for this date")

    # Find and update the block
    block_found = False
    for i, block in enumerate(schedule.get("study_blocks", [])):
        if block.get("id") == block_id:
            block_found = True
            update_data = updates.model_dump(exclude_none=True)
            for key, value in update_data.items():
                schedule["study_blocks"][i][key] = value
            break

    if not block_found:
        raise HTTPException(404, "Study block not found")

    # Log modification
    schedule["modifications"].append({
        "timestamp": datetime.utcnow(),
        "change_type": "update",
        "description": f"Updated block {block_id}"
    })

    study_plans_collection.update_one(
        {"_id": schedule["_id"]},
        {"$set": {
            "study_blocks": schedule["study_blocks"],
            "modifications": schedule["modifications"]
        }}
    )

    return {
        "message": "Study block updated successfully",
        "block_id": block_id
    }


@router.post("/schedule/{date}/blocks/{block_id}/complete")
async def complete_study_block(
    date: str,
    block_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a study block as completed"""
    user_id = str(current_user["_id"])

    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date
    })

    if not schedule:
        raise HTTPException(404, "Schedule not found for this date")

    # Find and complete the block
    block_found = False
    task_id = None
    duration = 0

    for i, block in enumerate(schedule.get("study_blocks", [])):
        if block.get("id") == block_id:
            block_found = True
            schedule["study_blocks"][i]["completed"] = True
            task_id = block.get("task_id")
            duration = block.get("duration_minutes", 0)
            break

    if not block_found:
        raise HTTPException(404, "Study block not found")

    # Update task time_spent if linked
    if task_id:
        try:
            tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {"$inc": {"time_spent_minutes": duration}}
            )
        except:
            pass  # Task might not exist

    # Log modification
    schedule["modifications"].append({
        "timestamp": datetime.utcnow(),
        "change_type": "complete",
        "description": f"Completed block {block_id}"
    })

    study_plans_collection.update_one(
        {"_id": schedule["_id"]},
        {"$set": {
            "study_blocks": schedule["study_blocks"],
            "modifications": schedule["modifications"]
        }}
    )

    return {
        "message": "Study block completed! Great job! 🎉",
        "block_id": block_id,
        "time_logged": duration
    }


@router.delete("/schedule/{date}/blocks/{block_id}")
async def remove_study_block(
    date: str,
    block_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a study block from schedule"""
    user_id = str(current_user["_id"])

    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date
    })

    if not schedule:
        raise HTTPException(404, "Schedule not found for this date")

    # Filter out the block
    original_count = len(schedule.get("study_blocks", []))
    schedule["study_blocks"] = [
        b for b in schedule.get("study_blocks", [])
        if b.get("id") != block_id
    ]

    if len(schedule["study_blocks"]) == original_count:
        raise HTTPException(404, "Study block not found")

    # Recalculate total hours
    total_minutes = sum(b.get("duration_minutes", 0) for b in schedule["study_blocks"])
    schedule["total_study_hours"] = round(total_minutes / 60, 1)

    # Log modification
    schedule["modifications"].append({
        "timestamp": datetime.utcnow(),
        "change_type": "remove",
        "description": f"Removed block {block_id}"
    })

    study_plans_collection.update_one(
        {"_id": schedule["_id"]},
        {"$set": {
            "study_blocks": schedule["study_blocks"],
            "total_study_hours": schedule["total_study_hours"],
            "modifications": schedule["modifications"]
        }}
    )

    return {
        "message": "Study block removed successfully",
        "block_id": block_id
    }


@router.post("/schedule/{date}/blocks")
async def add_study_block(
    date: str,
    block: StudyBlockCreate,
    current_user: dict = Depends(get_current_user)
):
    """Manually add a study block"""
    user_id = str(current_user["_id"])

    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": date
    })

    if not schedule:
        raise HTTPException(404, "Schedule not found for this date")

    # Get task info
    task = tasks_collection.find_one({"_id": ObjectId(block.task_id)})
    if not task:
        raise HTTPException(404, "Task not found")

    # Calculate duration
    start = datetime.strptime(block.start_time, "%H:%M")
    end = datetime.strptime(block.end_time, "%H:%M")
    duration = int((end - start).total_seconds() / 60)

    new_block = {
        "id": str(uuid.uuid4()),
        "task_id": block.task_id,
        "task_title": task.get("title", "Untitled"),
        "start_time": block.start_time,
        "end_time": block.end_time,
        "duration_minutes": duration,
        "session_type": block.session_type,
        "complexity": task.get("complexity_score", 5),
        "priority": task.get("priority", "medium"),
        "deadline_urgency": "flexible",
        "completed": False,
        "notes": ""
    }

    schedule["study_blocks"].append(new_block)

    # Sort by start time
    schedule["study_blocks"].sort(key=lambda x: x["start_time"])

    # Recalculate total hours
    total_minutes = sum(b.get("duration_minutes", 0) for b in schedule["study_blocks"])
    schedule["total_study_hours"] = round(total_minutes / 60, 1)

    # Log modification
    schedule["modifications"].append({
        "timestamp": datetime.utcnow(),
        "change_type": "add",
        "description": f"Added block for {task.get('title')}"
    })

    study_plans_collection.update_one(
        {"_id": schedule["_id"]},
        {"$set": {
            "study_blocks": schedule["study_blocks"],
            "total_study_hours": schedule["total_study_hours"],
            "modifications": schedule["modifications"]
        }}
    )

    return {
        "message": "Study block added successfully",
        "block": new_block
    }


# ==================== Quick Actions ====================

@router.post("/quick-reschedule")
async def quick_reschedule(
    task_id: str,
    reason: Literal["too_stressed", "no_time", "priority_change", "completed_early"],
    current_user: dict = Depends(get_current_user)
):
    """Quickly reschedule a task based on reason"""
    user_id = str(current_user["_id"])
    today = datetime.now().strftime("%Y-%m-%d")

    # Get today's schedule
    schedule = study_plans_collection.find_one({
        "user_id": user_id,
        "date": today
    })

    if not schedule:
        raise HTTPException(404, "No schedule found for today")

    # Find blocks with this task
    affected_blocks = [
        b for b in schedule.get("study_blocks", [])
        if b.get("task_id") == task_id and not b.get("completed")
    ]

    if not affected_blocks:
        return {
            "message": "No pending blocks found for this task today",
            "rescheduled": False
        }

    action_taken = ""

    if reason == "too_stressed":
        # Remove blocks and suggest tomorrow
        schedule["study_blocks"] = [
            b for b in schedule["study_blocks"]
            if b.get("task_id") != task_id or b.get("completed")
        ]
        action_taken = "Removed from today's schedule. Consider scheduling for tomorrow when you feel better."

    elif reason == "no_time":
        # Move to end of day
        latest_end = max(
            b.get("end_time", "00:00") for b in schedule["study_blocks"]
            if b.get("task_id") != task_id
        ) if schedule["study_blocks"] else "18:00"

        for block in affected_blocks:
            block["start_time"] = latest_end
            # Recalculate end time
            start_dt = datetime.strptime(latest_end, "%H:%M")
            end_dt = start_dt + timedelta(minutes=block.get("duration_minutes", 25))
            block["end_time"] = end_dt.strftime("%H:%M")
            latest_end = block["end_time"]

        action_taken = "Moved to end of schedule."

    elif reason == "priority_change":
        # Move to next available slot
        action_taken = "Task priority noted. Consider regenerating schedule."

    elif reason == "completed_early":
        # Mark all blocks as completed
        for block in affected_blocks:
            block["completed"] = True
        action_taken = "All blocks marked as completed. Great job! 🎉"

    # Recalculate total hours
    total_minutes = sum(
        b.get("duration_minutes", 0)
        for b in schedule["study_blocks"]
        if not b.get("completed")
    )
    schedule["total_study_hours"] = round(total_minutes / 60, 1)

    # Log modification
    schedule["modifications"].append({
        "timestamp": datetime.utcnow(),
        "change_type": "reschedule",
        "description": f"Quick reschedule: {reason}"
    })

    study_plans_collection.update_one(
        {"_id": schedule["_id"]},
        {"$set": {
            "study_blocks": schedule["study_blocks"],
            "total_study_hours": schedule["total_study_hours"],
            "modifications": schedule["modifications"]
        }}
    )

    return {
        "message": action_taken,
        "rescheduled": True,
        "affected_blocks": len(affected_blocks),
        "reason": reason
    }


# ==================== Stats Endpoint ====================

@router.get("/stats")
async def get_planner_stats(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get study planner statistics"""
    user_id = str(current_user["_id"])

    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    schedules = list(study_plans_collection.find({
        "user_id": user_id,
        "date": {"$gte": cutoff}
    }))

    total_planned_hours = 0
    total_completed_blocks = 0
    total_blocks = 0

    for schedule in schedules:
        total_planned_hours += schedule.get("total_study_hours", 0)
        for block in schedule.get("study_blocks", []):
            total_blocks += 1
            if block.get("completed"):
                total_completed_blocks += 1

    completion_rate = (total_completed_blocks / total_blocks * 100) if total_blocks > 0 else 0

    return {
        "days_analyzed": days,
        "schedules_count": len(schedules),
        "total_planned_hours": round(total_planned_hours, 1),
        "total_blocks": total_blocks,
        "completed_blocks": total_completed_blocks,
        "completion_rate": round(completion_rate, 1),
        "average_daily_hours": round(total_planned_hours / max(len(schedules), 1), 1)
    }
