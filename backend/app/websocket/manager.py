from typing import Dict, Set
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map user_id to set of socket_ids (user might have multiple tabs open)
        self.active_connections: Dict[str, Set[str]] = {}
        # Map socket_id to user_id for quick lookup on disconnect
        self.sid_to_user: Dict[str, str] = {}

    async def connect(self, sid: str, user_id: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(sid)
        self.sid_to_user[sid] = user_id
        logger.info(f"Connection registered - User: {user_id}, SID: {sid}, Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, sid: str):
        if sid in self.sid_to_user:
            user_id = self.sid_to_user[sid]
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(sid)
                remaining = len(self.active_connections[user_id])
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    logger.info(f"User {user_id} fully disconnected - SID: {sid}")
                else:
                    logger.info(f"User {user_id} disconnected - SID: {sid}, Remaining connections: {remaining}")
            del self.sid_to_user[sid]
        else:
            logger.warning(f"Disconnect attempted for unknown SID: {sid}")

    def get_user_sids(self, user_id: str) -> Set[str]:
        return self.active_connections.get(user_id, set())

manager = ConnectionManager()
