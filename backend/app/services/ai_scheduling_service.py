from app.services.ollama_service import generate_ai_response
from app.db_config import tasks_collection, stress_logs_collection, focus_sessions_collection
from datetime import datetime, timedelta
from bson import ObjectId
import json
import uuid


def get_urgency_label(days_until_deadline: int) -> str:
    """Convert days until deadline to urgency label"""
    if days_until_deadline <= 0:
        return "immediate"
    elif days_until_deadline <= 2:
        return "soon"
    elif days_until_deadline <= 7:
        return "upcoming"
    else:
        return "flexible"


def get_active_tasks(user_id: str, target_date: datetime) -> list:
    """Fetch all active (non-completed) tasks for a user"""
    tasks = list(tasks_collection.find({
        "assigned_to": user_id,
        "status": {"$ne": "completed"}
    }))

    # Convert ObjectId to string and datetime for serialization
    for task in tasks:
        task["_id"] = str(task["_id"])
        if task.get("deadline"):
            if isinstance(task["deadline"], str):
                task["deadline"] = datetime.fromisoformat(task["deadline"].replace("Z", "+00:00"))

    return tasks


def score_tasks(tasks: list, target_date: datetime, stress_level: float) -> list:
    """
    Score each task based on:
    - Deadline urgency (40% weight)
    - Priority level (25% weight)
    - Complexity vs stress balance (20% weight)
    - Estimated completion time (15% weight)
    """
    scored = []

    for task in tasks:
        deadline = task.get("deadline")

        # Calculate days until deadline
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            days_until_deadline = (deadline.replace(tzinfo=None) - target_date.replace(tzinfo=None)).days
        else:
            days_until_deadline = 30  # No deadline = flexible

        # Deadline score (0-40)
        if days_until_deadline <= 0:
            deadline_score = 40  # Overdue
        elif days_until_deadline <= 1:
            deadline_score = 38  # Due today/tomorrow
        elif days_until_deadline <= 2:
            deadline_score = 35
        elif days_until_deadline <= 3:
            deadline_score = 28
        elif days_until_deadline <= 7:
            deadline_score = 20
        elif days_until_deadline <= 14:
            deadline_score = 12
        else:
            deadline_score = max(5, 10 - (days_until_deadline - 14))

        # Priority score (0-25)
        priority_map = {"urgent": 25, "high": 20, "medium": 12, "low": 5}
        priority_score = priority_map.get(task.get("priority", "medium"), 12)

        # Complexity-stress balance (0-20)
        complexity = task.get("complexity_score", 5)
        if stress_level >= 7:
            # High stress: prefer easier tasks
            complexity_score = max(0, 20 - (complexity * 2))
        elif stress_level >= 4:
            # Moderate stress: balanced approach
            complexity_score = 10
        else:
            # Low stress: can handle harder tasks
            complexity_score = min(20, complexity * 2)

        # Time estimate score (0-15) - prefer shorter tasks for flexibility
        hours = task.get("estimated_hours", 2)
        time_score = max(0, 15 - (hours * 1.5))

        total_score = deadline_score + priority_score + complexity_score + time_score

        scored.append({
            **task,
            "scheduling_score": round(total_score, 1),
            "deadline_urgency": get_urgency_label(days_until_deadline),
            "days_until_deadline": days_until_deadline
        })

    return sorted(scored, key=lambda x: x["scheduling_score"], reverse=True)


def calculate_available_slots(preferences: dict, target_date: datetime) -> list:
    """Calculate available time slots based on user preferences"""
    study_hours = preferences.get("study_hours", {"start": "09:00", "end": "21:00"})
    start_parts = study_hours.get("start", "09:00").split(":")
    end_parts = study_hours.get("end", "21:00").split(":")

    start_hour = int(start_parts[0])
    start_minute = int(start_parts[1]) if len(start_parts) > 1 else 0
    end_hour = int(end_parts[0])
    end_minute = int(end_parts[1]) if len(end_parts) > 1 else 0

    blocked_times = preferences.get("blocked_times", [])

    slots = []
    current_time = target_date.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
    end_time = target_date.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)

    # Get day of week for blocked time matching
    day_name = target_date.strftime("%A").lower()

    while current_time < end_time:
        slot_end = current_time + timedelta(minutes=30)
        if slot_end > end_time:
            slot_end = end_time

        # Check if slot is blocked
        is_blocked = False
        current_time_str = current_time.strftime("%H:%M")

        for blocked in blocked_times:
            blocked_day = blocked.get("day", "").lower()
            if blocked_day != "daily" and blocked_day != day_name:
                continue

            blocked_start = blocked.get("start_time", "")
            blocked_end = blocked.get("end_time", "")

            # Simple overlap check
            if blocked_start <= current_time_str < blocked_end:
                is_blocked = True
                break

        if not is_blocked:
            slots.append({
                "start": current_time.strftime("%H:%M"),
                "end": slot_end.strftime("%H:%M"),
                "available": True
            })

        current_time = slot_end

    return slots


def select_session_type(task: dict, stress_level: float, hour: int) -> str:
    """Select appropriate session type based on task complexity, stress, and time of day"""
    complexity = task.get("complexity_score", 5)
    estimated_hours = task.get("estimated_hours", 1)

    # High stress: shorter sessions
    if stress_level >= 7:
        return "short_burst" if complexity <= 4 else "pomodoro"

    # Low stress + complex task + morning: deep work
    if stress_level <= 3 and complexity >= 7 and 6 <= hour <= 12:
        return "deep_work"

    # Long task with low stress: deep work
    if stress_level <= 4 and estimated_hours >= 3:
        return "deep_work"

    # Default to pomodoro
    return "pomodoro"


def get_session_duration(session_type: str, stress_level: float) -> int:
    """Get session duration in minutes based on type and stress"""
    base_durations = {
        "pomodoro": 25,
        "deep_work": 90,
        "short_burst": 15
    }

    duration = base_durations.get(session_type, 25)

    # Reduce duration for high stress
    if stress_level >= 8:
        duration = min(duration, 20)
    elif stress_level >= 6:
        duration = int(duration * 0.8)

    return duration


def ai_generate_schedule(scored_tasks: list, time_slots: list, preferences: dict, stress_level: float) -> dict:
    """Use Ollama AI to generate optimal schedule"""

    stress_text = "relaxed" if stress_level <= 3 else "moderate" if stress_level <= 6 else "high"

    # Prepare task summary for AI (limit to top 8 tasks)
    task_summary = []
    for t in scored_tasks[:8]:
        task_summary.append({
            "title": t.get("title", "Untitled"),
            "complexity": t.get("complexity_score", 5),
            "estimated_hours": t.get("estimated_hours", 2),
            "priority": t.get("priority", "medium"),
            "urgency": t.get("deadline_urgency", "flexible"),
            "score": t.get("scheduling_score", 0)
        })

    # Limit slots for prompt
    available_slots = time_slots[:24]  # Max 12 hours of slots

    prompt = f"""You are an intelligent study planner. Create an optimal study schedule.

STRESS LEVEL: {stress_level}/10 ({stress_text})

TASKS (sorted by priority):
{json.dumps(task_summary, indent=2)}

AVAILABLE SLOTS: {len(available_slots)} slots from {available_slots[0]['start'] if available_slots else '09:00'} to {available_slots[-1]['end'] if available_slots else '21:00'}

PREFERENCES:
- Session length: {preferences.get('preferred_session_length', 25)} min
- Short break: {preferences.get('break_duration_short', 5)} min
- Long break: {preferences.get('break_duration_long', 15)} min
- Max daily hours: {preferences.get('max_daily_study_hours', 8)}
- Pattern: {preferences.get('preferred_complexity_pattern', 'alternating')}

RULES:
1. High urgency tasks first
2. If stress is HIGH: shorter sessions, more breaks, easier tasks first
3. If stress is LOW: can do deep work sessions
4. Add breaks every 2-4 study blocks
5. Alternate complexity based on pattern preference

Return ONLY valid JSON:
{{"study_blocks":[{{"task_title":"..","start_time":"HH:MM","end_time":"HH:MM","duration_minutes":25,"session_type":"pomodoro"}}],"break_blocks":[{{"start_time":"HH:MM","end_time":"HH:MM","duration_minutes":5,"break_type":"short"}}],"total_study_hours":4.5,"ai_reasoning":"Brief explanation"}}"""

    response = generate_ai_response(prompt)

    try:
        start = response.find('{')
        end = response.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except:
        pass

    # Return None to trigger fallback
    return None


def generate_fallback_schedule(scored_tasks: list, time_slots: list, preferences: dict, stress_level: float) -> dict:
    """Fallback algorithm if AI fails - uses greedy scheduling"""

    study_blocks = []
    break_blocks = []
    current_slot_idx = 0
    consecutive_blocks = 0
    total_minutes = 0

    max_daily_minutes = preferences.get("max_daily_study_hours", 8) * 60
    short_break = preferences.get("break_duration_short", 5)
    long_break = preferences.get("break_duration_long", 15)
    preferred_duration = preferences.get("preferred_session_length", 25)

    for task in scored_tasks:
        if current_slot_idx >= len(time_slots) or total_minutes >= max_daily_minutes:
            break

        # Determine session type and duration
        current_hour = int(time_slots[current_slot_idx]["start"].split(":")[0])
        session_type = select_session_type(task, stress_level, current_hour)
        duration = get_session_duration(session_type, stress_level)

        # Adjust duration to fit available slots
        slots_needed = (duration + 29) // 30  # Round up to slots
        if current_slot_idx + slots_needed > len(time_slots):
            slots_needed = len(time_slots) - current_slot_idx
            duration = slots_needed * 30

        if duration < 15:  # Skip if less than 15 min
            continue

        # Add break if needed
        if consecutive_blocks > 0:
            break_duration = long_break if consecutive_blocks >= 4 else short_break
            break_start = time_slots[current_slot_idx]["start"]

            # Calculate break end time
            break_start_dt = datetime.strptime(break_start, "%H:%M")
            break_end_dt = break_start_dt + timedelta(minutes=break_duration)
            break_end = break_end_dt.strftime("%H:%M")

            break_blocks.append({
                "start_time": break_start,
                "end_time": break_end,
                "duration_minutes": break_duration,
                "break_type": "long" if consecutive_blocks >= 4 else "short"
            })

            # Advance slots for break
            break_slots = (break_duration + 29) // 30
            current_slot_idx += break_slots

            if consecutive_blocks >= 4:
                consecutive_blocks = 0

            if current_slot_idx >= len(time_slots):
                break

        # Create study block
        start_time = time_slots[current_slot_idx]["start"]
        start_dt = datetime.strptime(start_time, "%H:%M")
        end_dt = start_dt + timedelta(minutes=duration)
        end_time = end_dt.strftime("%H:%M")

        study_blocks.append({
            "id": str(uuid.uuid4()),
            "task_id": task.get("_id", ""),
            "task_title": task.get("title", "Untitled"),
            "start_time": start_time,
            "end_time": end_time,
            "duration_minutes": duration,
            "session_type": session_type,
            "complexity": task.get("complexity_score", 5),
            "priority": task.get("priority", "medium"),
            "deadline_urgency": task.get("deadline_urgency", "flexible"),
            "completed": False,
            "notes": ""
        })

        total_minutes += duration
        consecutive_blocks += 1
        current_slot_idx += slots_needed

    return {
        "study_blocks": study_blocks,
        "break_blocks": break_blocks,
        "total_study_hours": round(total_minutes / 60, 1),
        "ai_reasoning": f"Schedule generated using priority-based algorithm. {len(study_blocks)} study blocks created based on deadline urgency and complexity balance."
    }


def generate_study_schedule(user_id: str, target_date: datetime, preferences: dict, stress_data: dict) -> dict:
    """
    Main function to generate AI-powered study schedule.
    Combines deadline-first prioritization, complexity balancing, and stress-awareness.
    """

    # Get stress level
    stress_level = stress_data.get("objective_score", 5)

    # Step 1: Gather all active tasks
    active_tasks = get_active_tasks(user_id, target_date)

    if not active_tasks:
        return {
            "study_blocks": [],
            "break_blocks": [],
            "total_study_hours": 0,
            "ai_reasoning": "No active tasks found. Add some tasks to generate a study schedule."
        }

    # Step 2: Calculate available time slots
    time_slots = calculate_available_slots(preferences, target_date)

    if not time_slots:
        return {
            "study_blocks": [],
            "break_blocks": [],
            "total_study_hours": 0,
            "ai_reasoning": "No available time slots for the selected date based on your preferences."
        }

    # Step 3: Score and prioritize tasks
    scored_tasks = score_tasks(active_tasks, target_date, stress_level)

    # Step 4: Try AI generation first
    ai_schedule = ai_generate_schedule(scored_tasks, time_slots, preferences, stress_level)

    if ai_schedule and ai_schedule.get("study_blocks"):
        # Enrich AI schedule with task IDs and additional data
        for block in ai_schedule.get("study_blocks", []):
            if not block.get("id"):
                block["id"] = str(uuid.uuid4())

            # Match task title to task ID
            for task in scored_tasks:
                if task.get("title", "").lower() in block.get("task_title", "").lower():
                    block["task_id"] = task.get("_id", "")
                    block["complexity"] = task.get("complexity_score", 5)
                    block["priority"] = task.get("priority", "medium")
                    block["deadline_urgency"] = task.get("deadline_urgency", "flexible")
                    break

            if not block.get("completed"):
                block["completed"] = False
            if not block.get("notes"):
                block["notes"] = ""

        return ai_schedule

    # Step 5: Fall back to algorithmic generation
    return generate_fallback_schedule(scored_tasks, time_slots, preferences, stress_level)
