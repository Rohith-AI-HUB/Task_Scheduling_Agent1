"""
User Context Service
Aggregates all user data to provide comprehensive context for AI assistant.
This enables the AI to have full knowledge of the user's tasks, resources,
study plans, stress levels, and more.
"""

from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
import logging

from app.db_config import (
    users_collection,
    tasks_collection,
    groups_collection,
    resources_collection,
    study_plans_collection,
    user_preferences_collection,
    stress_logs_collection,
    focus_sessions_collection,
    chat_history_collection
)

logger = logging.getLogger(__name__)


def get_user_info(user_id: str) -> dict:
    """Get basic user information."""
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return {"name": "User", "role": "student"}
        return {
            "name": user.get("full_name", "User"),
            "role": user.get("role", "student"),
            "email": user.get("email", ""),
            "usn": user.get("usn", "")
        }
    except Exception as e:
        logger.error(f"Error fetching user info: {e}")
        return {"name": "User", "role": "student"}


def get_tasks_context(user_id: str) -> dict:
    """
    Get comprehensive task context for the user.
    Categorizes tasks by urgency and status.
    """
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)

        # Fetch all user tasks
        tasks = list(tasks_collection.find({"assigned_to": user_id}))

        overdue = []
        due_today = []
        due_this_week = []
        in_progress = []
        completed_recently = []
        todo = []

        for task in tasks:
            deadline = task.get("deadline")
            status = task.get("status", "todo")

            task_summary = {
                "id": str(task["_id"]),
                "title": task.get("title", "Untitled"),
                "description": task.get("description", "")[:100],
                "priority": task.get("priority", "medium"),
                "status": status,
                "deadline": deadline.isoformat() if deadline else None,
                "complexity_score": task.get("complexity_score"),
                "estimated_hours": task.get("estimated_hours"),
                "subtasks": task.get("subtasks", []),
                "subtasks_completed": sum(1 for s in task.get("subtasks", []) if s.get("completed", False))
            }

            if status == "completed":
                completed_at = task.get("completed_at") or task.get("updated_at")
                if completed_at and completed_at > now - timedelta(days=7):
                    completed_recently.append(task_summary)
            elif status == "in_progress":
                in_progress.append(task_summary)
            elif deadline:
                if deadline < now:
                    overdue.append(task_summary)
                elif today_start <= deadline < today_end:
                    due_today.append(task_summary)
                elif today_end <= deadline < week_end:
                    due_this_week.append(task_summary)
                else:
                    todo.append(task_summary)
            else:
                todo.append(task_summary)

        # Sort by priority and deadline
        priority_order = {"high": 0, "medium": 1, "low": 2}
        for task_list in [overdue, due_today, due_this_week, in_progress, todo]:
            task_list.sort(key=lambda t: (priority_order.get(t["priority"], 1), t["deadline"] or ""))

        return {
            "overdue": overdue,
            "due_today": due_today,
            "due_this_week": due_this_week,
            "in_progress": in_progress,
            "todo": todo[:10],  # Limit to 10 future tasks
            "completed_recently": completed_recently[:5],
            "total_pending": len(overdue) + len(due_today) + len(due_this_week) + len(in_progress) + len(todo),
            "total_overdue": len(overdue)
        }
    except Exception as e:
        logger.error(f"Error fetching tasks context: {e}")
        return {
            "overdue": [], "due_today": [], "due_this_week": [],
            "in_progress": [], "todo": [], "completed_recently": [],
            "total_pending": 0, "total_overdue": 0
        }


def get_groups_context(user_id: str) -> dict:
    """Get user's groups context."""
    try:
        # Groups where user is coordinator
        coordinating = list(groups_collection.find({"coordinator_id": user_id}))

        # Groups where user is a member
        member_of = list(groups_collection.find({
            "members": user_id,
            "coordinator_id": {"$ne": user_id}
        }))

        coordinating_summary = [
            {
                "id": str(g["_id"]),
                "name": g.get("name", "Unnamed Group"),
                "member_count": len(g.get("members", []))
            }
            for g in coordinating
        ]

        member_summary = [
            {
                "id": str(g["_id"]),
                "name": g.get("name", "Unnamed Group"),
                "member_count": len(g.get("members", []))
            }
            for g in member_of
        ]

        return {
            "coordinating": coordinating_summary,
            "member_of": member_summary,
            "total_groups": len(coordinating_summary) + len(member_summary)
        }
    except Exception as e:
        logger.error(f"Error fetching groups context: {e}")
        return {"coordinating": [], "member_of": [], "total_groups": 0}


def get_resources_context(user_id: str) -> dict:
    """Get user's resources and notes context."""
    try:
        resources = list(resources_collection.find({"user_id": user_id}).sort("created_at", -1).limit(20))

        notes = []
        files = []
        links = []
        flashcard_sets = []

        for resource in resources:
            resource_summary = {
                "id": str(resource["_id"]),
                "title": resource.get("title", "Untitled"),
                "type": resource.get("type", "note"),
                "tags": resource.get("tags", []),
                "has_flashcards": bool(resource.get("flashcards")),
                "flashcard_count": len(resource.get("flashcards", [])),
                "created_at": resource.get("created_at").isoformat() if resource.get("created_at") else None
            }

            resource_type = resource.get("type", "note")
            if resource_type == "note":
                notes.append(resource_summary)
            elif resource_type == "link":
                links.append(resource_summary)
            elif resource_type in ["pdf", "document", "code", "file"]:
                files.append(resource_summary)

            if resource.get("flashcards"):
                flashcard_sets.append({
                    "id": str(resource["_id"]),
                    "title": resource.get("title", "Untitled"),
                    "count": len(resource.get("flashcards", []))
                })

        return {
            "notes": notes[:10],
            "files": files[:10],
            "links": links[:10],
            "flashcard_sets": flashcard_sets[:10],
            "total_resources": len(resources)
        }
    except Exception as e:
        logger.error(f"Error fetching resources context: {e}")
        return {"notes": [], "files": [], "links": [], "flashcard_sets": [], "total_resources": 0}


def get_study_plans_context(user_id: str) -> dict:
    """Get user's study plans context."""
    try:
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Today's plan
        today_plan = study_plans_collection.find_one({
            "user_id": user_id,
            "date": {"$gte": today, "$lt": today + timedelta(days=1)}
        })

        # Upcoming plans
        upcoming_plans = list(study_plans_collection.find({
            "user_id": user_id,
            "date": {"$gt": today}
        }).sort("date", 1).limit(5))

        today_summary = None
        if today_plan:
            tasks = today_plan.get("tasks", [])
            today_summary = {
                "id": str(today_plan["_id"]),
                "date": today_plan.get("date").isoformat() if today_plan.get("date") else None,
                "total_blocks": len(tasks),
                "completed_blocks": sum(1 for t in tasks if t.get("completed", False)),
                "tasks": [
                    {
                        "title": t.get("task_title", "Study Block"),
                        "start_time": t.get("start_time"),
                        "end_time": t.get("end_time"),
                        "completed": t.get("completed", False)
                    }
                    for t in tasks[:10]
                ]
            }

        upcoming_summary = [
            {
                "id": str(p["_id"]),
                "date": p.get("date").isoformat() if p.get("date") else None,
                "total_blocks": len(p.get("tasks", []))
            }
            for p in upcoming_plans
        ]

        return {
            "today": today_summary,
            "upcoming": upcoming_summary,
            "has_today_plan": today_summary is not None
        }
    except Exception as e:
        logger.error(f"Error fetching study plans context: {e}")
        return {"today": None, "upcoming": [], "has_today_plan": False}


def get_user_preferences_context(user_id: str) -> dict:
    """Get user's study preferences."""
    try:
        prefs = user_preferences_collection.find_one({"user_id": user_id})

        if not prefs:
            return {
                "study_hours": {"start": "09:00", "end": "21:00"},
                "preferred_session_length": 45,
                "break_duration": 10,
                "complexity_pattern": "hard_first"
            }

        return {
            "study_hours": prefs.get("study_hours", {"start": "09:00", "end": "21:00"}),
            "preferred_session_length": prefs.get("preferred_session_length", 45),
            "break_duration": prefs.get("break_duration", 10),
            "complexity_pattern": prefs.get("complexity_pattern", "hard_first"),
            "blocked_times": prefs.get("blocked_times", [])
        }
    except Exception as e:
        logger.error(f"Error fetching preferences: {e}")
        return {}


def get_wellbeing_context(user_id: str) -> dict:
    """Get user's stress and focus session context."""
    try:
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)

        # Recent stress logs
        recent_stress = list(stress_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": week_ago}
        }).sort("timestamp", -1).limit(5))

        # Current/latest stress level
        current_stress = None
        if recent_stress:
            latest = recent_stress[0]
            current_stress = {
                "objective_score": latest.get("objective_score"),
                "subjective_score": latest.get("subjective_score"),
                "timestamp": latest.get("timestamp").isoformat() if latest.get("timestamp") else None,
                "recommendations": latest.get("recommendations", [])
            }

        # Focus sessions this week
        focus_sessions = list(focus_sessions_collection.find({
            "user_id": user_id,
            "start_time": {"$gte": week_ago}
        }).sort("start_time", -1).limit(10))

        completed_sessions = [s for s in focus_sessions if s.get("completed", False)]
        total_focus_minutes = sum(s.get("actual_duration_minutes", 0) for s in completed_sessions)
        avg_productivity = 0
        if completed_sessions:
            ratings = [s.get("productivity_rating", 0) for s in completed_sessions if s.get("productivity_rating")]
            if ratings:
                avg_productivity = sum(ratings) / len(ratings)

        return {
            "current_stress": current_stress,
            "stress_trend": "stable",  # Could calculate trend from recent_stress
            "focus_stats": {
                "sessions_this_week": len(completed_sessions),
                "total_focus_minutes": total_focus_minutes,
                "average_productivity": round(avg_productivity, 1),
                "total_interruptions": sum(len(s.get("interruptions", [])) for s in completed_sessions)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching wellbeing context: {e}")
        return {
            "current_stress": None,
            "stress_trend": "unknown",
            "focus_stats": {
                "sessions_this_week": 0,
                "total_focus_minutes": 0,
                "average_productivity": 0,
                "total_interruptions": 0
            }
        }


def get_recent_chat_context(user_id: str, limit: int = 10) -> list:
    """Get recent AI chat messages for conversation continuity."""
    try:
        recent_messages = list(chat_history_collection.find({
            "chat_type": "ai",
            "$or": [
                {"sender_id": user_id},
                {"sender_id": "ai_assistant", "chat_id": "assistant"}
            ]
        }).sort("timestamp", -1).limit(limit))

        # Reverse to get chronological order
        recent_messages.reverse()

        return [
            {
                "role": "user" if msg.get("sender_id") != "ai_assistant" else "assistant",
                "content": msg.get("content", "")[:500],  # Truncate long messages
                "timestamp": msg.get("timestamp").isoformat() if msg.get("timestamp") else None
            }
            for msg in recent_messages
        ]
    except Exception as e:
        logger.error(f"Error fetching chat context: {e}")
        return []


def get_full_user_context(user_id: str, scope: Optional[list] = None) -> dict:
    """
    Aggregate all user data for AI context.
    This data is PRIVATE to the user and never shared.

    Args:
        user_id: The user's MongoDB ObjectId as string
        scope: Optional list of context areas to include.
               Options: ["tasks", "groups", "resources", "study_plans", "preferences", "wellbeing", "chat"]
               If None, includes all.

    Returns:
        Comprehensive dictionary of user context
    """
    if scope is None:
        scope = ["tasks", "groups", "resources", "study_plans", "preferences", "wellbeing", "chat"]

    context = {
        "user": get_user_info(user_id),
        "generated_at": datetime.utcnow().isoformat()
    }

    if "tasks" in scope:
        context["tasks"] = get_tasks_context(user_id)

    if "groups" in scope:
        context["groups"] = get_groups_context(user_id)

    if "resources" in scope:
        context["resources"] = get_resources_context(user_id)

    if "study_plans" in scope:
        context["study_plans"] = get_study_plans_context(user_id)

    if "preferences" in scope:
        context["preferences"] = get_user_preferences_context(user_id)

    if "wellbeing" in scope:
        context["wellbeing"] = get_wellbeing_context(user_id)

    if "chat" in scope:
        context["recent_chat"] = get_recent_chat_context(user_id)

    return context


def format_context_for_ai(context: dict) -> str:
    """
    Format the user context into a readable string for AI system prompt.

    Args:
        context: The full user context dictionary

    Returns:
        Formatted string for AI consumption
    """
    user = context.get("user", {})
    tasks = context.get("tasks", {})
    groups = context.get("groups", {})
    resources = context.get("resources", {})
    study_plans = context.get("study_plans", {})
    wellbeing = context.get("wellbeing", {})

    lines = [
        f"=== USER: {user.get('name', 'User')} ({user.get('role', 'student')}) ===",
        ""
    ]

    # Tasks section
    lines.append("=== TASKS ===")
    if tasks.get("overdue"):
        lines.append(f"OVERDUE ({len(tasks['overdue'])}):")
        for t in tasks["overdue"][:5]:
            lines.append(f"  - [{t['priority'].upper()}] {t['title']} (ID: {t['id'][:8]})")

    if tasks.get("due_today"):
        lines.append(f"\nDUE TODAY ({len(tasks['due_today'])}):")
        for t in tasks["due_today"][:5]:
            lines.append(f"  - [{t['priority'].upper()}] {t['title']} (ID: {t['id'][:8]})")

    if tasks.get("due_this_week"):
        lines.append(f"\nDUE THIS WEEK ({len(tasks['due_this_week'])}):")
        for t in tasks["due_this_week"][:5]:
            deadline = t.get("deadline", "")[:10] if t.get("deadline") else "No deadline"
            lines.append(f"  - [{t['priority'].upper()}] {t['title']} - Due: {deadline}")

    if tasks.get("in_progress"):
        lines.append(f"\nIN PROGRESS ({len(tasks['in_progress'])}):")
        for t in tasks["in_progress"][:5]:
            lines.append(f"  - {t['title']} (ID: {t['id'][:8]})")

    lines.append(f"\nTotal pending tasks: {tasks.get('total_pending', 0)}")
    lines.append("")

    # Groups section
    if groups.get("coordinating") or groups.get("member_of"):
        lines.append("=== GROUPS ===")
        if groups.get("coordinating"):
            lines.append("Coordinating:")
            for g in groups["coordinating"][:3]:
                lines.append(f"  - {g['name']} ({g['member_count']} members)")
        if groups.get("member_of"):
            lines.append("Member of:")
            for g in groups["member_of"][:3]:
                lines.append(f"  - {g['name']}")
        lines.append("")

    # Resources section
    if resources.get("total_resources", 0) > 0:
        lines.append("=== RESOURCES ===")
        lines.append(f"Total resources: {resources['total_resources']}")
        if resources.get("notes"):
            lines.append(f"Notes: {len(resources['notes'])}")
        if resources.get("files"):
            lines.append(f"Files: {len(resources['files'])}")
        if resources.get("flashcard_sets"):
            lines.append(f"Flashcard sets: {len(resources['flashcard_sets'])}")
        lines.append("")

    # Study plans section
    if study_plans.get("today"):
        lines.append("=== TODAY'S STUDY PLAN ===")
        today = study_plans["today"]
        lines.append(f"Progress: {today['completed_blocks']}/{today['total_blocks']} blocks completed")
        for task in today.get("tasks", [])[:5]:
            status = "[x]" if task.get("completed") else "[ ]"
            lines.append(f"  {status} {task['title']} ({task.get('start_time', '')} - {task.get('end_time', '')})")
        lines.append("")

    # Wellbeing section
    if wellbeing.get("current_stress"):
        stress = wellbeing["current_stress"]
        lines.append("=== WELLBEING ===")
        lines.append(f"Stress Level: {stress.get('objective_score', 'N/A')}/10")
        focus = wellbeing.get("focus_stats", {})
        lines.append(f"Focus this week: {focus.get('sessions_this_week', 0)} sessions, "
                     f"{focus.get('total_focus_minutes', 0)} minutes")
        lines.append(f"Average productivity: {focus.get('average_productivity', 'N/A')}/5")
        lines.append("")

    return "\n".join(lines)
