from app.websocket.server import sio
from app.websocket.manager import manager
from app.services.firebase_service import verify_firebase_token
from app.db_config import users_collection, groups_collection
from app.utils.logger import get_logger
from bson import ObjectId

logger = get_logger(__name__)

@sio.event
async def connect(sid, environ, auth):
    logger.debug(f"WebSocket connect attempt - SID: {sid}")
    logger.debug(f"Auth data received: {bool(auth)}")

    if not auth or 'token' not in auth:
        logger.warning(f"Connection rejected: No token provided - SID: {sid}")
        return False  # Reject

    token = auth['token']
    try:
        decoded = verify_firebase_token(token)
    except Exception as e:
        logger.error(f"Token verification failed - SID: {sid}, Error: {e}")
        decoded = None

    if not decoded:
        logger.warning(f"Connection rejected: Invalid token - SID: {sid}")
        return False

    firebase_uid = decoded['uid']
    logger.debug(f"Firebase UID verified: {firebase_uid}")

    user = users_collection.find_one({"firebase_uid": firebase_uid})

    if not user:
        logger.warning(f"Connection rejected: User not found for Firebase UID: {firebase_uid} - SID: {sid}")
        return False

    user_id = str(user['_id'])

    # Register connection
    await manager.connect(sid, user_id)

    # Automatically join a room for their own user_id (for personal notifications)
    await sio.enter_room(sid, f"user_{user_id}")

    logger.info(f"WebSocket connected - User: {user_id}, SID: {sid}")

@sio.event
async def disconnect(sid):
    manager.disconnect(sid)

@sio.event
async def join_group(sid, data):
    # data expects {'group_id': '...'}
    group_id = data.get('group_id')
    if not group_id:
        logger.warning(f"Group join rejected: No group_id provided - SID: {sid}")
        return

    # Get user_id from connection manager
    user_id = manager.sid_to_user.get(sid)
    if not user_id:
        logger.warning(f"Group join rejected: No user found for SID {sid}")
        return

    # Verify user is actually a member of this group
    try:
        group = groups_collection.find_one({"_id": ObjectId(group_id)})
        if not group:
            logger.warning(f"Group join rejected: Group {group_id} not found - User: {user_id}")
            return

        # Check if user is in the group members list
        members = group.get('members', [])
        if user_id not in members:
            logger.warning(f"Group join rejected: User {user_id} not a member of group {group_id}")
            return

        # User is authorized, allow them to join
        await sio.enter_room(sid, f"group_{group_id}")
        logger.info(f"User {user_id} joined group {group_id} - SID: {sid}")

    except Exception as e:
        logger.error(f"Error in join_group - SID: {sid}, Error: {e}", exc_info=True)

@sio.event
async def leave_group(sid, data):
    group_id = data.get('group_id')
    if not group_id:
        logger.warning(f"Group leave rejected: No group_id provided - SID: {sid}")
        return

    # Get user_id from connection manager
    user_id = manager.sid_to_user.get(sid)
    if not user_id:
        logger.warning(f"Group leave rejected: No user found for SID {sid}")
        return

    await sio.leave_room(sid, f"group_{group_id}")
    logger.info(f"User {user_id} left group {group_id} - SID: {sid}")


# ==================== CHAT EVENTS ====================

@sio.event
async def typing_start(sid, data):
    """
    Notify chat members that user is typing.

    Expected data: {'chat_type': 'group'|'direct', 'chat_id': '...'}
    """
    try:
        user_id = manager.sid_to_user.get(sid)
        if not user_id:
            logger.warning(f"Typing event rejected: No user found for SID {sid}")
            return

        chat_type = data.get('chat_type')
        chat_id = data.get('chat_id')

        if not chat_type or not chat_id:
            logger.warning(f"Typing event rejected: Missing chat_type or chat_id")
            return

        # Get user info for display
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        user_name = user.get("name", "Unknown User") if user else "Unknown User"

        # Broadcast typing indicator to chat
        if chat_type == "group":
            # Broadcast to all group members except sender
            await sio.emit(
                "user_typing",
                {
                    "user_id": user_id,
                    "user_name": user_name,
                    "chat_type": chat_type,
                    "chat_id": chat_id,
                    "typing": True
                },
                room=f"group_{chat_id}",
                skip_sid=sid
            )
            logger.debug(f"User {user_id} is typing in group {chat_id}")

        elif chat_type == "direct":
            # Send to specific user
            recipient_sids = manager.get_user_sids(chat_id)
            for recipient_sid in recipient_sids:
                await sio.emit(
                    "user_typing",
                    {
                        "user_id": user_id,
                        "user_name": user_name,
                        "chat_type": chat_type,
                        "chat_id": user_id,  # For direct messages, sender's ID is the chat_id from recipient's perspective
                        "typing": True
                    },
                    room=recipient_sid
                )
            logger.debug(f"User {user_id} is typing to user {chat_id}")

    except Exception as e:
        logger.error(f"Error in typing_start: {e}", exc_info=True)


@sio.event
async def typing_stop(sid, data):
    """
    Notify chat members that user stopped typing.

    Expected data: {'chat_type': 'group'|'direct', 'chat_id': '...'}
    """
    try:
        user_id = manager.sid_to_user.get(sid)
        if not user_id:
            return

        chat_type = data.get('chat_type')
        chat_id = data.get('chat_id')

        if not chat_type or not chat_id:
            return

        # Get user info
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        user_name = user.get("name", "Unknown User") if user else "Unknown User"

        # Broadcast typing stopped
        if chat_type == "group":
            await sio.emit(
                "user_typing",
                {
                    "user_id": user_id,
                    "user_name": user_name,
                    "chat_type": chat_type,
                    "chat_id": chat_id,
                    "typing": False
                },
                room=f"group_{chat_id}",
                skip_sid=sid
            )

        elif chat_type == "direct":
            recipient_sids = manager.get_user_sids(chat_id)
            for recipient_sid in recipient_sids:
                await sio.emit(
                    "user_typing",
                    {
                        "user_id": user_id,
                        "user_name": user_name,
                        "chat_type": chat_type,
                        "chat_id": user_id,
                        "typing": False
                    },
                    room=recipient_sid
                )

        logger.debug(f"User {user_id} stopped typing")

    except Exception as e:
        logger.error(f"Error in typing_stop: {e}", exc_info=True)
