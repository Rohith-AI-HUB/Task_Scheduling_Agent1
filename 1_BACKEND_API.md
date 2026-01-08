# 🔧 Backend API Documentation

**AI-Powered Task Scheduling Agent v2.0**
**Last Updated:** January 7, 2026

---

## 📚 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Database Schema](#database-schema)
3. [Core API Endpoints](#core-api-endpoints)
4. [Week 1 Features](#week-1-student-features-api)
5. [Week 2 Features](#week-2-teacher-features-api)
6. [Setup & Configuration](#setup--configuration)

---

## 🛠️ Tech Stack

- **Framework:** FastAPI (Python 3.8+)
- **Database:** MongoDB
- **Authentication:** Firebase Auth
- **AI:** Ollama (Local LLM)
- **CORS:** Enabled for http://localhost:5173

---

## 🗄️ Database Schema

### Core Collections

#### `users`
```javascript
{
  _id: ObjectId,
  firebase_uid: string,
  email: string,
  full_name: string,
  role: "student" | "teacher",
  created_at: datetime
}
```
**Indexes:** `email` (unique), `firebase_uid` (unique)

#### `tasks`
```javascript
{
  _id: ObjectId,
  title: string,
  description: string,
  deadline: datetime,
  priority: "low" | "medium" | "high" | "urgent",
  status: "todo" | "in_progress" | "completed",
  assigned_to: string,  // user_id
  created_by: string,    // user_id
  estimated_hours: float,
  complexity_score: int (1-10),
  subtasks: [{text: string, completed: boolean}],
  grade: float (0-100),
  teacher_feedback: string,
  time_spent_minutes: int,
  created_at: datetime,
  completion_date: datetime
}
```
**Indexes:** `assigned_to`, `created_by`

#### `extension_requests`
```javascript
{
  _id: ObjectId,
  task_id: string,
  user_id: string,
  original_deadline: datetime,
  requested_deadline: datetime,
  reason: string,
  reason_category: string,
  status: "pending" | "approved" | "denied",
  created_at: datetime
}
```
**Indexes:** `task_id`

---

### Week 1 Collections (Student Features)

#### `stress_logs`
```javascript
{
  _id: ObjectId,
  user_id: string,
  objective_score: float (0-10),
  subjective_score: float (0-10),
  breakdown: {
    complexity_contribution: float,
    time_pressure: float,
    deadline_overlap: float,
    historical_pattern: float
  },
  recommendations: [string],
  notes: string,
  timestamp: datetime
}
```
**Indexes:** `user_id`, `timestamp`

#### `focus_sessions`
```javascript
{
  _id: ObjectId,
  user_id: string,
  task_id: string,
  session_type: "pomodoro" | "deep_work" | "short_burst",
  planned_duration_minutes: int,
  actual_duration_minutes: int,
  start_time: datetime,
  end_time: datetime,
  completed: boolean,
  interruptions: int,
  interruption_log: [{type: string, timestamp: datetime}],
  productivity_rating: int (1-5),
  notes: string
}
```
**Indexes:** `user_id`, `(user_id + completed)`

#### `resources`
```javascript
{
  _id: ObjectId,
  user_id: string,
  task_id: string,
  title: string,
  type: "note" | "pdf" | "video" | "link" | "code" | "file",
  content: string,
  file_url: string,
  tags: [string],
  ai_summary: string,
  ai_key_points: [string],
  flashcards: [{question: string, answer: string}],
  favorite: boolean,
  created_at: datetime,
  updated_at: datetime
}
```
**Indexes:** `user_id`, `(user_id + type)`, **Text Search:** `(title, content, tags)`

---

### Week 2 Collections (Teacher Features)

#### `grade_suggestions`
```javascript
{
  _id: ObjectId,
  task_id: string,
  student_id: string,
  teacher_id: string,
  ai_suggested_grade: float (0-100),
  ai_reasoning: string,
  performance_factors: {
    estimated_hours: float,
    actual_hours: float,
    completed_on_time: boolean,
    days_late: int,
    subtasks_completed: int,
    total_subtasks: int,
    extension_requests: int,
    complexity: int
  },
  strengths: [string],
  weaknesses: [string],
  improvement_suggestions: [string],
  encouragement: string,
  final_grade: float,
  teacher_comments: string,
  teacher_override_reason: string,
  historical_context: {
    average_grade: float,
    trend: string,
    recent_grades: [float]
  },
  status: "pending" | "finalized",
  created_at: datetime,
  finalized_at: datetime
}
```
**Indexes:** `task_id`, `student_id`, `teacher_id`, `(teacher_id + task_id)`

#### `class_analytics`
```javascript
{
  _id: ObjectId,
  teacher_id: string,
  total_students: int,
  class_completion_rate: float,
  class_average_grade: float,
  at_risk_count: int,
  grade_distribution: object,
  timestamp: datetime
}
```
**Indexes:** `teacher_id`, `timestamp`

#### `task_templates`
```javascript
{
  _id: ObjectId,
  teacher_id: string,
  name: string,
  title: string,
  description: string,
  estimated_hours: float,
  complexity_score: int,
  subtasks: [string],
  tags: [string],
  usage_count: int,
  created_at: datetime
}
```
**Indexes:** `teacher_id`, `(teacher_id + tags)`

---

## 🔌 Core API Endpoints

### Authentication (`/api/auth`)

#### `POST /api/auth/register`
Create new user account
```json
Request:
{
  "email": "student@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "student"
}

Response:
{
  "message": "User registered successfully",
  "user_id": "507f1f77bcf86cd799439011"
}
```

#### `POST /api/auth/login`
Login user
```json
Request:
{
  "email": "student@example.com",
  "password": "password123"
}

Response:
{
  "token": "firebase_jwt_token",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "full_name": "John Doe",
    "role": "student"
  }
}
```

---

### Tasks (`/api/tasks`)

#### `POST /api/tasks/`
Create new task with AI analysis
```json
Request:
{
  "title": "Complete Chapter 5 Exercises",
  "description": "Answer questions 1-20",
  "deadline": "2026-01-15T23:59:00",
  "priority": "high",
  "assigned_to": "student_user_id"
}

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Complete Chapter 5 Exercises",
  "estimated_hours": 4,
  "complexity_score": 6,
  "subtasks": [
    {"text": "Review chapter material", "completed": false},
    {"text": "Answer questions 1-10", "completed": false},
    {"text": "Answer questions 11-20", "completed": false}
  ],
  "ai_suggested_deadline": "2026-01-14T18:00:00"
}
```

#### `GET /api/tasks/`
Get all tasks for current user

#### `GET /api/tasks/{task_id}`
Get specific task

#### `PUT /api/tasks/{task_id}`
Update task

#### `DELETE /api/tasks/{task_id}`
Delete task

---

## 🧠 Week 1 Student Features API

### Stress Meter (`/api/stress`)

#### `GET /api/stress/current`
Calculate real-time stress level
```json
Response:
{
  "stress_score": 7.2,
  "level": "high",
  "breakdown": {
    "time_pressure": 3.5,
    "complexity_contribution": 2.1,
    "deadline_overlap": 1.6
  },
  "recommendations": [
    "Consider requesting extension for lowest priority task",
    "Focus on one task at a time",
    "Take short breaks every hour"
  ],
  "active_tasks": 8,
  "urgent_tasks": 3,
  "deadlines_this_week": 5
}
```

#### `POST /api/stress/log-feeling`
Log subjective stress level
```json
Request:
{
  "feeling_score": 8,
  "notes": "Feeling overwhelmed with deadlines"
}
```

#### `GET /api/stress/history`
Get 7-day stress history for visualization

---

### Focus Mode (`/api/focus`)

#### `POST /api/focus/start-session`
Start focus session
```json
Request:
{
  "session_type": "pomodoro",  // "pomodoro", "deep_work", "short_burst"
  "task_id": "507f1f77bcf86cd799439011"
}

Response:
{
  "session_id": "507f1f77bcf86cd799439012",
  "session_type": "pomodoro",
  "duration_minutes": 25,
  "end_time": "2026-01-07T15:25:00"
}
```

#### `POST /api/focus/{session_id}/complete`
Complete focus session
```json
Request:
{
  "productivity_rating": 4,
  "notes": "Very productive session"
}
```

#### `POST /api/focus/{session_id}/interrupt`
Log interruption
```json
Request:
{
  "interruption_type": "notification"  // "notification", "distraction", "break"
}
```

#### `GET /api/focus/active`
Get active session

#### `GET /api/focus/stats`
Get focus statistics
```json
Response:
{
  "total_focus_time_minutes": 450,
  "total_sessions": 18,
  "completion_rate": 85.5,
  "sessions_by_type": {
    "pomodoro": 12,
    "deep_work": 4,
    "short_burst": 2
  }
}
```

---

### Resource Library (`/api/resources`)

#### `POST /api/resources/notes`
Create markdown note with AI enhancement
```json
Request:
{
  "title": "Chapter 5 Summary",
  "content": "# Key Concepts\n\nImportant points from chapter 5...",
  "tags": ["math", "chapter5"]
}

Response:
{
  "resource_id": "507f1f77bcf86cd799439013",
  "ai_summary": "This note covers 3 key concepts: derivatives, integrals, and limits.",
  "ai_key_points": [
    "Derivatives measure rate of change",
    "Integrals calculate area under curve",
    "Limits define function behavior"
  ],
  "suggested_tags": ["calculus", "derivatives", "integrals"]
}
```

#### `POST /api/resources/{resource_id}/flashcards`
Generate AI flashcards
```json
Response:
{
  "flashcards": [
    {
      "question": "What is a derivative?",
      "answer": "A measure of how a function changes as its input changes"
    },
    // ... 7-11 more flashcards
  ],
  "count": 12
}
```

#### `GET /api/resources/search`
Full-text search
```
Query params: ?query=calculus&type=note
```

---

## 🎓 Week 2 Teacher Features API

### AI Grading (`/api/grading`)

#### `POST /api/grading/analyze-submission`
AI analyzes student submission
```json
Request:
{
  "task_id": "507f1f77bcf86cd799439011",
  "student_id": "507f1f77bcf86cd799439014"
}

Response:
{
  "suggestion_id": "507f1f77bcf86cd799439015",
  "suggested_grade": 87.5,
  "reasoning": "The student completed the task efficiently, finishing in 3.5 hours compared to the estimated 4 hours. All subtasks were completed on time with no extension requests.",
  "strengths": [
    "Excellent time management",
    "Completed all subtasks thoroughly",
    "Submitted ahead of deadline"
  ],
  "weaknesses": [
    "Could provide more detailed responses"
  ],
  "improvements": [
    "Consider adding examples to strengthen answers",
    "Review material before starting for better preparation"
  ],
  "encouragement": "Great work! Your time management skills are improving. Keep up the consistent effort!",
  "performance_summary": {
    "time_efficiency": "0.9x estimated",
    "on_time": true,
    "completion_rate": "100%",
    "extensions": 0
  }
}
```

#### `PUT /api/grading/{suggestion_id}/finalize`
Finalize grade
```json
Request:
{
  "final_grade": 90,
  "teacher_comments": "Excellent work! Well done.",
  "override_reason": null  // Required if grade differs >10 points from AI
}

Response:
{
  "message": "Grade finalized and student notified",
  "final_grade": 90,
  "ai_suggested_grade": 87.5,
  "grade_difference": 2.5,
  "ai_agreement": true
}
```

#### `GET /api/grading/pending`
Get ungraded submissions

#### `GET /api/grading/history`
Get grading history with AI agreement stats

---

### Class Analytics (`/api/class`)

#### `GET /api/class/analytics`
Get comprehensive class overview
```json
Response:
{
  "class_metrics": {
    "total_students": 25,
    "class_completion_rate": 78.5,
    "class_average_grade": 82.3,
    "at_risk_count": 4
  },
  "grade_distribution": {
    "A (90-100)": 8,
    "B (80-89)": 10,
    "C (70-79)": 5,
    "D (60-69)": 1,
    "F (0-59)": 0,
    "Not Graded": 1
  },
  "at_risk_students": [
    {
      "student_id": "...",
      "student_name": "Jane Doe",
      "completion_rate": 45.0,
      "average_grade": 62.5,
      "risk_score": 7,
      "risk_factors": [
        "Low completion rate",
        "3 overdue tasks",
        "Declining grades"
      ]
    }
  ],
  "top_performers": [...],
  "struggle_areas": [
    {
      "task_title": "Advanced Calculus Problem Set",
      "completion_rate": 40.0,
      "students_struggling": 15
    }
  ]
}
```

#### `GET /api/class/at-risk-students`
Get detailed at-risk analysis with intervention recommendations

#### `GET /api/class/trends?days=30`
Get historical performance trends

---

### Bulk Tasks (`/api/bulk-tasks`)

#### `POST /api/bulk-tasks/create`
Create tasks for multiple students
```json
Request:
{
  "title": "Weekly Reading Assignment",
  "description": "Read chapters 6-7 and answer discussion questions",
  "deadline": "2026-01-14T23:59:00",
  "priority": "medium",
  "estimated_hours": 3,
  "complexity_score": 5,
  "subtasks": [
    "Read chapter 6",
    "Read chapter 7",
    "Answer discussion questions"
  ],
  "student_ids": [
    "student_id_1",
    "student_id_2",
    "student_id_3"
  ],
  "save_as_template": true,
  "template_name": "Weekly Reading Template"
}

Response:
{
  "message": "Successfully created 3 tasks",
  "total_created": 3,
  "total_failed": 0,
  "template_id": "507f1f77bcf86cd799439016",
  "created_tasks": [
    {"task_id": "...", "student_id": "...", "student_name": "John Doe"},
    // ...
  ]
}
```

#### `GET /api/bulk-tasks/templates`
Get all templates

#### `GET /api/bulk-tasks/templates/{template_id}`
Get specific template

#### `DELETE /api/bulk-tasks/templates/{template_id}`
Delete template

#### `GET /api/bulk-tasks/students`
Get list of students for assignment

---

## ⚙️ Setup & Configuration

### Installation

```bash
# Install dependencies
cd backend
pip install fastapi uvicorn pymongo firebase-admin python-dotenv

# Run server
uvicorn app.main:app --reload
```

### Environment Variables

Create `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/task_scheduler
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
OLLAMA_BASE_URL=http://localhost:11434
```

### Database Setup

```python
# Indexes are created automatically in db_config.py
# No manual setup needed
```

---

## 🔒 Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require Firebase JWT token:

```
Authorization: Bearer <firebase_jwt_token>
```

---

## 🤖 AI Integration

### Ollama Service
- **Model:** Local LLM via Ollama
- **Used For:**
  - Task complexity analysis
  - Stress recommendations
  - Resource summarization
  - Flashcard generation
  - Grading explanations

### AI Functions
- `generate_ai_response(prompt)` - Base AI call
- `humanize_task_analysis()` - Task analysis
- `generate_grading_explanation()` - Grading feedback
- `generate_resource_summary()` - Content summarization

---

## 📊 API Response Format

All responses follow this format:

**Success:**
```json
{
  "data": {...},
  "message": "Success message"
}
```

**Error:**
```json
{
  "detail": "Error description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

**Total Endpoints:** 30+ API endpoints across 10 routers

**Backend Files:** 15+ Python files, ~5,000+ lines of code

**Last Updated:** January 7, 2026 ✅
