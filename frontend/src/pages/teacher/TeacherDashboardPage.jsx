import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Calendar, BarChart3, Users, Brain, Award, Activity, Send,
  LogOut, MessageCircle, LayoutDashboard, Clock, Settings, GraduationCap,
  BookOpen, FileText, TrendingUp
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
    pendingGrades: 0
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const analytics = await classService.getClassAnalytics();
        if (analytics && analytics.class_metrics) {
          setStats({
            totalStudents: analytics.class_metrics.total_students || 0,
            completionRate: Math.round(analytics.class_metrics.class_completion_rate || 0),
            atRiskCount: analytics.class_metrics.at_risk_count || 0,
            pendingGrades: analytics.class_metrics.pending_grades || 0
          });
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
    { title: 'Schedule', icon: Calendar, path: '/calendar-settings' },
    { title: 'Chat', icon: MessageCircle, path: '/chat' },
    { title: 'Group Management', icon: Users, path: '/groups' },
  ];

  // Teacher Feature Cards
  const classroomTools = [
    {
      title: 'Grading Assistant',
      icon: Award,
      path: '/teacher/grading',
      color: 'bg-indigo-100 text-indigo-600',
      desc: 'AI-powered grading analysis and feedback'
    },
    {
      title: 'Bulk Assignment',
      icon: Send,
      path: '/teacher/bulk-tasks',
      color: 'bg-blue-100 text-blue-600',
      desc: 'Assign tasks to multiple students at once'
    }
  ];

  const collaborationTools = [
    {
      title: 'Team Chat',
      icon: MessageCircle,
      path: '/chat',
      color: 'bg-pink-100 text-pink-600',
      desc: 'Connect with students and colleagues'
    },
    {
      title: 'Group Management',
      icon: Users,
      path: '/groups',
      color: 'bg-amber-100 text-amber-600',
      desc: 'Create and manage student project teams'
    },
    {
      title: 'Extensions',
      icon: Clock,
      path: '/extensions',
      color: 'bg-orange-100 text-orange-600',
      desc: 'Review deadline extension requests'
    }
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
          </div>

          {/* Classroom Management Section */}
          <div className="feature-section">
            <div className="section-header">
              <GraduationCap className="text-purple-600" size={20} />
              <h2>Classroom Management</h2>
            </div>
            <div className="feature-cards-grid">
              {classroomTools.map((tool) => (
                <div key={tool.title} className="premium-card" onClick={() => navigate(tool.path)}>
                  <div className={`card-icon-wrapper ${tool.color}`}>
                    <tool.icon size={24} />
                  </div>
                  <h3>{tool.title}</h3>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Collaboration & Communication Section */}
          <div className="feature-section">
            <div className="section-header">
              <MessageCircle className="text-pink-600" size={20} />
              <h2>Collaboration & Communication</h2>
            </div>
            <div className="feature-cards-grid">
              {collaborationTools.map((tool) => (
                <div key={tool.title} className="premium-card" onClick={() => navigate(tool.path)}>
                  <div className={`card-icon-wrapper ${tool.color}`}>
                    <tool.icon size={24} />
                  </div>
                  <h3>{tool.title}</h3>
                  <p>{tool.desc}</p>
                </div>
              ))}
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
