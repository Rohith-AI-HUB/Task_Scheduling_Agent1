from app.websocket.server import sio
from app.websocket.manager import manager
from app.services.firebase_service import verify_firebase_token
from app.db_config import users_collection

@sio.event
async def connect(sid, environ, auth):
    if not auth or 'token' not in auth:
        print(f"Connection rejected: No token provided (SID: {sid})")
        return False  # Reject

    token = auth['token']
    decoded = verify_firebase_token(token)
    
    if not decoded:
        print(f"Connection rejected: Invalid token (SID: {sid})")
        return False
    
    firebase_uid = decoded['uid']
    user = users_collection.find_one({"firebase_uid": firebase_uid})
    
    if not user:
        print(f"Connection rejected: User not found (SID: {sid})")
        return False
        
    user_id = str(user['_id'])
    
    # Register connection
    await manager.connect(sid, user_id)
    
    # Automatically join a room for their own user_id (for personal notifications)
    await sio.enter_room(sid, f"user_{user_id}")
    
    print(f"User {user_id} connected (SID: {sid})")

@sio.event
async def disconnect(sid):
    manager.disconnect(sid)

@sio.event
async def join_group(sid, data):
    # data expects {'group_id': '...'}
    # In a real app, verify user is actually in this group
    group_id = data.get('group_id')
    if group_id:
        await sio.enter_room(sid, f"group_{group_id}")
        print(f"SID {sid} joined group_{group_id}")

@sio.event
async def leave_group(sid, data):
    group_id = data.get('group_id')
    if group_id:
        await sio.leave_room(sid, f"group_{group_id}")
        print(f"SID {sid} left group_{group_id}")
