import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Brain, Zap, Settings, ChevronLeft, ChevronRight,
  RefreshCw, Play, Check, X, AlertTriangle, Coffee, Target,
  TrendingUp, Sparkles, Sun, Moon, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studyPlannerService } from '../services/studyPlanner.service';
import { stressService } from '../services/stress.service';
import { taskService } from '../services/task.service';
import HomeButton from '../components/HomeButton';
import GradientButton from '../components/ui/GradientButton';
import NotificationBell from '../components/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import './StudyPlannerPage.css';

function StudyPlannerPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [stressLevel, setStressLevel] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [tasks, setTasks] = useState([]);

  // Preferences form state
  const [prefsForm, setPrefsForm] = useState({
    study_hours: { start: '09:00', end: '21:00' },
    preferred_session_length: 25,
    break_duration_short: 5,
    break_duration_long: 15,
    max_daily_study_hours: 8,
    preferred_complexity_pattern: 'alternating',
    stress_sensitivity: 'medium'
  });

  const dateStr = currentDate.toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, [dateStr]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSchedule(),
        fetchPreferences(),
        fetchStressLevel(),
        fetchStats(),
        fetchTasks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchSchedule = async () => {
    try {
      const response = await studyPlannerService.getSchedule(dateStr);
      setSchedule(response.schedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedule(null);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await studyPlannerService.getPreferences();
      setPreferences(response.preferences);
      setPrefsForm(response.preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchStressLevel = async () => {
    try {
      const data = await stressService.getCurrentStress();
      setStressLevel(data);
    } catch (error) {
      console.error('Error fetching stress:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await studyPlannerService.getStats(7);
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await taskService.getTasks();
      setTasks(response.tasks?.filter(t => t.status !== 'completed') || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const generateSchedule = async (regenerate = false) => {
    setGenerating(true);
    try {
      const response = await studyPlannerService.generateSchedule(dateStr, regenerate);
      setSchedule(response.schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
    setGenerating(false);
  };

  const completeBlock = async (blockId) => {
    try {
      await studyPlannerService.completeBlock(dateStr, blockId);
      fetchSchedule();
      fetchStats();
    } catch (error) {
      console.error('Error completing block:', error);
    }
  };

  const removeBlock = async (blockId) => {
    if (!confirm('Remove this study block?')) return;
    try {
      await studyPlannerService.removeBlock(dateStr, blockId);
      fetchSchedule();
    } catch (error) {
      console.error('Error removing block:', error);
    }
  };

  const startFocusSession = (block) => {
    navigate('/focus-mode', {
      state: {
        preselectedTask: block.task_id,
        sessionType: block.session_type,
        duration: block.duration_minutes
      }
    });
  };

  const savePreferences = async () => {
    try {
      await studyPlannerService.updatePreferences(prefsForm);
      setPreferences(prefsForm);
      setShowPreferencesModal(false);
      if (schedule) {
        generateSchedule(true);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = dateStr === new Date().toISOString().split('T')[0];

  const getUrgencyColor = (urgency) => {
    const colors = {
      immediate: 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10',
      soon: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
      upcoming: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
      flexible: 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
    };
    return colors[urgency] || colors.flexible;
  };

  const getSessionTypeInfo = (type) => {
    const types = {
      pomodoro: { icon: '🍅', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
      deep_work: { icon: '🧠', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
      short_burst: { icon: '⚡', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
    };
    return types[type] || types.pomodoro;
  };

  const getStressInfo = () => {
    if (!stressLevel) return { class: 'bg-gray-100', text: 'Unknown' };
    const score = stressLevel.objective_score;
    if (score <= 3) return { class: 'stress-relaxed', text: 'Relaxed' };
    if (score <= 6) return { class: 'stress-moderate', text: 'Moderate' };
    if (score <= 8) return { class: 'stress-high', text: 'High' };
    return { class: 'stress-critical', text: 'Critical' };
  };

  const stressInfo = getStressInfo();

  return (
    <div className="planner-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="planner-header">
          <div className="planner-title">
            <h1 className="flex items-center gap-3">
              <Brain className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              Smart Study Plan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">
              AI-powered optimization for your peak productivity
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-white/50 dark:border-gray-700/50 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all shadow-sm"
              title="Settings"
            >
              <Settings size={22} />
            </button>
            <NotificationBell />
            <HomeButton />
          </div>
        </div>

        {/* Date Navigation & Stress Indicator */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="date-nav-pill">
            <button onClick={() => navigateDate(-1)} className="date-nav-btn">
              <ChevronLeft size={20} />
            </button>

            <div className="text-center px-4 min-w-[180px]">
              <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <button onClick={() => navigateDate(1)} className="date-nav-btn">
              <ChevronRight size={20} />
            </button>

            {!isToday && (
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-bold hover:bg-indigo-200 transition-all"
              >
                Today
              </button>
            )}
          </div>

          {stressLevel && (
            <div className={`stress-pill ${stressInfo.class}`}>
              <Zap size={18} />
              <span>Stress: {stressLevel.objective_score?.toFixed(1)}/10</span>
              <span className="opacity-70">• {stressInfo.text}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Schedule Area */}
          <div className="lg:col-span-2 space-y-8">
            {loading ? (
              <div className="planner-glass-card p-16 text-center">
                <RefreshCw className="mx-auto mb-4 text-indigo-400 animate-spin" size={48} />
                <p className="text-gray-500 font-bold">Optimizing your schedule...</p>
              </div>
            ) : !schedule ? (
              <div className="planner-glass-card p-12 text-center border-t-4 border-indigo-500">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {isToday ? 'No Plan for Today' : 'No Plan for this Date'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto font-medium">
                  Let our AI analyze your tasks, deadlines, and stress levels to build the perfect study plan.
                </p>
                <GradientButton
                  variant="purple"
                  onClick={() => generateSchedule(false)}
                  disabled={generating}
                  className="px-10 py-4 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none"
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="animate-spin" size={20} />
                      Generating Plan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap size={20} />
                      Create Smart Schedule
                    </span>
                  )}
                </GradientButton>
                {tasks.length === 0 && (
                  <p className="mt-6 text-sm text-gray-400 font-medium">
                    Tip: Add some tasks first so AI has something to schedule!
                  </p>
                )}
              </div>
            ) : (
              <div className="planner-glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Agenda</h2>
                    <p className="text-sm text-gray-400 font-bold mt-1">
                      {schedule.study_blocks?.length || 0} BLOCKS • {schedule.total_study_hours || 0}H TOTAL
                    </p>
                  </div>
                  <button
                    onClick={() => generateSchedule(true)}
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all text-sm font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 border border-gray-200 dark:border-gray-700"
                  >
                    <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                </div>

                {schedule.ai_reasoning && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-5 mb-8 border border-indigo-100 dark:border-indigo-800/50">
                    <div className="flex items-start gap-4">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                        <Sparkles className="text-indigo-500" size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 block">AI Insight</span>
                        <p className="text-indigo-900 dark:text-indigo-200 font-medium italic leading-relaxed">"{schedule.ai_reasoning}"</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {schedule.study_blocks?.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">
                      No study blocks scheduled {isToday ? 'today' : 'for this date'}
                    </div>
                  ) : (
                    schedule.study_blocks?.map((block, index) => {
                      const typeInfo = getSessionTypeInfo(block.session_type);
                      const isBreakBefore = index > 0 && schedule.break_blocks?.find(
                        b => b.end_time === block.start_time
                      );

                      return (
                        <React.Fragment key={block.id}>
                          {isBreakBefore && (
                            <div className="flex items-center gap-3 px-6 py-2">
                              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <Coffee size={14} className="text-amber-500" />
                                <span>Break</span>
                              </div>
                              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                            </div>
                          )}

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`planner-glass-card study-block p-5 border-l-4 group ${block.completed ? 'block-completed' : `block-${block.session_type} ${getUrgencyColor(block.deadline_urgency)}`}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${typeInfo.color}`}>
                                    {typeInfo.icon} {block.session_type?.replace('_', ' ').toUpperCase()}
                                  </span>
                                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {block.start_time} - {block.end_time}
                                    <span className="opacity-50">({block.duration_minutes}m)</span>
                                  </span>
                                </div>

                                <h3 className={`text-lg font-bold text-gray-900 dark:text-white ${block.completed ? 'line-through opacity-50' : ''}`}>
                                  {block.task_title || 'Untitled Session'}
                                </h3>

                                <div className="flex flex-wrap items-center gap-4 mt-3">
                                  {block.deadline_urgency !== 'flexible' && (
                                    <span className={`urgency-badge urgency-${block.deadline_urgency}`}>
                                      {block.deadline_urgency}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500">
                                    <Target size={14} />
                                    PRIORITY: {block.priority}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500">
                                    <Brain size={14} />
                                    COMPLEXITY: {block.complexity}/10
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!block.completed && (
                                  <>
                                    <button
                                      onClick={() => startFocusSession(block)}
                                      className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                      title="Start Focus Session"
                                    >
                                      <Play size={18} fill="currentColor" />
                                    </button>
                                    <button
                                      onClick={() => completeBlock(block.id)}
                                      className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                      title="Mark Complete"
                                    >
                                      <Check size={18} strokeWidth={3} />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => removeBlock(block.id)}
                                  className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                  title="Remove Block"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 gap-4">
                <div className="planner-glass-card stat-widget">
                  <div className="stat-icon stat-icon-purple">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="stat-value">{stats.total_planned_hours || 0}h</div>
                    <div className="stat-label">Planned (7d)</div>
                  </div>
                </div>

                <div className="planner-glass-card stat-widget">
                  <div className="stat-icon stat-icon-blue">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="stat-value">{stats.completion_rate?.toFixed(0) || 0}%</div>
                    <div className="stat-label">Success Rate</div>
                  </div>
                </div>

                <div className="planner-glass-card stat-widget">
                  <div className="stat-icon stat-icon-purple">
                    <Target size={24} />
                  </div>
                  <div>
                    <div className="stat-value">{stats.completed_blocks || 0}/{stats.total_blocks || 0}</div>
                    <div className="stat-label">Blocks Done</div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {tasks.length > 0 && (
              <div className="planner-glass-card p-6">
                <div className="flex items-center gap-2 mb-4 text-orange-500 dark:text-orange-400">
                  <AlertTriangle size={20} />
                  <h3 className="font-bold uppercase tracking-tight text-sm">Vital Deadlines</h3>
                </div>
                <div className="space-y-4">
                  {tasks
                    .filter(t => t.deadline)
                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                    .slice(0, 4)
                    .map(task => (
                      <div key={task._id} className="flex justify-between items-center group cursor-pointer">
                        <span className="truncate flex-1 text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-500 transition-colors">{task.title}</span>
                        <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 ml-2">
                          {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* AI Insights Tip Card */}
            <div className="planner-glass-card p-6 border-t-4 border-purple-500 overflow-hidden relative">
              <div className="absolute top-[-10px] right-[-10px] opacity-10">
                <Brain size={100} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                Smart Advice
              </h3>
              <ul className="text-sm space-y-3 text-gray-600 dark:text-gray-400 font-medium">
                {stressLevel?.objective_score >= 7 ? (
                  <>
                    <li className="flex gap-2"><span>•</span> <span>Prioritize shorter, frequent breaks to prevent burnout.</span></li>
                    <li className="flex gap-2"><span>•</span> <span>Start with low-complexity tasks to build momentum.</span></li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2"><span>•</span> <span>Energy levels are optimal for deep work sessions today.</span></li>
                    <li className="flex gap-2"><span>•</span> <span>Focus on your highest priority deadlines before noon.</span></li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Preferences Modal */}
        <AnimatePresence>
          {showPreferencesModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreferencesModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="planner-modal relative w-full max-w-lg rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Settings className="text-indigo-500" size={28} />
                    Study Preferences
                  </h3>
                  <button onClick={() => setShowPreferencesModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Time Range */}
                  <section>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">ACTIVE STUDY HOURS</label>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Sun size={12} /> START</span>
                        <input
                          type="time"
                          value={prefsForm.study_hours?.start || '09:00'}
                          onChange={(e) => setPrefsForm({
                            ...prefsForm,
                            study_hours: { ...prefsForm.study_hours, start: e.target.value }
                          })}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-gray-900 dark:text-white text-lg"
                        />
                      </div>
                      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Moon size={12} /> END</span>
                        <input
                          type="time"
                          value={prefsForm.study_hours?.end || '21:00'}
                          onChange={(e) => setPrefsForm({
                            ...prefsForm,
                            study_hours: { ...prefsForm.study_hours, end: e.target.value }
                          })}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-gray-900 dark:text-white text-lg"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Range Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">SESSION: {prefsForm.preferred_session_length}m</label>
                      <input
                        type="range" min="15" max="90" step="5"
                        value={prefsForm.preferred_session_length || 25}
                        onChange={(e) => setPrefsForm({ ...prefsForm, preferred_session_length: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </section>
                    <section>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">MAX DAILY: {prefsForm.max_daily_study_hours}H</label>
                      <input
                        type="range" min="2" max="12" step="0.5"
                        value={prefsForm.max_daily_study_hours || 8}
                        onChange={(e) => setPrefsForm({ ...prefsForm, max_daily_study_hours: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </section>
                  </div>

                  {/* Pattern Selection */}
                  <section>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">COMPLEXITY PATTERN</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'hard_first', label: 'Hard Tasks First', icon: <Target size={16} /> },
                        { id: 'easy_first', label: 'Quick Wins First', icon: <Zap size={16} /> },
                        { id: 'alternating', label: 'Balanced Mix', icon: <RefreshCw size={16} /> }
                      ].map(pattern => (
                        <button
                          key={pattern.id}
                          onClick={() => setPrefsForm({ ...prefsForm, preferred_complexity_pattern: pattern.id })}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all font-bold text-sm ${prefsForm.preferred_complexity_pattern === pattern.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                        >
                          {pattern.icon}
                          {pattern.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-10 flex gap-4">
                  <GradientButton
                    variant="purple"
                    onClick={savePreferences}
                    className="flex-1 py-4 rounded-2xl font-bold shadow-lg"
                  >
                    Apply Changes
                  </GradientButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StudyPlannerPage;
