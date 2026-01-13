import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Calendar, BarChart3, Users, Brain, Zap, BookOpen,
  GraduationCap, Award, Activity, Send, Sparkles, Link as LinkIcon,
  LogOut, MessageCircle, LayoutDashboard, Clock, Settings, Search
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ActivityFeed from '../components/ActivityFeed';
import { useAuthStore, useAuth } from '../store/useStore';
import { authService } from '../services/auth.service';
import { analyticsService } from '../services/analytics.service';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { isTeacher, isStudent } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    focusScore: 0,
    dueToday: 0
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardData, workloadData, productivityData] = await Promise.all([
          analyticsService.getDashboardStats(),
          analyticsService.getWorkload(),
          analyticsService.getProductivityMetrics()
        ]);

        // Calculate Due Today
        // Workload returns array of 7 days starting from today
        const todayWorkload = workloadData.workload_by_day[0] || { task_count: 0 };

        setStats({
          pending: dashboardData.todo,
          focusScore: Math.round(productivityData.productivity_score),
          dueToday: todayWorkload.task_count
        });
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

  // Sidebar Navigation Items
  const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', active: true },
    { title: 'My Tasks', icon: CheckSquare, path: '/tasks' },
    { title: 'Schedule', icon: Calendar, path: '/calendar-settings' },
    { title: 'Study Plan', icon: Sparkles, path: '/study-planner', studentOnly: true },
    { title: 'Resources', icon: BookOpen, path: '/resources', studentOnly: true },
    { title: 'Analytics', icon: BarChart3, path: '/analytics' },
    { title: 'Chat', icon: MessageCircle, path: '/chat' },
    { title: 'Communities', icon: Users, path: '/groups' },
  ];

  // Feature Cards Organized by Category
  const productivityTools = [
    {
      title: 'Focus Mode',
      icon: Zap,
      path: '/focus-mode',
      color: 'bg-indigo-100 text-indigo-600',
      desc: 'Pomodoro timer & focus tracking'
    },
    {
      title: 'Stress Meter',
      icon: Brain,
      path: '/stress-meter',
      color: 'bg-pink-100 text-pink-600',
      desc: 'Monitor and manage workload stress'
    },
    {
      title: 'Extensions',
      icon: Clock,
      path: '/extensions',
      color: 'bg-orange-100 text-orange-600',
      desc: 'Manage deadline extension requests'
    }
  ];

  const teacherTools = [
    {
      title: 'Grading Assistant',
      icon: Award,
      path: '/teacher/grading',
      color: 'bg-indigo-50 text-indigo-600',
      desc: 'AI-powered grading analysis and feedback'
    },
    {
      title: 'Class Analytics',
      icon: Activity,
      path: '/teacher/class',
      color: 'bg-purple-50 text-purple-600',
      desc: 'Student performance tracking'
    },
    {
      title: 'Bulk Assignment',
      icon: Send,
      path: '/teacher/bulk-tasks',
      color: 'bg-blue-50 text-blue-600',
      desc: 'Assign tasks to multiple students'
    },
    {
      title: 'Team Collaboration',
      icon: MessageCircle,
      path: '/chat',
      color: 'bg-pink-50 text-pink-600',
      desc: 'Connect with students and staff'
    },
    {
      title: 'Group Management',
      icon: Users,
      path: '/groups',
      color: 'bg-amber-50 text-amber-600',
      desc: 'Manage student project teams'
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">

        {/* Left Sidebar Navigation */}
        <aside className="dashboard-nav">
          <div className="flex items-center gap-3 px-4 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              TS
            </div>
            <span className="font-bold text-xl text-gray-800">TaskFlow</span>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {navItems.map((item) => (
              (!item.studentOnly || isStudent) && (
                <div
                  key={item.title}
                  className={`nav-item ${item.active ? 'bg-indigo-50 text-indigo-600' : ''}`}
                  onClick={() => !item.active && navigate(item.path)}
                >
                  <item.icon size={20} />
                  <span>{item.title}</span>
                </div>
              )
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
              <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.full_name?.split(' ')[0] || 'Student'}!</h1>
              <p>{today} • Let's make today productive.</p>
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
                  <CheckSquare size={20} />
                </div>
                {/* <span className="text-green-500 text-xs font-bold">+12%</span> */}
              </div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Tasks Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-purple-100 text-purple-600">
                  <Activity size={20} />
                </div>
                <span className="text-gray-400 text-xs">This Week</span>
              </div>
              <div className="stat-value">{stats.focusScore}%</div>
              <div className="stat-label">Focus Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-orange-100 text-orange-600">
                  <Clock size={20} />
                </div>
                <span className="text-red-500 text-xs font-bold">Urgent</span>
              </div>
              <div className="stat-value">{stats.dueToday}</div>
              <div className="stat-label">Due Today</div>
            </div>
          </div>

          {/* Productivity Tools Section */}
          <div className="feature-section">
            <div className="section-header">
              <Zap className="text-indigo-600" size={20} />
              <h2>Productivity & Wellness</h2>
            </div>
            <div className="feature-cards-grid">
              {productivityTools.map((tool) => (
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

          {/* Teacher Tools Section (Conditionally Rendered) */}
          {isTeacher && (
            <div className="feature-section">
              <div className="section-header">
                <GraduationCap className="text-emerald-600" size={20} />
                <h2>Classroom Management</h2>
              </div>
              <div className="feature-cards-grid">
                {teacherTools.map((tool) => (
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
          )}

        </main>

        {/* Right Sidebar - Activity Feed */}
        <aside className="dashboard-right-sidebar">
          <div className="activity-widget">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Recent Activity</h3>
              <div className="text-xs text-indigo-600 font-medium cursor-pointer">View All</div>
            </div>
            <ActivityFeed />
          </div>
        </aside>

      </div>
    </div>
  );
}
