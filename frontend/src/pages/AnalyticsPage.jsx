import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Clock, CheckCircle, AlertCircle,
  BarChart3, PieChart as PieIcon, Activity,
  Zap, Brain, Calendar, ChevronRight, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { useAuth } from '../store/useStore';
import MetricCard from '../components/ui/MetricCard';
import { analyticsService } from '../services/analytics.service';
import './AnalyticsPage.css';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isTeacher } = useAuth();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [statsData, workloadData] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getWorkload()
      ]);

      setStats(statsData);
      setWorkload(workloadData);
      setError('');
    } catch (err) {
      setError('Failed to load analytics: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4 inline-block"
          >
            <Zap className="w-12 h-12 text-indigo-500" />
          </motion.div>
          <p className="text-gray-500 font-bold animate-pulse">Processing your big data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="bg-rose-100/80 backdrop-blur-md border border-rose-200 text-rose-700 p-6 rounded-2xl shadow-xl max-w-2xl mx-auto flex items-center gap-4">
          <AlertCircle size={32} />
          <div>
            <h3 className="font-bold text-lg">Analysis Interrupted</h3>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const statusData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.in_progress, color: '#8b5cf6' },
    { name: 'Todo', value: stats.todo, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  const priorityData = Object.entries(stats.priority_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const PRIORITY_COLORS = {
    'Low': '#10b981',
    'Medium': '#8b5cf6',
    'High': '#f97316',
    'Urgent': '#ef4444'
  };

  const workloadData = workload?.workload_by_day.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: day.total_hours,
    tasks: day.task_count
  })) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="analytics-container">
      <motion.div
        className="max-w-7xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <div className="analytics-header">
          <div className="analytics-title">
            <h1 className="flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              {isTeacher ? 'Class Intelligence' : 'Personal Analytics'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">
              Unlocking productivity insights with AI-driven analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <HomeButton />
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="summary-grid">
          <MetricCard
            icon={Activity}
            label="Volume"
            value={stats.total_tasks}
            gradient="purple-blue"
          />
          <MetricCard
            icon={CheckCircle}
            label="Finished"
            value={stats.completed}
            gradient="green"
          />
          <MetricCard
            icon={TrendingUp}
            label="In Flow"
            value={stats.in_progress}
            gradient="purple-indigo"
          />
          <MetricCard
            icon={Clock}
            label="Backlog"
            value={stats.todo}
            gradient="blue"
          />
          <MetricCard
            icon={Zap}
            label="Hrs Reamining"
            value={stats.total_hours_remaining.toFixed(1)}
            gradient="orange"
          />
        </div>

        {/* Highlight Metrics */}
        <div className="performance-grid">
          <motion.div variants={cardVariants} className="analytics-glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="analytics-card-title">
                <div className="p-2 bg-green-100 dark:bg-green-950/30 rounded-lg">
                  <Award className="text-green-600" size={20} />
                </div>
                Execution Velocity
              </h2>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Efficiency</span>
            </div>
            <div className="performance-value text-green-600">{stats.completion_rate}%</div>
            <div className="progress-bar-bg">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completion_rate}%` }}
                transition={{ duration: 1, ease: "circOut" }}
                className="progress-bar-fill bg-gradient-to-r from-green-400 to-emerald-500"
              />
            </div>
            <p className="mt-4 text-sm text-gray-500 font-medium italic">
              {stats.completion_rate > 80 ? "Outstanding performance this week!" : "Push a bit more to hit your targets."}
            </p>
          </motion.div>

          <motion.div variants={cardVariants} className="analytics-glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="analytics-card-title">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/30 rounded-lg">
                  <Brain className="text-indigo-600" size={20} />
                </div>
                Cognitive Load
              </h2>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Complexity</span>
            </div>
            <div className="performance-value text-indigo-600">{stats.average_complexity}/10</div>
            <div className="progress-bar-bg">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.average_complexity * 10}%` }}
                transition={{ duration: 1, ease: "circOut" }}
                className="progress-bar-fill bg-gradient-to-r from-indigo-400 to-purple-600"
              />
            </div>
            <p className="mt-4 text-sm text-gray-500 font-medium italic">
              Average task weight across your current workload.
            </p>
          </motion.div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div variants={cardVariants} className="analytics-glass-card p-8">
            <h3 className="analytics-card-title mb-8">
              <PieIcon className="text-purple-500" size={20} />
              Status Breakdown
            </h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 italic">No task data to visualize</div>
            )}
          </motion.div>

          <motion.div variants={cardVariants} className="analytics-glass-card p-8">
            <h3 className="analytics-card-title mb-8">
              <BarChart3 className="text-blue-500" size={20} />
              Priority Spectrum
            </h3>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 italic">No priority data available</div>
            )}
          </motion.div>
        </div>

        {/* Workload Forecast */}
        <motion.div variants={cardVariants} className="analytics-glass-card p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="analytics-card-title">
              <Activity className="text-indigo-500" size={20} />
              Energy & Workload Forecast
            </h3>
            {workload?.peak_day && (
              <div className="px-3 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-lg border border-rose-100 dark:border-rose-900/50 uppercase tracking-widest">
                Critical Peak: {new Date(workload.peak_day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>

          <div className="h-[300px] w-full">
            {workloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workloadData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#8b5cf6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                    name="Estimated Hours"
                  />
                  <Area
                    type="monotone"
                    dataKey="tasks"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorTasks)"
                    name="Task Count"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">Predictive data is still being processed...</div>
            )}
          </div>
        </motion.div>

        {/* Deadlines Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <motion.div variants={cardVariants} className="lg:col-span-2 analytics-glass-card p-8">
            <h3 className="analytics-card-title mb-6">
              <Calendar className="text-rose-500" size={20} />
              Upcoming Critical Deadlines
            </h3>
            <div className="space-y-3">
              {stats.upcoming_deadlines.length > 0 ? (
                stats.upcoming_deadlines.map(task => (
                  <div key={task.id} className="deadline-item group">
                    <div className="flex items-center gap-4">
                      <span className={`priority-tag ${task.priority === 'urgent' ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                        {task.priority}
                      </span>
                      <span className="font-bold text-gray-700 dark:text-gray-200 leading-tight truncate max-w-[200px] md:max-w-md">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                      <ChevronRight size={16} className="text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 italic">Your schedule is currently clear of urgent deadlines.</div>
              )}
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="analytics-glass-card p-8 bg-gradient-to-br from-indigo-600/5 to-purple-600/5">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-4">Strategic Insights</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Zap size={20} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-1">Peak Productivity</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">Your most effective hours are consistently observed between 9 AM and 11 AM.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Brain size={20} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-1">Complexity Alert</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">High complexity tasks are taking 15% longer than average. Consider breaking them down.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Teacher Overview Link */}
        {isTeacher && (
          <motion.div variants={cardVariants} className="analytics-glass-card p-8 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border-indigo-200 dark:border-indigo-900">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-100 mb-2">Advanced Class Insights Available</h2>
                <p className="text-indigo-700/70 dark:text-indigo-300/60 font-medium">Identify at-risk students and track group performance in real-time.</p>
              </div>
              <Link
                to="/teacher/class"
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
              >
                Access Teacher Portal
                <ChevronRight size={20} />
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
