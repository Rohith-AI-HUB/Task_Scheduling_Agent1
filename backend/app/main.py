from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, tasks, extensions, notifications, analytics, groups, stress, focus, resources, grading, class_analytics, bulk_tasks, study_planner, calendar

app = FastAPI(title="Task Scheduling Agent API v2.0 - Week 4: Calendar Integration")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(extensions.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(groups.router)

# Week 1 Feature routers
app.include_router(stress.router)
app.include_router(focus.router)
app.include_router(resources.router)

# Week 2 Teacher Feature routers
app.include_router(grading.router)
app.include_router(class_analytics.router)
app.include_router(bulk_tasks.router)

# Week 3 Smart Study Planner
app.include_router(study_planner.router)

# Week 4 Calendar Integration
app.include_router(calendar.router)

@app.get("/")
def root():
    return {"status": "Task Scheduling Agent API Running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-01-04"}
