from app.services.ollama_service import generate_ai_response
import json
from datetime import datetime, timedelta

def analyze_task_complexity(title: str, description: str) -> dict:
    prompt = f"""Analyze this task and provide:
1. Complexity score (1-10)
2. Estimated hours
3. Suggested deadline (days from now)
4. Priority (low/medium/high/urgent)

Task: {title}
Description: {description}

Respond ONLY in JSON format:
{{"complexity": 5, "hours": 8, "deadline_days": 7, "priority": "medium"}}"""

    response = generate_ai_response(prompt)
    try:
        # Extract JSON from response
        start = response.find('{')
        end = response.rfind('}') + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except:
        return {"complexity": 5, "hours": 4, "deadline_days": 3, "priority": "medium"}

def generate_subtasks(title: str, description: str) -> list:
    prompt = f"""Break down this task into 3-5 actionable subtasks.

Task: {title}
Description: {description}

Respond ONLY as JSON array:
["Subtask 1", "Subtask 2", "Subtask 3"]"""

    response = generate_ai_response(prompt)
    try:
        start = response.find('[')
        end = response.rfind(']') + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except:
        return ["Research task requirements", "Plan approach", "Execute and review"]
