import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { useAuth } from '../store/useStore';
import MetricCard from '../components/ui/MetricCard';
import GlassCard from '../components/ui/GlassCard';

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-purple-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const statusData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.in_progress, color: '#7C3AED' },
    { name: 'Todo', value: stats.todo, color: '#3B82F6' }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
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
        <MetricCard
          icon={TrendingUp}
          label="Total Tasks"
          value={stats.total_tasks}
          gradient="purple-blue"
        />
        <MetricCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          gradient="green"
        />
        <MetricCard
          icon={AlertCircle}
          label="In Progress"
          value={stats.in_progress}
          gradient="purple-indigo"
        />
        <MetricCard
          icon={Clock}
          label="Todo"
          value={stats.todo}
          gradient="blue"
        />
        <MetricCard
          icon={Clock}
          label="Hours Left"
          value={stats.total_hours_remaining.toFixed(1)}
          gradient="orange"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <GlassCard borderColor="purple" className="p-6">
          <h2 className="text-xl font-bold mb-2 text-purple-600">Completion Rate</h2>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-green-600">{stats.completion_rate}%</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.completion_rate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard borderColor="blue" className="p-6">
          <h2 className="text-xl font-bold mb-2 text-blue-600">Average Complexity</h2>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-purple-600">{stats.average_complexity}/10</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${stats.average_complexity * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Task Status Distribution */}
        <GlassCard borderColor="purple" className="p-6">
          <h2 className="font-bold text-xl mb-4 text-purple-600">Task Status Distribution</h2>
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
        </GlassCard>

        {/* Priority Distribution */}
        <GlassCard borderColor="blue" className="p-6">
          <h2 className="font-bold text-xl mb-4 text-blue-600">Priority Distribution</h2>
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
        </GlassCard>
      </div>

      {/* Workload Analysis */}
      <GlassCard borderColor="purple" className="p-6 mb-6">
        <h2 className="font-bold text-xl mb-4 text-purple-600">7-Day Workload Forecast</h2>
        {workloadData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Tasks', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="hours" fill="#7C3AED" name="Total Hours" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="tasks" fill="#3B82F6" name="Task Count" radius={[8, 8, 0, 0]} />
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
      </GlassCard>

      {/* Upcoming Deadlines */}
      <GlassCard borderColor="purple" className="p-6">
        <h2 className="font-bold text-xl mb-4 text-purple-600">Upcoming Deadlines</h2>
        {stats.upcoming_deadlines.length > 0 ? (
          <div className="space-y-3">
            {stats.upcoming_deadlines.map(task => {
              const priorityColors = {
                low: 'bg-green-100 text-green-800',
                medium: 'bg-purple-100 text-purple-800',
                high: 'bg-blue-100 text-blue-800',
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
      </GlassCard>

      {/* Teacher-Specific Section */}
      {isTeacher && (
        <GlassCard borderColor="purple" className="mt-6 p-6">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Class Overview</h2>
          <p className="text-gray-600">
            For detailed class performance analytics, student progress tracking, and at-risk student identification,
            visit the{' '}
            <Link to="/teacher/class" className="text-purple-600 hover:underline font-semibold">
              Class Dashboard
            </Link>.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
