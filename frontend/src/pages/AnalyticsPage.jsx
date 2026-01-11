import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { useAuth } from '../store/useStore';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, workloadRes] = await Promise.all([
        axios.get('http://localhost:8000/analytics/dashboard', { headers }),
        axios.get('http://localhost:8000/analytics/workload', { headers })
      ]);

      setStats(statsRes.data);
      setWorkload(workloadRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load analytics: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const statusData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.in_progress, color: '#3b82f6' },
    { name: 'Todo', value: stats.todo, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const priorityData = Object.entries(stats.priority_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const PRIORITY_COLORS = {
    'Low': '#10b981',
    'Medium': '#f59e0b',
    'High': '#f97316',
    'Urgent': '#ef4444'
  };

  const workloadData = workload?.workload_by_day.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    hours: day.total_hours,
    tasks: day.task_count
  })) || [];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">
            {isTeacher ? 'My Analytics & Class Overview' : 'My Analytics Dashboard'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <HomeButton />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-800">{stats.total_tasks}</p>
            </div>
            <TrendingUp size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.in_progress}</p>
            </div>
            <AlertCircle size={32} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Todo</p>
              <p className="text-3xl font-bold text-orange-600">{stats.todo}</p>
            </div>
            <Clock size={32} className="text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Hours Left</p>
              <p className="text-3xl font-bold text-red-600">{stats.total_hours_remaining.toFixed(1)}</p>
            </div>
            <Clock size={32} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Completion Rate</h2>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-green-600">{stats.completion_rate}%</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.completion_rate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Average Complexity</h2>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-blue-600">{stats.average_complexity}/10</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.average_complexity * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Task Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-bold text-xl mb-4">Task Status Distribution</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No tasks available</p>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-bold text-xl mb-4">Priority Distribution</h2>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No priority data available</p>
          )}
        </div>
      </div>

      {/* Workload Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="font-bold text-xl mb-4">7-Day Workload Forecast</h2>
        {workloadData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Tasks', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="hours" fill="#3b82f6" name="Total Hours" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="tasks" fill="#10b981" name="Task Count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No workload data available</p>
        )}
        {workload?.peak_day && (
          <p className="text-sm text-gray-600 mt-4">
            Peak workload day: <strong>{new Date(workload.peak_day).toLocaleDateString()}</strong>
          </p>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="font-bold text-xl mb-4">Upcoming Deadlines</h2>
        {stats.upcoming_deadlines.length > 0 ? (
          <div className="space-y-3">
            {stats.upcoming_deadlines.map(task => {
              const priorityColors = {
                low: 'bg-green-100 text-green-800',
                medium: 'bg-yellow-100 text-yellow-800',
                high: 'bg-orange-100 text-orange-800',
                urgent: 'bg-red-100 text-red-800'
              };

              return (
                <div key={task.id} className="flex justify-between items-center border-b pb-3 hover:bg-gray-50 px-2 rounded transition">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(task.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
        )}
      </div>

      {/* Teacher-Specific Section */}
      {isTeacher && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-700">Class Overview</h2>
          <p className="text-gray-600">
            For detailed class performance analytics, student progress tracking, and at-risk student identification,
            visit the{' '}
            <Link to="/teacher/class" className="text-purple-600 hover:underline font-semibold">
              Class Dashboard
            </Link>.
          </p>
        </div>
      )}
    </div>
  );
}
