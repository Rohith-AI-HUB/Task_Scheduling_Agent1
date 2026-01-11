from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, tasks, extensions, notifications, analytics, groups, stress, focus, resources, grading, class_analytics, bulk_tasks, study_planner, calendar, chat

app = FastAPI(title="Task Scheduling Agent API v2.0 - Week 4: Calendar Integration")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(extensions.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(groups.router, prefix="/api")

# Week 1 Feature routers
app.include_router(stress.router, prefix="/api")
app.include_router(focus.router, prefix="/api")
app.include_router(resources.router, prefix="/api")

# Week 2 Teacher Feature routers
app.include_router(grading.router, prefix="/api")
app.include_router(class_analytics.router, prefix="/api")
app.include_router(bulk_tasks.router)  # Already has /api/ in its prefix

# Week 3 Smart Study Planner
app.include_router(study_planner.router, prefix="/api")

# Week 4 Calendar Integration
app.include_router(calendar.router, prefix="/api")

# Chat & Messaging
app.include_router(chat.router, prefix="/api")

from app.websocket import sio
import socketio

@app.get("/")
def root():
    return {"status": "Task Scheduling Agent API Running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-01-04"}

# Keep reference to FastAPI app for testing
fastapi_app = app

# Wrap FastAPI application with Socket.IO
# This handles /socket.io/ requests and forwards others to FastAPI
app = socketio.ASGIApp(sio, fastapi_app)
