import ollama
from app.config import settings

def generate_ai_response(prompt: str, context: dict = None) -> str:
    try:
        response = ollama.generate(
            model=settings.ollama_model,
            prompt=prompt,
            stream=False
        )
        return response['response']
    except Exception as e:
        return f"AI Error: {str(e)}"

def test_ollama_connection():
    response = generate_ai_response("Say 'AI Ready'")
    return "Ready" in response
