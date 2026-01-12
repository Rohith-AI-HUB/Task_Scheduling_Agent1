import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Brain, Zap, Settings, ChevronLeft, ChevronRight,
  RefreshCw, Play, Check, X, AlertTriangle, Coffee, Target,
  TrendingUp, Sparkles, Sun, Moon
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { studyPlannerService } from '../services/studyPlanner.service';
import HomeButton from '../components/HomeButton';
import GradientButton from '../components/ui/GradientButton';
import MetricCard from '../components/ui/MetricCard';

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
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/stress/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStressLevel(response.data);
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
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data.tasks?.filter(t => t.status !== 'completed') || []);
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
      alert('Error generating schedule. Please try again.');
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
      // Regenerate schedule with new preferences
      if (schedule) {
        generateSchedule(true);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences');
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

  // Get urgency color
  const getUrgencyColor = (urgency) => {
    const colors = {
      immediate: 'border-l-red-500 bg-red-50',
      soon: 'border-l-orange-500 bg-orange-50',
      upcoming: 'border-l-yellow-500 bg-yellow-50',
      flexible: 'border-l-green-500 bg-green-50'
    };
    return colors[urgency] || colors.flexible;
  };

  // Get session type info
  const getSessionTypeInfo = (type) => {
    const types = {
      pomodoro: { icon: '🍅', color: 'bg-purple-100 text-purple-700' },
      deep_work: { icon: '🧠', color: 'bg-blue-100 text-blue-700' },
      short_burst: { icon: '⚡', color: 'bg-amber-100 text-amber-700' }
    };
    return types[type] || types.pomodoro;
  };

  // Get stress info
  const getStressInfo = () => {
    if (!stressLevel) return { color: 'bg-gray-100', text: 'Unknown' };
    const score = stressLevel.objective_score;
    if (score <= 3) return { color: 'bg-green-100 text-green-700', text: 'Relaxed' };
    if (score <= 6) return { color: 'bg-yellow-100 text-yellow-700', text: 'Moderate' };
    if (score <= 8) return { color: 'bg-orange-100 text-orange-700', text: 'High' };
    return { color: 'bg-red-100 text-red-700', text: 'Critical' };
  };

  const stressInfo = getStressInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            <Calendar className="text-purple-600" />
            Smart Study Planner
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="p-2 hover:bg-purple-50 rounded-lg transition-colors text-purple-600"
              title="Settings"
            >
              <Settings size={24} />
            </button>
            <HomeButton />
          </div>
        </div>
        <p className="text-gray-600">AI-powered daily schedule optimized for your productivity</p>
      </div>

      {/* Date Navigation & Stress Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-gray-600">
              {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={24} />
          </button>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 font-medium transition-all"
            >
              Today
            </button>
          )}
        </div>

        {/* Stress Level Pill */}
        {stressLevel && (
          <div className={`px-4 py-2 rounded-full flex items-center gap-2 shadow-md ${stressInfo.color}`}>
            <Brain size={18} />
            <span className="font-medium">Stress: {stressLevel.objective_score?.toFixed(1)}/10</span>
            <span className="text-sm">({stressInfo.text})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule Area */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <RefreshCw className="mx-auto mb-4 text-gray-400 animate-spin" size={48} />
              <p className="text-gray-600">Loading schedule...</p>
            </div>
          ) : !schedule ? (
            // No Schedule - Generate Prompt
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-lg p-12 text-center border-t-4 border-purple-600">
              <Sparkles className="mx-auto mb-6 text-purple-500" size={64} />
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">No Schedule Yet</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Let AI create an optimized study schedule based on your tasks, deadlines, and current stress level.
              </p>
              <GradientButton
                variant="purple"
                onClick={() => generateSchedule(false)}
                disabled={generating}
                className="px-8 py-4 text-lg flex items-center gap-3 mx-auto"
              >
                {generating ? (
                  <>
                    <RefreshCw className="animate-spin" size={24} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Generate My Schedule
                  </>
                )}
              </GradientButton>
              {tasks.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  No active tasks found. Add some tasks first!
                </p>
              )}
            </div>
          ) : (
            // Schedule Display
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* Schedule Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Today's Schedule</h2>
                  <p className="text-sm text-gray-600">
                    {schedule.study_blocks?.length || 0} study blocks • {schedule.total_study_hours || 0}h total
                  </p>
                </div>
                <button
                  onClick={() => generateSchedule(true)}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                  Regenerate
                </button>
              </div>

              {/* AI Reasoning */}
              {schedule.ai_reasoning && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <Brain className="text-blue-500 mt-0.5" size={18} />
                    <div>
                      <span className="font-medium text-blue-700">AI Insight: </span>
                      <span className="text-blue-600">{schedule.ai_reasoning}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Study Blocks */}
              <div className="space-y-4">
                {schedule.study_blocks?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No study blocks scheduled</p>
                ) : (
                  schedule.study_blocks?.map((block, index) => {
                    const typeInfo = getSessionTypeInfo(block.session_type);
                    const isBreakBefore = index > 0 && schedule.break_blocks?.find(
                      b => b.end_time === block.start_time
                    );

                    return (
                      <React.Fragment key={block.id}>
                        {/* Break indicator */}
                        {isBreakBefore && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                            <Coffee size={16} />
                            <span>Break</span>
                          </div>
                        )}

                        {/* Study Block Card */}
                        <div
                          className={`border-l-4 rounded-xl p-4 transition-all ${
                            block.completed
                              ? 'bg-gray-50 opacity-60 border-l-gray-300'
                              : getUrgencyColor(block.deadline_urgency)
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                                  {typeInfo.icon} {block.session_type?.replace('_', ' ')}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {block.start_time} - {block.end_time}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ({block.duration_minutes} min)
                                </span>
                              </div>

                              <h3 className={`font-semibold text-lg ${block.completed ? 'line-through' : ''}`}>
                                {block.task_title || 'Untitled Task'}
                              </h3>

                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Target size={14} />
                                  {block.priority}
                                </span>
                                <span className="flex items-center gap-1">
                                  Complexity: {block.complexity}/10
                                </span>
                                {block.deadline_urgency !== 'flexible' && (
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    block.deadline_urgency === 'immediate' ? 'bg-red-100 text-red-700' :
                                    block.deadline_urgency === 'soon' ? 'bg-orange-100 text-orange-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {block.deadline_urgency}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              {!block.completed && (
                                <>
                                  <button
                                    onClick={() => startFocusSession(block)}
                                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
                                    title="Start Focus Session"
                                  >
                                    <Play size={18} />
                                  </button>
                                  <button
                                    onClick={() => completeBlock(block.id)}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                    title="Mark Complete"
                                  >
                                    <Check size={18} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => removeBlock(block.id)}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                title="Remove"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats Cards */}
          {stats && (
            <>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Clock className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.total_planned_hours || 0}h</div>
                    <div className="text-sm text-gray-600">Planned (7 days)</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <TrendingUp className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.completion_rate?.toFixed(0) || 0}%</div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Target className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.completed_blocks || 0}/{stats.total_blocks || 0}</div>
                    <div className="text-sm text-gray-600">Blocks Completed</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Upcoming Deadlines */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                Upcoming Deadlines
              </h3>
              <div className="space-y-2">
                {tasks
                  .filter(t => t.deadline)
                  .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                  .slice(0, 5)
                  .map(task => (
                    <div key={task._id} className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1">{task.title}</span>
                      <span className="text-gray-500 ml-2">
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl p-6 border-t-4 border-purple-600">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              AI Tips
            </h3>
            <ul className="text-sm space-y-2 text-gray-700">
              {stressLevel?.objective_score >= 7 ? (
                <>
                  <li>• Take shorter breaks more often</li>
                  <li>• Start with easier tasks to build momentum</li>
                  <li>• Consider delegating or postponing non-urgent items</li>
                </>
              ) : stressLevel?.objective_score >= 4 ? (
                <>
                  <li>• Balance hard and easy tasks</li>
                  <li>• Use Pomodoro technique for consistency</li>
                  <li>• Schedule complex work for peak energy hours</li>
                </>
              ) : (
                <>
                  <li>• Great time for deep work sessions</li>
                  <li>• Tackle complex tasks while energy is high</li>
                  <li>• Set challenging goals for today</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings size={24} />
              Study Preferences
            </h3>

            {/* Study Hours */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Study Hours</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sun size={18} className="text-amber-500" />
                  <input
                    type="time"
                    value={prefsForm.study_hours?.start || '09:00'}
                    onChange={(e) => setPrefsForm({
                      ...prefsForm,
                      study_hours: { ...prefsForm.study_hours, start: e.target.value }
                    })}
                    className="border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
                <span>to</span>
                <div className="flex items-center gap-2">
                  <Moon size={18} className="text-indigo-500" />
                  <input
                    type="time"
                    value={prefsForm.study_hours?.end || '21:00'}
                    onChange={(e) => setPrefsForm({
                      ...prefsForm,
                      study_hours: { ...prefsForm.study_hours, end: e.target.value }
                    })}
                    className="border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Session Length */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Preferred Session Length: {prefsForm.preferred_session_length} min
              </label>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={prefsForm.preferred_session_length || 25}
                onChange={(e) => setPrefsForm({
                  ...prefsForm,
                  preferred_session_length: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>15 min</span>
                <span>90 min</span>
              </div>
            </div>

            {/* Break Durations */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Short Break</label>
                <select
                  value={prefsForm.break_duration_short || 5}
                  onChange={(e) => setPrefsForm({
                    ...prefsForm,
                    break_duration_short: parseInt(e.target.value)
                  })}
                  className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value={3}>3 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Long Break</label>
                <select
                  value={prefsForm.break_duration_long || 15}
                  onChange={(e) => setPrefsForm({
                    ...prefsForm,
                    break_duration_long: parseInt(e.target.value)
                  })}
                  className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                </select>
              </div>
            </div>

            {/* Max Daily Hours */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Max Daily Study Hours: {prefsForm.max_daily_study_hours}h
              </label>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={prefsForm.max_daily_study_hours || 8}
                onChange={(e) => setPrefsForm({
                  ...prefsForm,
                  max_daily_study_hours: parseFloat(e.target.value)
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>2h</span>
                <span>12h</span>
              </div>
            </div>

            {/* Complexity Pattern */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Complexity Pattern</label>
              <div className="space-y-2">
                {[
                  { id: 'hard_first', label: 'Hard First', desc: 'Tackle difficult tasks when fresh' },
                  { id: 'easy_first', label: 'Easy First', desc: 'Build momentum with quick wins' },
                  { id: 'alternating', label: 'Alternating', desc: 'Mix hard and easy tasks' }
                ].map(pattern => (
                  <label
                    key={pattern.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      prefsForm.preferred_complexity_pattern === pattern.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complexity_pattern"
                      value={pattern.id}
                      checked={prefsForm.preferred_complexity_pattern === pattern.id}
                      onChange={(e) => setPrefsForm({
                        ...prefsForm,
                        preferred_complexity_pattern: e.target.value
                      })}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium">{pattern.label}</div>
                      <div className="text-sm text-gray-600">{pattern.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Stress Sensitivity */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Stress Sensitivity</label>
              <select
                value={prefsForm.stress_sensitivity || 'medium'}
                onChange={(e) => setPrefsForm({
                  ...prefsForm,
                  stress_sensitivity: e.target.value
                })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="low">Low - Push through stress</option>
                <option value="medium">Medium - Balanced approach</option>
                <option value="high">High - Prioritize wellbeing</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <GradientButton
                variant="purple"
                onClick={savePreferences}
                className="flex-1 py-3"
              >
                Save Preferences
              </GradientButton>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyPlannerPage;
