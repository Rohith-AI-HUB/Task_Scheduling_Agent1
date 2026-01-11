import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const NOTIFICATION_DURATION = 5000; // 5 seconds

export default function LiveNotification() {
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      const id = Date.now();
      const newNotification = {
        id,
        ...data,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Auto-dismiss after duration
      setTimeout(() => {
        removeNotification(id);
      }, NOTIFICATION_DURATION);
    });

    return () => unsubscribe();
  }, [subscribe]);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'extension_review':
      case 'extension_request':
        return <Bell size={20} className="text-blue-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-80 border-l-4 border-blue-500 pointer-events-auto flex items-start gap-3 relative"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 pr-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {notification.type === 'extension_request' ? 'New Request' : 
                 notification.type === 'extension_review' ? 'Request Update' : 'Notification'}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                {notification.message}
              </p>
              <span className="text-xs text-gray-400 mt-2 block">Just now</span>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
