from app.websocket.server import sio
from datetime import datetime

class Broadcaster:
    @staticmethod
    def _serialize(data):
        """Recursively convert datetime objects to ISO strings"""
        if isinstance(data, dict):
            return {k: Broadcaster._serialize(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [Broadcaster._serialize(v) for v in data]
        elif isinstance(data, datetime):
            return data.isoformat()
        return data

    @staticmethod
    async def to_user(user_id: str, event: str, data: dict):
        """Send an event to a specific user"""
        try:
            serialized_data = Broadcaster._serialize(data)
            await sio.emit(event, serialized_data, room=f"user_{user_id}")
            print(f"Broadcast to user_{user_id}: {event}")
        except Exception as e:
            print(f"Error broadcasting to user {user_id}: {e}")

    @staticmethod
    async def to_group(group_id: str, event: str, data: dict):
        """Send an event to a group room"""
        try:
            serialized_data = Broadcaster._serialize(data)
            await sio.emit(event, serialized_data, room=f"group_{group_id}")
            print(f"Broadcast to group_{group_id}: {event}")
        except Exception as e:
            print(f"Error broadcasting to group {group_id}: {e}")

    @staticmethod
    async def task_update(task_id: str, action: str, task_data: dict, user_ids: list):
        """
        Notify users about a task update.
        action: 'created', 'updated', 'deleted', 'completed'
        """
        payload = {
            "task_id": task_id,
            "action": action,
            "task": task_data
        }
        for uid in user_ids:
            await Broadcaster.to_user(uid, "task_update", payload)

broadcaster = Broadcaster()
