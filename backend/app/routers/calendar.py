"""
Calendar Integration Router

Handles OAuth flow, sync operations, and conflict management for Google Calendar integration.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

from app.routers.tasks import get_current_user_id
from app.services.google_calendar_service import (
    get_oauth_authorization_url,
    exchange_code_for_tokens,
    disconnect_calendar,
    get_sync_status,
    sync_task_to_calendar,
    sync_study_block_to_calendar,
    is_sync_enabled
)
from app.db_config import (
    calendar_sync_collection,
    calendar_event_mappings_collection,
    tasks_collection,
    study_plans_collection
)
from bson import ObjectId

router = APIRouter(prefix="/api/calendar", tags=["Calendar Integration"])


# ==================== PYDANTIC MODELS ====================

class SyncPreferencesUpdate(BaseModel):
    sync_tasks: Optional[bool] = None
    sync_study_plans: Optional[bool] = None
    sync_direction: Optional[str] = None
    auto_sync_interval: Optional[int] = None


class ConflictResolution(BaseModel):
    resolution: str  # "use_local", "use_google"


# ==================== OAUTH ENDPOINTS ====================

@router.post("/oauth/initiate")
async def initiate_oauth(user_id: str = Depends(get_current_user_id)):
    """
    Initiate OAuth 2.0 flow and return authorization URL.

    Returns:
        dict with authorization_url and state
    """
    try:
        auth_data = get_oauth_authorization_url(user_id)
        return {
            "authorization_url": auth_data["url"],
            "state": auth_data["state"],
            "message": "Open this URL in browser to authorize calendar access"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth: {str(e)}")


@router.get("/oauth/callback", response_class=HTMLResponse)
async def oauth_callback(code: str, state: str, request: Request):
    """
    Handle OAuth callback from Google.

    Query params:
        code: Authorization code
        state: State parameter containing user_id

    Returns:
        Success message or error
    """
    try:
        # Decode user_id from state parameter
        import base64
        import json

        try:
            decoded_state = base64.urlsafe_b64decode(state.encode()).decode()
            state_data = json.loads(decoded_state)
            user_id = state_data.get("user_id")
        except Exception as decode_error:
            raise HTTPException(status_code=400, detail=f"Invalid state parameter: {str(decode_error)}")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id not found in state")

        result = exchange_code_for_tokens(code, user_id)

        if result["success"]:
            # Return HTML that closes the popup and notifies parent window
            return f"""
            <html>
            <head><title>Authorization Successful</title></head>
            <body>
                <h2>✅ Authorization Successful!</h2>
                <p>You can close this window now.</p>
                <script>
                    // Notify parent window and close popup
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'calendar_auth_success',
                            calendar_id: '{result.get("calendar_id", "")}'
                        }}, '*');
                        setTimeout(() => window.close(), 1000);
                    }}
                </script>
            </body>
            </html>
            """
        else:
            raise HTTPException(status_code=400, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        print(f"OAuth callback error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OAuth callback error: {str(e)}")


@router.post("/oauth/disconnect")
async def disconnect_google_calendar(user_id: str = Depends(get_current_user_id)):
    """
    Disconnect Google Calendar and remove all sync data.

    Returns:
        Success message
    """
    try:
        success = disconnect_calendar(user_id)

        if success:
            return {
                "message": "Google Calendar disconnected successfully",
                "success": True
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to disconnect calendar")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disconnecting: {str(e)}")


# ==================== SYNC STATUS & PREFERENCES ====================

@router.get("/status")
async def get_calendar_status(user_id: str = Depends(get_current_user_id)):
    """
    Get calendar connection and sync status.

    Returns:
        dict with connection status, last sync time, preferences, etc.
    """
    try:
        status = get_sync_status(user_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")


@router.put("/preferences")
async def update_sync_preferences(
    preferences: SyncPreferencesUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update sync preferences.

    Body:
        sync_tasks: bool - Sync tasks to calendar
        sync_study_plans: bool - Sync study schedules
        sync_direction: str - "bidirectional", "to_calendar", "from_calendar"
        auto_sync_interval: int - Auto sync interval in minutes

    Returns:
        Updated preferences
    """
    try:
        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})

        if not sync_doc:
            raise HTTPException(status_code=404, detail="Calendar not connected")

        # Update preferences
        update_data = {}
        if preferences.sync_tasks is not None:
            update_data["sync_preferences.sync_tasks"] = preferences.sync_tasks
        if preferences.sync_study_plans is not None:
            update_data["sync_preferences.sync_study_plans"] = preferences.sync_study_plans
        if preferences.sync_direction is not None:
            update_data["sync_preferences.sync_direction"] = preferences.sync_direction
        if preferences.auto_sync_interval is not None:
            update_data["sync_preferences.auto_sync_interval"] = preferences.auto_sync_interval

        update_data["updated_at"] = datetime.utcnow()

        calendar_sync_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )

        # Return updated preferences
        updated_doc = calendar_sync_collection.find_one({"user_id": user_id})
        return {
            "message": "Preferences updated successfully",
            "preferences": updated_doc.get("sync_preferences", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")


# ==================== MANUAL SYNC OPERATIONS ====================

@router.post("/sync/task/{task_id}")
async def sync_single_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Manually sync a specific task to Google Calendar.

    Path params:
        task_id: MongoDB task ID

    Returns:
        Sync result with event_id
    """
    try:
        result = sync_task_to_calendar(task_id, user_id)

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("message", "Sync failed"))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing task: {str(e)}")


@router.post("/sync/schedule/{date}")
async def sync_schedule_for_date(date: str, user_id: str = Depends(get_current_user_id)):
    """
    Sync all study blocks for a specific date.

    Path params:
        date: Date string (YYYY-MM-DD)

    Returns:
        Sync results for all blocks
    """
    try:
        if not is_sync_enabled(user_id):
            raise HTTPException(status_code=400, detail="Calendar sync not enabled")

        # Get study plan for date
        study_plan = study_plans_collection.find_one({
            "user_id": user_id,
            "date": date
        })

        if not study_plan:
            raise HTTPException(status_code=404, detail=f"No study plan found for {date}")

        # Sync all study blocks
        results = []
        for block in study_plan.get("study_blocks", []):
            result = sync_study_block_to_calendar(block, date, user_id)
            results.append({
                "block_id": block.get("id"),
                "success": result["success"],
                "event_id": result.get("event_id")
            })

        success_count = sum(1 for r in results if r["success"])

        return {
            "message": f"Synced {success_count}/{len(results)} blocks",
            "date": date,
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing schedule: {str(e)}")


@router.post("/sync/full")
async def trigger_full_sync(user_id: str = Depends(get_current_user_id)):
    """
    Trigger full sync of all tasks and study schedules.

    Returns:
        Sync summary with counts
    """
    try:
        if not is_sync_enabled(user_id):
            raise HTTPException(status_code=400, detail="Calendar sync not enabled")

        sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
        prefs = sync_doc.get("sync_preferences", {})

        tasks_synced = 0
        blocks_synced = 0

        # Sync tasks if enabled
        if prefs.get("sync_tasks", True):
            tasks = list(tasks_collection.find({"assigned_to": user_id, "status": {"$ne": "completed"}}))
            for task in tasks:
                result = sync_task_to_calendar(str(task["_id"]), user_id)
                if result["success"]:
                    tasks_synced += 1

        # Sync study plans if enabled
        if prefs.get("sync_study_plans", True):
            # Get all study plans (e.g., next 7 days)
            from datetime import date, timedelta
            today = date.today()

            for i in range(7):
                check_date = (today + timedelta(days=i)).isoformat()
                study_plan = study_plans_collection.find_one({
                    "user_id": user_id,
                    "date": check_date
                })

                if study_plan:
                    for block in study_plan.get("study_blocks", []):
                        result = sync_study_block_to_calendar(block, check_date, user_id)
                        if result["success"]:
                            blocks_synced += 1

        # Update last sync time
        calendar_sync_collection.update_one(
            {"user_id": user_id},
            {"$set": {"last_sync_at": datetime.utcnow()}}
        )

        return {
            "message": "Full sync completed",
            "tasks_synced": tasks_synced,
            "study_blocks_synced": blocks_synced,
            "total_synced": tasks_synced + blocks_synced
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during full sync: {str(e)}")


# ==================== CONFLICT MANAGEMENT ====================

@router.get("/conflicts")
async def get_pending_conflicts(user_id: str = Depends(get_current_user_id)):
    """
    Get list of pending sync conflicts.

    Returns:
        List of conflict mappings with local and Google versions
    """
    try:
        conflicts = list(calendar_event_mappings_collection.find({
            "user_id": user_id,
            "sync_status": "conflict"
        }))

        # Convert ObjectId to string
        for conflict in conflicts:
            conflict["id"] = str(conflict.pop("_id"))

        return {
            "conflicts": conflicts,
            "count": len(conflicts)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conflicts: {str(e)}")


@router.post("/conflicts/{mapping_id}/resolve")
async def resolve_sync_conflict(
    mapping_id: str,
    resolution: ConflictResolution,
    user_id: str = Depends(get_current_user_id)
):
    """
    Resolve a sync conflict.

    Path params:
        mapping_id: ID of the calendar_event_mapping document

    Body:
        resolution: "use_local" or "use_google"

    Returns:
        Resolution result
    """
    try:
        mapping = calendar_event_mappings_collection.find_one({
            "_id": ObjectId(mapping_id),
            "user_id": user_id
        })

        if not mapping:
            raise HTTPException(status_code=404, detail="Conflict not found")

        if resolution.resolution == "use_local":
            # Sync local version to Google
            if mapping["local_entity_type"] == "task":
                result = sync_task_to_calendar(mapping["local_entity_id"], user_id)
            else:
                # For study blocks, extract date from stored data
                # Try to find the study plan that contains this block
                study_plan = study_plans_collection.find_one({
                    "user_id": user_id,
                    "study_blocks.id": mapping["local_entity_id"]
                })

                if not study_plan:
                    raise HTTPException(status_code=404, detail="Study plan not found for this block")

                # Find the specific block
                block = next((b for b in study_plan.get("study_blocks", []) if b.get("id") == mapping["local_entity_id"]), None)

                if not block:
                    raise HTTPException(status_code=404, detail="Study block not found")

                result = sync_study_block_to_calendar(block, study_plan["date"], user_id)

            if result["success"]:
                calendar_event_mappings_collection.update_one(
                    {"_id": ObjectId(mapping_id)},
                    {"$set": {
                        "sync_status": "synced",
                        "last_synced_at": datetime.utcnow(),
                        "last_modified_local": datetime.utcnow()
                    }}
                )
                return {"message": "Conflict resolved using local version", "success": True}

        elif resolution.resolution == "use_google":
            # Import event from Google Calendar and update local
            from app.services.google_calendar_service import get_calendar_client

            calendar = get_calendar_client(user_id)
            if not calendar:
                raise HTTPException(status_code=500, detail="Failed to get calendar client")

            sync_doc = calendar_sync_collection.find_one({"user_id": user_id})
            calendar_id = sync_doc.get("google_calendar_id", "primary")

            # Fetch event from Google Calendar
            event = calendar.events().get(
                calendarId=calendar_id,
                eventId=mapping["google_event_id"]
            ).execute()

            # Update local entity based on type
            if mapping["local_entity_type"] == "task":
                # Extract data from Google event
                task_update = {
                    "title": event.get("summary", ""),
                    "deadline": datetime.fromisoformat(event["start"]["dateTime"].replace('Z', '+00:00')),
                    "updated_at": datetime.utcnow()
                }

                # Update task
                tasks_collection.update_one(
                    {"_id": ObjectId(mapping["local_entity_id"])},
                    {"$set": task_update}
                )
            else:
                # For study blocks, update in study plan
                # Extract time from Google event
                start_dt = datetime.fromisoformat(event["start"]["dateTime"].replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(event["end"]["dateTime"].replace('Z', '+00:00'))

                # Update study block
                study_plans_collection.update_one(
                    {"user_id": user_id, "study_blocks.id": mapping["local_entity_id"]},
                    {"$set": {
                        "study_blocks.$.start_time": start_dt.strftime("%H:%M"),
                        "study_blocks.$.end_time": end_dt.strftime("%H:%M"),
                        "study_blocks.$.task_title": event.get("summary", "").replace("🍅 ", "").replace("🧠 ", "").replace("⚡ ", "")
                    }}
                )

            # Mark as synced
            calendar_event_mappings_collection.update_one(
                {"_id": ObjectId(mapping_id)},
                {"$set": {
                    "sync_status": "synced",
                    "last_synced_at": datetime.utcnow(),
                    "last_modified_google": datetime.utcnow()
                }}
            )
            return {"message": "Conflict resolved using Google version", "success": True}

        else:
            raise HTTPException(status_code=400, detail="Invalid resolution option")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resolving conflict: {str(e)}")


# ==================== EVENT OPERATIONS ====================

@router.get("/events")
async def list_synced_events(user_id: str = Depends(get_current_user_id)):
    """
    List all synced calendar events.

    Returns:
        List of event mappings
    """
    try:
        events = list(calendar_event_mappings_collection.find({"user_id": user_id}))

        # Convert ObjectId to string and format dates
        for event in events:
            event["id"] = str(event.pop("_id"))
            if "last_synced_at" in event and event["last_synced_at"]:
                event["last_synced_at"] = event["last_synced_at"].isoformat()
            if "created_at" in event and event["created_at"]:
                event["created_at"] = event["created_at"].isoformat()

        return {
            "events": events,
            "count": len(events)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing events: {str(e)}")


@router.delete("/events/{google_event_id}")
async def delete_synced_event(
    google_event_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Delete a synced calendar event.

    Path params:
        google_event_id: Google Calendar event ID

    Returns:
        Deletion result
    """
    try:
        from app.services.google_calendar_service import delete_calendar_event

        success = delete_calendar_event(google_event_id, user_id)

        if success:
            return {
                "message": "Event deleted successfully",
                "success": True
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete event")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")
