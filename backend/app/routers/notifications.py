from fastapi import APIRouter, Depends, HTTPException
from app.db_config import notifications_collection
from app.routers.tasks import get_current_user_id
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_notifications(user_id: str = Depends(get_current_user_id)):
    """
    Get all notifications for the current user

    Returns:
        List of notifications sorted by created_at (newest first)
    """
    try:
        # Fetch notifications for user, sorted by created_at descending, limit to 50
        notifs = list(
            notifications_collection
            .find({"user_id": user_id})
            .sort("created_at", -1)
            .limit(50)
        )

        # Convert to response format
        for n in notifs:
            n["id"] = str(n.pop("_id"))

            # Convert datetime to ISO string
            if "created_at" in n and isinstance(n["created_at"], datetime):
                n["created_at"] = n["created_at"].isoformat()

        return notifs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")


@router.get("/unread")
async def get_unread_notifications(user_id: str = Depends(get_current_user_id)):
    """
    Get only unread notifications for the current user

    Returns:
        List of unread notifications
    """
    try:
        notifs = list(
            notifications_collection
            .find({"user_id": user_id, "read": False})
            .sort("created_at", -1)
        )

        for n in notifs:
            n["id"] = str(n.pop("_id"))

            # Convert datetime to ISO string
            if "created_at" in n and isinstance(n["created_at"], datetime):
                n["created_at"] = n["created_at"].isoformat()

        return notifs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread notifications: {str(e)}")


@router.get("/count")
async def get_notification_count(user_id: str = Depends(get_current_user_id)):
    """
    Get count of unread notifications

    Returns:
        Count of unread notifications
    """
    try:
        count = notifications_collection.count_documents({
            "user_id": user_id,
            "read": False
        })

        return {"unread_count": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error counting notifications: {str(e)}")


@router.put("/{notif_id}/read")
async def mark_as_read(notif_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Mark a notification as read

    Args:
        notif_id: Notification ID
        user_id: Current user ID

    Returns:
        Success message
    """
    try:
        # Verify notification belongs to user
        notif = notifications_collection.find_one({"_id": ObjectId(notif_id)})

        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")

        if str(notif.get("user_id")) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this notification")

        # Update notification
        result = notifications_collection.update_one(
            {"_id": ObjectId(notif_id)},
            {"$set": {"read": True}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking notification as read: {str(e)}")


@router.put("/read-all")
async def mark_all_as_read(user_id: str = Depends(get_current_user_id)):
    """
    Mark all notifications as read for the current user

    Returns:
        Count of notifications marked as read
    """
    try:
        result = notifications_collection.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}}
        )

        return {
            "message": "All notifications marked as read",
            "count": result.modified_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking all as read: {str(e)}")


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete a notification

    Args:
        notif_id: Notification ID
        user_id: Current user ID

    Returns:
        Success message
    """
    try:
        # Verify notification belongs to user
        notif = notifications_collection.find_one({"_id": ObjectId(notif_id)})

        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")

        if str(notif.get("user_id")) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this notification")

        # Delete notification
        result = notifications_collection.delete_one({"_id": ObjectId(notif_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting notification: {str(e)}")


@router.delete("/")
async def delete_all_notifications(user_id: str = Depends(get_current_user_id)):
    """
    Delete all notifications for the current user

    Returns:
        Count of notifications deleted
    """
    try:
        result = notifications_collection.delete_many({"user_id": user_id})

        return {
            "message": "All notifications deleted",
            "count": result.deleted_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting all notifications: {str(e)}")
