from app.services.ollama_service import generate_ai_response
import json

def analyze_extension_request(task, original_deadline, requested_deadline, reason, reason_category):
    """
    Analyze an extension request and provide AI-powered recommendation

    Args:
        task: Task document with details
        original_deadline: Original deadline as string
        requested_deadline: Requested new deadline as string
        reason: Student's explanation for extension
        reason_category: Category (medical/technical/overlapping/personal/other)

    Returns:
        dict: AI recommendation with reasoning and confidence score
    """
    prompt = f"""Analyze this deadline extension request and provide a recommendation:

Task: {task['title']}
Description: {task.get('description', 'No description')}
Original Deadline: {original_deadline}
Requested Deadline: {requested_deadline}
Reason: {reason}
Category: {reason_category}
Task Complexity: {task.get('complexity_score', 5)}/10
Estimated Hours: {task.get('estimated_hours', 0)} hours

Based on the information, determine if this extension should be approved.
Consider:
1. Validity of the reason
2. Reasonableness of the time extension
3. Task complexity and estimated hours
4. Category of the reason

Provide recommendation as JSON:
{{"recommendation": "approve/deny/conditional", "confidence": 0.85, "reasoning": "Clear explanation here", "suggested_deadline": "2026-01-10T00:00:00Z"}}

Response must be valid JSON only."""

    response = generate_ai_response(prompt)

    try:
        # Extract JSON from response
        start = response.find('{')
        end = response.rfind('}') + 1

        if start != -1 and end > start:
            json_str = response[start:end]
            result = json.loads(json_str)

            # Validate response structure
            if 'recommendation' in result and 'confidence' in result and 'reasoning' in result:
                # Ensure confidence is between 0 and 1
                if isinstance(result['confidence'], (int, float)):
                    result['confidence'] = max(0.0, min(1.0, float(result['confidence'])))
                else:
                    result['confidence'] = 0.5

                # Ensure suggested_deadline exists
                if 'suggested_deadline' not in result:
                    result['suggested_deadline'] = requested_deadline

                return result
    except Exception as e:
        print(f"AI Extension Analysis Error: {str(e)}")

    # Fallback response if AI fails
    return {
        "recommendation": "conditional",
        "confidence": 0.5,
        "reasoning": "Unable to analyze automatically. Manual review recommended based on the reason category and complexity of the task.",
        "suggested_deadline": requested_deadline
    }
