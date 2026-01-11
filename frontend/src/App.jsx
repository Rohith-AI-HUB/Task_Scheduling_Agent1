import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeStores } from './store/useStore';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import UnauthorizedPage from './components/UnauthorizedPage';
import LiveNotification from './components/LiveNotification';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ExtensionsPage from './pages/ExtensionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GroupsPage from './pages/GroupsPage';

// Week 1 Feature Pages
import StressMeterPage from './pages/StressMeterPage';
import FocusModePage from './pages/FocusModePage';
import ResourceLibraryPage from './pages/ResourceLibraryPage';

// Week 2 Teacher Feature Pages
import GradingDashboard from './pages/teacher/GradingDashboard';
import ClassDashboard from './pages/teacher/ClassDashboard';
import BulkTaskCreator from './pages/teacher/BulkTaskCreator';

// Week 3 Smart Study Planner
import StudyPlannerPage from './pages/StudyPlannerPage';

// Week 4 Calendar Integration
import CalendarSettingsPage from './pages/CalendarSettingsPage';

// Chat & Messaging
import ChatPage from './pages/ChatPage';

function AppContent() {
  // Initialize stores on app mount
  useEffect(() => {
    initializeStores();
  }, []);

  return (
    <>
      <LiveNotification />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes - Require Authentication */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/extensions" element={<ProtectedRoute><ExtensionsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />

        {/* Week 1 Feature Routes - Student Only */}
        <Route path="/stress-meter" element={<RoleProtectedRoute allowedRoles={['student']}><StressMeterPage /></RoleProtectedRoute>} />
        <Route path="/focus-mode" element={<RoleProtectedRoute allowedRoles={['student']}><FocusModePage /></RoleProtectedRoute>} />
        <Route path="/resources" element={<RoleProtectedRoute allowedRoles={['student']}><ResourceLibraryPage /></RoleProtectedRoute>} />

        {/* Week 2 Teacher Feature Routes - Teacher Only */}
        <Route path="/teacher/grading" element={<RoleProtectedRoute allowedRoles={['teacher']}><GradingDashboard /></RoleProtectedRoute>} />
        <Route path="/teacher/class" element={<RoleProtectedRoute allowedRoles={['teacher']}><ClassDashboard /></RoleProtectedRoute>} />
        <Route path="/teacher/bulk-tasks" element={<RoleProtectedRoute allowedRoles={['teacher']}><BulkTaskCreator /></RoleProtectedRoute>} />

        {/* Week 3 Smart Study Planner - Student Only */}
        <Route path="/study-planner" element={<RoleProtectedRoute allowedRoles={['student']}><StudyPlannerPage /></RoleProtectedRoute>} />

        {/* Week 4 Calendar Integration - Protected */}
        <Route path="/calendar-settings" element={<ProtectedRoute><CalendarSettingsPage /></ProtectedRoute>} />

        {/* Chat & Messaging - Protected */}
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

        {/* Unauthorized Page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}
