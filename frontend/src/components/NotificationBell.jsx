import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        axios.get('http://localhost:8000/api/notifications', getAuthHeader()),
        axios.get('http://localhost:8000/api/notifications/count', getAuthHeader())
      ]);

      setNotifications(notifsRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await axios.put(
        `http://localhost:8000/api/notifications/${notifId}/read`,
        {},
        getAuthHeader()
      );
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await axios.put('http://localhost:8000/api/notifications/read-all', {}, getAuthHeader());
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notifId) => {
    try {
      await axios.delete(`http://localhost:8000/api/notifications/${notifId}`, getAuthHeader());
      loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      extension_request: '📝',
      extension_review: '✅',
      task_assigned: '📋',
      task_completed: '✔️',
      default: '🔔'
    };
    return icons[type] || icons.default;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 mt-3 w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 dark:border-white/10 z-20 max-h-[30rem] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
              <h3 className="font-extrabold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Bell size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="font-bold italic">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-5 border-b border-gray-50 dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/5 transition-all ${!notif.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.read ? 'font-semibold' : ''}`}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(notif.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Mark as read"
                          >
                            <Check size={16} className="text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Delete"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
