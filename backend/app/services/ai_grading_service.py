"""
AI Grading Service - Week 2 Feature
Provides intelligent grading suggestions based on task performance
"""

from app.services.ollama_service import generate_ai_response
import json
from typing import Dict, List
from datetime import datetime


async def generate_grading_explanation(
    task: dict,
    student: dict,
    performance_data: dict,
    suggested_grade: float,
    historical_average: float
) -> Dict:
    """
    Use AI to generate human-readable grading explanation with encouragement

    Args:
        task: Task document
        student: Student user document
        performance_data: Performance metrics
        suggested_grade: Calculated grade (0-100)
        historical_average: Student's historical average grade

    Returns:
        Dict with reasoning, strengths, weaknesses, improvements
    """

    prompt = f"""You are an experienced, encouraging teacher assistant helping to grade student work fairly.

Student: {student.get('full_name', 'Student')}
Task: {task.get('title', 'Task')}
Task Complexity: {task.get('complexity_score', 5)}/10

Performance Data:
- Estimated time: {performance_data.get('estimated_hours', 0)}h
- Actual time: {performance_data.get('actual_hours', 0):.1f}h
- Completed on time: {performance_data.get('completed_on_time', False)}
- Subtasks completed: {performance_data.get('subtasks_completed', 0)}/{performance_data.get('total_subtasks', 0)}
- Extension requests: {performance_data.get('extension_requests', 0)}

Suggested Grade: {suggested_grade:.1f}/100
Student's Historical Average: {historical_average:.1f}/100

Please provide a constructive, encouraging assessment in JSON format:

{{
  "reasoning": "A clear 2-3 sentence explanation of why this grade is appropriate. Be specific about what the student did well and what could improve. Use an encouraging, supportive tone.",

  "strengths": [
    "Specific strength 1 (e.g., 'Completed all subtasks thoroughly')",
    "Specific strength 2 (e.g., 'Finished ahead of the deadline')",
    "Specific strength 3 (e.g., 'Demonstrated strong time management')"
  ],

  "weaknesses": [
    "Area for improvement 1 (phrased constructively)",
    "Area for improvement 2 (phrased constructively)"
  ],

  "improvements": [
    "Actionable suggestion 1 for future tasks",
    "Actionable suggestion 2 for future tasks",
    "Actionable suggestion 3 for future tasks"
  ],

  "encouragement": "A personalized, motivating message based on the student's performance. Acknowledge their effort and growth potential."
}}

IMPORTANT:
- Be encouraging and constructive, not critical
- Focus on growth and learning
- Acknowledge effort even if results weren't perfect
- Provide specific, actionable feedback
- Use a warm, supportive tone"""

    try:
        response = generate_ai_response(prompt)

        # Parse JSON from response
        start = response.find('{')
        end = response.rfind('}') + 1

        if start == -1 or end == 0:
            return _create_fallback_grading_response(suggested_grade, historical_average)

        json_str = response[start:end]
        parsed = json.loads(json_str)

        # Validate required fields
        required_fields = ['reasoning', 'strengths', 'weaknesses', 'improvements']
        if not all(field in parsed for field in required_fields):
            return _create_fallback_grading_response(suggested_grade, historical_average)

        return parsed

    except Exception as e:
        print(f"AI grading explanation error: {e}")
        return _create_fallback_grading_response(suggested_grade, historical_average)


def _create_fallback_grading_response(suggested_grade: float, historical_average: float) -> Dict:
    """Fallback response if AI fails"""

    return {
        "reasoning": f"This grade of {suggested_grade:.1f}/100 reflects the student's performance on this task, considering time management, completion quality, and deadline adherence.",

        "strengths": [
            "Task was completed successfully",
            "Demonstrated effort and commitment",
            "Followed submission guidelines"
        ],

        "weaknesses": [
            "Time management could be improved",
            "Consider planning tasks more carefully"
        ],

        "improvements": [
            "Break down complex tasks into smaller steps",
            "Start working on tasks earlier to avoid deadline pressure",
            "Reach out for help when needed"
        ],

        "encouragement": "Keep up the good work! Every task is an opportunity to learn and grow. 📚"
    }


def calculate_grade_from_performance(performance_data: dict, task: dict) -> float:
    """
    Calculate grade based on multiple performance factors

    Grading Criteria:
    - Base score: 100
    - Time management: -10 to +5 points
    - Deadline compliance: up to -20 points
    - Subtask completion: up to -15 points
    - Extension requests: -3 per excessive request
    - Complexity bonus: +5 for difficult tasks

    Args:
        performance_data: Performance metrics
        task: Task document

    Returns:
        Grade score (0-100)
    """

    base_score = 100.0

    # Time management adjustment (-10 to +5)
    estimated_hours = max(performance_data.get('estimated_hours', 1), 0.5)
    actual_hours = performance_data.get('actual_hours', 0)

    if estimated_hours > 0 and actual_hours > 0:
        time_ratio = actual_hours / estimated_hours

        if time_ratio > 1.5:  # Took 50% longer than estimated
            base_score -= 10
        elif time_ratio < 0.7:  # Completed in <70% of estimated time
            base_score += 5  # Bonus for efficiency

    # Deadline compliance (up to -20)
    if not performance_data.get('completed_on_time', True):
        days_late = performance_data.get('days_late', 0)
        penalty = min(days_late * 5, 20)  # Max 20-point penalty
        base_score -= penalty

    # Subtask completion (up to -15)
    total_subtasks = performance_data.get('total_subtasks', 0)
    if total_subtasks > 0:
        subtasks_completed = performance_data.get('subtasks_completed', 0)
        completion_rate = subtasks_completed / total_subtasks

        if completion_rate < 1.0:
            penalty = (1 - completion_rate) * 15
            base_score -= penalty

    # Extension requests penalty (-3 per excessive request)
    extension_requests = performance_data.get('extension_requests', 0)
    if extension_requests > 2:
        penalty = (extension_requests - 2) * 3
        base_score -= penalty

    # Complexity bonus (+5 for difficult tasks)
    complexity = task.get('complexity_score', 5)
    if complexity >= 8:
        base_score += 5

    # Ensure grade is within bounds
    final_grade = max(0, min(100, base_score))

    return round(final_grade, 1)


async def analyze_student_performance_trend(student_id: str, tasks_collection) -> Dict:
    """
    Analyze student's performance trend over recent tasks

    Returns:
        Dict with avg_grade, trend, recent_performance
    """

    # Get completed tasks for student
    completed_tasks = list(tasks_collection.find({
        "assigned_to": student_id,
        "status": "completed",
        "grade": {"$exists": True}
    }).sort("completion_date", -1).limit(10))

    if not completed_tasks:
        return {
            "avg_grade": 0,
            "trend": "no_data",
            "recent_performance": [],
            "task_count": 0
        }

    # Calculate average grade
    grades = [task.get('grade', 0) for task in completed_tasks]
    avg_grade = sum(grades) / len(grades) if grades else 0

    # Determine trend (compare recent 3 vs older tasks)
    if len(grades) >= 6:
        recent_avg = sum(grades[:3]) / 3
        older_avg = sum(grades[3:6]) / 3

        if recent_avg > older_avg + 5:
            trend = "improving"
        elif recent_avg < older_avg - 5:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    return {
        "avg_grade": round(avg_grade, 1),
        "trend": trend,
        "recent_performance": grades[:5],
        "task_count": len(completed_tasks)
    }


def identify_performance_strengths_weaknesses(performance_data: dict) -> Dict:
    """
    Identify specific strengths and weaknesses based on performance data

    Returns:
        Dict with strength_areas and weakness_areas
    """

    strengths = []
    weaknesses = []

    # Time management analysis
    if performance_data.get('actual_hours', 0) > 0:
        time_ratio = performance_data.get('actual_hours', 0) / max(performance_data.get('estimated_hours', 1), 0.5)

        if time_ratio <= 0.8:
            strengths.append("Excellent time management - completed efficiently")
        elif time_ratio > 1.5:
            weaknesses.append("Time management - took significantly longer than estimated")

    # Deadline compliance
    if performance_data.get('completed_on_time', False):
        strengths.append("Strong deadline adherence")
    else:
        days_late = performance_data.get('days_late', 0)
        if days_late > 0:
            weaknesses.append(f"Deadline management - submitted {days_late} day(s) late")

    # Subtask completion
    total_subtasks = performance_data.get('total_subtasks', 0)
    if total_subtasks > 0:
        completion_rate = performance_data.get('subtasks_completed', 0) / total_subtasks

        if completion_rate >= 0.9:
            strengths.append("Thorough task completion - completed all subtasks")
        elif completion_rate < 0.7:
            weaknesses.append("Task thoroughness - some subtasks incomplete")

    # Extension requests
    extension_requests = performance_data.get('extension_requests', 0)
    if extension_requests == 0:
        strengths.append("Self-sufficient planning - no extension requests needed")
    elif extension_requests > 2:
        weaknesses.append("Frequent extension requests - may need better initial planning")

    return {
        "strength_areas": strengths if strengths else ["Completed the task successfully"],
        "weakness_areas": weaknesses if weaknesses else []
    }
