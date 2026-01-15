import ollama
from typing import Optional, List
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def generate_ai_response(prompt: str, context: dict = None, json_mode: bool = False) -> str:
    """
    Generate AI response using Ollama.

    Args:
        prompt: The prompt to send to the model
        context: Optional context dict (unused currently)
        json_mode: If True, request JSON format output from Ollama

    Returns:
        The model's response text, or an error string starting with "AI Error:"
    """
    try:
        kwargs = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
        }

        # Use format='json' when JSON output is expected
        # This tells Ollama to constrain output to valid JSON
        if json_mode:
            kwargs["format"] = "json"

        response = ollama.generate(**kwargs)
        result = response.get('response', '')

        if not result:
            logger.warning("Ollama returned empty response")
            return "AI Error: Empty response from model"

        return result
    except ollama.ResponseError as e:
        logger.error(f"Ollama response error: {e}", exc_info=True)
        return f"AI Error: Model error - {str(e)}"
    except Exception as e:
        logger.error(f"Ollama service error: {e}", exc_info=True)
        return f"AI Error: {str(e)}"


def generate_json_response(prompt: str) -> str:
    """
    Generate AI response with JSON format enforced.
    This uses Ollama's format='json' parameter for better JSON output.
    """
    return generate_ai_response(prompt, json_mode=True)


def test_ollama_connection():
    response = generate_ai_response("Say 'AI Ready'")
    return "Ready" in response


def generate_chat_response(
    user_message: str,
    system_prompt: str,
    chat_history: Optional[List[dict]] = None,
    document_content: Optional[str] = None,
    use_chat_model: bool = True
) -> str:
    """
    Generate a conversational AI response with full context support.

    Args:
        user_message: The user's current message
        system_prompt: System prompt with user context
        chat_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        document_content: Optional extracted document text to include
        use_chat_model: If True, use the chat model (llama3.2:3b), else use code model

    Returns:
        The AI's response text
    """
    try:
        # Build messages list for chat endpoint
        messages = []

        # Add system message with context
        full_system = system_prompt
        if document_content:
            # Truncate document if too long
            max_doc_length = settings.ai_max_context_length // 2
            if len(document_content) > max_doc_length:
                document_content = document_content[:max_doc_length] + "\n[Document truncated...]"

            full_system += f"\n\n=== UPLOADED DOCUMENT ===\n{document_content}"

        messages.append({
            "role": "system",
            "content": full_system
        })

        # Add chat history for context continuity
        if chat_history:
            # Only include recent history to stay within context limits
            recent_history = chat_history[-10:]  # Last 10 messages
            for msg in recent_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")[:1000]  # Truncate long messages
                })

        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })

        # Choose model
        model = settings.ollama_chat_model if use_chat_model else settings.ollama_model

        # Call Ollama chat endpoint
        response = ollama.chat(
            model=model,
            messages=messages,
            stream=False
        )

        result = response.get('message', {}).get('content', '')

        if not result:
            logger.warning("Ollama chat returned empty response")
            return "I apologize, but I couldn't generate a response. Please try again."

        return result

    except ollama.ResponseError as e:
        logger.error(f"Ollama chat error: {e}", exc_info=True)
        return f"I encountered an error processing your request. Please try again."
    except Exception as e:
        logger.error(f"Ollama chat service error: {e}", exc_info=True)
        return f"Sorry, I'm having trouble connecting to the AI service. Please try again later."


def build_ai_system_prompt(
    user_name: str,
    user_role: str,
    context_text: str
) -> str:
    """
    Build the system prompt for the AI assistant with user context.

    Args:
        user_name: User's display name
        user_role: User's role (student/teacher)
        context_text: Pre-formatted context text from user_context_service

    Returns:
        Complete system prompt string
    """
    return f"""You are a personal AI assistant for {user_name}, a {user_role}.

You have FULL ACCESS to their private data and can help them with:
- Managing tasks and deadlines
- Study planning and scheduling
- Generating flashcards
- Answering questions about their schedule
- Providing personalized recommendations

{context_text}

=== CAPABILITIES ===
You can execute these slash commands when users ask:
- /task create <title> - Create a new task
- /task list - List all tasks
- /task complete <id> - Mark task complete
- /task delete <id> - Delete a task
- /group create <name> - Create a group
- /group list - List groups
- /plan generate - Generate study plan
- /flashcard generate <topic> - Generate flashcards

When users ask to do something that matches a command, suggest they use the command or tell them you'll execute it.

=== INSTRUCTIONS ===
- Be helpful, friendly, and encouraging
- Reference actual task names, deadlines, and data from the context above
- Give specific, actionable advice
- If a user uploads a document, analyze it and answer questions about it
- Keep responses concise but informative
- Use markdown formatting for better readability"""


def analyze_document_with_ai(
    document_text: str,
    user_question: str,
    document_type: str = "document"
) -> str:
    """
    Analyze a document and answer a user's question about it.

    Args:
        document_text: Extracted text from the document
        user_question: User's question about the document
        document_type: Type of document (pdf, image, code, etc.)

    Returns:
        AI's analysis/answer
    """
    # Truncate if too long
    max_length = settings.ai_max_context_length
    if len(document_text) > max_length:
        document_text = document_text[:max_length] + "\n[Content truncated...]"

    prompt = f"""Analyze the following {document_type} and answer the user's question.

=== DOCUMENT CONTENT ===
{document_text}

=== USER QUESTION ===
{user_question}

=== INSTRUCTIONS ===
- Provide a clear, helpful answer based on the document content
- If the question asks for a summary, provide a concise summary
- If the document is code, explain what it does
- If the document is an image (OCR text), describe what was detected
- Be specific and reference actual content from the document

Answer:"""

    return generate_chat_response(
        user_message=prompt,
        system_prompt="You are a helpful document analysis assistant.",
        use_chat_model=True
    )
