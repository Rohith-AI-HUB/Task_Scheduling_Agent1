import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, CheckCircle, AlertCircle, XCircle, Clock, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { calendarService } from '../services/calendar.service';
import { useCalendarStore } from '../store/useStore';
import HomeButton from '../components/HomeButton';
import GradientButton from '../components/ui/GradientButton';
import NotificationBell from '../components/NotificationBell';
import './SchedulePage.css';

const CalendarSettingsPage = () => {
  const {
    isConnected,
    syncEnabled,
    lastSyncAt,
    pendingConflicts,
    totalSynced,
    calendarId,
    setSyncStatus,
    updateLastSync,
    reset
  } = useCalendarStore();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncPrefs, setSyncPrefs] = useState({
    sync_tasks: true,
    sync_study_plans: true,
    auto_sync_interval: 15
  });
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [nextSyncIn, setNextSyncIn] = useState(60);

  // Load calendar status on mount
  useEffect(() => {
    loadCalendarStatus();
  }, []);

  // Auto-sync every 1 minute when connected
  useEffect(() => {
    if (!isConnected || !autoSyncEnabled) return;

    // Countdown timer for next sync
    const countdownInterval = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev <= 1) {
          return 60; // Reset to 60 seconds
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-sync interval (every 1 minute)
    const syncInterval = setInterval(async () => {
      if (syncing) return; // Skip if already syncing

      try {
        console.log('Auto-sync triggered');
        setSyncing(true);
        await calendarService.triggerFullSync();
        updateLastSync();
        await loadCalendarStatus();
      } catch (err) {
        console.error('Auto-sync failed:', err);
      } finally {
        setSyncing(false);
      }
    }, 60000); // 1 minute = 60000ms

    return () => {
      clearInterval(countdownInterval);
      clearInterval(syncInterval);
    };
  }, [isConnected, autoSyncEnabled, syncing]);

  const loadCalendarStatus = async () => {
    try {
      const status = await calendarService.getStatus();
      setSyncStatus(status);
      if (status.sync_preferences) {
        setSyncPrefs(status.sync_preferences);
      }
    } catch (err) {
      console.error('Error loading calendar status:', err);
      // Show error to user - don't show error if it's just "not connected" (404)
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || 'Failed to load calendar status. Please check if the backend is running.');
      }
    }
  };

  const handleConnectCalendar = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await calendarService.initiateOAuth();

      const messageHandler = (event) => {
        if (event.data.type === 'calendar_auth_success') {
          window.removeEventListener('message', messageHandler);
          loadCalendarStatus();
          setSuccess('Google Calendar connected successfully!');
          setLoading(false);
        }
      };
      window.addEventListener('message', messageHandler);

      const popup = window.open(
        response.authorization_url,
        'Google Calendar Authorization',
        'width=600,height=700'
      );

      const pollTimer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          setTimeout(() => {
            loadCalendarStatus();
            setSuccess('Authorization completed. If not connected, please try again.');
            setLoading(false);
          }, 500);
        }
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect calendar');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? All sync mappings will be removed.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await calendarService.disconnect();
      reset();
      setSuccess('Google Calendar disconnected successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to disconnect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      await calendarService.updatePreferences(syncPrefs);
      setSuccess('Preferences updated successfully');
      await loadCalendarStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await calendarService.triggerFullSync();
      updateLastSync();
      setNextSyncIn(60); // Reset countdown after manual sync
      setSuccess(`Synced ${result.total_synced} items successfully!`);
      await loadCalendarStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateValue) => {
    if (!dateValue) return 'Never';

    const raw = typeof dateValue === 'string' ? dateValue : String(dateValue);
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(raw);
    const date = new Date(hasTimezone ? raw : `${raw}Z`);

    if (Number.isNaN(date.getTime())) return 'Never';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const loadConflicts = async () => {
    try {
      const response = await calendarService.getConflicts();
      setConflicts(response.conflicts || []);
    } catch (err) {
      console.error('Error loading conflicts:', err);
    }
  };

  const handleOpenConflicts = async () => {
    await loadConflicts();
    setShowConflictModal(true);
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    setResolvingConflict(conflictId);
    try {
      await calendarService.resolveConflict(conflictId, resolution);
      setSuccess(`Conflict resolved using ${resolution === 'use_local' ? 'local' : 'Google Calendar'} version`);
      await loadConflicts();
      await loadCalendarStatus();
      if (conflicts.length <= 1) {
        setShowConflictModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resolve conflict');
    } finally {
      setResolvingConflict(null);
    }
  };

  return (
    <div className="schedule-container">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="schedule-header">
          <div className="schedule-title">
            <h1 className="flex items-center gap-3">
              <Calendar className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              Calendar Schedule
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Manage your Google Calendar sync and preferences
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <HomeButton />
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-4 mb-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-200"
            >
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{success}</span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Connection Card */}
            <div className="schedule-glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connection Status</h2>
                <div className={`status-badge ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                  {isConnected ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {isConnected ? 'Connected' : 'Not Connected'}
                </div>
              </div>

              {!isConnected ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LinkIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connect Google Calendar</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                    Sync your tasks and study plans directly to your primary Google Calendar.
                  </p>
                  <GradientButton
                    variant="purple"
                    onClick={handleConnectCalendar}
                    disabled={loading}
                    className="px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                  >
                    {loading ? 'Connecting...' : 'Connect Now'}
                  </GradientButton>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/40 dark:border-gray-700/50">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Calendar ID</p>
                      <p className="font-bold text-gray-900 dark:text-white truncate">{calendarId || 'primary'}</p>
                    </div>
                    <div className="p-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/40 dark:border-gray-700/50">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Items Synced</p>
                      <p className="font-bold text-gray-900 dark:text-white text-xl">{totalSynced}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-sm font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    Disconnect Google Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Preferences Card */}
            {isConnected && (
              <div className="schedule-glass-card p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Sync Preferences</h2>
                <div className="space-y-4">
                  <div className="pref-item flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Sync All Tasks</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Push deadlines from My Tasks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncPrefs.sync_tasks}
                        onChange={(e) => setSyncPrefs({ ...syncPrefs, sync_tasks: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="pref-item flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Sync Study Plans</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Export AI scheduled study blocks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncPrefs.sync_study_plans}
                        onChange={(e) => setSyncPrefs({ ...syncPrefs, sync_study_plans: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="pt-4">
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Sync Frequency (min)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={syncPrefs.auto_sync_interval}
                      onChange={(e) => setSyncPrefs({ ...syncPrefs, auto_sync_interval: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      <span>5m</span>
                      <span>Now: {syncPrefs.auto_sync_interval}m</span>
                      <span>60m</span>
                    </div>
                  </div>

                  <GradientButton
                    variant="purple"
                    onClick={handleUpdatePreferences}
                    disabled={loading}
                    className="w-full mt-6 py-4 rounded-2xl font-bold"
                  >
                    {loading ? 'Updating...' : 'Save Preferences'}
                  </GradientButton>
                </div>
              </div>
            )}
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {/* Sync Now Card */}
            {isConnected && (
              <div className="schedule-glass-card p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sync Status</h3>
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Last Synced</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatLastSync(lastSyncAt)}</p>
                    </div>
                  </div>

                  {/* Auto-sync toggle and countdown */}
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${autoSyncEnabled && syncing ? 'animate-spin' : ''}`} />
                        <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">Auto-Sync (1 min)</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSyncEnabled}
                          onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    {autoSyncEnabled && (
                      <div className="text-xs text-indigo-700 dark:text-indigo-300">
                        Next sync in <span className="font-bold">{nextSyncIn}s</span>
                      </div>
                    )}
                  </div>

                  <GradientButton
                    variant="purple"
                    onClick={handleFullSync}
                    disabled={syncing}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Force Sync Now'}
                  </GradientButton>
                </div>
              </div>
            )}

            {/* Sync Conflicts Card */}
            {isConnected && pendingConflicts > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <h4 className="font-bold text-orange-900 dark:text-orange-100">Action Required</h4>
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-4 font-medium">
                  There are {pendingConflicts} scheduling conflicts that need your attention.
                </p>
                <button
                  onClick={handleOpenConflicts}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                >
                  Resolve Conflicts
                </button>
              </div>
            )}

            {/* Feature Teaser */}
            <div className="schedule-glass-card p-6 border-dashed border-2 border-indigo-200 dark:border-indigo-900/50 bg-transparent">
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">Did you know?</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                TaskFlow can automatically find the best study times based on your calendar gaps. Enable Smart Study Plans to try it out!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Resolve Conflicts</h3>
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose which version to keep for each conflict
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
              {conflicts.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No conflicts to resolve
                </p>
              ) : (
                conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                  >
                    <div className="mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {conflict.local_entity_type === 'task' ? 'Task' : 'Study Block'}
                      </span>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {conflict.local_entity_id}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'use_local')}
                        disabled={resolvingConflict === conflict.id}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {resolvingConflict === conflict.id ? 'Resolving...' : 'Use Local'}
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'use_google')}
                        disabled={resolvingConflict === conflict.id}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {resolvingConflict === conflict.id ? 'Resolving...' : 'Use Google'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setShowConflictModal(false)}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CalendarSettingsPage;
