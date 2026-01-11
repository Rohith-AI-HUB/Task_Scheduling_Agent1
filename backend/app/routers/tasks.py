from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
from app.models.schemas import TaskCreate
from app.db_config import tasks_collection, users_collection, calendar_event_mappings_collection
from app.services.firebase_service import verify_firebase_token
from app.services.ai_task_service import analyze_task_complexity, generate_subtasks
from app.services.google_calendar_service import sync_task_to_calendar, is_sync_enabled, delete_calendar_event
from app.websocket.broadcaster import broadcaster
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_current_user_id(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    decoded = verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = users_collection.find_one({"firebase_uid": decoded['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return str(user["_id"])

@router.post("/")
async def create_task(task: TaskCreate, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
    try:
        # AI Analysis
        ai_analysis = analyze_task_complexity(task.title, task.description or "")
        subtasks = generate_subtasks(task.title, task.description or "")

        suggested_deadline = datetime.utcnow() + timedelta(days=ai_analysis.get("deadline_days", 3))

        task_doc = {
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline,
            "priority": ai_analysis.get("priority", task.priority),
            "status": "todo",
            "assigned_to": task.assigned_to,
            "created_by": user_id,
            "ai_suggested_deadline": suggested_deadline,
            "complexity_score": ai_analysis.get("complexity", 5),
            "estimated_hours": ai_analysis.get("hours", 4),
            "subtasks": [{"title": st, "status": "todo", "ai_generated": True} for st in subtasks],
            "attachments": task.attachments if task.attachments else [],
            "created_at": datetime.utcnow()
        }

        result = tasks_collection.insert_one(task_doc)
        task_doc["id"] = str(result.inserted_id)
        task_doc.pop("_id", None)

        # Sync to Google Calendar if enabled
        if is_sync_enabled(user_id):
            background_tasks.add_task(sync_task_to_calendar, str(result.inserted_id), user_id)

        # Broadcast update
        await broadcaster.task_update(
            task_id=task_doc["id"],
            action="created",
            task_data=task_doc,
            user_ids=[task.assigned_to]
        )

        return task_doc
    except Exception as e:
        print(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.get("/")
async def get_tasks(user_id: str = Depends(get_current_user_id)):
    try:
        tasks = list(tasks_collection.find({"assigned_to": user_id}))
        for task in tasks:
            task["id"] = str(task.pop("_id"))
            # Convert datetime objects to ISO strings for JSON serialization
            if "deadline" in task and task["deadline"]:
                task["deadline"] = task["deadline"].isoformat()
            if "ai_suggested_deadline" in task and task["ai_suggested_deadline"]:
                task["ai_suggested_deadline"] = task["ai_suggested_deadline"].isoformat()
            if "created_at" in task and task["created_at"]:
                task["created_at"] = task["created_at"].isoformat()
        return tasks
    except Exception as e:
        print(f"Error fetching tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")

@router.get("/{task_id}")
async def get_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task["id"] = str(task.pop("_id"))
    return task

@router.put("/{task_id}")
async def update_task(task_id: str, updates: dict, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    # Sync updated task to Google Calendar if enabled
    if is_sync_enabled(user_id):
        background_tasks.add_task(sync_task_to_calendar, task_id, user_id)

    # Fetch updated task for broadcast
    updated_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if updated_task:
        updated_task["id"] = str(updated_task.pop("_id"))
        # Broadcast update
        await broadcaster.task_update(
            task_id=task_id,
            action="updated",
            task_data=updated_task,
            user_ids=[updated_task['assigned_to']]
        )

    return {"message": "Task updated"}

@router.delete("/{task_id}")
async def delete_task(task_id: str, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
    # Get task before deletion to know assignee
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    assignee_id = task.get("assigned_to", user_id)

    # Get event mapping before deleting task
    mapping = calendar_event_mappings_collection.find_one({
        "user_id": user_id,
        "local_entity_id": task_id,
        "local_entity_type": "task"
    })

    result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    # Delete from Google Calendar if synced
    if mapping and is_sync_enabled(user_id):
        background_tasks.add_task(delete_calendar_event, mapping["google_event_id"], user_id)
        
    # Broadcast deletion
    await broadcaster.task_update(
        task_id=task_id,
        action="deleted",
        task_data={"id": task_id},
        user_ids=[assignee_id]
    )

    return {"message": "Task deleted"}
