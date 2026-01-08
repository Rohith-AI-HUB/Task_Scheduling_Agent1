from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from app.db_config import db, tasks_collection
from app.routers.auth import get_current_user
from app.services.ollama_service import generate_ai_response
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel
import os
import json
import shutil

router = APIRouter(prefix="/api/resources", tags=["Resources"])

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
    title: str
    content: str
    task_id: Optional[str] = None
    tags: List[str] = []


class CreateLinkRequest(BaseModel):
    title: str
    url: str
    task_id: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None


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

    # Create upload directory
    upload_dir = f"uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Determine file type
    file_type = get_file_type(file.filename)

    # Extract text content if possible
    content = None
    ai_summary = None
    key_points = []

    if file_type == "text" or file.filename.endswith(('.txt', '.md', '.py', '.js', '.java', '.cpp')):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Generate AI summary for text files
            if len(content) > 100:
                summary_result = await generate_resource_summary(content, file.filename)
                ai_summary = summary_result.get("summary")
                key_points = summary_result.get("key_points", [])
        except Exception as e:
            print(f"Error reading file: {e}")

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
        "title": file.filename,
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
        "title": file.filename,
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
    summary_result = await generate_resource_summary(request.content, request.title)

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

    user_id = str(current_user["_id"])

    # Build filter
    filters = {"user_id": user_id}

    if type_filter:
        filters["type"] = type_filter

    if task_id:
        filters["task_id"] = task_id

    # Search in title, content, tags, summary
    search_filters = {
        **filters,
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"content": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}},
            {"ai_summary": {"$regex": query, "$options": "i"}}
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
            summary_result = await generate_resource_summary(request.content, resource["title"])
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

    return {"message": f"Resource {'favorited' if favorite else 'unfavorited'}"}


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
            print(f"Error deleting file: {e}")

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

    if not content or len(content) < 50:
        raise HTTPException(400, "Not enough content to generate flashcards")

    # Generate flashcards with AI
    flashcards = await generate_flashcards_ai(content, resource.get("title", ""))

    # Save flashcards
    resources_collection.update_one(
        {"_id": ObjectId(resource_id)},
        {"$set": {"flashcards": flashcards}}
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


async def generate_resource_summary(content: str, title: str) -> dict:
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

        response = await generate_ai_response(prompt)

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
        print(f"AI summary error: {e}")
        return {
            "summary": None,
            "key_points": []
        }


async def generate_flashcards_ai(content: str, title: str) -> List[dict]:
    """Use AI to generate flashcards from content"""

    try:
        content_preview = content[:2000] if len(content) > 2000 else content

        prompt = f"""Generate study flashcards from this content. Create 8-12 cards.

Title: {title}

Content:
{content_preview}

Format as JSON array:
[
  {{"question": "What is X?", "answer": "X is..."}},
  {{"question": "Why is Y important?", "answer": "Y is important because..."}}
]

Make questions clear and answers concise but complete."""

        response = await generate_ai_response(prompt)

        # Parse JSON
        try:
            start = response.find('[')
            end = response.rfind(']') + 1
            if start != -1 and end > start:
                flashcards = json.loads(response[start:end])
                return flashcards[:12]  # Max 12 cards
        except:
            pass

        # Fallback
        return []

    except Exception as e:
        print(f"Flashcard generation error: {e}")
        return []
