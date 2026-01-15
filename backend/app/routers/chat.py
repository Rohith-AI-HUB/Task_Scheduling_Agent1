"""
Chat & Messaging Router

Handles group chats, direct messages, and real-time messaging via WebSocket.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import os
import shutil
import re
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.routers.auth import get_current_user_id, get_current_user
from app.db_config import (
    chat_history_collection,
    groups_collection,
    users_collection,
    tasks_collection
)
from app.utils.logger import get_logger
from app.websocket.broadcaster import broadcaster
from app.services.ollama_service import (
    generate_ai_response,
    generate_chat_response,
    build_ai_system_prompt,
    analyze_document_with_ai
)
from app.services.user_context_service import (
    get_full_user_context,
    format_context_for_ai,
    get_recent_chat_context
)
from app.services.command_parser import (
    is_command,
    execute_command,
    get_command_suggestions,
    AVAILABLE_COMMANDS
)
from app.services.document_processor import (
    process_uploaded_document,
    is_supported_file,
    get_document_summary
)
from app.config import settings

router = APIRouter(prefix="/chat", tags=["Chat & Messaging"])
logger = get_logger(__name__)


# ==================== PYDANTIC MODELS ====================

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    chat_type: str = Field(..., description="'group' or 'direct'")
    chat_id: str = Field(..., description="Group ID or recipient user ID")
    reply_to: Optional[str] = Field(None, description="Message ID being replied to")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "Hey, anyone free to study together?",
                "chat_type": "group",
                "chat_id": "507f1f77bcf86cd799439011"
            }
        }


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class MessageReaction(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)


# ==================== HELPER FUNCTIONS ====================

def format_message(msg: dict) -> dict:
    """Format message document for API response."""
    msg["id"] = str(msg.pop("_id"))

    # Format timestamps
    if "timestamp" in msg and msg["timestamp"]:
        msg["timestamp"] = msg["timestamp"].isoformat()
    if "edited_at" in msg and msg["edited_at"]:
        msg["edited_at"] = msg["edited_at"].isoformat()

    # Format read_by ObjectIds
    if "read_by" in msg:
        msg["read_by"] = [str(uid) for uid in msg["read_by"]]

    return msg


def can_access_chat(user_id: str, chat_type: str, chat_id: str) -> bool:
    """Check if user has access to a chat."""
    if chat_type == "group":
        group = groups_collection.find_one({"_id": ObjectId(chat_id)})
        if not group:
            return False
        return user_id in group.get("members", [])

    elif chat_type == "direct":
        # For direct messages, chat_id is the other user's ID
        # User can always access direct chats with any other user
        return ObjectId.is_valid(chat_id)

    return False


def get_chat_members(chat_type: str, chat_id: str, user_id: str) -> List[str]:
    """Get list of user IDs in a chat."""
    if chat_type == "group":
        group = groups_collection.find_one({"_id": ObjectId(chat_id)})
        return group.get("members", []) if group else []

    elif chat_type == "direct":
        # Direct chat includes current user and recipient
        return [user_id, chat_id]

    return []


# ==================== MESSAGE ENDPOINTS ====================

@router.post("/send")
async def send_message(
    message: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to a group chat or direct message.

    Returns:
        Created message with ID
    """
    try:
        user_id = str(current_user["_id"])

        # Validate access
        if not can_access_chat(user_id, message.chat_type, message.chat_id):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this chat"
            )

        # Validate chat exists
        if message.chat_type == "group":
            group = groups_collection.find_one({"_id": ObjectId(message.chat_id)})
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
        elif message.chat_type == "direct":
            recipient = users_collection.find_one({"_id": ObjectId(message.chat_id)})
            if not recipient:
                raise HTTPException(status_code=404, detail="Recipient not found")

        # Validate reply_to if provided
        if message.reply_to:
            if not ObjectId.is_valid(message.reply_to):
                raise HTTPException(status_code=400, detail="Invalid reply_to message ID")

            parent_msg = chat_history_collection.find_one({"_id": ObjectId(message.reply_to)})
            if not parent_msg:
                raise HTTPException(status_code=404, detail="Parent message not found")

        # Create message document
        msg_doc = {
            "sender_id": user_id,
            "sender_name": current_user.get("full_name", "Unknown"),
            "chat_type": message.chat_type,
            "chat_id": message.chat_id,
            "content": message.content.strip(),
            "reply_to": message.reply_to,
            "reactions": [],
            "read_by": [user_id],  # Sender has read it
            "edited": False,
            "edited_at": None,
            "timestamp": datetime.utcnow()
        }

        # Insert message
        result = chat_history_collection.insert_one(msg_doc)
        msg_doc["id"] = str(result.inserted_id)

        # Broadcast to chat members via WebSocket
        chat_members = get_chat_members(message.chat_type, message.chat_id, user_id)

        for member_id in chat_members:
            if member_id != user_id:  # Don't broadcast to sender
                await broadcaster.to_user(
                    user_id=member_id,
                    event="new_message",
                    data={
                        "message": format_message(msg_doc.copy()),
                        "chat_type": message.chat_type,
                        "chat_id": message.chat_id
                    }
                )

        logger.info(f"Message sent: {message.chat_type} chat {message.chat_id} by user {user_id}")

        return {
            "message": format_message(msg_doc),
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@router.get("/messages/{chat_type}/{chat_id}")
async def get_chat_messages(
    chat_type: str,
    chat_id: str,
    limit: int = 50,
    before_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get message history for a chat with pagination.

    Args:
        chat_type: 'group' or 'direct'
        chat_id: Group ID or user ID
        limit: Number of messages to return (max 100)
        before_id: Get messages before this message ID (for pagination)

    Returns:
        List of messages
    """
    try:
        # Validate chat type
        if chat_type not in ["group", "direct"]:
            raise HTTPException(status_code=400, detail="Invalid chat_type. Must be 'group' or 'direct'")

        # Validate access
        if not can_access_chat(user_id, chat_type, chat_id):
            raise HTTPException(status_code=403, detail="You don't have access to this chat")

        # Limit cap
        limit = min(limit, 100)

        # Build query
        if chat_type == "direct":
            # For direct messages, fetch messages in both directions
            # (user sends to chat_id OR chat_id sends to user)
            query = {
                "chat_type": "direct",
                "$or": [
                    {"sender_id": user_id, "chat_id": chat_id},
                    {"sender_id": chat_id, "chat_id": user_id}
                ]
            }
        else:
            # For group chats, just match the chat_id
            query = {
                "chat_type": chat_type,
                "chat_id": chat_id
            }

        # Pagination: get messages before a specific ID
        if before_id:
            if not ObjectId.is_valid(before_id):
                raise HTTPException(status_code=400, detail="Invalid before_id")
            query["_id"] = {"$lt": ObjectId(before_id)}

        # Get messages (newest first)
        messages = list(
            chat_history_collection.find(query)
            .sort("timestamp", -1)
            .limit(limit)
        )

        # Format messages
        formatted_messages = [format_message(msg) for msg in messages]

        # Reverse to get chronological order (oldest first)
        formatted_messages.reverse()

        logger.debug(f"Retrieved {len(formatted_messages)} messages for {chat_type} chat {chat_id}")

        return {
            "messages": formatted_messages,
            "count": len(formatted_messages),
            "has_more": len(formatted_messages) == limit
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")


@router.put("/messages/{message_id}")
async def edit_message(
    message_id: str,
    edit: EditMessageRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Edit a message (only sender can edit).

    Returns:
        Updated message
    """
    try:
        if not ObjectId.is_valid(message_id):
            raise HTTPException(status_code=400, detail="Invalid message ID")

        # Get message
        message = chat_history_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check ownership
        if message["sender_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own messages")

        # Update message
        update_result = chat_history_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {
                "content": edit.content.strip(),
                "edited": True,
                "edited_at": datetime.utcnow()
            }}
        )

        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update message")

        # Get updated message
        updated_message = chat_history_collection.find_one({"_id": ObjectId(message_id)})

        # Broadcast edit to chat members
        chat_members = get_chat_members(message["chat_type"], message["chat_id"], user_id)

        for member_id in chat_members:
            await broadcaster.to_user(
                user_id=member_id,
                event="message_edited",
                data={
                    "message": format_message(updated_message.copy()),
                    "chat_type": message["chat_type"],
                    "chat_id": message["chat_id"]
                }
            )

        logger.info(f"Message {message_id} edited by user {user_id}")

        return {
            "message": format_message(updated_message),
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to edit message: {str(e)}")


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Delete a message (only sender can delete).

    Returns:
        Success confirmation
    """
    try:
        if not ObjectId.is_valid(message_id):
            raise HTTPException(status_code=400, detail="Invalid message ID")

        # Get message
        message = chat_history_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check ownership
        if message["sender_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own messages")

        # Delete message
        result = chat_history_collection.delete_one({"_id": ObjectId(message_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete message")

        # Broadcast deletion to chat members
        chat_members = get_chat_members(message["chat_type"], message["chat_id"], user_id)

        for member_id in chat_members:
            await broadcaster.to_user(
                user_id=member_id,
                event="message_deleted",
                data={
                    "message_id": message_id,
                    "chat_type": message["chat_type"],
                    "chat_id": message["chat_id"]
                }
            )

        logger.info(f"Message {message_id} deleted by user {user_id}")

        return {
            "message": "Message deleted successfully",
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")


@router.post("/messages/{message_id}/react")
async def add_reaction(
    message_id: str,
    reaction: MessageReaction,
    current_user: dict = Depends(get_current_user)
):
    """
    Add emoji reaction to a message.

    Returns:
        Updated reactions list
    """
    try:
        user_id = str(current_user["_id"])

        if not ObjectId.is_valid(message_id):
            raise HTTPException(status_code=400, detail="Invalid message ID")

        # Get message
        message = chat_history_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check access to chat
        if not can_access_chat(user_id, message["chat_type"], message["chat_id"]):
            raise HTTPException(status_code=403, detail="You don't have access to this chat")

        # Add or update reaction
        reactions = message.get("reactions", [])

        # Check if user already reacted with this emoji
        existing_reaction = next((r for r in reactions if r["user_id"] == user_id and r["emoji"] == reaction.emoji), None)

        if existing_reaction:
            # Remove reaction if it exists (toggle)
            reactions = [r for r in reactions if not (r["user_id"] == user_id and r["emoji"] == reaction.emoji)]
            action = "removed"
        else:
            # Add new reaction
            reactions.append({
                "user_id": user_id,
                "user_name": current_user.get("full_name", "Unknown"),
                "emoji": reaction.emoji
            })
            action = "added"

        # Update message
        chat_history_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"reactions": reactions}}
        )

        # Broadcast reaction update
        chat_members = get_chat_members(message["chat_type"], message["chat_id"], user_id)

        for member_id in chat_members:
            await broadcaster.to_user(
                user_id=member_id,
                event="message_reaction",
                data={
                    "message_id": message_id,
                    "reactions": reactions,
                    "chat_type": message["chat_type"],
                    "chat_id": message["chat_id"]
                }
            )

        logger.info(f"Reaction {action}: {reaction.emoji} on message {message_id} by user {user_id}")

        return {
            "reactions": reactions,
            "action": action,
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding reaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add reaction: {str(e)}")


@router.post("/messages/{message_id}/mark-read")
async def mark_message_as_read(
    message_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Mark a message as read and notify the sender.

    Returns:
        Success confirmation
    """
    try:
        if not ObjectId.is_valid(message_id):
            raise HTTPException(status_code=400, detail="Invalid message ID")

        # Get the message first to check sender
        message = chat_history_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Don't mark own messages as read (already read by sender)
        if message["sender_id"] == user_id:
            return {"message": "Own message", "success": True}

        # Add user to read_by array if not already there
        result = chat_history_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$addToSet": {"read_by": user_id}}
        )

        # Notify the sender that their message was read (for blue ticks)
        if result.modified_count > 0:
            await broadcaster.to_user(
                user_id=message["sender_id"],
                event="message_read",
                data={
                    "message_id": message_id,
                    "read_by": user_id,
                    "chat_type": message.get("chat_type"),
                    "chat_id": message.get("chat_id")
                }
            )

        return {
            "message": "Message marked as read",
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to mark as read: {str(e)}")


@router.post("/messages/mark-read-bulk")
async def mark_messages_as_read_bulk(
    chat_type: str,
    chat_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Mark all messages in a chat as read. Called when opening a conversation.

    Returns:
        Number of messages marked as read
    """
    try:
        # Validate chat type
        if chat_type not in ["group", "direct"]:
            raise HTTPException(status_code=400, detail="Invalid chat_type")

        # Build query to find unread messages from others
        if chat_type == "direct":
            # For direct messages, mark messages FROM the other user TO current user
            query = {
                "chat_type": "direct",
                "sender_id": chat_id,
                "chat_id": user_id,
                "read_by": {"$ne": user_id}
            }
        else:
            # For group chats, mark all messages not read by current user
            query = {
                "chat_type": "group",
                "chat_id": chat_id,
                "sender_id": {"$ne": user_id},
                "read_by": {"$ne": user_id}
            }

        # Get messages to mark as read (to notify senders)
        messages_to_mark = list(chat_history_collection.find(query))

        if not messages_to_mark:
            return {"marked_count": 0, "success": True}

        # Mark all as read
        result = chat_history_collection.update_many(
            query,
            {"$addToSet": {"read_by": user_id}}
        )

        # Notify each unique sender about read receipts
        sender_ids = set(msg["sender_id"] for msg in messages_to_mark)
        for sender_id in sender_ids:
            sender_message_ids = [str(msg["_id"]) for msg in messages_to_mark if msg["sender_id"] == sender_id]
            await broadcaster.to_user(
                user_id=sender_id,
                event="messages_read",
                data={
                    "message_ids": sender_message_ids,
                    "read_by": user_id,
                    "chat_type": chat_type,
                    "chat_id": chat_id if chat_type == "group" else user_id
                }
            )

        logger.info(f"User {user_id} marked {result.modified_count} messages as read in {chat_type} chat {chat_id}")

        return {
            "marked_count": result.modified_count,
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking messages as read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to mark as read: {str(e)}")


@router.get("/chats")
async def get_user_chats(user_id: str = Depends(get_current_user_id)):
    """
    Get list of all chats user is part of with unread counts.

    Returns:
        List of chats with metadata
    """
    try:
        chats = []

        # Get groups user is in
        groups = list(groups_collection.find({"members": user_id}))

        for group in groups:
            # Get last message
            last_message = chat_history_collection.find_one(
                {"chat_type": "group", "chat_id": str(group["_id"])},
                sort=[("timestamp", -1)]
            )

            # Count unread messages
            unread_count = chat_history_collection.count_documents({
                "chat_type": "group",
                "chat_id": str(group["_id"]),
                "read_by": {"$ne": user_id}
            })

            chats.append({
                "id": str(group["_id"]),
                "type": "group",
                "name": group.get("name", "Unnamed Group"),
                "description": group.get("description", ""),
                "members_count": len(group.get("members", [])),
                "last_message": format_message(last_message) if last_message else None,
                "unread_count": unread_count
            })

        # Get direct message conversations
        # Find all unique users the current user has messaged
        sent_pipeline = [
            {"$match": {"chat_type": "direct", "sender_id": user_id}},
            {"$group": {"_id": "$chat_id"}}
        ]
        received_pipeline = [
            {"$match": {"chat_type": "direct", "chat_id": user_id}},
            {"$group": {"_id": "$sender_id"}}
        ]

        sent_to = [doc["_id"] for doc in chat_history_collection.aggregate(sent_pipeline)]
        received_from = [doc["_id"] for doc in chat_history_collection.aggregate(received_pipeline)]

        dm_users = list(set(sent_to + received_from))

        for other_user_id in dm_users:
            # Get user info
            other_user = users_collection.find_one({"_id": ObjectId(other_user_id)})
            if not other_user:
                continue

            # Get last message (in either direction)
            last_message = chat_history_collection.find_one(
                {
                    "$or": [
                        {"chat_type": "direct", "sender_id": user_id, "chat_id": other_user_id},
                        {"chat_type": "direct", "sender_id": other_user_id, "chat_id": user_id}
                    ]
                },
                sort=[("timestamp", -1)]
            )

            # Count unread messages from other user
            unread_count = chat_history_collection.count_documents({
                "chat_type": "direct",
                "sender_id": other_user_id,
                "chat_id": user_id,
                "read_by": {"$ne": user_id}
            })

            chats.append({
                "id": other_user_id,
                "type": "direct",
                "name": other_user.get("full_name", "Unknown User"),
                "email": other_user.get("email", ""),
                "last_message": format_message(last_message) if last_message else None,
                "unread_count": unread_count
            })

        # Sort by last message timestamp
        chats.sort(key=lambda x: x["last_message"]["timestamp"] if x["last_message"] else "", reverse=True)

        return {
            "chats": chats,
            "count": len(chats)
        }

    except Exception as e:
        logger.error(f"Error getting user chats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get chats: {str(e)}")


@router.get("/search")
async def search_messages(
    query: str,
    chat_type: Optional[str] = None,
    chat_id: Optional[str] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """
    Search messages across all chats or within a specific chat.

    Args:
        query: Search text
        chat_type: Optional - filter by chat type
        chat_id: Optional - filter by specific chat
        limit: Number of results (max 100)

    Returns:
        List of matching messages
    """
    try:
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

        # Build search query
        search_query = {
            "content": {"$regex": query, "$options": "i"}
        }

        # Filter by chat type/id if provided
        if chat_type:
            search_query["chat_type"] = chat_type
        if chat_id:
            search_query["chat_id"] = chat_id

        # Limit cap
        limit = min(limit, 100)

        # Search messages
        messages = list(
            chat_history_collection.find(search_query)
            .sort("timestamp", -1)
            .limit(limit)
        )

        # Filter to only chats user has access to
        accessible_messages = []
        for msg in messages:
            if can_access_chat(user_id, msg["chat_type"], msg["chat_id"]):
                accessible_messages.append(format_message(msg))

        logger.info(f"Search for '{query}' returned {len(accessible_messages)} results")

        return {
            "messages": accessible_messages,
            "count": len(accessible_messages),
            "query": query
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching messages: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# ==================== AI ASSISTANT ENDPOINTS ====================

class AIMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Message to send to AI assistant")


@router.post("/ai")
async def chat_with_ai(
    request: AIMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Chat with AI assistant that has knowledge of user's tasks and schedule.
    
    Returns:
        AI response with context-aware message
    """
    try:
        user_id = str(current_user["_id"])
        user_name = current_user.get("full_name", "User")
        user_role = current_user.get("role", "student")
        
        # Fetch user's tasks for context
        tasks = list(tasks_collection.find({"assigned_to": user_id}).limit(20))
        
        # Build task context
        task_context = ""
        pending_tasks = []
        overdue_tasks = []
        
        for task in tasks:
            status = task.get("status", "todo")
            title = task.get("title", "Untitled")
            deadline = task.get("deadline")
            priority = task.get("priority", "medium")
            
            if status != "done":
                if deadline and deadline < datetime.utcnow():
                    overdue_tasks.append(f"- {title} (Priority: {priority}, OVERDUE)")
                else:
                    deadline_str = deadline.strftime("%b %d") if deadline else "No deadline"
                    pending_tasks.append(f"- {title} (Priority: {priority}, Due: {deadline_str})")
        
        if pending_tasks or overdue_tasks:
            task_context = f"""
User's Current Tasks:
Overdue ({len(overdue_tasks)}):
{chr(10).join(overdue_tasks) if overdue_tasks else "None"}

Pending ({len(pending_tasks)}):
{chr(10).join(pending_tasks[:10]) if pending_tasks else "None"}
"""
        
        # Build the AI prompt
        # Build the AI prompt
        system_context = f"""You are the internal specific Task Assistant for {user_name}, a {user_role}.
SYSTEM INSTRUCTION: You have FULL PERMISSION to access the user's task data provided below. It is injected directly from the database for this session.
DO NOT refuse to answer questions about these tasks. DO NOT say you cannot access personal data.
Use the provided context to answer questions about the user's schedule, deadlines, and priorities.

TASK DATA:
{task_context}

Be helpful, friendly, and direct. If the user asks "What are my tasks?", list them from the data above.
"""
        
        prompt = f"{system_context}\n\nUser: {request.message}\n\nAssistant:"
        
        # Generate AI response
        ai_response = generate_ai_response(prompt)
        
        # Store the conversation in chat history
        user_msg = {
            "sender_id": user_id,
            "sender_name": user_name,
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": request.message,
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        chat_history_collection.insert_one(user_msg)
        
        ai_msg_doc = {
            "sender_id": "ai_assistant",
            "sender_name": "AI Assistant",
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": ai_response.strip(),
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        result = chat_history_collection.insert_one(ai_msg_doc)
        ai_msg_doc["id"] = str(result.inserted_id)
        
        logger.info(f"AI chat: user {user_id} sent message")
        
        return {
            "message": format_message(ai_msg_doc),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error in AI chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.get("/ai/history")
async def get_ai_chat_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get AI chat history for current user.
    """
    try:
        messages = list(
            chat_history_collection.find({
                "chat_type": "ai",
                "chat_id": "assistant",
                "$or": [
                    {"sender_id": user_id},
                    {"sender_id": "ai_assistant", "read_by": user_id}
                ]
            })
            .sort("timestamp", -1)
            .limit(limit)
        )

        formatted = [format_message(msg) for msg in messages]
        formatted.reverse()  # Chronological order

        return {
            "messages": formatted,
            "count": len(formatted)
        }
    except Exception as e:
        logger.error(f"Error getting AI history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get AI history: {str(e)}")


# ==================== ENHANCED AI ASSISTANT ENDPOINTS ====================

class AIMessageWithDocumentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Message to send to AI")
    context_scope: Optional[List[str]] = Field(
        default=["tasks", "study_plans", "wellbeing"],
        description="What context to include: tasks, groups, resources, study_plans, preferences, wellbeing, chat"
    )


class CommandRequest(BaseModel):
    command: str = Field(..., min_length=2, max_length=500, description="Slash command to execute")


@router.post("/ai/enhanced")
async def chat_with_ai_enhanced(
    message: str = Form(...),
    file: Optional[UploadFile] = File(None),
    context_scope: Optional[str] = Form(default="tasks,study_plans,wellbeing"),
    current_user: dict = Depends(get_current_user)
):
    """
    Enhanced AI chat with full user context and document upload support.

    - Supports document/image upload for analysis
    - Includes full user context (tasks, resources, plans, etc.)
    - Handles slash commands automatically
    - Maintains conversation history

    Args:
        message: User's message or question
        file: Optional document/image to analyze
        context_scope: Comma-separated list of context areas to include

    Returns:
        AI response with optional command execution results
    """
    try:
        user_id = str(current_user["_id"])
        user_name = current_user.get("full_name", "User")
        user_role = current_user.get("role", "student")

        # Parse context scope
        scope_list = [s.strip() for s in context_scope.split(",") if s.strip()]

        # Check if message is a command
        if is_command(message):
            command_result = await execute_command(user_id, message)

            # Store command in chat history
            user_msg = {
                "sender_id": user_id,
                "sender_name": user_name,
                "chat_type": "ai",
                "chat_id": "assistant",
                "content": message,
                "command_executed": {
                    "command": command_result.get("command_type"),
                    "action": command_result.get("action"),
                    "success": command_result.get("success", False)
                },
                "reactions": [],
                "read_by": [user_id],
                "timestamp": datetime.utcnow()
            }
            chat_history_collection.insert_one(user_msg)

            # Store AI response
            ai_msg_doc = {
                "sender_id": "ai_assistant",
                "sender_name": "AI Assistant",
                "chat_type": "ai",
                "chat_id": "assistant",
                "content": command_result.get("message", "Command executed."),
                "reactions": [],
                "read_by": [user_id],
                "timestamp": datetime.utcnow()
            }
            result = chat_history_collection.insert_one(ai_msg_doc)
            ai_msg_doc["id"] = str(result.inserted_id)

            return {
                "message": format_message(ai_msg_doc),
                "success": True,
                "command_executed": True,
                "command_result": command_result
            }

        # Process document if uploaded
        document_content = None
        document_metadata = None

        if file:
            # Validate file
            if not is_supported_file(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type. Supported: PDF, DOCX, TXT, code files, images"
                )

            # Check file size
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)

            if size > settings.ai_max_document_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {settings.ai_max_document_size // (1024*1024)}MB"
                )

            # Save file temporarily
            now = datetime.now()
            upload_dir = os.path.join("uploads", "ai_docs", user_id, str(now.year), str(now.month))
            os.makedirs(upload_dir, exist_ok=True)

            safe_filename = re.sub(r'[^\w\s\-\.]', '', file.filename).strip().replace(' ', '_')
            file_path = os.path.join(upload_dir, safe_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Process document
            doc_result = process_uploaded_document(file_path, file.filename)

            if doc_result.get("success"):
                document_content = doc_result.get("extracted_text", "")
                document_metadata = {
                    "filename": file.filename,
                    "file_type": doc_result.get("document_type"),
                    "character_count": doc_result.get("character_count", 0),
                    "file_path": file_path
                }
            else:
                # Still include error info
                document_metadata = {
                    "filename": file.filename,
                    "error": doc_result.get("error", "Failed to process document")
                }

        # Get full user context
        user_context = get_full_user_context(user_id, scope_list)
        context_text = format_context_for_ai(user_context)

        # Get recent chat history for continuity
        chat_history = get_recent_chat_context(user_id, limit=10)

        # Build system prompt
        system_prompt = build_ai_system_prompt(user_name, user_role, context_text)

        # Generate AI response
        ai_response = generate_chat_response(
            user_message=message,
            system_prompt=system_prompt,
            chat_history=chat_history,
            document_content=document_content,
            use_chat_model=True
        )

        # Store user message
        user_msg = {
            "sender_id": user_id,
            "sender_name": user_name,
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": message,
            "has_document": document_content is not None,
            "document_metadata": document_metadata,
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        chat_history_collection.insert_one(user_msg)

        # Store AI response
        ai_msg_doc = {
            "sender_id": "ai_assistant",
            "sender_name": "AI Assistant",
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": ai_response,
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        result = chat_history_collection.insert_one(ai_msg_doc)
        ai_msg_doc["id"] = str(result.inserted_id)

        logger.info(f"Enhanced AI chat: user {user_id}, doc: {document_content is not None}")

        return {
            "message": format_message(ai_msg_doc),
            "success": True,
            "command_executed": False,
            "document_processed": document_content is not None,
            "document_metadata": document_metadata
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced AI chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.post("/ai/command")
async def execute_chat_command(
    request: CommandRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a slash command from the chat interface.

    Supported commands:
    - /task create <title>, /task list, /task complete <id>, /task delete <id_or_title>
    - /group create <name>, /group list, /group assign <task> to <group>
    - /plan generate, /plan show
    - /flashcard generate <topic>
    """
    try:
        user_id = str(current_user["_id"])
        user_name = current_user.get("full_name", "User")

        if not is_command(request.command):
            raise HTTPException(
                status_code=400,
                detail="Invalid command. Commands must start with /"
            )

        result = await execute_command(user_id, request.command)

        # Store in chat history
        user_msg = {
            "sender_id": user_id,
            "sender_name": user_name,
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": request.command,
            "command_executed": {
                "command": result.get("command_type"),
                "action": result.get("action"),
                "success": result.get("success", False)
            },
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        chat_history_collection.insert_one(user_msg)

        ai_msg_doc = {
            "sender_id": "ai_assistant",
            "sender_name": "AI Assistant",
            "chat_type": "ai",
            "chat_id": "assistant",
            "content": result.get("message", "Command executed."),
            "reactions": [],
            "read_by": [user_id],
            "timestamp": datetime.utcnow()
        }
        db_result = chat_history_collection.insert_one(ai_msg_doc)
        ai_msg_doc["id"] = str(db_result.inserted_id)

        return {
            "message": format_message(ai_msg_doc),
            "success": result.get("success", False),
            "command_type": result.get("command_type"),
            "action": result.get("action"),
            "result": result.get("result")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing command: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Command execution failed: {str(e)}")


@router.get("/ai/commands")
async def get_available_commands():
    """
    Get list of available slash commands for autocomplete.
    """
    return {
        "commands": AVAILABLE_COMMANDS,
        "count": len(AVAILABLE_COMMANDS)
    }


@router.get("/ai/commands/suggest")
async def suggest_commands(
    partial: str = ""
):
    """
    Get command suggestions based on partial input.

    Args:
        partial: Partial command string (e.g., "/task" or "/task cr")
    """
    if not partial.startswith("/"):
        partial = "/" + partial

    suggestions = get_command_suggestions(partial)

    return {
        "suggestions": suggestions,
        "count": len(suggestions)
    }


@router.get("/ai/history/search")
async def search_ai_history(
    query: str,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """
    Search through AI chat history.

    Args:
        query: Search query
        limit: Maximum results to return
    """
    try:
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

        # Escape regex special characters
        escaped_query = re.escape(query.strip())

        messages = list(
            chat_history_collection.find({
                "chat_type": "ai",
                "$or": [
                    {"sender_id": user_id},
                    {"sender_id": "ai_assistant", "read_by": user_id}
                ],
                "content": {"$regex": escaped_query, "$options": "i"}
            })
            .sort("timestamp", -1)
            .limit(limit)
        )

        formatted = [format_message(msg) for msg in messages]

        return {
            "messages": formatted,
            "count": len(formatted),
            "query": query
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching AI history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.delete("/ai/history")
async def clear_ai_history(
    user_id: str = Depends(get_current_user_id)
):
    """
    Clear all AI chat history for the current user.
    """
    try:
        result = chat_history_collection.delete_many({
            "chat_type": "ai",
            "$or": [
                {"sender_id": user_id},
                {"sender_id": "ai_assistant", "read_by": user_id}
            ]
        })

        logger.info(f"Cleared {result.deleted_count} AI messages for user {user_id}")

        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Cleared {result.deleted_count} messages from AI chat history"
        }

    except Exception as e:
        logger.error(f"Error clearing AI history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")


@router.get("/ai/context")
async def get_ai_context_preview(
    current_user: dict = Depends(get_current_user)
):
    """
    Get a preview of what context the AI has access to for the current user.
    Useful for showing users what data the AI can see.
    """
    try:
        user_id = str(current_user["_id"])

        # Get full context
        context = get_full_user_context(user_id)

        # Build summary
        tasks = context.get("tasks", {})
        groups = context.get("groups", {})
        resources = context.get("resources", {})
        study_plans = context.get("study_plans", {})
        wellbeing = context.get("wellbeing", {})

        summary = {
            "user": context.get("user", {}),
            "data_access": {
                "tasks": {
                    "total_pending": tasks.get("total_pending", 0),
                    "overdue": len(tasks.get("overdue", [])),
                    "due_today": len(tasks.get("due_today", [])),
                    "in_progress": len(tasks.get("in_progress", []))
                },
                "groups": {
                    "coordinating": len(groups.get("coordinating", [])),
                    "member_of": len(groups.get("member_of", []))
                },
                "resources": {
                    "total": resources.get("total_resources", 0),
                    "flashcard_sets": len(resources.get("flashcard_sets", []))
                },
                "study_plans": {
                    "has_today_plan": study_plans.get("has_today_plan", False)
                },
                "wellbeing": {
                    "current_stress": wellbeing.get("current_stress", {}).get("objective_score") if wellbeing.get("current_stress") else None,
                    "focus_sessions_this_week": wellbeing.get("focus_stats", {}).get("sessions_this_week", 0)
                }
            },
            "generated_at": context.get("generated_at")
        }

        return {
            "context_summary": summary,
            "message": "This shows what data the AI assistant can access to help you."
        }

    except Exception as e:
        logger.error(f"Error getting AI context: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get context: {str(e)}")


@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to be sent in chat"""
    try:
        # Validate file size (10MB limit)
        MAX_SIZE = 10 * 1024 * 1024
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        if size > MAX_SIZE:
            raise HTTPException(400, "File too large (max 10MB)")

        # Create uploads directory structure
        # uploads/chat/{year}/{month}/filename
        now = datetime.now()
        relative_path = os.path.join("chat", str(now.year), str(now.month))
        upload_dir = os.path.join("uploads", relative_path)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Sanitize filename
        safe_filename = re.sub(r'[^\w\s\-\.]', '', file.filename).strip().replace(' ', '_')
        if not safe_filename:
            safe_filename = f"file_{int(now.timestamp())}"
            
        # Avoid collisions
        base, ext = os.path.splitext(safe_filename)
        counter = 1
        final_filename = safe_filename
        while os.path.exists(os.path.join(upload_dir, final_filename)):
            final_filename = f"{base}_{counter}{ext}"
            counter += 1
            
        file_path = os.path.join(upload_dir, final_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Generate URL (assuming backend is serving uploads map)
        # Windows path fix for URL
        url_path = os.path.join(relative_path, final_filename).replace("\\", "/")
        file_url = f"/uploads/{url_path}"
        
        return {
            "url": file_url,
            "filename": final_filename,
            "size": size,
            "type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ==================== USER DISCOVERY ENDPOINTS ====================

@router.get("/users")
async def get_chat_users(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of users available for chat.
    - Students can see teachers and other students
    - Teachers can see students
    Only returns registered users.
    """
    try:
        user_id = str(current_user["_id"])
        user_role = current_user.get("role", "student")
        
        # Build query based on role
        if user_role == "teacher":
            # Teachers see all students
            query = {"role": "student", "_id": {"$ne": current_user["_id"]}}
        else:
            # Students see teachers and other students
            query = {"_id": {"$ne": current_user["_id"]}}
        
        users = list(users_collection.find(query).limit(100))
        
        result = []
        for u in users:
            result.append({
                "id": str(u["_id"]),
                "name": u.get("full_name", "Unknown"),
                "email": u.get("email", ""),
                "role": u.get("role", "student"),
                "usn": u.get("usn", "")
            })
        
        # Sort: teachers first, then alphabetically
        result.sort(key=lambda x: (0 if x["role"] == "teacher" else 1, x["name"].lower()))
        
        logger.debug(f"User {user_id} fetched {len(result)} chat users")
        
        return {
            "users": result,
            "count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error getting chat users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")


@router.get("/users/search")
async def search_chat_users(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Search for users by name, email, or USN.
    """
    try:
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
        
        user_role = current_user.get("role", "student")
        
        # Build search query
        search_query = {
            "_id": {"$ne": current_user["_id"]},
            "$or": [
                {"full_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"usn": {"$regex": query, "$options": "i"}}
            ]
        }
        
        # Teachers only see students
        if user_role == "teacher":
            search_query["role"] = "student"
        
        users = list(users_collection.find(search_query).limit(20))
        
        result = []
        for u in users:
            result.append({
                "id": str(u["_id"]),
                "name": u.get("full_name", "Unknown"),
                "email": u.get("email", ""),
                "role": u.get("role", "student"),
                "usn": u.get("usn", "")
            })
        
        return {
            "users": result,
            "count": len(result),
            "query": query
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
