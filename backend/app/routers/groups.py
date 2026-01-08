from fastapi import APIRouter, Depends, HTTPException
from app.db_config import groups_collection, tasks_collection, notifications_collection, users_collection
from app.routers.tasks import get_current_user_id
from bson import ObjectId
from datetime import datetime
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/groups", tags=["Groups"])

class GroupCreate(BaseModel):
    name: str
    member_ids: List[str]

class TaskAssignment(BaseModel):
    task_id: str

@router.post("/")
async def create_group(group_data: GroupCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new group with members"""
    # Verify all member IDs exist
    for member_id in group_data.member_ids:
        user = users_collection.find_one({"_id": ObjectId(member_id)})
        if not user:
            raise HTTPException(status_code=404, detail=f"User {member_id} not found")

    group_doc = {
        "name": group_data.name,
        "coordinator_id": user_id,
        "members": group_data.member_ids,
        "created_at": datetime.utcnow()
    }
    result = groups_collection.insert_one(group_doc)

    # Create notifications for all members
    for member_id in group_data.member_ids:
        notifications_collection.insert_one({
            "user_id": member_id,
            "type": "group_added",
            "message": f"You've been added to group '{group_data.name}'",
            "reference_id": str(result.inserted_id),
            "read": False,
            "created_at": datetime.utcnow()
        })

    group_doc["id"] = str(result.inserted_id)
    return group_doc

@router.get("/")
async def get_groups(user_id: str = Depends(get_current_user_id)):
    """Get all groups created by the current user"""
    groups = list(groups_collection.find({"coordinator_id": user_id}))
    for g in groups:
        g["id"] = str(g.pop("_id"))
        # Add member details
        members = []
        for member_id in g.get("members", []):
            user = users_collection.find_one({"_id": ObjectId(member_id)})
            if user:
                members.append({
                    "id": str(user["_id"]),
                    "full_name": user.get("full_name", "Unknown"),
                    "email": user.get("email", "")
                })
        g["member_details"] = members
    return groups

@router.get("/{group_id}")
async def get_group(group_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific group by ID"""
    group = groups_collection.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify user is coordinator
    if group['coordinator_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")

    group["id"] = str(group.pop("_id"))

    # Add member details
    members = []
    for member_id in group.get("members", []):
        user = users_collection.find_one({"_id": ObjectId(member_id)})
        if user:
            members.append({
                "id": str(user["_id"]),
                "full_name": user.get("full_name", "Unknown"),
                "email": user.get("email", "")
            })
    group["member_details"] = members

    return group

@router.post("/{group_id}/assign-task")
async def assign_task_to_group(
    group_id: str,
    assignment: TaskAssignment,
    user_id: str = Depends(get_current_user_id)
):
    """Assign a task to all members of a group"""
    group = groups_collection.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify user is coordinator
    if group['coordinator_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to assign tasks to this group")

    # Get the task
    task = tasks_collection.find_one({"_id": ObjectId(assignment.task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Assign task to all group members
    assigned_count = 0
    for member_id in group['members']:
        new_task = task.copy()
        new_task.pop("_id")
        new_task["assigned_to"] = member_id
        new_task["group_id"] = group_id
        new_task["created_at"] = datetime.utcnow()
        result = tasks_collection.insert_one(new_task)

        # Create notification for the member
        notifications_collection.insert_one({
            "user_id": member_id,
            "type": "task_assigned",
            "message": f"New task assigned: '{task['title']}'",
            "reference_id": str(result.inserted_id),
            "read": False,
            "created_at": datetime.utcnow()
        })

        assigned_count += 1

    return {
        "message": f"Task assigned to {assigned_count} members",
        "group_name": group['name'],
        "task_title": task['title']
    }

@router.delete("/{group_id}")
async def delete_group(group_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a group"""
    group = groups_collection.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify user is coordinator
    if group['coordinator_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this group")

    result = groups_collection.delete_one({"_id": ObjectId(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")

    return {"message": "Group deleted successfully"}

@router.get("/my-groups/all")
async def get_my_groups_as_member(user_id: str = Depends(get_current_user_id)):
    """Get all groups where current user is a member"""
    groups = list(groups_collection.find({"members": user_id}))
    for g in groups:
        g["id"] = str(g.pop("_id"))
        # Add coordinator details
        coordinator = users_collection.find_one({"_id": ObjectId(g['coordinator_id'])})
        if coordinator:
            g["coordinator_name"] = coordinator.get("full_name", "Unknown")
    return groups
