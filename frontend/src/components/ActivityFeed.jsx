import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, Edit, Trash2, PlusCircle, Bell } from 'lucide-react';

export default function ActivityFeed() {
  const { subscribe } = useWebSocket();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Listen for task updates
    const unsubscribeTask = subscribe('task_update', (data) => {
      addActivity({
        id: Date.now(),
        type: 'task',
        action: data.action, // created, updated, deleted
        title: data.task?.title || 'Unknown Task',
        timestamp: new Date()
      });
    });

    // Listen for notifications (extensions, etc.)
    const unsubscribeNotif = subscribe('notification', (data) => {
      addActivity({
        id: Date.now(),
        type: 'notification',
        action: data.type,
        title: data.message,
        timestamp: new Date()
      });
    });

    return () => {
      unsubscribeTask();
      unsubscribeNotif();
    };
  }, [subscribe]);

  const addActivity = (activity) => {
    setActivities(prev => [activity, ...prev].slice(0, 10)); // Keep last 10
  };

  const getIcon = (type, action) => {
    if (type === 'task') {
      switch (action) {
        case 'created': return <PlusCircle size={16} className="text-green-500" />;
        case 'updated': return <Edit size={16} className="text-blue-500" />;
        case 'deleted': return <Trash2 size={16} className="text-red-500" />;
        case 'completed': return <CheckCircle size={16} className="text-green-600" />;
        default: return <Clock size={16} className="text-gray-500" />;
      }
    }
    return <Bell size={16} className="text-yellow-500" />;
  };

  const getMessage = (activity) => {
    if (activity.type === 'task') {
      const actionText = {
        created: 'Created task',
        updated: 'Updated task',
        deleted: 'Deleted task',
        completed: 'Completed task'
      }[activity.action] || 'Modified task';

      return (
        <span>
          {actionText} <span className="font-medium text-gray-900 dark:text-gray-100">"{activity.title}"</span>
        </span>
      );
    }
    return activity.title;
  };

  if (activities.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {activities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 text-sm"
          >
            <div className="mt-0.5 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-full">
              {getIcon(activity.type, activity.action)}
            </div>
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-300">
                {getMessage(activity)}
              </p>
              <span className="text-xs text-gray-400">
                {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
