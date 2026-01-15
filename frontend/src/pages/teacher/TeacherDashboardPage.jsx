import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckSquare, Calendar, Users, Award, Activity, Send,
  LogOut, MessageCircle, LayoutDashboard, Clock, GraduationCap,
  FileText, TrendingUp
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import ActivityFeed from '../../components/ActivityFeed';
import { useAuthStore } from '../../store/useStore';
import { authService } from '../../services/auth.service';
import { classService } from '../../services/class.service';
import '../../pages/DashboardPage.css';

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [stats, setStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    atRiskCount: 0,
    pendingGrades: 0,
    pendingExtensionRequests: 0
  });

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [analyticsResult, pendingExtensionsResult] = await Promise.allSettled([
          classService.getClassAnalytics(),
          axios.get('http://localhost:8000/api/extensions/pending', getAuthHeader())
        ]);

        const analytics =
          analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
        const pendingExtensionRequests =
          pendingExtensionsResult.status === 'fulfilled'
            ? (pendingExtensionsResult.value?.data || []).length
            : 0;

        if (analytics && analytics.class_metrics) {
          setStats({
            totalStudents: analytics.class_metrics.total_students || 0,
            completionRate: Math.round(analytics.class_metrics.class_completion_rate || 0),
            atRiskCount: analytics.class_metrics.at_risk_count || 0,
            pendingGrades: analytics.class_metrics.pending_grades || 0,
            pendingExtensionRequests
          });
        } else {
          setStats((prev) => ({ ...prev, pendingExtensionRequests }));
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await authService.logout();
        logout();
        navigate('/login', { replace: true });
        window.location.reload();
      } catch (error) {
        logout();
        navigate('/login', { replace: true });
      }
    }
  };

  // Sidebar Navigation Items for Teachers
  const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard', active: true },
    { title: 'Grading', icon: Award, path: '/teacher/grading' },
    { title: 'Bulk Tasks', icon: Send, path: '/teacher/bulk-tasks' },
    { title: 'My Tasks', icon: CheckSquare, path: '/tasks' },
    { title: 'Extensions', icon: Clock, path: '/extensions' },
    { title: 'Schedule', icon: Calendar, path: '/calendar-settings' },
    { title: 'Chat', icon: MessageCircle, path: '/chat' },
    { title: 'Group Management', icon: Users, path: '/groups' },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">

        {/* Left Sidebar Navigation */}
        <aside className="dashboard-nav">
          <div className="flex items-center gap-3 px-4 mb-8">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              <GraduationCap size={20} />
            </div>
            <span className="font-bold text-xl text-gray-800">Teacher Portal</span>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {navItems.map((item) => (
              <div
                key={item.title}
                className={`nav-item ${item.active ? 'bg-purple-50 text-purple-600' : ''}`}
                onClick={() => !item.active && navigate(item.path)}
              >
                <item.icon size={20} />
                <span>{item.title}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-gray-100">
            <button onClick={handleLogout} className="logout-btn w-full">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Header */}
          <header className="dashboard-header">
            <div className="welcome-text">
              <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.full_name?.split(' ')[0] || 'Teacher'}!</h1>
              <p>{today} • Let's empower students today.</p>
            </div>
            <div className="header-actions">
              <NotificationBell />
            </div>
          </header>

          {/* Quick Stats Row */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-blue-100 text-blue-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-green-100 text-green-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="stat-value">{stats.completionRate}%</div>
              <div className="stat-label">Class Completion</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-orange-100 text-orange-600">
                  <Activity size={20} />
                </div>
                {stats.atRiskCount > 0 && (
                  <span className="text-red-500 text-xs font-bold">Alert</span>
                )}
              </div>
              <div className="stat-value">{stats.atRiskCount}</div>
              <div className="stat-label">At-Risk Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-purple-100 text-purple-600">
                  <FileText size={20} />
                </div>
              </div>
              <div className="stat-value">{stats.pendingGrades}</div>
              <div className="stat-label">Pending Grades</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-indigo-100 text-indigo-600">
                  <Clock size={20} />
                </div>
              </div>
              <div className="stat-value">{stats.pendingExtensionRequests}</div>
              <div className="stat-label">Extension Requests</div>
            </div>
          </div>

        </main>

        {/* Right Sidebar - Activity Feed */}
        <aside className="dashboard-right-sidebar">
          <div className="activity-widget">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Recent Activity</h3>
              <div className="text-xs text-purple-600 font-medium cursor-pointer">View All</div>
            </div>
            <ActivityFeed />
          </div>
        </aside>

      </div>
    </div>
  );
}
