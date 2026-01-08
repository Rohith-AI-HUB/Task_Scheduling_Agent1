import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Users, Plus, Trash2, Send } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    member_ids: []
  });
  const [assignData, setAssignData] = useState({
    task_id: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
    loadTasks();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/groups/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load groups: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/tasks/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/groups/', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Group created successfully!');
      setShowCreateForm(false);
      setFormData({ name: '', member_ids: [] });
      loadGroups();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create group: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Group deleted successfully!');
      loadGroups();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete group: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAssignTask = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:8000/groups/${groupId}/assign-task`,
        assignData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess(res.data.message);
      setShowAssignForm(null);
      setAssignData({ task_id: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to assign task: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleMemberIdChange = (e) => {
    const value = e.target.value;
    const ids = value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    setFormData({ ...formData, member_ids: ids });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading groups...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition"
          >
            <Home size={20} />
            Home
          </button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={32} />
            Group Coordinator
          </h1>
        </div>
        <NotificationBell />
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create Group Button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="mb-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 transition"
      >
        <Plus size={20} />
        {showCreateForm ? 'Cancel' : 'Create New Group'}
      </button>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Group</h2>
          <form onSubmit={handleCreateGroup}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Project Team Alpha"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Member IDs (comma-separated)
              </label>
              <input
                type="text"
                onChange={handleMemberIdChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter MongoDB ObjectIds of users separated by commas
              </p>
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
            >
              Create Group
            </button>
          </form>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No groups created yet. Create your first group!</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="text-red-500 hover:text-red-700 transition"
                  title="Delete Group"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Members */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Members ({group.member_details?.length || 0})</h4>
                {group.member_details && group.member_details.length > 0 ? (
                  <div className="space-y-2">
                    {group.member_details.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.full_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No member details available</p>
                )}
              </div>

              {/* Assign Task Button */}
              <button
                onClick={() => setShowAssignForm(showAssignForm === group.id ? null : group.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <Send size={16} />
                {showAssignForm === group.id ? 'Cancel' : 'Assign Task to Group'}
              </button>

              {/* Assign Task Form */}
              {showAssignForm === group.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <h4 className="font-semibold mb-2">Select Task to Assign</h4>
                  <select
                    value={assignData.task_id}
                    onChange={(e) => setAssignData({ task_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Task --</option>
                    {tasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({task.priority})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignTask(group.id)}
                    disabled={!assignData.task_id}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    Assign Task
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">How to use Groups:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Create groups to organize team members</li>
          <li>Assign tasks to entire groups at once</li>
          <li>All group members will receive the task and a notification</li>
          <li>Get user IDs from the Users section or MongoDB</li>
        </ul>
      </div>
    </div>
  );
}
