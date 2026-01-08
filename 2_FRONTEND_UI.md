# 🎨 Frontend & UI Documentation

**AI-Powered Task Scheduling Agent v2.0**
**Last Updated:** January 7, 2026

---

## 📚 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [UI/UX Design System](#uiux-design-system)
4. [Core Pages](#core-pages)
5. [Week 1 Features](#week-1-student-pages)
6. [Week 2 Features](#week-2-teacher-pages)
7. [Components](#components)
8. [Setup & Configuration](#setup--configuration)

---

## 🛠️ Tech Stack

- **Framework:** React 18 with Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Theme:** Dark mode support

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TasksPage.jsx
│   │   ├── ExtensionsPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   ├── GroupsPage.jsx
│   │   │
│   │   ├── StressMeterPage.jsx         # Week 1
│   │   ├── FocusModePage.jsx           # Week 1
│   │   ├── ResourceLibraryPage.jsx     # Week 1
│   │   │
│   │   └── teacher/
│   │       ├── GradingDashboard.jsx    # Week 2
│   │       ├── ClassDashboard.jsx      # Week 2
│   │       └── BulkTaskCreator.jsx     # Week 2
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   └── Card/
│   │   │       └── GlassCard.jsx
│   │   ├── features/
│   │   │   └── ThemeToggle/
│   │   │       └── ThemeToggle.jsx
│   │   ├── TaskCard.jsx
│   │   └── NotificationBell.jsx
│   │
│   ├── contexts/
│   │   └── ThemeContext.jsx
│   │
│   ├── store/
│   │   └── useStore.js
│   │
│   ├── styles/
│   │   ├── tokens.js
│   │   └── animations.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── tailwind.config.js
└── package.json
```

---

## 🎨 UI/UX Design System

### Color Palette

#### Role-Based Colors
```javascript
Student Theme:
- Primary: Blue (#3B82F6)
- Accent: Purple (#8B5CF6)
- Background: Light gray (#F9FAFB)

Teacher Theme:
- Primary: Amber/Gold (#C89968)
- Accent: Red (#EF4444)
- Background: Warm beige (#F5F5DC)
```

#### Feature Colors
```javascript
Week 1 Features:
- Stress Meter: Pink (#EC4899)
- Focus Mode: Indigo (#6366F1)
- Resource Library: Teal (#14B8A6)

Week 2 Features:
- AI Grading: Purple to Blue gradient
- Class Dashboard: Blue to Cyan gradient
- Bulk Creator: Green to Emerald gradient
```

#### Semantic Colors
```javascript
Success: Green (#10B981)
Warning: Orange (#F59E0B)
Error: Red (#EF4444)
Info: Blue (#3B82F6)

At-Risk Levels:
- Low: Yellow
- Medium: Orange
- High: Red
```

---

### Typography

```javascript
Fonts:
- Headings: Clash Display (display font)
- Body: Inter (sans-serif)

Sizes:
- h1: 2.25rem (36px)
- h2: 1.875rem (30px)
- h3: 1.5rem (24px)
- body: 1rem (16px)
- small: 0.875rem (14px)
```

---

### Spacing System

8px Grid System:
```
0: 0px
1: 8px
2: 16px
3: 24px
4: 32px
6: 48px
8: 64px
12: 96px
```

---

### Components Library

#### Glassmorphism Cards
```jsx
// Light mode
className="glass-light dark:glass-dark"

Styles:
- Background: rgba(255, 255, 255, 0.7)
- Backdrop blur: 10px
- Border: 1px solid rgba(255, 255, 255, 0.3)
```

#### Buttons
```javascript
Primary: bg-blue-600 hover:bg-blue-700
Secondary: bg-gray-200 hover:bg-gray-300
Success: bg-green-600 hover:bg-green-700
Danger: bg-red-600 hover:bg-red-700

Gradient: bg-gradient-to-r from-purple-500 to-blue-500
```

#### Animations
```css
fadeIn: 300ms ease-out
slideIn: 400ms ease-out
scaleIn: 200ms ease-out
pulse: 2s ease-in-out infinite
shimmer: 2s linear infinite
```

---

## 📄 Core Pages

### 1. Login/Register
**Route:** `/login`, `/register`

**Features:**
- Firebase authentication
- Form validation
- Role selection (student/teacher)
- Error handling

---

### 2. Dashboard
**Route:** `/dashboard`
**File:** `DashboardPage.jsx`

**Layout:**
- Welcome header with notification bell
- Week 2 banner (amber gradient)
- Week 2 Teacher Tools grid (3 cards)
- Week 1 Student Features grid (3 cards)
- Core features grid (4 cards)

**Cards:**
```jsx
Week 2 Teacher Tools:
1. AI Grading Assistant (purple-blue gradient)
2. Class Dashboard (blue-cyan gradient)
3. Bulk Task Creator (green-emerald gradient)

Week 1 Student Features:
1. Stress Meter (pink)
2. Focus Mode (indigo)
3. Resource Library (teal)

Core Features:
1. My Tasks (blue)
2. Extensions (purple)
3. Analytics (green)
4. Groups (orange)
```

---

### 3. Tasks Page
**Route:** `/tasks`

**Features:**
- Task list with filters (all, todo, in_progress, completed)
- Create new task button
- Task cards with:
  - Priority badge
  - Deadline countdown
  - Progress bar
  - Complexity indicator
  - AI analysis toggle
  - Subtask list

---

## 🧠 Week 1 Student Pages

### 1. Stress Meter
**Route:** `/stress-meter`
**File:** `StressMeterPage.jsx`

**Components:**
- Large stress score display (0-10)
- Color-coded stress level
  - 😊 Green: Relaxed (0-3)
  - 😐 Yellow: Moderate (4-6)
  - 😰 Orange: High (7-8)
  - 🔥 Red: Critical (9-10)
- Stress factor breakdown:
  - Time pressure
  - Task complexity
  - Deadline overlap
- AI recommendations panel
- Quick stats cards:
  - Active tasks
  - Urgent tasks
  - Deadlines this week
- "How Do You Feel?" modal
- 7-day stress trend chart

**UI Highlights:**
- Gradient background
- Animated stress meter
- Smooth transitions
- Interactive chart

---

### 2. Focus Mode
**Route:** `/focus-mode`
**File:** `FocusModePage.jsx`

**Components:**
- Large countdown timer (MM:SS)
- Session type selector:
  - 🍅 Pomodoro (25 min)
  - 🧠 Deep Work (90 min)
  - ⚡ Short Burst (15 min)
- Optional task linking
- Real-time progress bar
- Session info:
  - Start time
  - End time
  - Interruption count
- Interruption logging buttons:
  - Notification
  - Distraction
  - Quick Break
- Completion modal:
  - Productivity rating (1-5 stars)
  - Session notes
- Statistics sidebar:
  - Total focus time
  - Total sessions
  - Completion rate
  - Sessions by type
- Focus tips panel

**UI Highlights:**
- Large, readable timer
- Circular progress indicator
- Color changes based on state
- Confetti on completion

---

### 3. Resource Library
**Route:** `/resources`
**File:** `ResourceLibraryPage.jsx`

**Components:**
- 3 creation modes:
  - 📝 Create Note (markdown editor)
  - 🔗 Save Link
  - 📁 Upload File
- Search bar (full-text search)
- Filter tabs:
  - 📁 All
  - 📝 Notes
  - 📄 Files
  - 🔗 Links
  - 💻 Code
- Resource cards:
  - Title and icon
  - AI-generated summary
  - Tags (including AI-extracted)
  - Favorite star
  - View/Hide details
  - Generate flashcards button
  - Delete button
- Expandable details:
  - AI key points
  - Flashcard count
  - Creation date
  - Link to URL

**UI Highlights:**
- Card-based layout
- Smooth expand/collapse
- Tag chips
- Icon per file type

---

## 🎓 Week 2 Teacher Pages

### 1. Grading Dashboard
**Route:** `/teacher/grading`
**File:** `GradingDashboard.jsx`

**Layout:** Two-column

**Left Column:**
- Stats cards (3):
  - Total graded
  - AI agreement rate
  - Pending submissions
- Pending submissions list OR AI analysis panel

**Right Column:**
- Grade finalization form OR Recent grades history

**AI Analysis Panel:**
- Large suggested grade (0-100)
- AI reasoning explanation
- Performance summary:
  - Time efficiency
  - On time status
  - Completion rate
  - Extensions count
- Color-coded sections:
  - 💚 Strengths (green)
  - 🟠 Weaknesses (orange)
  - 💙 Suggestions (blue)
  - 💗 Encouragement (pink)

**Grade Finalization:**
- Grade input (with AI comparison)
- Teacher feedback textarea
- Override reason (if >10 pt difference)
- Finalize button

**UI Highlights:**
- Gradient stats cards
- Smooth panel transitions
- Color-coded feedback
- Loading animations

---

### 2. Class Dashboard
**Route:** `/teacher/class`
**File:** `ClassDashboard.jsx`

**Metric Cards (4):**
1. Total Students (blue)
2. Completion Rate (green)
3. Class Average (purple)
4. At-Risk Students (red)

**View Tabs (4):**

**Overview:**
- Grade distribution chart
- Common struggle areas

**At-Risk:**
- Risk score display
- Performance metrics grid
- Risk factors list
- Color-coded by severity

**Top Performers:**
- Ranked list with #1, #2, #3
- Average grade display
- Performance stats

**All Students:**
- Sortable table
- Columns: Name, Tasks, Completion, Grade, Overdue, Status
- Color-coded values

**UI Highlights:**
- Gradient metric cards
- Interactive tabs
- Progress bars
- Status badges
- Responsive table

---

### 3. Bulk Task Creator
**Route:** `/teacher/bulk-tasks`
**File:** `BulkTaskCreator.jsx`

**Layout:** Two-column

**Left Column - Task Form:**
- Template selector dropdown
- Task details:
  - Title *
  - Description (textarea)
  - Deadline * (datetime picker)
  - Priority (select)
  - Estimated hours (number)
  - Complexity (1-10 slider)
- Dynamic subtask builder:
  - Add/remove buttons
  - Text inputs
- Save as template checkbox
  - Template name input
- Submit button (shows selected count)

**Right Column - Student Selection:**
- Select All / Clear buttons
- Student count display
- Scrollable student list:
  - Checkbox
  - Name
  - Email
  - Tasks assigned count
  - Checkmark icon when selected

**UI Highlights:**
- Sticky student panel
- Multi-select with visual feedback
- Template loading
- Success notifications
- Disabled state handling

---

## 🧩 Components

### GlassCard
**File:** `components/ui/Card/GlassCard.jsx`

```jsx
<GlassCard
  hover={true}
  animate={true}
  padding="md"
  rounded="xl"
  intensity="medium"
>
  {children}
</GlassCard>
```

**Props:**
- `hover`: Enable hover scale effect
- `animate`: Use framer-motion
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `rounded`: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
- `intensity`: 'light' | 'medium' | 'intense'

---

### TaskCard
**File:** `components/TaskCard.jsx`

**Features:**
- Priority-based colored left border
- Complexity dots (10 visual indicators)
- Expandable AI analysis section
- Subtask checkboxes with animations
- Hover glow effects
- Action buttons (Start, Complete)

---

### ThemeToggle
**File:** `components/features/ThemeToggle/ThemeToggle.jsx`

**Features:**
- Sun/Moon icon toggle
- Smooth rotation animation
- System preference detection
- Persistent storage

---

### NotificationBell
**File:** `components/NotificationBell.jsx`

**Features:**
- Unread count badge
- Dropdown panel
- Mark as read
- Real-time updates

---

## 🎭 Animations

### Entrance Animations
```jsx
// Fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Slide in
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
/>

// Staggered children
{items.map((item, i) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: i * 0.05 }}
  />
))}
```

### Hover Effects
```css
hover:scale-105 active:scale-95
hover:shadow-lg hover:shadow-glow-blue
hover:bg-opacity-90
```

### Loading States
```jsx
<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
```

---

## 🌙 Dark Mode

### Implementation
```jsx
// ThemeContext
const [theme, setTheme] = useState('light');

// Toggle
const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', newTheme);
};
```

### CSS Classes
```css
/* Light mode */
bg-white text-gray-900

/* Dark mode */
dark:bg-gray-800 dark:text-gray-100

/* Conditional */
className={`${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
```

---

## 🔧 State Management

### Zustand Stores

#### Auth Store
```javascript
const useAuthStore = create(persist((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  role: null,
  login: (userData, authToken) => {...},
  logout: () => {...}
}), { name: 'auth-storage' }));
```

#### Theme Store
```javascript
const useThemeStore = create(persist((set) => ({
  theme: 'light',
  setTheme: (newTheme) => {...},
  toggleTheme: () => {...}
}), { name: 'theme-storage' }));
```

---

## ⚙️ Setup & Configuration

### Installation
```bash
cd frontend
npm install
```

### Dependencies
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "tailwindcss": "^3.4.0",
  "zustand": "^4.5.0",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.292.0",
  "axios": "^1.6.2",
  "canvas-confetti": "^1.9.2",
  "clsx": "^2.1.0"
}
```

### Environment
```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_key
```

### Run Development Server
```bash
npm run dev
# Access at http://localhost:5173
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## 🎨 Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        student: {
          primary: '#3B82F6',
          accent: '#8B5CF6'
        },
        teacher: {
          primary: '#C89968',
          accent: '#EF4444'
        }
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        },
        '.glass-dark': {
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(10px)'
        }
      });
    }
  ]
}
```

---

## 📱 Responsive Design

### Breakpoints
```javascript
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile-First Approach
```jsx
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

---

## 🎯 Performance Optimizations

- **Code Splitting:** React.lazy for route-based splitting
- **Memoization:** React.memo for expensive components
- **Debouncing:** Search inputs
- **Pagination:** Large lists
- **Image Optimization:** Lazy loading
- **Bundle Size:** Tree shaking with Vite

---

**Total Pages:** 12 React pages, ~5,200+ lines of code

**Components:** 15+ reusable components

**Last Updated:** January 7, 2026 ✅
