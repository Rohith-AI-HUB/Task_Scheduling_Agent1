import { useState, useEffect } from 'react';
import { taskService } from '../services/task.service';
import { authService } from '../services/auth.service';
import { useWebSocket } from '../hooks/useWebSocket';
import TaskCard from '../components/TaskCard';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', deadline: '', priority: 'medium', assigned_to: ''
  });
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    loadCurrentUser();
    loadTasks();

    // Subscribe to real-time task updates
    const unsubscribe = subscribe('task_update', (data) => {
      console.log('Real-time update received:', data);
      
      setTasks(prevTasks => {
        const { action, task, task_id } = data;
        
        if (action === 'created') {
          // Check if already exists to prevent duplicates
          if (prevTasks.find(t => t.id === task_id)) return prevTasks;
          return [task, ...prevTasks];
        }
        
        if (action === 'updated') {
          return prevTasks.map(t => t.id === task_id ? task : t);
        }
        
        if (action === 'deleted') {
          return prevTasks.filter(t => t.id !== task_id);
        }
        
        return prevTasks;
      });
    });

    return () => unsubscribe();
  }, [subscribe]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      setFormData(prev => ({ ...prev, assigned_to: user.id }));
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await taskService.createTask({
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      });
      await loadTasks();
      setShowForm(false);
      setFormData({
        title: '', description: '', deadline: '', priority: 'medium', assigned_to: currentUser?.id || ''
      });
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (taskId, updates) => {
    try {
      await taskService.updateTask(taskId, updates);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">My Tasks</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <HomeButton />
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} /> New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating... (AI analyzing)' : 'Create Task (AI will analyze)'}
            </button>
          </form>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No tasks yet. Create your first task to get started!</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
