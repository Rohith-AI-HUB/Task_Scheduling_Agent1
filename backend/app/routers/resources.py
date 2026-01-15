from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from app.db_config import db, tasks_collection
from app.routers.auth import get_current_user
from app.services.ollama_service import generate_ai_response, generate_json_response
from app.utils.logger import get_logger
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel, Field, validator
import os
import json
import ast
import shutil
import re
from pypdf import PdfReader

logger = get_logger(__name__)

router = APIRouter(prefix="/resources", tags=["Resources"])

resources_collection = db["resources"]

# MongoDB Schema: resources
# {
#     "_id": ObjectId,
#     "user_id": str,
#     "task_id": str,  # Optional: link to task
#     "title": str,
#     "type": str,  # "note", "pdf", "video", "link", "code", "file"
#     "content": str,  # Markdown for notes, text content
#     "file_url": str,  # For uploads
#     "tags": List[str],
#     "ai_summary": str,
#     "ai_key_points": List[str],
#     "flashcards": List[dict],
#     "related_resources": List[str],  # Resource IDs
#     "favorite": bool,
#     "created_at": datetime,
#     "updated_at": datetime
# }


class CreateNoteRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Note title")
    content: str = Field(..., min_length=1, max_length=50000, description="Note content")
    task_id: Optional[str] = None
    tags: List[str] = Field(default=[], max_items=20, description="Tags for the note")

    @validator('title', 'content')
    def strip_and_validate(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or only whitespace')
        return v.strip()

    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        # Validate each tag
        validated_tags = []
        for tag in v:
            if isinstance(tag, str) and tag.strip() and len(tag.strip()) <= 50:
                validated_tags.append(tag.strip())
        return validated_tags

    @validator('task_id')
    def validate_task_id(cls, v):
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid task_id format')
        return v


class CreateLinkRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Link title")
    url: str = Field(..., min_length=1, max_length=2000, description="URL")
    task_id: Optional[str] = None
    tags: List[str] = Field(default=[], max_items=20, description="Tags for the link")
    description: Optional[str] = Field(None, max_length=1000, description="Link description")

    @validator('title', 'url')
    def strip_and_validate(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or only whitespace')
        return v.strip()

    @validator('url')
    def validate_url(cls, v):
        # Basic URL validation
        v = v.strip()
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        if len(v) > 2000:
            raise ValueError('URL too long (max 2000 characters)')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        validated_tags = []
        for tag in v[:20]:  # Limit to 20 tags
            if isinstance(tag, str) and tag.strip() and len(tag.strip()) <= 50:
                validated_tags.append(tag.strip())
        return validated_tags

    @validator('task_id')
    def validate_task_id(cls, v):
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid task_id format')
        return v


class UpdateResourceRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/upload")
async def upload_resource(
    file: UploadFile = File(...),
    task_id: Optional[str] = Form(None),
    tags: Optional[str] = Form("[]"),  # JSON string
    current_user: dict = Depends(get_current_user)
):
    """Upload file (PDF, image, code, etc.) and auto-generate summary"""

    user_id = str(current_user["_id"])

    # Parse tags
    try:
        tags_list = json.loads(tags) if tags else []
    except:
        tags_list = []

    # Validate file
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    # Sanitize filename to prevent path traversal attacks
    # Remove path components and dangerous characters
    safe_filename = os.path.basename(file.filename)
    safe_filename = re.sub(r'[^\w\s\-\.]', '', safe_filename)  # Keep only alphanumeric, spaces, hyphens, dots
    safe_filename = safe_filename.strip()

    if not safe_filename or safe_filename == '.':
        raise HTTPException(400, "Invalid filename")

    # Validate file extension (whitelist)
    allowed_extensions = {
        '.pdf', '.txt', '.md', '.doc', '.docx',
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h',
        '.json', '.xml', '.csv', '.html', '.css',
        '.png', '.jpg', '.jpeg', '.gif', '.svg'
    }
    file_ext = os.path.splitext(safe_filename)[1].lower()
    if not file_ext or file_ext not in allowed_extensions:
        raise HTTPException(
            400,
            f"File type not allowed. Allowed types: {', '.join(sorted(allowed_extensions))}"
        )

    # Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum size is 10MB, got {file_size / 1024 / 1024:.2f}MB")

    if file_size == 0:
        raise HTTPException(400, "File is empty")

    # Create upload directory using proper path construction
    upload_dir = os.path.join("uploads", user_id)
    os.makedirs(upload_dir, exist_ok=True)

    # Save file with sanitized filename
    file_path = os.path.join(upload_dir, safe_filename)

    # Check if file already exists, append number if needed
    base_name, extension = os.path.splitext(safe_filename)
    counter = 1
    while os.path.exists(file_path):
        safe_filename = f"{base_name}_{counter}{extension}"
        file_path = os.path.join(upload_dir, safe_filename)
        counter += 1

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(500, f"Failed to save file: {str(e)}")

    # Determine file type using sanitized filename
    file_type = get_file_type(safe_filename)

    # Extract text content if possible
    content = None
    ai_summary = None
    key_points = []

    try:
        if file_type == "text" or safe_filename.endswith((".txt", ".md", ".py", ".js", ".java", ".cpp")):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        elif file_type == "pdf":
            try:
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                content = text
            except Exception as e:
                logger.error(f"Error reading PDF file: {e}", exc_info=True)

        # Generate AI summary for text/pdf files
        if content and len(content) > 100:
            summary_result = generate_resource_summary(content, safe_filename)
            ai_summary = summary_result.get("summary")
            key_points = summary_result.get("key_points", [])
    except Exception as e:
        logger.error(f"Error processing file content: {e}", exc_info=True)

    # Verify task if provided
    task_title = None
    if task_id:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if task and task.get("assigned_to") == user_id:
            task_title = task.get("title")

    # Save to database
    resource = {
        "user_id": user_id,
        "task_id": task_id,
        "task_title": task_title,
        "title": safe_filename,
        "type": file_type,
        "content": content,
        "file_url": file_path,
        "file_size": os.path.getsize(file_path),
        "tags": tags_list,
        "ai_summary": ai_summary,
        "ai_key_points": key_points,
        "flashcards": [],
        "related_resources": [],
        "favorite": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    result = resources_collection.insert_one(resource)

    return {
        "resource_id": str(result.inserted_id),
        "title": safe_filename,
        "type": file_type,
        "summary": ai_summary,
        "key_points": key_points,
        "message": "Resource uploaded successfully! 📁"
    }


@router.post("/notes")
async def create_note(
    request: CreateNoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a markdown note with AI enhancements"""

    user_id = str(current_user["_id"])

    # Generate AI summary and extract key concepts
    summary_result = generate_resource_summary(request.content, request.title)

    ai_summary = summary_result.get("summary")
    key_concepts = summary_result.get("key_points", [])

    # Combine user tags with AI-extracted concepts
    all_tags = list(set(request.tags + key_concepts[:5]))  # Max 5 AI tags

    # Verify task if provided
    task_title = None
    if request.task_id:
        task = tasks_collection.find_one({"_id": ObjectId(request.task_id)})
        if task and task.get("assigned_to") == user_id:
            task_title = task.get("title")

    # Create note
    note = {
        "user_id": user_id,
        "task_id": request.task_id,
        "task_title": task_title,
        "title": request.title,
        "type": "note",
        "content": request.content,
        "file_url": None,
        "tags": all_tags,
        "ai_summary": ai_summary,
        "ai_key_points": key_concepts,
        "flashcards": [],
        "related_resources": [],
        "favorite": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    result = resources_collection.insert_one(note)

    return {
        "note_id": str(result.inserted_id),
        "title": request.title,
        "suggested_tags": key_concepts,
        "summary": ai_summary,
        "message": "Note created successfully! 📝"
    }


@router.post("/links")
async def create_link(
    request: CreateLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save a link/URL resource"""

    user_id = str(current_user["_id"])

    # Verify task if provided
    task_title = None
    if request.task_id:
        task = tasks_collection.find_one({"_id": ObjectId(request.task_id)})
        if task and task.get("assigned_to") == user_id:
            task_title = task.get("title")

    # Create link resource
    link = {
        "user_id": user_id,
        "task_id": request.task_id,
        "task_title": task_title,
        "title": request.title,
        "type": "link",
        "content": request.description or "",
        "file_url": request.url,
        "tags": request.tags,
        "ai_summary": None,
        "ai_key_points": [],
        "flashcards": [],
        "related_resources": [],
        "favorite": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    result = resources_collection.insert_one(link)

    return {
        "link_id": str(result.inserted_id),
        "title": request.title,
        "message": "Link saved successfully! 🔗"
    }


@router.get("/")
async def get_all_resources(
    type_filter: Optional[str] = None,
    task_id: Optional[str] = None,
    favorite_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get all resources for the current user"""

    user_id = str(current_user["_id"])

    # Build filter
    filters = {"user_id": user_id}

    if type_filter and type_filter != "all":
        filters["type"] = type_filter

    if task_id:
        filters["task_id"] = task_id

    if favorite_only:
        filters["favorite"] = True

    # Get resources
    resources = list(resources_collection.find(filters).sort("created_at", -1))

    # Format response
    formatted_resources = []
    for resource in resources:
        formatted_resources.append(format_resource(resource))

    return {
        "resources": formatted_resources,
        "count": len(formatted_resources),
        "filters": {
            "type": type_filter,
            "task_id": task_id,
            "favorite_only": favorite_only
        }
    }


@router.get("/search")
async def search_resources(
    query: str,
    type_filter: Optional[str] = None,
    task_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Full-text search across all resources"""

    # Validate query input
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if len(query) > 200:
        raise HTTPException(status_code=400, detail="Query too long (max 200 characters)")

    user_id = str(current_user["_id"])

    # Sanitize query - escape regex special characters to prevent injection
    sanitized_query = re.escape(query.strip())

    # Build filter
    filters = {"user_id": user_id}

    if type_filter:
        # Validate type_filter to prevent injection
        valid_types = ["note", "pdf", "video", "link", "code", "file"]
        if type_filter not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid type filter. Must be one of: {', '.join(valid_types)}")
        filters["type"] = type_filter

    if task_id:
        # Validate ObjectId format
        if not ObjectId.is_valid(task_id):
            raise HTTPException(status_code=400, detail="Invalid task_id format")
        filters["task_id"] = task_id

    # Search in title, content, tags, summary with sanitized query
    search_filters = {
        **filters,
        "$or": [
            {"title": {"$regex": sanitized_query, "$options": "i"}},
            {"content": {"$regex": sanitized_query, "$options": "i"}},
            {"tags": {"$regex": sanitized_query, "$options": "i"}},
            {"ai_summary": {"$regex": sanitized_query, "$options": "i"}}
        ]
    }

    resources = list(resources_collection.find(search_filters).sort("created_at", -1).limit(50))

    formatted_resources = [format_resource(r) for r in resources]

    return {
        "results": formatted_resources,
        "count": len(formatted_resources),
        "query": query
    }


@router.get("/{resource_id}")
async def get_resource(
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific resource"""

    user_id = str(current_user["_id"])

    resource = resources_collection.find_one({
        "_id": ObjectId(resource_id),
        "user_id": user_id
    })

    if not resource:
        raise HTTPException(404, "Resource not found")

    return format_resource(resource)


@router.put("/{resource_id}")
async def update_resource(
    resource_id: str,
    request: UpdateResourceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a resource"""

    user_id = str(current_user["_id"])

    resource = resources_collection.find_one({
        "_id": ObjectId(resource_id),
        "user_id": user_id
    })

    if not resource:
        raise HTTPException(404, "Resource not found")

    # Build update
    update_data = {"updated_at": datetime.now()}

    if request.title:
        update_data["title"] = request.title

    if request.content is not None:
        update_data["content"] = request.content

        # Regenerate AI summary for notes
        if resource["type"] == "note":
            summary_result = generate_resource_summary(request.content, resource["title"])
            update_data["ai_summary"] = summary_result.get("summary")
            update_data["ai_key_points"] = summary_result.get("key_points", [])

    if request.tags is not None:
        update_data["tags"] = request.tags

    # Update
    resources_collection.update_one(
        {"_id": ObjectId(resource_id)},
        {"$set": update_data}
    )

    return {"message": "Resource updated successfully"}


@router.put("/{resource_id}/favorite")
async def toggle_favorite(
    resource_id: str,
    favorite: bool,
    current_user: dict = Depends(get_current_user)
):
    """Toggle favorite status"""

    user_id = str(current_user["_id"])

    result = resources_collection.update_one(
        {"_id": ObjectId(resource_id), "user_id": user_id},
        {"$set": {"favorite": favorite}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Resource not found")

    return {"message": f"Resource {('favorited' if favorite else 'unfavorited')}"}


@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a resource"""

    user_id = str(current_user["_id"])

    resource = resources_collection.find_one({
        "_id": ObjectId(resource_id),
        "user_id": user_id
    })

    if not resource:
        raise HTTPException(404, "Resource not found")

    # Delete file if exists
    if resource.get("file_url") and os.path.exists(resource["file_url"]):
        try:
            os.remove(resource["file_url"])
        except Exception as e:
            logger.error(f"Error deleting file: {e}", exc_info=True)

    # Delete from database
    resources_collection.delete_one({"_id": ObjectId(resource_id)})

    return {"message": "Resource deleted successfully"}


@router.post("/{resource_id}/flashcards")
async def generate_flashcards(
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """AI generates flashcards from resource content"""

    user_id = str(current_user["_id"])

    resource = resources_collection.find_one({
        "_id": ObjectId(resource_id),
        "user_id": user_id
    })

    if not resource:
        raise HTTPException(404, "Resource not found")

    # Check if flashcards already exist
    if resource.get("flashcards") and len(resource["flashcards"]) > 0:
        return {
            "flashcards": resource["flashcards"],
            "count": len(resource["flashcards"]),
            "message": "Using existing flashcards"
        }

    # Get content to analyze
    content = resource.get("content") or resource.get("ai_summary", "")

    # If content is missing but file exists (e.g. uploaded before PDF support), try to read it
    if (not content or len(content) < 50) and resource.get("file_url") and os.path.exists(resource["file_url"]):
        try:
            file_path = resource["file_url"]
            file_ext = file_path.lower().split('.')[-1] if '.' in file_path else ''
            
            extracted_text = ""
            if file_ext == 'pdf':
                reader = PdfReader(file_path)
                for page in reader.pages:
                    extracted_text += page.extract_text() + "\n"
            elif file_ext in ['txt', 'md', 'py', 'js', 'java', 'cpp', 'c', 'h', 'html', 'css', 'json']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    extracted_text = f.read()
            
            if extracted_text and len(extracted_text) > 50:
                content = extracted_text
                # Update DB with extracted content
                resources_collection.update_one(
                    {"_id": ObjectId(resource_id)},
                    {"$set": {"content": content}}
                )
                logger.info(f"Extracted content from existing file: {len(content)} chars")
        except Exception as e:
            logger.error(f"Error reading existing file for flashcards: {e}", exc_info=True)

    if not content or len(content) < 50:
        msg = "Not enough content to generate flashcards."
        if resource.get("type") not in ["note", "text", "pdf", "code"]:
            msg += f" File type '{resource.get('type')}' is not supported yet."
        else:
            msg += " Please add more content or a summary."
        raise HTTPException(400, msg)

    # Generate flashcards with AI
    result = generate_flashcards_ai(content, resource.get("title", ""))

    if not result["success"]:
        # Log the error and return informative message to user
        logger.warning(f"Flashcard generation failed for resource {resource_id}: {result['error']}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate flashcards: {result['error']}"
        )

    flashcards = result["flashcards"]

    # Save flashcards
    resources_collection.update_one(
        {"_id": ObjectId(resource_id)},
        {"$set": {"flashcards": flashcards, "updated_at": datetime.now()}}
    )

    return {
        "flashcards": flashcards,
        "count": len(flashcards),
        "message": f"Generated {len(flashcards)} flashcards! 📇"
    }


# Helper functions

def get_file_type(filename: str) -> str:
    """Determine file type from extension"""

    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    type_map = {
        'pdf': 'pdf',
        'doc': 'document',
        'docx': 'document',
        'txt': 'text',
        'md': 'text',
        'py': 'code',
        'js': 'code',
        'jsx': 'code',
        'ts': 'code',
        'tsx': 'code',
        'java': 'code',
        'cpp': 'code',
        'c': 'code',
        'html': 'code',
        'css': 'code',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'mp4': 'video',
        'mov': 'video',
        'avi': 'video'
    }

    return type_map.get(ext, 'file')


def format_resource(resource: dict) -> dict:
    """Format resource for API response"""

    return {
        "_id": str(resource["_id"]),
        "title": resource.get("title"),
        "type": resource.get("type"),
        "content": resource.get("content"),
        "file_url": resource.get("file_url"),
        "file_size": resource.get("file_size"),
        "tags": resource.get("tags", []),
        "ai_summary": resource.get("ai_summary"),
        "ai_key_points": resource.get("ai_key_points", []),
        "flashcards": resource.get("flashcards", []),
        "task_id": resource.get("task_id"),
        "task_title": resource.get("task_title"),
        "favorite": resource.get("favorite", False),
        "created_at": resource.get("created_at").isoformat() if resource.get("created_at") else None,
        "updated_at": resource.get("updated_at").isoformat() if resource.get("updated_at") else None
    }


def generate_resource_summary(content: str, title: str) -> dict:
    """Use AI to generate summary and extract key points"""

    try:
        # Limit content length for AI
        content_preview = content[:3000] if len(content) > 3000 else content

        prompt = f"""Analyze this document and provide:
1. A concise summary (2-3 sentences)
2. Key points/concepts (3-5 items)

Title: {title}

Content:
{content_preview}

Respond in JSON format:
{{
  "summary": "Brief summary here...",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}}

Be concise and focus on the most important information."""

        response = generate_ai_response(prompt)

        # Parse JSON
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                return result
        except:
            pass

        # Fallback
        return {
            "summary": f"Document about {title}",
            "key_points": []
        }

    except Exception as e:
        logger.error(f"AI summary generation error: {e}", exc_info=True)
        return {
            "summary": None,
            "key_points": []
        }


def generate_flashcards_ai(content: str, title: str) -> dict:
    """
    Use AI to generate flashcards from content

    Returns:
        dict with 'success', 'flashcards', and 'error' keys
    """

    try:
        if not content or len(content.strip()) < 50:
            return {
                "success": False,
                "flashcards": [],
                "error": "Content too short to generate flashcards (minimum 50 characters)"
            }

        content_preview = content[:2000] if len(content) > 2000 else content

        prompt = f"""Generate 8-12 study flashcards from the content below.

Title: {title}

Content:
{content_preview}

Return a JSON object with a "flashcards" array. Each flashcard must have "question" and "answer" keys.

Example format:
{{"flashcards": [{{"question": "What is X?", "answer": "X is..."}}, {{"question": "Why is Y important?", "answer": "Y is important because..."}}]}}"""

        # Use JSON mode for better structured output
        response = generate_json_response(prompt)

        if isinstance(response, str) and response.strip().startswith("AI Error:"):
            return {
                "success": False,
                "flashcards": [],
                "error": response.strip()
            }

        def parse_flashcards_from_response(text: str) -> Optional[list]:
            """
            Parse flashcards from AI response.
            Handles both:
            - JSON object with "flashcards" key: {"flashcards": [...]}
            - Direct JSON array: [...]
            """
            if not text:
                return None

            text = text.strip()

            # Strip markdown code fences if present
            fence_start = text.find("```")
            if fence_start != -1:
                fence_end = text.find("```", fence_start + 3)
                if fence_end != -1:
                    inner = text[fence_start + 3:fence_end].strip()
                    if "\n" in inner:
                        first_line, rest = inner.split("\n", 1)
                        if first_line.strip().lower() in {"json", "javascript", "js"}:
                            inner = rest.strip()
                    text = inner

            # Try parsing as JSON object first (format: {"flashcards": [...]})
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    # Look for flashcards in common key names
                    for key in ["flashcards", "cards", "data", "items"]:
                        if key in parsed and isinstance(parsed[key], list):
                            return parsed[key]
                    # If it's a dict but no flashcards key, check if values are lists
                    for value in parsed.values():
                        if isinstance(value, list) and len(value) > 0:
                            return value
                elif isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass

            # Fallback: try to extract JSON array from text
            start = text.find("[")
            if start != -1:
                depth = 0
                in_str = False
                esc = False

                for i in range(start, len(text)):
                    ch = text[i]

                    if in_str:
                        if esc:
                            esc = False
                        elif ch == "\\":
                            esc = True
                        elif ch == '"':
                            in_str = False
                        continue

                    if ch == '"':
                        in_str = True
                    elif ch == "[":
                        depth += 1
                    elif ch == "]":
                        depth -= 1
                        if depth == 0:
                            candidate = text[start:i + 1]
                            try:
                                return json.loads(candidate)
                            except json.JSONDecodeError:
                                try:
                                    return ast.literal_eval(candidate)
                                except Exception:
                                    pass
                            break

            return None

        flashcards = parse_flashcards_from_response(response)
        if flashcards is None:
            logger.warning(f"Initial flashcard parse failed. Response preview: {(response or '')[:200]}")
            repair_prompt = f"""Convert the following text into a JSON object with a "flashcards" array.
Each flashcard must have "question" and "answer" keys.

Example format: {{"flashcards": [{{"question": "Q1", "answer": "A1"}}]}}

TEXT:
{(response or '')[:2500]}"""
            repaired = generate_json_response(repair_prompt)
            flashcards = parse_flashcards_from_response(repaired)

        if not isinstance(flashcards, list):
            logger.warning("No valid JSON array found in AI response for flashcard generation")
            return {
                "success": False,
                "flashcards": [],
                "error": "AI did not return valid flashcard format"
            }

        valid_flashcards = []
        for card in flashcards:
            if not isinstance(card, dict):
                continue

            if "question" not in card or "answer" not in card:
                continue

            question = str(card.get("question", "")).strip()
            answer = str(card.get("answer", "")).strip()

            if not question or not answer:
                continue

            valid_flashcards.append({"question": question, "answer": answer})

            if len(valid_flashcards) >= 12:
                break

        if not valid_flashcards:
            return {
                "success": False,
                "flashcards": [],
                "error": "No valid flashcards could be generated from AI response"
            }

        logger.info(f"Generated {len(valid_flashcards)} flashcards for '{title}'")
        return {
            "success": True,
            "flashcards": valid_flashcards,
            "error": None
        }

    except Exception as e:
        logger.error(f"Flashcard generation error: {e}", exc_info=True)
        return {
            "success": False,
            "flashcards": [],
            "error": f"Flashcard generation failed: {str(e)}"
        }