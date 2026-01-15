"""
Command Parser Service
Handles parsing and execution of slash commands from the chat interface.

Supported Commands:
- /task create <title> - Create a new task
- /task list - List all tasks
- /task complete <id> - Mark task as completed
- /task delete <id_or_title> - Delete a task
- /group create <name> - Create a new group
- /group list - List all groups
- /group assign <task_title> to <group_name> - Assign task to group
- /plan generate - Generate today's study plan
- /plan show - Show today's study plan
- /flashcard generate <topic> - Generate flashcards from topic
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Any
from bson import ObjectId

from app.db_config import (
    tasks_collection,
    groups_collection,
    users_collection,
    study_plans_collection,
    user_preferences_collection,
    stress_logs_collection,
    resources_collection,
    notifications_collection
)
from app.services.ai_task_service import analyze_task_complexity, generate_subtasks
from app.services.ai_scheduling_service import generate_study_schedule
from app.services.ollama_service import generate_ai_response

logger = logging.getLogger(__name__)

# Command pattern: /entity action [args...]
COMMAND_PATTERN = r'^/(\w+)\s+(\w+)(?:\s+(.*))?$'

# Available commands for autocomplete
AVAILABLE_COMMANDS = [
    {"command": "/task create", "description": "Create a new task", "usage": "/task create <title>"},
    {"command": "/task list", "description": "List all your tasks", "usage": "/task list"},
    {"command": "/task complete", "description": "Mark a task as completed", "usage": "/task complete <task_id>"},
    {"command": "/task delete", "description": "Delete a task", "usage": "/task delete <task_id_or_title>"},
    {"command": "/group create", "description": "Create a new group", "usage": "/group create <name>"},
    {"command": "/group list", "description": "List all your groups", "usage": "/group list"},
    {"command": "/group assign", "description": "Assign task to group", "usage": "/group assign <task_title> to <group_name>"},
    {"command": "/plan generate", "description": "Generate today's study plan", "usage": "/plan generate"},
    {"command": "/plan show", "description": "Show today's study plan", "usage": "/plan show"},
    {"command": "/flashcard generate", "description": "Generate flashcards", "usage": "/flashcard generate <topic>"},
]


def is_command(message: str) -> bool:
    """Check if a message is a slash command."""
    return message.strip().startswith('/')


def parse_command(message: str) -> Optional[Tuple[str, str, str]]:
    """
    Parse a slash command.

    Args:
        message: The message to parse

    Returns:
        Tuple of (entity, action, args_string) or None if not a valid command
    """
    message = message.strip()
    if not message.startswith('/'):
        return None

    match = re.match(COMMAND_PATTERN, message)
    if not match:
        # Try simpler pattern for commands without args
        simple_match = re.match(r'^/(\w+)\s+(\w+)$', message)
        if simple_match:
            return (simple_match.group(1).lower(), simple_match.group(2).lower(), "")
        return None

    entity = match.group(1).lower()
    action = match.group(2).lower()
    args_str = match.group(3) or ""

    return (entity, action, args_str.strip())


async def execute_command(user_id: str, message: str) -> dict:
    """
    Execute a slash command.

    Args:
        user_id: The user's ID
        message: The full command message

    Returns:
        Dictionary with success status, result, and AI-friendly message
    """
    parsed = parse_command(message)

    if not parsed:
        return {
            "success": False,
            "error": "Invalid command format",
            "message": "I couldn't parse that command. Try /task list or /help for available commands.",
            "command_type": None,
            "action": None
        }

    entity, action, args = parsed

    handlers = {
        "task": handle_task_command,
        "group": handle_group_command,
        "plan": handle_plan_command,
        "flashcard": handle_flashcard_command,
        "help": handle_help_command,
    }

    handler = handlers.get(entity)
    if not handler:
        return {
            "success": False,
            "error": f"Unknown command: /{entity}",
            "message": f"I don't recognize the command '/{entity}'. Available commands: /task, /group, /plan, /flashcard",
            "command_type": entity,
            "action": action
        }

    try:
        result = await handler(user_id, action, args)
        result["command_type"] = entity
        result["action"] = action
        return result
    except Exception as e:
        logger.error(f"Command execution error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"An error occurred while executing the command: {str(e)}",
            "command_type": entity,
            "action": action
        }


# ==================== TASK COMMANDS ====================

async def handle_task_command(user_id: str, action: str, args: str) -> dict:
    """Handle /task commands."""

    if action == "create":
        return await task_create(user_id, args)
    elif action == "list":
        return await task_list(user_id)
    elif action == "complete":
        return await task_complete(user_id, args)
    elif action == "delete":
        return await task_delete(user_id, args)
    else:
        return {
            "success": False,
            "error": f"Unknown task action: {action}",
            "message": f"Unknown task action '{action}'. Available: create, list, complete, delete"
        }


async def task_create(user_id: str, title: str) -> dict:
    """Create a new task."""
    if not title:
        return {
            "success": False,
            "error": "Task title required",
            "message": "Please provide a task title. Usage: /task create <title>"
        }

    try:
        # AI analysis
        ai_analysis = analyze_task_complexity(title, "")
        subtasks = generate_subtasks(title, "")

        suggested_deadline = datetime.utcnow() + timedelta(days=ai_analysis.get("deadline_days", 3))

        task_doc = {
            "title": title,
            "description": "",
            "deadline": suggested_deadline,
            "priority": ai_analysis.get("priority", "medium"),
            "status": "todo",
            "assigned_to": user_id,
            "created_by": user_id,
            "ai_suggested_deadline": suggested_deadline,
            "complexity_score": ai_analysis.get("complexity", 5),
            "estimated_hours": ai_analysis.get("hours", 4),
            "subtasks": [{"title": st, "status": "todo", "ai_generated": True} for st in subtasks],
            "attachments": [],
            "created_at": datetime.utcnow(),
            "created_via": "chat_command"
        }

        result = tasks_collection.insert_one(task_doc)
        task_id = str(result.inserted_id)

        # Format subtasks for message
        subtasks_str = "\n".join([f"  - {st}" for st in subtasks[:3]]) if subtasks else "None generated"

        return {
            "success": True,
            "result": {
                "task_id": task_id,
                "title": title,
                "priority": task_doc["priority"],
                "deadline": suggested_deadline.strftime("%Y-%m-%d"),
                "estimated_hours": task_doc["estimated_hours"],
                "subtasks": subtasks[:3]
            },
            "message": f"Task created successfully!\n\n**{title}**\n- Priority: {task_doc['priority']}\n- Deadline: {suggested_deadline.strftime('%B %d, %Y')}\n- Estimated time: {task_doc['estimated_hours']} hours\n- Subtasks:\n{subtasks_str}"
        }
    except Exception as e:
        logger.error(f"Task creation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to create task: {str(e)}"
        }


async def task_list(user_id: str) -> dict:
    """List all tasks for the user."""
    try:
        tasks = list(tasks_collection.find({"assigned_to": user_id}))

        if not tasks:
            return {
                "success": True,
                "result": {"tasks": [], "count": 0},
                "message": "You don't have any tasks yet. Create one with /task create <title>"
            }

        # Categorize tasks
        overdue = []
        in_progress = []
        todo = []
        completed = []

        now = datetime.utcnow()

        for task in tasks:
            task_info = {
                "id": str(task["_id"])[:8],
                "full_id": str(task["_id"]),
                "title": task.get("title", "Untitled"),
                "priority": task.get("priority", "medium"),
                "status": task.get("status", "todo"),
                "deadline": task.get("deadline")
            }

            status = task.get("status", "todo")
            deadline = task.get("deadline")

            if status == "completed":
                completed.append(task_info)
            elif status == "in_progress":
                in_progress.append(task_info)
            elif deadline and deadline < now:
                overdue.append(task_info)
            else:
                todo.append(task_info)

        # Build message
        lines = ["**Your Tasks:**\n"]

        if overdue:
            lines.append("**OVERDUE:**")
            for t in overdue[:5]:
                lines.append(f"  - [{t['priority'][0].upper()}] {t['title']} (ID: {t['id']})")

        if in_progress:
            lines.append("\n**IN PROGRESS:**")
            for t in in_progress[:5]:
                lines.append(f"  - {t['title']} (ID: {t['id']})")

        if todo:
            lines.append("\n**TODO:**")
            for t in todo[:5]:
                dl = t['deadline'].strftime('%m/%d') if t['deadline'] else 'No deadline'
                lines.append(f"  - [{t['priority'][0].upper()}] {t['title']} - Due: {dl} (ID: {t['id']})")

        if completed:
            lines.append(f"\n**COMPLETED:** {len(completed)} tasks")

        lines.append(f"\n*Total: {len(tasks)} tasks*")

        return {
            "success": True,
            "result": {
                "overdue": overdue,
                "in_progress": in_progress,
                "todo": todo,
                "completed_count": len(completed),
                "total": len(tasks)
            },
            "message": "\n".join(lines)
        }
    except Exception as e:
        logger.error(f"Task list error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to retrieve tasks: {str(e)}"
        }


async def task_complete(user_id: str, task_identifier: str) -> dict:
    """Mark a task as completed."""
    if not task_identifier:
        return {
            "success": False,
            "error": "Task ID required",
            "message": "Please provide a task ID. Usage: /task complete <task_id>"
        }

    try:
        # Try to find by full ID or partial ID
        task = None

        # Try full ObjectId
        if ObjectId.is_valid(task_identifier):
            task = tasks_collection.find_one({
                "_id": ObjectId(task_identifier),
                "assigned_to": user_id
            })

        # Try partial ID match
        if not task:
            tasks = list(tasks_collection.find({"assigned_to": user_id}))
            for t in tasks:
                if str(t["_id"]).startswith(task_identifier):
                    task = t
                    break

        if not task:
            return {
                "success": False,
                "error": "Task not found",
                "message": f"Couldn't find task with ID '{task_identifier}'. Use /task list to see your tasks."
            }

        # Update task
        tasks_collection.update_one(
            {"_id": task["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow()
                }
            }
        )

        return {
            "success": True,
            "result": {
                "task_id": str(task["_id"]),
                "title": task.get("title", "Untitled")
            },
            "message": f"Task completed! **{task.get('title', 'Untitled')}** has been marked as done."
        }
    except Exception as e:
        logger.error(f"Task complete error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to complete task: {str(e)}"
        }


async def task_delete(user_id: str, task_identifier: str) -> dict:
    """Delete a task."""
    if not task_identifier:
        return {
            "success": False,
            "error": "Task identifier required",
            "message": "Please provide a task ID or title. Usage: /task delete <task_id_or_title>"
        }

    try:
        raw_query = task_identifier.strip()

        task = None

        if ObjectId.is_valid(raw_query):
            task = tasks_collection.find_one({
                "_id": ObjectId(raw_query),
                "created_by": user_id
            })

        if not task:
            tasks = list(tasks_collection.find({"created_by": user_id}))
            for t in tasks:
                if str(t["_id"]).startswith(raw_query):
                    task = t
                    break

        if not task:
            cleaned_query = re.sub(r"^(delete|remove)\s+", "", raw_query, flags=re.IGNORECASE).strip()
            cleaned_query = cleaned_query.strip(" '\"\t\r\n")
            cleaned_query = re.sub(r"^the\s+", "", cleaned_query, flags=re.IGNORECASE).strip()

            if cleaned_query:
                exact_matches = list(tasks_collection.find({
                    "created_by": user_id,
                    "title": {"$regex": f"^{re.escape(cleaned_query)}$", "$options": "i"}
                }).limit(10))

                matches = exact_matches
                if not matches:
                    matches = list(tasks_collection.find({
                        "created_by": user_id,
                        "title": {"$regex": re.escape(cleaned_query), "$options": "i"}
                    }).limit(10))

                if len(matches) == 1:
                    task = matches[0]
                elif len(matches) > 1:
                    title_counts = {}
                    title_display = {}
                    for m in matches:
                        title = m.get("title", "Untitled")
                        key = title.strip().lower()
                        title_counts[key] = title_counts.get(key, 0) + 1
                        if key not in title_display:
                            title_display[key] = title

                    lines = [
                        f"Multiple tasks match '{cleaned_query}'.",
                        "Reply with the exact title to delete one of these:",
                        ""
                    ]

                    shown = 0
                    for key, title in title_display.items():
                        count = title_counts.get(key, 1)
                        suffix = f" ({count})" if count > 1 else ""
                        lines.append(f"  - {title}{suffix}")
                        shown += 1
                        if shown >= 10:
                            break
                    remaining = len(title_display) - shown
                    if remaining > 0:
                        lines.append(f"  - ...and {remaining} more")

                    return {
                        "success": False,
                        "error": "Multiple matching tasks",
                        "result": {
                            "matches": [{"title": title_display[k], "count": title_counts.get(k, 1)} for k in list(title_display.keys())[:10]]
                        },
                        "message": "\n".join(lines)
                    }

        if not task:
            return {
                "success": False,
                "error": "Task not found or not authorized",
                "message": f"Couldn't find a task with ID or title '{raw_query}' that you created. Use /task list to see your tasks."
            }

        task_title = task.get("title", "Untitled")
        tasks_collection.delete_one({"_id": task["_id"]})

        return {
            "success": True,
            "result": {"task_id": str(task["_id"]), "title": task_title},
            "message": f"Task deleted: **{task_title}**"
        }
    except Exception as e:
        logger.error(f"Task delete error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to delete task: {str(e)}"
        }


# ==================== GROUP COMMANDS ====================

async def handle_group_command(user_id: str, action: str, args: str) -> dict:
    """Handle /group commands."""

    if action == "create":
        return await group_create(user_id, args)
    elif action == "list":
        return await group_list(user_id)
    elif action == "assign":
        return await group_assign(user_id, args)
    else:
        return {
            "success": False,
            "error": f"Unknown group action: {action}",
            "message": f"Unknown group action '{action}'. Available: create, list, assign"
        }


async def group_create(user_id: str, name: str) -> dict:
    """Create a new group."""
    if not name:
        return {
            "success": False,
            "error": "Group name required",
            "message": "Please provide a group name. Usage: /group create <name>"
        }

    try:
        group_doc = {
            "name": name,
            "coordinator_id": user_id,
            "members": [],
            "created_at": datetime.utcnow(),
            "created_via": "chat_command"
        }

        result = groups_collection.insert_one(group_doc)

        return {
            "success": True,
            "result": {
                "group_id": str(result.inserted_id),
                "name": name
            },
            "message": f"Group created: **{name}**\n\nAdd members from the Groups page to start assigning tasks."
        }
    except Exception as e:
        logger.error(f"Group creation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to create group: {str(e)}"
        }


async def group_list(user_id: str) -> dict:
    """List all groups for the user."""
    try:
        # Groups where user is coordinator
        coordinating = list(groups_collection.find({"coordinator_id": user_id}))

        # Groups where user is a member
        member_of = list(groups_collection.find({
            "members": user_id,
            "coordinator_id": {"$ne": user_id}
        }))

        if not coordinating and not member_of:
            return {
                "success": True,
                "result": {"coordinating": [], "member_of": []},
                "message": "You're not part of any groups yet. Create one with /group create <name>"
            }

        lines = ["**Your Groups:**\n"]

        if coordinating:
            lines.append("**Coordinating:**")
            for g in coordinating:
                lines.append(f"  - {g['name']} ({len(g.get('members', []))} members)")

        if member_of:
            lines.append("\n**Member of:**")
            for g in member_of:
                lines.append(f"  - {g['name']}")

        return {
            "success": True,
            "result": {
                "coordinating": [{"id": str(g["_id"]), "name": g["name"], "members": len(g.get("members", []))} for g in coordinating],
                "member_of": [{"id": str(g["_id"]), "name": g["name"]} for g in member_of]
            },
            "message": "\n".join(lines)
        }
    except Exception as e:
        logger.error(f"Group list error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to retrieve groups: {str(e)}"
        }


async def group_assign(user_id: str, args: str) -> dict:
    """Assign a task to a group. Usage: /group assign <task_title> to <group_name>"""
    if not args or " to " not in args.lower():
        return {
            "success": False,
            "error": "Invalid format",
            "message": "Usage: /group assign <task_title> to <group_name>"
        }

    try:
        # Parse "task_title to group_name"
        parts = re.split(r'\s+to\s+', args, flags=re.IGNORECASE)
        if len(parts) != 2:
            return {
                "success": False,
                "error": "Invalid format",
                "message": "Usage: /group assign <task_title> to <group_name>"
            }

        task_search = parts[0].strip()
        group_search = parts[1].strip()

        # Find the task
        task = tasks_collection.find_one({
            "created_by": user_id,
            "title": {"$regex": task_search, "$options": "i"}
        })

        if not task:
            return {
                "success": False,
                "error": "Task not found",
                "message": f"Couldn't find a task matching '{task_search}'"
            }

        # Find the group
        group = groups_collection.find_one({
            "coordinator_id": user_id,
            "name": {"$regex": group_search, "$options": "i"}
        })

        if not group:
            return {
                "success": False,
                "error": "Group not found",
                "message": f"Couldn't find a group matching '{group_search}' that you coordinate"
            }

        # Assign to all members
        assigned_count = 0
        for member_id in group.get("members", []):
            new_task = task.copy()
            new_task.pop("_id")
            new_task["assigned_to"] = member_id
            new_task["group_id"] = str(group["_id"])
            new_task["created_at"] = datetime.utcnow()
            tasks_collection.insert_one(new_task)

            # Create notification
            notifications_collection.insert_one({
                "user_id": member_id,
                "type": "task_assigned",
                "message": f"New task assigned: '{task['title']}'",
                "reference_id": str(group["_id"]),
                "read": False,
                "created_at": datetime.utcnow()
            })
            assigned_count += 1

        return {
            "success": True,
            "result": {
                "task_title": task["title"],
                "group_name": group["name"],
                "assigned_count": assigned_count
            },
            "message": f"Task **{task['title']}** assigned to {assigned_count} members of **{group['name']}**"
        }
    except Exception as e:
        logger.error(f"Group assign error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to assign task: {str(e)}"
        }


# ==================== PLAN COMMANDS ====================

async def handle_plan_command(user_id: str, action: str, args: str) -> dict:
    """Handle /plan commands."""

    if action == "generate":
        return await plan_generate(user_id)
    elif action == "show":
        return await plan_show(user_id)
    else:
        return {
            "success": False,
            "error": f"Unknown plan action: {action}",
            "message": f"Unknown plan action '{action}'. Available: generate, show"
        }


async def plan_generate(user_id: str) -> dict:
    """Generate a study plan for today."""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Get user preferences
        prefs = user_preferences_collection.find_one({"user_id": user_id}) or {
            "study_hours": {"start": "09:00", "end": "21:00"},
            "preferred_session_length": 45,
            "break_duration": 10,
            "complexity_pattern": "hard_first",
            "blocked_times": []
        }

        # Get stress data
        stress_log = stress_logs_collection.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        stress_data = {"objective_score": stress_log.get("objective_score", 5)} if stress_log else {"objective_score": 5}

        # Generate schedule
        schedule = generate_study_schedule(user_id, today, prefs, stress_data)

        if not schedule.get("study_blocks"):
            return {
                "success": True,
                "result": schedule,
                "message": "No study blocks could be generated. This might be because you have no pending tasks or all time slots are blocked."
            }

        # Save to database
        study_plans_collection.update_one(
            {"user_id": user_id, "date": {"$gte": today, "$lt": today + timedelta(days=1)}},
            {
                "$set": {
                    "user_id": user_id,
                    "date": today,
                    "tasks": schedule.get("study_blocks", []),
                    "generated_by_ai": True,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        # Format message
        lines = ["**Today's Study Plan Generated!**\n"]
        total_hours = schedule.get("total_study_hours", 0)
        lines.append(f"*Total study time: {total_hours:.1f} hours*\n")

        for block in schedule.get("study_blocks", [])[:6]:
            time_range = f"{block.get('start_time', '??:??')} - {block.get('end_time', '??:??')}"
            lines.append(f"- **{time_range}**: {block.get('task_title', 'Study Block')}")

        if len(schedule.get("study_blocks", [])) > 6:
            lines.append(f"\n*...and {len(schedule['study_blocks']) - 6} more blocks*")

        if schedule.get("ai_reasoning"):
            lines.append(f"\n*AI Note: {schedule['ai_reasoning'][:100]}...*")

        return {
            "success": True,
            "result": schedule,
            "message": "\n".join(lines)
        }
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to generate study plan: {str(e)}"
        }


async def plan_show(user_id: str) -> dict:
    """Show today's study plan."""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        plan = study_plans_collection.find_one({
            "user_id": user_id,
            "date": {"$gte": today, "$lt": today + timedelta(days=1)}
        })

        if not plan:
            return {
                "success": True,
                "result": None,
                "message": "No study plan for today. Generate one with /plan generate"
            }

        tasks = plan.get("tasks", [])
        completed = sum(1 for t in tasks if t.get("completed", False))

        lines = [f"**Today's Study Plan ({completed}/{len(tasks)} completed)**\n"]

        for block in tasks[:8]:
            status = "[x]" if block.get("completed") else "[ ]"
            time_range = f"{block.get('start_time', '??:??')} - {block.get('end_time', '??:??')}"
            lines.append(f"{status} **{time_range}**: {block.get('task_title', 'Study Block')}")

        if len(tasks) > 8:
            lines.append(f"\n*...and {len(tasks) - 8} more blocks*")

        return {
            "success": True,
            "result": {
                "total_blocks": len(tasks),
                "completed_blocks": completed,
                "tasks": tasks
            },
            "message": "\n".join(lines)
        }
    except Exception as e:
        logger.error(f"Plan show error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to retrieve study plan: {str(e)}"
        }


# ==================== FLASHCARD COMMANDS ====================

async def handle_flashcard_command(user_id: str, action: str, args: str) -> dict:
    """Handle /flashcard commands."""

    if action == "generate":
        return await flashcard_generate(user_id, args)
    else:
        return {
            "success": False,
            "error": f"Unknown flashcard action: {action}",
            "message": f"Unknown flashcard action '{action}'. Available: generate"
        }


async def flashcard_generate(user_id: str, topic: str) -> dict:
    """Generate flashcards from a topic."""
    if not topic:
        return {
            "success": False,
            "error": "Topic required",
            "message": "Please provide a topic. Usage: /flashcard generate <topic>"
        }

    try:
        # Generate flashcards using AI
        prompt = f"""Generate 8 educational flashcards about "{topic}".

Format your response as a JSON array with objects containing "question" and "answer" fields.
Make the questions test understanding, not just memorization.
Keep answers concise but informative.

Example format:
[
  {{"question": "What is X?", "answer": "X is..."}},
  {{"question": "How does Y work?", "answer": "Y works by..."}}
]

Generate flashcards now:"""

        response = generate_ai_response(prompt, json_mode=True)

        # Parse the response
        import json
        flashcards = []

        try:
            # Try to extract JSON from response
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                flashcards = json.loads(json_match.group())
        except json.JSONDecodeError:
            # Fallback: try to parse line by line
            pass

        if not flashcards:
            return {
                "success": False,
                "error": "Failed to generate flashcards",
                "message": f"I couldn't generate flashcards for '{topic}'. Try being more specific about the topic."
            }

        # Save as a resource
        resource_doc = {
            "user_id": user_id,
            "title": f"Flashcards: {topic}",
            "type": "flashcard_set",
            "content": f"AI-generated flashcards about {topic}",
            "tags": [topic.lower(), "flashcards", "ai-generated"],
            "flashcards": flashcards,
            "created_at": datetime.utcnow(),
            "created_via": "chat_command"
        }

        result = resources_collection.insert_one(resource_doc)

        # Format message
        lines = [f"**Generated {len(flashcards)} Flashcards: {topic}**\n"]
        lines.append("*Preview:*")
        for card in flashcards[:3]:
            lines.append(f"\nQ: {card.get('question', 'N/A')}")
            lines.append(f"A: {card.get('answer', 'N/A')[:100]}...")

        if len(flashcards) > 3:
            lines.append(f"\n*...and {len(flashcards) - 3} more cards*")

        lines.append(f"\n*Saved to your Resources library*")

        return {
            "success": True,
            "result": {
                "resource_id": str(result.inserted_id),
                "topic": topic,
                "count": len(flashcards),
                "flashcards": flashcards
            },
            "message": "\n".join(lines)
        }
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to generate flashcards: {str(e)}"
        }


# ==================== HELP COMMAND ====================

async def handle_help_command(user_id: str, action: str, args: str) -> dict:
    """Handle /help command."""

    lines = ["**Available Commands:**\n"]

    lines.append("**Task Commands:**")
    lines.append("  `/task create <title>` - Create a new task")
    lines.append("  `/task list` - List all your tasks")
    lines.append("  `/task complete <id>` - Mark task as completed")
    lines.append("  `/task delete <id_or_title>` - Delete a task")

    lines.append("\n**Group Commands:**")
    lines.append("  `/group create <name>` - Create a new group")
    lines.append("  `/group list` - List all your groups")
    lines.append("  `/group assign <task> to <group>` - Assign task to group")

    lines.append("\n**Plan Commands:**")
    lines.append("  `/plan generate` - Generate today's study plan")
    lines.append("  `/plan show` - Show today's study plan")

    lines.append("\n**Flashcard Commands:**")
    lines.append("  `/flashcard generate <topic>` - Generate flashcards")

    return {
        "success": True,
        "result": {"commands": AVAILABLE_COMMANDS},
        "message": "\n".join(lines)
    }


def get_command_suggestions(partial: str) -> List[dict]:
    """Get command suggestions for autocomplete."""
    partial = partial.lower()
    suggestions = []

    for cmd in AVAILABLE_COMMANDS:
        if cmd["command"].lower().startswith(partial):
            suggestions.append(cmd)

    return suggestions[:5]
