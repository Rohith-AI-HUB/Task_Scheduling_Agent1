import socketio

# Create a Socket.IO server
# CORS origins must match the FastAPI CORS configuration for security
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:5173']  # Match FastAPI CORS
)

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio)
