import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.routers import auth, tasks, extensions, notifications, analytics, groups, stress, focus, resources, grading, class_analytics, bulk_tasks, study_planner, calendar, chat

# Create FastAPI app
fastapi_app = FastAPI(title="Task Scheduling Agent API v2.0 - Week 4: Calendar Integration")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Core routers
fastapi_app.include_router(auth.router, prefix="/api")
fastapi_app.include_router(tasks.router, prefix="/api")
fastapi_app.include_router(extensions.router, prefix="/api")
fastapi_app.include_router(notifications.router, prefix="/api")
fastapi_app.include_router(analytics.router, prefix="/api")
fastapi_app.include_router(groups.router, prefix="/api")

# Week 1 Feature routers
fastapi_app.include_router(stress.router)
fastapi_app.include_router(focus.router)
fastapi_app.include_router(resources.router, prefix="/api")

# Week 2 Teacher Feature routers
fastapi_app.include_router(grading.router, prefix="/api")
fastapi_app.include_router(class_analytics.router)
fastapi_app.include_router(bulk_tasks.router)  # Already has /api/ in its prefix

# Week 3 Smart Study Planner
fastapi_app.include_router(study_planner.router)

# Week 4 Calendar Integration (router already has /api/calendar prefix)
fastapi_app.include_router(calendar.router)

# Chat & Messaging
fastapi_app.include_router(chat.router, prefix="/api")

@fastapi_app.get("/")
def root():
    return {"status": "Task Scheduling Agent API Running"}

@fastapi_app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-01-04"}

# Import and mount Socket.IO after defining all routes
from app.websocket import sio

# Create the combined ASGI app that handles both FastAPI and Socket.IO
app = socketio.ASGIApp(sio, fastapi_app)
