import { useNavigate } from 'react-router-dom';
import { CheckSquare, Calendar, BarChart3, Users, Brain, Zap, BookOpen, GraduationCap, Award, Activity, Send, Sparkles, Link as LinkIcon, LogOut, MessageCircle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ActivityFeed from '../components/ActivityFeed';
import { useAuthStore, useAuth } from '../store/useStore';
import { authService } from '../services/auth.service';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { isTeacher, isStudent } = useAuth();

  const menuItems = [
    { title: 'My Tasks', icon: CheckSquare, path: '/tasks', color: 'bg-blue-500' },
    { title: 'Extensions', icon: Calendar, path: '/extensions', color: 'bg-purple-500' },
    { title: 'Analytics', icon: BarChart3, path: '/analytics', color: 'bg-green-500' },
    { title: 'Groups', icon: Users, path: '/groups', color: 'bg-orange-500' },
    { title: 'Chat', icon: MessageCircle, path: '/chat', color: 'bg-cyan-500' },
  ];

  const weekOneFeatures = [
    { title: 'Stress Meter', icon: Brain, path: '/stress-meter', color: 'bg-pink-500', badge: 'NEW' },
    { title: 'Focus Mode', icon: Zap, path: '/focus-mode', color: 'bg-indigo-500', badge: 'NEW' },
    { title: 'Resource Library', icon: BookOpen, path: '/resources', color: 'bg-teal-500', badge: 'NEW' },
  ];

  const weekTwoTeacherFeatures = [
    { title: 'AI Grading Assistant', icon: Award, path: '/teacher/grading', color: 'bg-gradient-to-br from-purple-500 to-blue-500', badge: 'WEEK 2', description: 'Intelligent AI-powered grading with detailed analysis' },
    { title: 'Class Dashboard', icon: Activity, path: '/teacher/class', color: 'bg-gradient-to-br from-blue-500 to-cyan-500', badge: 'WEEK 2', description: 'Track class performance and identify at-risk students' },
    { title: 'Bulk Task Creator', icon: Send, path: '/teacher/bulk-tasks', color: 'bg-gradient-to-br from-green-500 to-emerald-500', badge: 'WEEK 2', description: 'Create and assign tasks to multiple students at once' },
  ];

  const weekThreeFeatures = [
    { title: 'Smart Study Planner', icon: Sparkles, path: '/study-planner', color: 'bg-gradient-to-br from-emerald-500 to-teal-500', badge: 'WEEK 3', description: 'AI-powered daily schedule with stress-aware planning' },
  ];

  const weekFourFeatures = [
    { title: 'Calendar Sync', icon: LinkIcon, path: '/calendar-settings', color: 'bg-gradient-to-br from-blue-600 to-indigo-600', badge: 'WEEK 4', description: 'Sync tasks and study schedules with Google Calendar' },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        // Call Firebase logout
        await authService.logout();

        // Clear Zustand store
        logout();

        // Navigate to login
        navigate('/login', { replace: true });

        // Force reload to clear any cached state
        window.location.reload();
      } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if there's an error
        logout();
        localStorage.clear();
        navigate('/login', { replace: true });
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.full_name || user?.email}! 👋
            {isTeacher && <span className="text-purple-600 font-semibold ml-2">(Teacher)</span>}
            {isStudent && <span className="text-blue-600 font-semibold ml-2">(Student)</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
            title="Logout"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {/* Week 1 NEW Features Banner - Student Only */}
          {isStudent && (
            <div className="mb-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Week 1 Features - AI-Powered Student Tools!</h2>
              <p className="opacity-90">New features to help you manage stress, focus better, and organize your learning</p>
            </div>
          )}

          {/* Week 4 NEW Calendar Integration Banner */}
          <div className="mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Calendar size={32} />
              Week 4 - Google Calendar Integration!
            </h2>
            <p className="opacity-90">Bidirectional sync with Google Calendar for tasks and AI-generated study schedules</p>
          </div>

          {/* Week 4 Calendar Integration */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <LinkIcon className="text-blue-600" />
              Calendar Sync (Week 4)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {weekFourFeatures.map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`${item.color} p-6 rounded-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden`}
                >
                  <div className="absolute top-2 right-2 bg-blue-400 text-blue-900 text-xs font-bold px-2 py-1 rounded animate-pulse">
                    {item.badge}
                  </div>
                  <item.icon className="text-white mb-4" size={48} />
                  <h2 className="text-white text-xl font-bold">{item.title}</h2>
                  <p className="text-white text-sm mt-2 opacity-90">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Week 3 NEW Smart Study Planner Banner - Student Only */}
          {isStudent && (
            <>
              <div className="mb-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Sparkles size={32} />
                  Week 3 - Smart Study Planner!
                </h2>
                <p className="opacity-90">AI-powered daily scheduling with deadline-first, complexity-balanced, stress-aware planning</p>
              </div>

              {/* Week 3 Smart Study Planner */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="text-emerald-600" />
                  Smart Scheduling (Week 3)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  {weekThreeFeatures.map((item) => (
                    <div
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`${item.color} p-6 rounded-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden`}
                    >
                      <div className="absolute top-2 right-2 bg-emerald-400 text-emerald-900 text-xs font-bold px-2 py-1 rounded animate-pulse">
                        {item.badge}
                      </div>
                      <item.icon className="text-white mb-4" size={48} />
                      <h2 className="text-white text-xl font-bold">{item.title}</h2>
                      <p className="text-white text-sm mt-2 opacity-90">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Week 2 NEW Teacher Features Banner - Teacher Only */}
          {isTeacher && (
            <>
              <div className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <GraduationCap size={32} />
                  Week 2 - Teacher Efficiency Tools!
                </h2>
                <p className="opacity-90">AI-powered tools for grading, class analytics, and bulk task management</p>
              </div>

              {/* Week 2 Teacher Features Grid */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="text-purple-600" />
                  Teacher Tools (Week 2)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {weekTwoTeacherFeatures.map((item) => (
                    <div
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`${item.color} p-6 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform relative overflow-hidden`}
                    >
                      <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded animate-pulse">
                        {item.badge}
                      </div>
                      <item.icon className="text-white mb-4" size={48} />
                      <h2 className="text-white text-xl font-bold">{item.title}</h2>
                      <p className="text-white text-sm mt-2 opacity-90">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Week 1 Features Grid - Student Only */}
          {isStudent && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="text-purple-500" />
                Student AI Features (Week 1)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {weekOneFeatures.map((item) => (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`${item.color} p-6 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform relative overflow-hidden`}
                  >
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                      {item.badge}
                    </div>
                    <item.icon className="text-white mb-4" size={48} />
                    <h2 className="text-white text-xl font-bold">{item.title}</h2>
                    <p className="text-white text-sm mt-2 opacity-90">
                      {item.title === 'Stress Meter' && 'AI analyzes your workload stress in real-time'}
                      {item.title === 'Focus Mode' && 'Pomodoro timer with productivity tracking'}
                      {item.title === 'Resource Library' && 'AI-powered note organization & flashcards'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Features */}
          <div>
            <h3 className="text-xl font-bold mb-4">Core Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`${item.color} p-6 rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <item.icon className="text-white mb-4" size={48} />
                  <h2 className="text-white text-xl font-bold">{item.title}</h2>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-80 flex-shrink-0">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
