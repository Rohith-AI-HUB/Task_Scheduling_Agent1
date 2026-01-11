import socketio

# Create a Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'  # Allow all origins for development
)

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio)
