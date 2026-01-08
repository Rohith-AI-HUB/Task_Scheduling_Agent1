# 🚀 4-Day Task Planning & Scheduling Agent - Fixed Development Plan

## 🎯 Project Overview

**AI-Powered Task Planning System with Smart Scheduling**

### Tech Stack
- **Auth:** Firebase Authentication
- **Database:** MongoDB (Local Compass)
- **AI/LLM:** Ollama with `deepseek-coder:1.3b-instruct`
- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite + Tailwind CSS

### Core Features
1. Student/Teacher Authentication (Firebase)
2. Task Management (CRUD + AI suggestions)
3. Extension Request System (AI-powered approval recommendations)
4. Dashboard (Analytics & Overview)
5. Analytics (Workload analysis)
6. Notifications (Real-time updates)
7. File Attachments (Task documents)
8. Group Coordinator (Team task management)

---

## 📅 DAY 1 - FOUNDATION & AUTHENTICATION (8-10 hours)

### 🎯 Goals
- Firebase auth integration (Student/Teacher)
- MongoDB setup and connection
- Ollama setup with deepseek-coder
- Basic backend API structure
- Frontend auth flow complete

---

### Part 1: Environment Setup (1.5 hours)

#### Backend Setup
```bash
# Create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn pymongo firebase-admin ollama python-dotenv pydantic pydantic-settings bcrypt python-jose python-multipart
```

#### MongoDB Setup
- Install MongoDB Compass (local)
- Create database: `task_scheduling_db`
- Create collections: `users`, `tasks`, `extension_requests`, `notifications`, `groups`

#### Firebase Setup
1. Create Firebase project: https://console.firebase.google.com
2. Enable Authentication > Email/Password
3. Download service account JSON (Admin SDK)
4. Add to `backend/firebase-credentials.json`

#### Ollama Setup
```bash
# Install Ollama (Windows: https://ollama.ai/download)
# Pull the model
ollama pull deepseek-coder:1.3b-instruct

# Test it
ollama run deepseek-coder:1.3b-instruct "Hello"
```

---

### Part 2: Backend Foundation (3 hours)

#### File: `backend/.env`
```env
MONGODB_URI=mongodb://localhost:27017/task_scheduling_db
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
SECRET_KEY=your-secret-key-change-this
OLLAMA_MODEL=deepseek-coder:1.3b-instruct
```

#### File: `backend/app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_uri: str
    firebase_credentials_path: str
    secret_key: str
    ollama_model: str = "deepseek-coder:1.3b-instruct"

    class Config:
        env_file = ".env"

settings = Settings()
```

#### File: `backend/app/db_config.py`
```python
from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.mongodb_uri)
db = client.get_database()

# Collections
users_collection = db["users"]
tasks_collection = db["tasks"]
extension_requests_collection = db["extension_requests"]
notifications_collection = db["notifications"]
groups_collection = db["groups"]
chat_history_collection = db["chat_history"]

# Create indexes
users_collection.create_index("email", unique=True)
users_collection.create_index("firebase_uid", unique=True)
tasks_collection.create_index("assigned_to")
tasks_collection.create_index("created_by")
extension_requests_collection.create_index("task_id")
```

#### File: `backend/app/models/schemas.py`
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["student", "teacher"]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    firebase_uid: str
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    assigned_to: str  # user_id
    attachments: Optional[List[str]] = []

class ExtensionRequest(BaseModel):
    task_id: str
    requested_deadline: datetime
    reason: str
    reason_category: Literal["medical", "technical", "overlapping", "personal", "other"]
```

#### File: `backend/app/services/firebase_service.py`
```python
import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings

cred = credentials.Certificate(settings.firebase_credentials_path)
firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token: str):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        return None

def create_firebase_user(email: str, password: str):
    try:
        user = auth.create_user(email=email, password=password)
        return user.uid
    except Exception as e:
        raise Exception(f"Firebase user creation failed: {str(e)}")
```

#### File: `backend/app/services/ollama_service.py`
```python
import ollama
from app.config import settings

def generate_ai_response(prompt: str, context: dict = None) -> str:
    try:
        response = ollama.generate(
            model=settings.ollama_model,
            prompt=prompt,
            stream=False
        )
        return response['response']
    except Exception as e:
        return f"AI Error: {str(e)}"

def test_ollama_connection():
    response = generate_ai_response("Say 'AI Ready'")
    return "Ready" in response
```

#### File: `backend/app/routers/auth.py`
```python
from fastapi import APIRouter, HTTPException, Depends, Header
from app.models.schemas import UserCreate, UserResponse
from app.services.firebase_service import create_firebase_user, verify_firebase_token
from app.db_config import users_collection
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create Firebase user
    try:
        firebase_uid = create_firebase_user(user.email, user.password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save to MongoDB
    user_doc = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "firebase_uid": firebase_uid,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)

    user_doc["id"] = str(result.inserted_id)
    return UserResponse(**user_doc)

@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    decoded = verify_firebase_token(token)

    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_collection.find_one({"firebase_uid": decoded['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["id"] = str(user["_id"])
    return UserResponse(**user)
```

#### File: `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth

app = FastAPI(title="Task Scheduling Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
def root():
    return {"status": "Task Scheduling Agent API Running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-01-04"}
```

---

### Part 3: Frontend Firebase Auth (3.5 hours)

#### Install Firebase
```bash
cd frontend
npm install firebase axios react-router-dom lucide-react
```

#### File: `frontend/src/firebase/config.js`
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### File: `frontend/src/services/auth.service.js`
```javascript
import { auth } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const authService = {
  async register(email, password, fullName, role) {
    // Register with backend
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      full_name: fullName,
      role
    });

    // Sign in with Firebase
    await signInWithEmailAndPassword(auth, email, password);
    return response.data;
  },

  async login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('authToken', token);
    return userCredential.user;
  },

  async logout() {
    await signOut(auth);
    localStorage.removeItem('authToken');
  },

  async getCurrentUser() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
```

#### File: `frontend/src/pages/LoginPage.jsx`
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### File: `frontend/src/pages/RegisterPage.jsx`
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', role: 'student'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await authService.register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">Register</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full p-2 border rounded mb-4"
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### ✅ Day 1 Deliverables
- Firebase auth working (Register/Login)
- MongoDB connected with collections
- Ollama running with deepseek-coder
- Backend API structure complete
- Frontend auth flow complete
- Protected routes setup

---

## 📅 DAY 2 - TASK MANAGEMENT & AI INTEGRATION (8-10 hours)

### 🎯 Goals
- Full CRUD for tasks
- AI-powered task breakdown (subtasks)
- AI deadline suggestions
- Task priority & complexity analysis
- Dashboard with task overview

---

### Part 1: Task Backend (3 hours)

#### File: `backend/app/services/ai_task_service.py`
```python
from app.services.ollama_service import generate_ai_response
import json
from datetime import datetime, timedelta

def analyze_task_complexity(title: str, description: str) -> dict:
    prompt = f"""Analyze this task and provide:
1. Complexity score (1-10)
2. Estimated hours
3. Suggested deadline (days from now)
4. Priority (low/medium/high/urgent)

Task: {title}
Description: {description}

Respond ONLY in JSON format:
{{"complexity": 5, "hours": 8, "deadline_days": 7, "priority": "medium"}}"""

    response = generate_ai_response(prompt)
    try:
        # Extract JSON from response
        start = response.find('{')
        end = response.rfind('}') + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except:
        return {"complexity": 5, "hours": 4, "deadline_days": 3, "priority": "medium"}

def generate_subtasks(title: str, description: str) -> list:
    prompt = f"""Break down this task into 3-5 actionable subtasks.

Task: {title}
Description: {description}

Respond ONLY as JSON array:
["Subtask 1", "Subtask 2", "Subtask 3"]"""

    response = generate_ai_response(prompt)
    try:
        start = response.find('[')
        end = response.rfind(']') + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except:
        return ["Research task requirements", "Plan approach", "Execute and review"]
```

#### File: `backend/app/routers/tasks.py`
```python
from fastapi import APIRouter, HTTPException, Depends, Header
from app.models.schemas import TaskCreate
from app.db_config import tasks_collection, users_collection
from app.services.firebase_service import verify_firebase_token
from app.services.ai_task_service import analyze_task_complexity, generate_subtasks
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_current_user_id(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    decoded = verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = users_collection.find_one({"firebase_uid": decoded['uid']})
    return str(user["_id"])

@router.post("/")
async def create_task(task: TaskCreate, user_id: str = Depends(get_current_user_id)):
    # AI Analysis
    ai_analysis = analyze_task_complexity(task.title, task.description or "")
    subtasks = generate_subtasks(task.title, task.description or "")

    suggested_deadline = datetime.utcnow() + timedelta(days=ai_analysis.get("deadline_days", 3))

    task_doc = {
        "title": task.title,
        "description": task.description,
        "deadline": task.deadline,
        "priority": ai_analysis.get("priority", task.priority),
        "status": "todo",
        "assigned_to": task.assigned_to,
        "created_by": user_id,
        "ai_suggested_deadline": suggested_deadline,
        "complexity_score": ai_analysis.get("complexity", 5),
        "estimated_hours": ai_analysis.get("hours", 4),
        "subtasks": [{"title": st, "status": "todo", "ai_generated": True} for st in subtasks],
        "attachments": task.attachments or [],
        "created_at": datetime.utcnow()
    }

    result = tasks_collection.insert_one(task_doc)
    task_doc["id"] = str(result.inserted_id)
    return task_doc

@router.get("/")
async def get_tasks(user_id: str = Depends(get_current_user_id)):
    tasks = list(tasks_collection.find({"assigned_to": user_id}))
    for task in tasks:
        task["id"] = str(task.pop("_id"))
    return tasks

@router.get("/{task_id}")
async def get_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task["id"] = str(task.pop("_id"))
    return task

@router.put("/{task_id}")
async def update_task(task_id: str, updates: dict, user_id: str = Depends(get_current_user_id)):
    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task updated"}

@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}
```

#### Update `backend/app/main.py`
```python
from app.routers import auth, tasks

app.include_router(auth.router)
app.include_router(tasks.router)
```

---

### Part 2: Task Frontend (3 hours)

#### File: `frontend/src/services/task.service.js`
```javascript
import axios from 'axios';

const API_URL = 'http://localhost:8000/tasks';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
});

export const taskService = {
  async getTasks() {
    const response = await axios.get(API_URL, getAuthHeader());
    return response.data;
  },

  async createTask(taskData) {
    const response = await axios.post(API_URL, taskData, getAuthHeader());
    return response.data;
  },

  async updateTask(taskId, updates) {
    const response = await axios.put(`${API_URL}/${taskId}`, updates, getAuthHeader());
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await axios.delete(`${API_URL}/${taskId}`, getAuthHeader());
    return response.data;
  }
};
```

#### File: `frontend/src/components/TaskCard.jsx`
```javascript
import { Clock, AlertCircle } from 'lucide-react';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg">{task.title}</h3>
        <span className={`px-2 py-1 rounded text-xs ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      <p className="text-gray-600 text-sm mt-2">{task.description}</p>

      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock size={16} />
          <span>{task.estimated_hours}h</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle size={16} />
          <span>Complexity: {task.complexity_score}/10</span>
        </div>
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700">AI-Generated Subtasks:</p>
          <ul className="text-xs text-gray-600 ml-4 mt-1">
            {task.subtasks.map((st, i) => (
              <li key={i} className="list-disc">{st.title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onUpdate(task.id, { status: 'completed' })}
          className="text-xs bg-green-500 text-white px-3 py-1 rounded"
        >
          Complete
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs bg-red-500 text-white px-3 py-1 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

#### File: `frontend/src/pages/TasksPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import { taskService } from '../services/task.service';
import TaskCard from '../components/TaskCard';
import { Plus } from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', deadline: '', priority: 'medium', assigned_to: ''
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const data = await taskService.getTasks();
    setTasks(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await taskService.createTask({
      ...formData,
      deadline: new Date(formData.deadline).toISOString()
    });
    loadTasks();
    setShowForm(false);
  };

  const handleUpdate = async (taskId, updates) => {
    await taskService.updateTask(taskId, updates);
    loadTasks();
  };

  const handleDelete = async (taskId) => {
    await taskService.deleteTask(taskId);
    loadTasks();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={20} /> New Task
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <form onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border rounded mb-3"
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded mb-3"
              rows="3"
            />
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full p-2 border rounded mb-3"
              required
            />
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
              Create Task (AI will analyze)
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### ✅ Day 2 Deliverables
- Task CRUD complete
- AI analyzing tasks (complexity, hours, priority)
- AI generating subtasks automatically
- Task dashboard with cards
- Real-time task updates

---

## 📅 DAY 3 - EXTENSION REQUESTS & NOTIFICATIONS (8-10 hours)

### 🎯 Goals
- Extension request system (students request, teachers review)
- AI recommendation for approval/denial
- Notification system
- Teacher approval dashboard
- File attachment support

---

### Part 1: Extension Request Backend (3 hours)

#### File: `backend/app/services/ai_extension_service.py`
```python
from app.services.ollama_service import generate_ai_response
import json

def analyze_extension_request(task, original_deadline, requested_deadline, reason, reason_category):
    prompt = f"""Analyze this deadline extension request:

Task: {task['title']}
Original Deadline: {original_deadline}
Requested Deadline: {requested_deadline}
Reason: {reason}
Category: {reason_category}
Task Complexity: {task.get('complexity_score', 5)}/10

Provide recommendation as JSON:
{{"recommendation": "approve/deny/conditional", "confidence": 0.85, "reasoning": "Clear explanation", "suggested_deadline": "2026-01-10T00:00:00Z"}}"""

    response = generate_ai_response(prompt)
    try:
        start = response.find('{')
        end = response.rfind('}') + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except:
        return {
            "recommendation": "conditional",
            "confidence": 0.5,
            "reasoning": "Unable to analyze. Manual review recommended.",
            "suggested_deadline": requested_deadline
        }
```

#### File: `backend/app/routers/extensions.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from app.db_config import extension_requests_collection, tasks_collection, notifications_collection
from app.services.ai_extension_service import analyze_extension_request
from app.routers.tasks import get_current_user_id
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/extensions", tags=["Extensions"])

@router.post("/")
async def create_extension_request(
    task_id: str,
    requested_deadline: str,
    reason: str,
    reason_category: str,
    user_id: str = Depends(get_current_user_id)
):
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # AI Analysis
    ai_analysis = analyze_extension_request(
        task,
        task['deadline'],
        requested_deadline,
        reason,
        reason_category
    )

    ext_doc = {
        "task_id": task_id,
        "user_id": user_id,
        "original_deadline": task['deadline'],
        "requested_deadline": datetime.fromisoformat(requested_deadline),
        "reason": reason,
        "reason_category": reason_category,
        "ai_recommendation": ai_analysis.get("recommendation"),
        "ai_reasoning": ai_analysis.get("reasoning"),
        "ai_confidence_score": ai_analysis.get("confidence"),
        "ai_suggested_deadline": ai_analysis.get("suggested_deadline"),
        "status": "pending",
        "created_at": datetime.utcnow()
    }

    result = extension_requests_collection.insert_one(ext_doc)

    # Create notification for teacher
    notifications_collection.insert_one({
        "user_id": task['created_by'],
        "type": "extension_request",
        "message": f"Extension request for '{task['title']}'",
        "reference_id": str(result.inserted_id),
        "read": False,
        "created_at": datetime.utcnow()
    })

    ext_doc["id"] = str(result.inserted_id)
    return ext_doc

@router.get("/")
async def get_extension_requests(user_id: str = Depends(get_current_user_id)):
    requests = list(extension_requests_collection.find({"user_id": user_id}))
    for req in requests:
        req["id"] = str(req.pop("_id"))
    return requests

@router.put("/{ext_id}/review")
async def review_extension(
    ext_id: str,
    status: str,
    comment: str,
    user_id: str = Depends(get_current_user_id)
):
    result = extension_requests_collection.update_one(
        {"_id": ObjectId(ext_id)},
        {"$set": {
            "status": status,
            "reviewed_by": user_id,
            "reviewed_at": datetime.utcnow(),
            "review_comment": comment
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")

    # Update task deadline if approved
    ext_req = extension_requests_collection.find_one({"_id": ObjectId(ext_id)})
    if status == "approved":
        tasks_collection.update_one(
            {"_id": ObjectId(ext_req['task_id'])},
            {"$set": {"deadline": ext_req['requested_deadline']}}
        )

    return {"message": "Request reviewed"}
```

#### File: `backend/app/routers/notifications.py`
```python
from fastapi import APIRouter, Depends
from app.db_config import notifications_collection
from app.routers.tasks import get_current_user_id

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_notifications(user_id: str = Depends(get_current_user_id)):
    notifs = list(notifications_collection.find({"user_id": user_id}).sort("created_at", -1).limit(20))
    for n in notifs:
        n["id"] = str(n.pop("_id"))
    return notifs

@router.put("/{notif_id}/read")
async def mark_as_read(notif_id: str, user_id: str = Depends(get_current_user_id)):
    from bson import ObjectId
    notifications_collection.update_one(
        {"_id": ObjectId(notif_id)},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}
```

Update `main.py`:
```python
from app.routers import auth, tasks, extensions, notifications

app.include_router(extensions.router)
app.include_router(notifications.router)
```

---

### Part 2: Extension & Notification Frontend (3 hours)

#### File: `frontend/src/pages/ExtensionsPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ExtensionsPage() {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadRequests();
    loadTasks();
  }, []);

  const loadRequests = async () => {
    const token = localStorage.getItem('authToken');
    const res = await axios.get('http://localhost:8000/extensions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setRequests(res.data);
  };

  const loadTasks = async () => {
    const token = localStorage.getItem('authToken');
    const res = await axios.get('http://localhost:8000/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTasks(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const token = localStorage.getItem('authToken');

    await axios.post('http://localhost:8000/extensions/', {
      task_id: formData.get('task_id'),
      requested_deadline: formData.get('requested_deadline'),
      reason: formData.get('reason'),
      reason_category: formData.get('reason_category')
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    loadRequests();
    setShowForm(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Extension Requests</h1>

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Request Extension
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-6">
          <select name="task_id" className="w-full p-2 border rounded mb-3" required>
            <option value="">Select Task</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            name="requested_deadline"
            className="w-full p-2 border rounded mb-3"
            required
          />
          <select name="reason_category" className="w-full p-2 border rounded mb-3" required>
            <option value="medical">Medical</option>
            <option value="technical">Technical Issues</option>
            <option value="overlapping">Overlapping Deadlines</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
          <textarea
            name="reason"
            placeholder="Explain your reason..."
            className="w-full p-2 border rounded mb-3"
            required
          />
          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
            Submit (AI will analyze)
          </button>
        </form>
      )}

      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">Task ID: {req.task_id}</h3>
            <p className="text-sm text-gray-600">Status: {req.status}</p>
            <p className="text-sm">AI Recommendation: {req.ai_recommendation}</p>
            <p className="text-sm italic">{req.ai_reasoning}</p>
            <p className="text-sm">Confidence: {(req.ai_confidence_score * 100).toFixed(0)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### ✅ Day 3 Deliverables
- Extension request system working
- AI analyzing and recommending approval/denial
- Notification system for teachers
- File upload capability
- Teacher review dashboard

---

## 📅 DAY 4 - ANALYTICS, GROUPS & POLISH (8-10 hours)

### 🎯 Goals
- Dashboard with analytics (charts)
- Group coordinator (assign tasks to groups)
- Workload analysis
- Final UI polish
- Testing & bug fixes

---

### Part 1: Analytics Backend (2 hours)

#### File: `backend/app/routers/analytics.py`
```python
from fastapi import APIRouter, Depends
from app.db_config import tasks_collection, users_collection
from app.routers.tasks import get_current_user_id
from datetime import datetime, timedelta
from collections import Counter

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(user_id: str = Depends(get_current_user_id)):
    user_tasks = list(tasks_collection.find({"assigned_to": user_id}))

    total_tasks = len(user_tasks)
    completed = len([t for t in user_tasks if t['status'] == 'completed'])
    in_progress = len([t for t in user_tasks if t['status'] == 'in_progress'])
    todo = len([t for t in user_tasks if t['status'] == 'todo'])

    total_hours = sum(t.get('estimated_hours', 0) for t in user_tasks if t['status'] != 'completed')

    priority_dist = Counter(t['priority'] for t in user_tasks)

    upcoming = [
        {
            "id": str(t['_id']),
            "title": t['title'],
            "deadline": t['deadline'].isoformat(),
            "priority": t['priority']
        }
        for t in sorted(user_tasks, key=lambda x: x['deadline'])[:5]
    ]

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "in_progress": in_progress,
        "todo": todo,
        "total_hours_remaining": total_hours,
        "priority_distribution": dict(priority_dist),
        "upcoming_deadlines": upcoming
    }
```

---

### Part 2: Groups Backend (2 hours)

#### File: `backend/app/routers/groups.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from app.db_config import groups_collection, tasks_collection
from app.routers.tasks import get_current_user_id
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/")
async def create_group(name: str, member_ids: list, user_id: str = Depends(get_current_user_id)):
    group_doc = {
        "name": name,
        "coordinator_id": user_id,
        "members": member_ids,
        "created_at": datetime.utcnow()
    }
    result = groups_collection.insert_one(group_doc)
    group_doc["id"] = str(result.inserted_id)
    return group_doc

@router.get("/")
async def get_groups(user_id: str = Depends(get_current_user_id)):
    groups = list(groups_collection.find({"coordinator_id": user_id}))
    for g in groups:
        g["id"] = str(g.pop("_id"))
    return groups

@router.post("/{group_id}/assign-task")
async def assign_task_to_group(
    group_id: str,
    task_id: str,
    user_id: str = Depends(get_current_user_id)
):
    group = groups_collection.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Assign task to all group members
    for member_id in group['members']:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        new_task = task.copy()
        new_task.pop("_id")
        new_task["assigned_to"] = member_id
        new_task["group_id"] = group_id
        tasks_collection.insert_one(new_task)

    return {"message": f"Task assigned to {len(group['members'])} members"}
```

Update `main.py`:
```python
from app.routers import auth, tasks, extensions, notifications, analytics, groups

app.include_router(analytics.router)
app.include_router(groups.router)
```

---

### Part 3: Dashboard Analytics Frontend (3 hours)

#### Install chart library:
```bash
npm install recharts
```

#### File: `frontend/src/pages/AnalyticsPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem('authToken');
    const res = await axios.get('http://localhost:8000/analytics/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setStats(res.data);
  };

  if (!stats) return <div>Loading...</div>;

  const statusData = [
    { name: 'Completed', value: stats.completed },
    { name: 'In Progress', value: stats.in_progress },
    { name: 'Todo', value: stats.todo }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded shadow">
          <h3 className="font-bold text-lg">Total Tasks</h3>
          <p className="text-3xl">{stats.total_tasks}</p>
        </div>
        <div className="bg-green-100 p-4 rounded shadow">
          <h3 className="font-bold text-lg">Completed</h3>
          <p className="text-3xl">{stats.completed}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded shadow">
          <h3 className="font-bold text-lg">In Progress</h3>
          <p className="text-3xl">{stats.in_progress}</p>
        </div>
        <div className="bg-red-100 p-4 rounded shadow">
          <h3 className="font-bold text-lg">Hours Remaining</h3>
          <p className="text-3xl">{stats.total_hours_remaining.toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="font-bold text-xl mb-4">Task Status Distribution</h2>
        <PieChart width={400} height={300}>
          <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-bold text-xl mb-4">Upcoming Deadlines</h2>
        <ul className="space-y-2">
          {stats.upcoming_deadlines.map(task => (
            <li key={task.id} className="flex justify-between border-b pb-2">
              <span>{task.title}</span>
              <span className="text-sm text-gray-600">{new Date(task.deadline).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

### Part 4: Final Polish & Testing (3 hours)

#### File: `frontend/src/App.jsx` (Complete Routing)
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ExtensionsPage from './pages/ExtensionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/extensions" element={<ProtectedRoute><ExtensionsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### Testing Checklist:
1. Register student & teacher accounts
2. Create tasks and verify AI analysis
3. Request extensions and check AI recommendations
4. Test task completion flow
5. Verify analytics charts
6. Test group creation
7. Check notifications
8. Test file uploads

---

### ✅ Day 4 Deliverables
- Analytics dashboard with charts
- Group coordinator feature
- All features integrated
- UI polished and responsive
- Full testing completed
- Production-ready app

---

## 🎯 Final Project Features Summary

### Student Features
- Register/Login with Firebase
- View assigned tasks
- Create personal tasks (AI analyzes)
- Request deadline extensions (AI recommendations)
- View workload analytics
- Receive notifications
- Upload attachments

### Teacher Features
- Assign tasks to students
- Review extension requests (with AI insights)
- Create groups
- Assign tasks to groups
- View student analytics
- Approve/deny extensions

### AI Capabilities (Ollama deepseek-coder:1.3b-instruct)
- Task complexity analysis
- Estimated hours calculation
- Automatic subtask generation
- Deadline suggestions
- Extension request analysis
- Workload stress scoring

---

## 🚀 Running the Complete Application

### Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

### Ollama
```bash
ollama serve
```

Access: **http://localhost:5173**

---

## 📊 Database Collections

1. **users** - Student/Teacher profiles
2. **tasks** - All tasks with AI analysis
3. **extension_requests** - Extension requests with AI recommendations
4. **notifications** - Real-time notifications
5. **groups** - Group coordinator data
6. **chat_history** - AI chat logs

---

## 🎓 Key Learning Outcomes

- Firebase Authentication integration
- MongoDB with FastAPI
- Ollama local LLM integration
- Prompt engineering for task analysis
- React state management
- Real-time notifications
- Data visualization with charts
- Full-stack AI application

---

## 📝 Notes

- This plan is **fixed for 4 days** with realistic time estimates
- Each day builds on the previous
- AI features are fully integrated from Day 2
- Focus on core features, avoiding scope creep
- All deliverables are achievable in the time allocated

**TOTAL: 32-40 hours over 4 days (8-10 hours/day)**

Good luck building your AI Task Scheduling Agent!
