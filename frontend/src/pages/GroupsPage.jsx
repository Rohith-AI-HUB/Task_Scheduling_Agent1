import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Trash2, Send, Info, AlertCircle, CheckCircle,
  LogOut, MessageCircle, LayoutDashboard, Calendar, CheckSquare, BookOpen,
  Sparkles, BarChart3, Clock, GraduationCap, Activity
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ActivityFeed from '../components/ActivityFeed';
import { useAuth, useAuthStore } from '../store/useStore';
import { groupService } from '../services/group.service';
import { taskService } from '../services/task.service';
import { authService } from '../services/auth.service';
import './DashboardPage.css';

export default function GroupsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { isTeacher, isStudent } = useAuth();

  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [subject, setSubject] = useState('');
  const [teacherUsn, setTeacherUsn] = useState('');
  const [selectedGroupForTask, setSelectedGroupForTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coordinatorGroups, memberGroups, tasksData] = await Promise.all([
        groupService.getGroups(),
        groupService.getMyGroups(),
        isTeacher ? taskService.getTasks() : Promise.resolve([])
      ]);

      // Combine groups (coordinator and member)
      const allGroups = [...coordinatorGroups];
      memberGroups.forEach(mg => {
        if (!allGroups.find(ag => ag.id === mg.id)) {
          allGroups.push(mg);
        }
      });

      setGroups(allGroups);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load groups. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || !memberIds.trim() || !subject.trim() || !teacherUsn.trim()) {
      setError('Please fill in all fields');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const ids = memberIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      await groupService.createGroup({
        name: groupName.trim(),
        member_ids: ids,
        subject: subject.trim(),
        teacher_usn: teacherUsn.trim()
      });

      setSuccess('Group created successfully!');
      setShowCreateForm(false);
      setGroupName('');
      setMemberIds('');
      setSubject('');
      setTeacherUsn('');
      await loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.response?.data?.detail || 'Failed to create group. Check member IDs.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await groupService.deleteGroup(groupId);
      setSuccess('Group deleted successfully!');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAssignTask = async (groupId) => {
    if (!selectedTaskId) {
      setError('Please select a task');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await groupService.assignTask(groupId, selectedTaskId);
      setSuccess('Task assigned to all group members!');
      setSelectedGroupForTask(null);
      setSelectedTaskId('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning task:', err);
      setError('Failed to assign task to group.');
      setTimeout(() => setError(''), 3000);
    }
  };

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

  // Navigation items based on role
  const getNavItems = () => {
    if (isTeacher) {
      return [
        { title: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard' },
        { title: 'Grading', icon: CheckCircle, path: '/teacher/grading' },
        { title: 'Bulk Tasks', icon: Send, path: '/teacher/bulk-tasks' },
        { title: 'My Tasks', icon: CheckSquare, path: '/tasks' },
        { title: 'Schedule', icon: Calendar, path: '/calendar-settings' },
        { title: 'Chat', icon: MessageCircle, path: '/chat' },
        { title: 'Group Management', icon: Users, path: '/groups', active: true },
      ];
    } else {
      return [
        { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { title: 'My Tasks', icon: CheckSquare, path: '/tasks' },
        { title: 'Schedule', icon: Calendar, path: '/calendar-settings' },
        { title: 'Study Plan', icon: Sparkles, path: '/study-planner' },
        { title: 'Resources', icon: BookOpen, path: '/resources' },
        { title: 'Analytics', icon: BarChart3, path: '/analytics' },
        { title: 'Chat', icon: MessageCircle, path: '/chat' },
        { title: 'Communities', icon: Users, path: '/groups', active: true },
      ];
    }
  };

  const navItems = getNavItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">

        {/* Left Sidebar Navigation */}
        <aside className="dashboard-nav">
          <div className="flex items-center gap-3 px-4 mb-8">
            <div className={`w-8 h-8 ${isTeacher ? 'bg-purple-600' : 'bg-indigo-600'} rounded-lg flex items-center justify-center text-white font-bold`}>
              {isTeacher ? <GraduationCap size={20} /> : 'TS'}
            </div>
            <span className="font-bold text-xl text-gray-800">
              {isTeacher ? 'Teacher Portal' : 'TaskFlow'}
            </span>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {navItems.map((item) => (
              <div
                key={item.title}
                className={`nav-item ${item.active ? (isTeacher ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600') : ''}`}
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
              <h1>
                {isTeacher ? 'Group Management' : 'My Communities'}
              </h1>
              <p>{today} • Manage and collaborate with teams</p>
            </div>
            <div className="header-actions">
              <NotificationBell />
            </div>
          </header>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Create Group Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Create New Group
            </button>

            {/* Create Group Form */}
            {showCreateForm && (
              <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border border-purple-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Create Group</h3>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., Senior Project Team"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Data Structures, Machine Learning"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teacher USN
                    </label>
                    <input
                      type="text"
                      value={teacherUsn}
                      onChange={(e) => setTeacherUsn(e.target.value)}
                      placeholder="e.g., T001, TEACH001"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Member USNs (comma-separated)
                    </label>
                    <textarea
                      value={memberIds}
                      onChange={(e) => setMemberIds(e.target.value)}
                      placeholder="e.g., 1MS22SCS001, 1MS22SCS002, 1MS22SCS003"
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter USNs separated by commas
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Create Group
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setGroupName('');
                        setMemberIds('');
                        setSubject('');
                        setTeacherUsn('');
                      }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Groups List */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isTeacher ? 'All Groups' : 'My Groups'} ({groups.length})
            </h2>

            {groups.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
                <Users className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No groups yet</h3>
                <p className="text-gray-600">Create your first group to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all"
                  >
                    {/* Group Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(group.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {isTeacher && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    {/* Members */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-600 mb-3">
                        Members ({group.member_details?.length || 0})
                      </p>
                      <div className="space-y-2">
                        {group.member_details?.slice(0, 3).map((member, idx) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg"
                          >
                            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center font-bold text-purple-700">
                              {member.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {member.full_name}
                              </p>
                              {member.usn && (
                                <p className="text-xs text-gray-500">{member.usn}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {group.member_details?.length > 3 && (
                          <p className="text-xs text-gray-500 text-center py-1">
                            +{group.member_details.length - 3} more members
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Task Assignment (Teacher Only) */}
                    {isTeacher && (
                      <div className="pt-4 border-t border-gray-200">
                        {selectedGroupForTask === group.id ? (
                          <div className="space-y-3">
                            <select
                              value={selectedTaskId}
                              onChange={(e) => setSelectedTaskId(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                              <option value="">Select a task...</option>
                              {tasks.map(task => (
                                <option key={task.id} value={task.id}>
                                  {task.title}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAssignTask(group.id)}
                                disabled={!selectedTaskId}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                              >
                                Assign Task
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedGroupForTask(null);
                                  setSelectedTaskId('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedGroupForTask(group.id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                          >
                            <Send size={18} />
                            Assign Task to Group
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box for Teachers */}
          {isTeacher && (
            <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Info size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Teacher Guide</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Create groups and add students using their USNs</li>
                    <li>• Assign tasks to entire groups at once</li>
                    <li>• All group members receive notifications automatically</li>
                    <li>• Monitor group progress in Class Analytics</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
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
