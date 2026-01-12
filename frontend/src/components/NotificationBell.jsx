import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, X, Check } from 'lucide-react';

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
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <Check size={16} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50' : ''
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
          </div>
        </>
      )}
    </div>
  );
}
