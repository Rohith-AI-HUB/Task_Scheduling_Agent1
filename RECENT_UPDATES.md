# Recent Updates - Task Scheduling Agent

**Last Updated:** January 8, 2026

## ✅ Latest Changes (Today)

### 1. Resource Library Filtering - FIXED
**Issue:** Filter options didn't match actual file types stored in backend.

**Solution:** Updated filter buttons to accurately categorize resources:
- 📁 **All** - Show everything
- 📝 **Notes** - User-created markdown notes
- 📕 **PDFs** - PDF documents
- 📄 **Documents** - Word docs (.doc, .docx)
- 📃 **Text Files** - Plain text (.txt, .md)
- 💻 **Code** - Code files (.py, .js, .java, .cpp, etc.)
- 🖼️ **Images** - Image files (.jpg, .png, .gif)
- 🎥 **Videos** - Video files (.mp4, .mov, .avi)
- 🔗 **Links** - Saved URLs
- 📦 **Other Files** - Any other file types

**Files Modified:**
- `frontend/src/pages/ResourceLibraryPage.jsx` (lines 245-257)

---

### 2. USN (University Serial Number) Support - NEW FEATURE
**Feature:** Students can now use USN instead of MongoDB ObjectIDs for group coordination.

#### USN Format Support:
- `1ms25scs032` - Standard format
- `1ms25scs032-t` - With suffix (automatically normalized)
- `1ms25scs032-s` - Alternative suffix (automatically normalized)
- All variations map to the same user

#### Changes Made:

**Backend:**
1. **User Schema** (`backend/app/models/schemas.py`)
   - Added optional `usn` field to `UserCreate` and `UserResponse`
   ```python
   usn: Optional[str] = None  # e.g., 1ms25scs032 or 1ms25scs032-t
   ```

2. **Registration** (`backend/app/routers/auth.py`)
   - Accepts USN during registration
   - Normalizes USN (lowercase, removes `-t` or `-s` suffix)
   - Prevents duplicate USN registration
   - Lines 39-45

3. **Groups API** (`backend/app/routers/groups.py`)
   - New function: `resolve_user_identifier(identifier: str)` (lines 18-38)
   - Accepts both USN and ObjectID
   - Automatically resolves to user ObjectID
   - Returns USN in member details
   - Lines 40-72, 74-92, 105-120

**Frontend:**
1. **Registration Page** (`frontend/src/pages/RegisterPage.jsx`)
   - Added USN input field (optional)
   - Placeholder: "e.g., 1ms25scs032 or 1ms25scs032-t"
   - Help text explaining group coordination
   - Lines 114-128

2. **Auth Service** (`frontend/src/services/auth.service.js`)
   - Updated `register()` to accept USN parameter
   - Lines 12-26

3. **Groups Page** (`frontend/src/pages/GroupsPage.jsx`)
   - Updated input placeholder to show USN examples
   - Changed label: "Member USNs or IDs (comma-separated)"
   - Displays USN in member list (blue monospace font)
   - Lines 186-199, 251-253

#### Usage Examples:

**Creating a Group:**
```
Before: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012
Now:    1ms25scs032, 1ms25scs033, 1ms25scs034-t
```

**Member Display:**
```
John Doe
john@example.com
USN: 1ms25scs032
```

---

## Previous Features (Completed)

### Week 4: Google Calendar Integration ✅
- Bidirectional sync with Google Calendar
- OAuth 2.0 authentication
- Task and study schedule sync
- Conflict resolution

### Week 3: Smart Study Planner ✅
- AI-powered daily scheduling
- Deadline-first, complexity-balanced planning
- Stress-aware schedule generation
- Pomodoro, deep work, and short burst sessions

### Week 2: Teacher Efficiency Tools ✅
- AI Grading Assistant
- Class Performance Dashboard
- Bulk Task Creator

### Week 1: Student AI Features ✅
- Stress Meter with AI analysis
- Focus Mode with Pomodoro timer
- Resource Library with AI summarization

### Core Features ✅
- Task Management
- Extension Requests
- Analytics Dashboard
- Group Coordination
- Notifications
- Authentication (Firebase + JWT)

---

## Technical Stack

**Backend:**
- FastAPI (Python)
- MongoDB
- Firebase Authentication
- Ollama (Local AI)
- Google Calendar API v3

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Zustand (State Management)
- Axios
- Framer Motion
- Recharts

---

## Database Schema Updates

### Users Collection
```javascript
{
  "_id": ObjectId,
  "email": string,
  "full_name": string,
  "role": "student" | "teacher",
  "usn": string | null,  // NEW: University Serial Number
  "firebase_uid": string,
  "created_at": datetime
}
```

### Resources Collection
```javascript
{
  "_id": ObjectId,
  "user_id": string,
  "title": string,
  "type": "note" | "pdf" | "document" | "text" | "code" | "image" | "video" | "link" | "file",
  "content": string,
  "file_url": string,
  "tags": [string],
  "ai_summary": string,
  "ai_key_points": [string],
  "flashcards": [{question, answer}],
  "favorite": boolean,
  "created_at": datetime,
  "updated_at": datetime
}
```

---

## API Endpoints

### New/Updated Endpoints:

#### Authentication
- `POST /auth/register` - Now accepts optional `usn` field

#### Groups
- `POST /groups/` - Now accepts USN or ObjectID for `member_ids`
- `GET /groups/` - Returns USN in member details
- `GET /groups/{group_id}` - Returns USN in member details

#### Resources
- `GET /api/resources?type_filter={type}` - Improved type filtering
  - Valid types: all, note, pdf, document, text, code, image, video, link, file

---

## Testing Checklist

### Resource Library:
- [ ] Upload a PDF → Click "📕 PDFs" filter → Only PDFs shown
- [ ] Upload a code file → Click "💻 Code" filter → Only code files shown
- [ ] Upload an image → Click "🖼️ Images" filter → Only images shown

### USN Registration:
- [ ] Register user with USN "1ms25scs032"
- [ ] Register user with USN "1ms25scs033-t"
- [ ] Try duplicate USN → Should fail

### Groups with USN:
- [ ] Create group with USNs: "1ms25scs032, 1ms25scs033"
- [ ] Group created successfully
- [ ] Member list shows USNs
- [ ] Create group with mixed: "1ms25scs032, 507f1f77bcf86cd799439011"
- [ ] Both formats work

---

## Known Issues

None at this time.

---

## Migration Notes

**For existing users without USN:**
- USN field is optional
- Old groups using ObjectIDs continue to work
- Users can add USN by re-registering (or database update)

**Backward Compatibility:**
- All existing group functionality preserved
- ObjectID-based groups still functional
- New groups can use USN, ObjectID, or mix of both

---

## Contributors

Development by Claude Code (Anthropic CLI)
