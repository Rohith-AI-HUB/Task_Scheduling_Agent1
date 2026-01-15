import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Zap, Coffee, AlertCircle, TrendingUp } from 'lucide-react';
import axios from 'axios';
import HomeButton from '../components/HomeButton';
import GradientButton from '../components/ui/GradientButton';
import MetricCard from '../components/ui/MetricCard';

function FocusModePage() {
  const [activeSession, setActiveSession] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sessionType, setSessionType] = useState('pomodoro');
  const [customDuration, setCustomDuration] = useState(25);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [productivityRating, setProductivityRating] = useState(3);
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    fetchActiveSession();
    fetchTasks();
    fetchStats();

    // Update time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setActiveSession(null);
        return;
      }
      const response = await axios.get('http://localhost:8000/api/focus/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveSession(response.data.active_session);
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTasks([]);
        return;
      }
      const response = await axios.get('http://localhost:8000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const taskList = Array.isArray(response.data) ? response.data : (response.data?.tasks || []);
      const activeTasks = taskList.filter(t =>
        t.status === 'todo' || t.status === 'in_progress'
      );
      setTasks(activeTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStats(null);
        return;
      }
      const response = await axios.get('http://localhost:8000/api/focus/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const startSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/focus/start-session',
        {
          task_id: selectedTask,
          session_type: sessionType,
          planned_duration_minutes: sessionType === 'pomodoro' ? 25 :
            sessionType === 'deep_work' ? 90 : customDuration
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveSession({
        session_id: response.data.session_id,
        task_id: selectedTask,
        task_title: response.data.task_title,
        session_type: sessionType,
        planned_duration_minutes: response.data.planned_duration_minutes,
        start_time: response.data.start_time,
        expected_end_time: response.data.expected_end_time,
        elapsed_minutes: 0,
        remaining_minutes: response.data.planned_duration_minutes,
        interruptions: 0
      });

      setShowStartModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error starting session:', error);
      alert(error.response?.data?.detail || 'Error starting session');
    }
  };

  const logInterruption = async (type) => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:8000/api/focus/${activeSession.session_id}/interrupt`,
        { interruption_type: type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveSession(prev => ({
        ...prev,
        interruptions: prev.interruptions + 1
      }));
    } catch (error) {
      console.error('Error logging interruption:', error);
    }
  };

  const completeSession = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:8000/api/focus/${activeSession.session_id}/complete`,
        {
          productivity_rating: productivityRating,
          notes: sessionNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveSession(null);
      setShowCompleteModal(false);
      setProductivityRating(3);
      setSessionNotes('');
      fetchStats();
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const cancelSession = async () => {
    if (!activeSession) return;

    if (!confirm('Are you sure you want to cancel this focus session?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/focus/${activeSession.session_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveSession(null);
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!activeSession) return null;

    const expectedEnd = new Date(activeSession.expected_end_time);
    const now = currentTime;
    const remaining = Math.max(0, (expectedEnd - now) / 1000 / 60);

    return {
      minutes: Math.floor(remaining),
      seconds: Math.floor((remaining % 1) * 60),
      isOvertime: remaining <= 0
    };
  };

  const timeLeft = getRemainingTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Focus Mode & Pomodoro</h1>
              <p className="text-gray-600">Stay focused and track your productive time</p>
            </div>
            <HomeButton />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timer Area */}
          <div className="lg:col-span-2">
            {activeSession ? (
              // Active Session View
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-lg p-8">
                <div className="text-center">
                  <div className="mb-6">
                    <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      {activeSession.session_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {activeSession.task_title && (
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">
                      {activeSession.task_title}
                    </h2>
                  )}

                  {/* Timer Display */}
                  <div className="mb-8">
                    <div className="text-9xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                      {timeLeft ? `${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}` : '00:00'}
                    </div>

                    {timeLeft?.isOvertime && (
                      <div className="text-red-500 font-semibold animate-pulse">
                        Overtime! You can finish up when ready.
                      </div>
                    )}

                    <div className="text-gray-600 mt-2">
                      {activeSession.planned_duration_minutes} minute session
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-8">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((activeSession.planned_duration_minutes - (timeLeft?.minutes || 0)) / activeSession.planned_duration_minutes) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="flex justify-center gap-8 mb-8 text-sm">
                    <div className="text-center">
                      <div className="text-gray-500">Started</div>
                      <div className="font-semibold">
                        {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">Interruptions</div>
                      <div className="font-semibold">{activeSession.interruptions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">End Time</div>
                      <div className="font-semibold">
                        {new Date(activeSession.expected_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center">
                    <GradientButton
                      variant="green"
                      onClick={() => setShowCompleteModal(true)}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Square size={18} />
                      Complete Session
                    </GradientButton>

                    <button
                      onClick={cancelSession}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Interruption Buttons */}
                  <div className="mt-6 p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">Got interrupted?</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => logInterruption('notification')}
                        className="text-sm border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-all"
                      >
                        Notification
                      </button>
                      <button
                        onClick={() => logInterruption('distraction')}
                        className="text-sm border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-all"
                      >
                        Distraction
                      </button>
                      <button
                        onClick={() => logInterruption('break')}
                        className="text-sm border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-all"
                      >
                        Quick Break
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // No Active Session
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Zap className="mx-auto mb-6 text-purple-600" size={64} />
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Ready to Focus?</h2>
                <p className="text-gray-600 mb-8">
                  Start a focus session to boost your productivity and track your time
                </p>

                <GradientButton
                  variant="indigo"
                  onClick={() => setShowStartModal(true)}
                  size="xl"
                  className="flex items-center gap-3 mx-auto"
                >
                  <Play size={24} />
                  Start Focus Session
                </GradientButton>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            {stats && (
              <>
                <MetricCard
                  icon={Clock}
                  label="Total Focus Time (min)"
                  value={stats.total_focus_time?.toFixed(0) || 0}
                  gradient="purple-indigo"
                />

                <MetricCard
                  icon={TrendingUp}
                  label="Sessions Completed"
                  value={stats.total_sessions || 0}
                  gradient="green"
                />

                <MetricCard
                  icon={Zap}
                  label="Completion Rate"
                  value={`${stats.completion_rate?.toFixed(0) || 0}%`}
                  gradient="purple-blue"
                />

                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold mb-3 text-sm text-gray-600">Session Types</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.sessions_by_type || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!activeSession && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-600">
                  <Coffee size={18} />
                  Focus Tips
                </h3>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• Turn off notifications</li>
                  <li>• Close unnecessary tabs</li>
                  <li>• Have water nearby</li>
                  <li>• Take breaks between sessions</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6">Start Focus Session</h3>

            {/* Session Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Session Type</label>
              <div className="space-y-2">
                {[
                  { id: 'pomodoro', name: 'Pomodoro', duration: '25 min', icon: '🍅' },
                  { id: 'deep_work', name: 'Deep Work', duration: '90 min', icon: '🧠' },
                  { id: 'short_burst', name: 'Short Burst', duration: '15 min', icon: '⚡' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSessionType(type.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${sessionType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <div className="font-semibold">{type.name}</div>
                          <div className="text-sm text-gray-600">{type.duration}</div>
                        </div>
                      </div>
                      {sessionType === type.id && (
                        <div className="text-purple-500">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Task Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Link to Task (Optional)
              </label>
              <select
                value={selectedTask || ''}
                onChange={(e) => setSelectedTask(e.target.value || null)}
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="">No specific task</option>
                {tasks.map((task, index) => {
                  const taskId = task?._id ?? task?.id ?? task?.task_id ?? index;
                  return (
                    <option key={String(taskId)} value={String(taskId)}>
                      {task?.title || task?.name || 'Untitled task'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <GradientButton
                variant="indigo"
                onClick={startSession}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Start Session
              </GradientButton>
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setSelectedTask(null);
                }}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Session Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4">Great Job!</h3>
            <p className="text-gray-600 mb-6">How productive was this session?</p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Productivity Rating: {productivityRating}/5
              </label>
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setProductivityRating(rating)}
                    className={`w-12 h-12 rounded-full border-2 font-bold transition-all ${productivityRating >= rating
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-600'
                        : 'border-gray-300 text-gray-400 hover:border-purple-400'
                      }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows="3"
                placeholder="What did you accomplish?"
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <GradientButton
                variant="green"
                onClick={completeSession}
                className="flex-1"
              >
                Complete Session
              </GradientButton>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FocusModePage;
