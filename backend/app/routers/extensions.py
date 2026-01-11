from fastapi import APIRouter, Depends, HTTPException
from app.db_config import extension_requests_collection, tasks_collection, notifications_collection
from app.services.ai_extension_service import analyze_extension_request
from app.routers.tasks import get_current_user_id
from app.models.schemas import ExtensionRequestCreate
from app.websocket.broadcaster import broadcaster
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/extensions", tags=["Extensions"])

@router.post("/")
async def create_extension_request(
    extension_data: ExtensionRequestCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new extension request for a task

    Args:
        extension_data: Extension request data
        user_id: Current user ID (from auth token)

    Returns:
        Extension request document with AI analysis
    """
    try:
        # Fetch the task
        task = tasks_collection.find_one({"_id": ObjectId(extension_data.task_id)})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check if user has permission (assigned to them or created by them)
        if str(task.get('assigned_to')) != user_id and str(task.get('created_by')) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to request extension for this task")

        # AI Analysis
        ai_analysis = analyze_extension_request(
            task,
            task['deadline'].isoformat() if isinstance(task['deadline'], datetime) else str(task['deadline']),
            extension_data.requested_deadline,
            extension_data.reason,
            extension_data.reason_category
        )

        # Create extension request document
        ext_doc = {
            "task_id": extension_data.task_id,
            "user_id": user_id,
            "original_deadline": task['deadline'],
            "requested_deadline": datetime.fromisoformat(extension_data.requested_deadline.replace('Z', '+00:00')),
            "reason": extension_data.reason,
            "reason_category": extension_data.reason_category,
            "ai_recommendation": ai_analysis.get("recommendation"),
            "ai_reasoning": ai_analysis.get("reasoning"),
            "ai_confidence_score": ai_analysis.get("confidence"),
            "ai_suggested_deadline": ai_analysis.get("suggested_deadline"),
            "status": "pending",
            "created_at": datetime.utcnow()
        }

        result = extension_requests_collection.insert_one(ext_doc)

        # Create notification for teacher (task creator)
        teacher_id = task['created_by']
        notification_data = {
            "user_id": teacher_id,
            "type": "extension_request",
            "message": f"Extension request for '{task['title']}' - AI recommends: {ai_analysis.get('recommendation')}",
            "reference_id": str(result.inserted_id),
            "read": False,
            "created_at": datetime.utcnow()
        }
        notif_result = notifications_collection.insert_one(notification_data)

        # Broadcast notification to teacher
        notification_data["id"] = str(notif_result.inserted_id)
        await broadcaster.to_user(
            teacher_id,
            "notification",
            notification_data
        )

        # Prepare response
        ext_doc["id"] = str(result.inserted_id)
        ext_doc["_id"] = str(result.inserted_id)

        # Convert datetime objects to ISO strings for JSON serialization
        ext_doc["original_deadline"] = ext_doc["original_deadline"].isoformat()
        ext_doc["requested_deadline"] = ext_doc["requested_deadline"].isoformat()
        ext_doc["created_at"] = ext_doc["created_at"].isoformat()

        return ext_doc

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating extension request: {str(e)}")


@router.get("/")
async def get_extension_requests(user_id: str = Depends(get_current_user_id)):
    """
    Get all extension requests for the current user

    Returns:
        List of extension requests (student's own requests or teacher's pending reviews)
    """
    try:
        # Get requests created by user (student view)
        requests = list(extension_requests_collection.find({"user_id": user_id}))

        # Convert to response format
        for req in requests:
            req["id"] = str(req.pop("_id"))

            # Convert datetime to ISO strings
            if "original_deadline" in req and isinstance(req["original_deadline"], datetime):
                req["original_deadline"] = req["original_deadline"].isoformat()
            if "requested_deadline" in req and isinstance(req["requested_deadline"], datetime):
                req["requested_deadline"] = req["requested_deadline"].isoformat()
            if "created_at" in req and isinstance(req["created_at"], datetime):
                req["created_at"] = req["created_at"].isoformat()
            if "reviewed_at" in req and isinstance(req["reviewed_at"], datetime):
                req["reviewed_at"] = req["reviewed_at"].isoformat()

        return requests

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching extension requests: {str(e)}")


@router.get("/pending")
async def get_pending_extensions(user_id: str = Depends(get_current_user_id)):
    """
    Get pending extension requests for tasks created by the current user (teacher view)

    Returns:
        List of pending extension requests for review
    """
    try:
        # Find all tasks created by this user
        user_tasks = list(tasks_collection.find({"created_by": user_id}))
        task_ids = [str(task["_id"]) for task in user_tasks]

        # Find pending extension requests for those tasks
        pending_requests = list(extension_requests_collection.find({
            "task_id": {"$in": task_ids},
            "status": "pending"
        }))

        # Enhance with task information
        for req in pending_requests:
            req["id"] = str(req.pop("_id"))

            # Get task details
            task = tasks_collection.find_one({"_id": ObjectId(req["task_id"])})
            if task:
                req["task_title"] = task.get("title", "Unknown Task")
                req["task_description"] = task.get("description", "")

            # Convert datetime to ISO strings
            if "original_deadline" in req and isinstance(req["original_deadline"], datetime):
                req["original_deadline"] = req["original_deadline"].isoformat()
            if "requested_deadline" in req and isinstance(req["requested_deadline"], datetime):
                req["requested_deadline"] = req["requested_deadline"].isoformat()
            if "created_at" in req and isinstance(req["created_at"], datetime):
                req["created_at"] = req["created_at"].isoformat()

        return pending_requests

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching pending extensions: {str(e)}")


@router.put("/{ext_id}/review")
async def review_extension(
    ext_id: str,
    status: str,
    comment: str = "",
    user_id: str = Depends(get_current_user_id)
):
    """
    Review an extension request (approve/deny)

    Args:
        ext_id: Extension request ID
        status: New status (approved/denied)
        comment: Optional review comment
        user_id: Current user ID (reviewer)

    Returns:
        Success message
    """
    try:
        # Validate status
        if status not in ["approved", "denied"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'denied'")

        # Get the extension request
        ext_req = extension_requests_collection.find_one({"_id": ObjectId(ext_id)})
        if not ext_req:
            raise HTTPException(status_code=404, detail="Extension request not found")

        # Verify the reviewer is the task creator
        task = tasks_collection.find_one({"_id": ObjectId(ext_req['task_id'])})
        if not task or str(task.get('created_by')) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to review this request")

        # Update extension request
        update_result = extension_requests_collection.update_one(
            {"_id": ObjectId(ext_id)},
            {"$set": {
                "status": status,
                "reviewed_by": user_id,
                "reviewed_at": datetime.utcnow(),
                "review_comment": comment
            }}
        )

        if update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")

        # Update task deadline if approved
        if status == "approved":
            tasks_collection.update_one(
                {"_id": ObjectId(ext_req['task_id'])},
                {"$set": {"deadline": ext_req['requested_deadline']}}
            )

        # Create notification for student
        student_id = ext_req['user_id']
        notification_data = {
            "user_id": student_id,
            "type": "extension_review",
            "message": f"Your extension request has been {status}. {comment}",
            "reference_id": ext_id,
            "read": False,
            "created_at": datetime.utcnow()
        }
        notif_result = notifications_collection.insert_one(notification_data)

        # Broadcast notification to student
        notification_data["id"] = str(notif_result.inserted_id)
        await broadcaster.to_user(
            student_id,
            "notification",
            notification_data
        )

        return {"message": f"Request {status} successfully", "status": status}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing extension: {str(e)}")


@router.delete("/{ext_id}")
async def delete_extension_request(ext_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete an extension request (only if pending and created by user)

    Args:
        ext_id: Extension request ID
        user_id: Current user ID

    Returns:
        Success message
    """
    try:
        # Get the extension request
        ext_req = extension_requests_collection.find_one({"_id": ObjectId(ext_id)})
        if not ext_req:
            raise HTTPException(status_code=404, detail="Extension request not found")

        # Verify ownership
        if str(ext_req.get('user_id')) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this request")

        # Only allow deletion of pending requests
        if ext_req.get('status') != 'pending':
            raise HTTPException(status_code=400, detail="Can only delete pending requests")

        # Delete the request
        result = extension_requests_collection.delete_one({"_id": ObjectId(ext_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")

        return {"message": "Extension request deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting extension request: {str(e)}")
