import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, CheckCircle, AlertCircle, XCircle, Clock, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { calendarService } from '../services/calendar.service';
import { useCalendarStore } from '../store/useStore';
import HomeButton from '../components/HomeButton';
import GradientButton from '../components/ui/GradientButton';

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

      // Listen for message from popup
      const messageHandler = (event) => {
        if (event.data.type === 'calendar_auth_success') {
          window.removeEventListener('message', messageHandler);
          loadCalendarStatus();
          setSuccess('Google Calendar connected successfully!');
          setLoading(false);
        }
      };
      window.addEventListener('message', messageHandler);

      // Open OAuth URL in popup window
      const popup = window.open(
        response.authorization_url,
        'Google Calendar Authorization',
        'width=600,height=700'
      );

      // Fallback: Poll for popup close in case postMessage doesn't work
      const pollTimer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          // Reload status after OAuth completion
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                <Calendar className="w-10 h-10 text-purple-600" />
                Google Calendar Integration
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Sync your tasks and study schedules with Google Calendar
              </p>
            </div>
            <HomeButton />
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
          </motion.div>
        )}

        {/* Connection Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connection Status
            </h2>
            {isConnected ? (
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Connected
              </span>
            ) : (
              <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Not Connected
              </span>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connect Your Google Calendar
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Sync your tasks and study schedules automatically with Google Calendar
              </p>
              <GradientButton
                variant="purple"
                onClick={handleConnectCalendar}
                disabled={loading}
                className="px-8 py-4 flex items-center gap-2 mx-auto"
              >
                <LinkIcon className="w-5 h-5" />
                {loading ? 'Connecting...' : 'Connect Google Calendar'}
              </GradientButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-600">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Calendar ID</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {calendarId || 'primary'}
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Items Synced</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {totalSynced}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Disconnect Calendar
              </button>
            </div>
          )}
        </motion.div>

        {/* Sync Preferences Card */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Sync Preferences
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sync Tasks</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Automatically sync task deadlines to calendar
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncPrefs.sync_tasks}
                    onChange={(e) => setSyncPrefs({ ...syncPrefs, sync_tasks: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sync Study Plans</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sync AI-generated study blocks to calendar
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncPrefs.sync_study_plans}
                    onChange={(e) => setSyncPrefs({ ...syncPrefs, sync_study_plans: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                  Auto Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={syncPrefs.auto_sync_interval}
                  onChange={(e) => setSyncPrefs({ ...syncPrefs, auto_sync_interval: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-purple-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-600 focus:border-purple-600 focus:outline-none"
                />
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  How often to check for calendar changes (5-60 minutes)
                </p>
              </div>

              <GradientButton
                variant="purple"
                onClick={handleUpdatePreferences}
                disabled={loading}
                className="w-full py-3"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </GradientButton>
            </div>
          </motion.div>
        )}

        {/* Sync Controls Card */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Sync Controls
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Last Sync</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatLastSync(lastSyncAt)}
                    </div>
                  </div>
                </div>
                <GradientButton
                  variant="purple"
                  onClick={handleFullSync}
                  disabled={syncing}
                  className="px-6 py-2 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </GradientButton>
              </div>

              {pendingConflicts > 0 && (
                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="font-medium text-orange-900 dark:text-orange-100">
                        {pendingConflicts} Sync Conflict{pendingConflicts > 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        Conflicts need manual resolution
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors">
                    Resolve
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CalendarSettingsPage;
