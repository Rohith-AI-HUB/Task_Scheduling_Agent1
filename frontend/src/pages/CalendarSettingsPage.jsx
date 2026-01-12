import React, { useState, useEffect } from 'react';
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
  const [syncing, setsyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncPrefs, setSyncPrefs] = useState({
    sync_tasks: true,
    sync_study_plans: true,
    auto_sync_interval: 15
  });

  // Load calendar status on mount
  useEffect(() => {
    loadCalendarStatus();
  }, []);

  const loadCalendarStatus = async () => {
    try {
      const status = await calendarService.getStatus();
      setSyncStatus(status);
      if (status.sync_preferences) {
        setSyncPrefs(status.sync_preferences);
      }
    } catch (err) {
      console.error('Error loading calendar status:', err);
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
    setsyncing(true);
    setError(null);
    try {
      const result = await calendarService.triggerFullSync();
      updateLastSync();
      setSuccess(`Synced ${result.total_synced} items successfully!`);
      await loadCalendarStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Sync failed');
    } finally {
      setsyncing(false);
    }
  };

  const formatLastSync = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
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
                <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all">
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
    </div>
  );
};

export default CalendarSettingsPage;
