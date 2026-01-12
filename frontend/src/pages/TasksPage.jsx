import { useState, useEffect } from 'react';
import { taskService } from '../services/task.service';
import { authService } from '../services/auth.service';
import { useWebSocket } from '../hooks/useWebSocket';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/useStore';
import useTaskStore from '../store/useTaskStore';
import KanbanBoard from '../components/KanbanBoard';
import StatisticsCards from '../components/StatisticsCards';
import KanbanToolbar from '../components/KanbanToolbar';
import TaskDetailsSidebar from '../components/TaskDetailsSidebar';
import CreateTaskModal from '../components/CreateTaskModal';
import { Plus } from 'lucide-react';
import './TasksPage.css';

export default function TasksPage() {
  const [showModal, setShowModal] = useState(false);
  // ... existing state ...
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { subscribe } = useWebSocket();
  const { isTeacher } = useAuth();

  // Use Zustand task store
  const { setTasks, addTask, updateTask, deleteTask: removeTask } = useTaskStore();

  useEffect(() => {
    loadCurrentUser();
    loadTasks();

    // Subscribe to real-time task updates
    const unsubscribe = subscribe('task_update', (data) => {
      console.log('Real-time update received:', data);

      const { action, task, task_id } = data;

      if (action === 'created') {
        addTask(task);
      }

      if (action === 'updated') {
        updateTask(task_id, task);
      }

      if (action === 'deleted') {
        removeTask(task_id);
      }
    });

    return () => unsubscribe();
  }, [subscribe, addTask, updateTask, removeTask]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
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

  const handleCreate = async (formData) => {
    setLoading(true);
    setError('');
    try {
      await taskService.createTask({
        ...formData,
        assigned_to: currentUser?.id || '',
        deadline: new Date(formData.deadline).toISOString()
      });
      await loadTasks();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-title">
          <h1>{isTeacher ? 'My Admin Tasks' : 'My Tasks'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isTeacher && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              <span>Create Task</span>
            </button>
          )}
          <NotificationBell />
          <HomeButton />
        </div>
      </div>

      {/* Teacher Hint */}
      {isTeacher && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <p className="text-purple-800 dark:text-purple-300">
            <strong>Note:</strong> To assign tasks to students, use the{' '}
            <Link
              to="/teacher/bulk-tasks"
              className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
            >
              Bulk Task Creator
            </Link>
            {' '}feature.
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <StatisticsCards />

      {/* Toolbar with Search and Filters */}
      <KanbanToolbar />

      {/* Kanban Board */}
      <KanbanBoard onAddTask={() => setShowModal(true)} />

      {/* Task Details Sidebar */}
      <TaskDetailsSidebar />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError('');
        }}
        onSubmit={handleCreate}
        loading={loading}
        error={error}
      />
    </div>
  );
}
