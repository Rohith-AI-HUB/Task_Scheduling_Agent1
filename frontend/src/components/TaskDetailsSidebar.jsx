import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, AlertCircle, Calendar, Trash2, Edit } from 'lucide-react';
import clsx from 'clsx';
import useTaskStore from '../store/useTaskStore';
import { taskService } from '../services/task.service';
import { useToast } from '../store/useStore';

/**
 * TaskDetailsSidebar - Slide-out panel showing full task details
 *
 * Features:
 * - Glassmorphic slide-in panel
 * - Full task metadata display
 * - Complexity indicator
 * - Subtasks with status
 * - Edit and Delete actions
 * - Click outside to close
 */

export default function TaskDetailsSidebar() {
  const { selectedTask, setSelectedTask, deleteTask: removeTask } = useTaskStore();
  const toast = useToast();

  if (!selectedTask) return null;

  const handleClose = () => {
    setSelectedTask(null);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await taskService.deleteTask(selectedTask.id);
      removeTask(selectedTask.id);
      toast.success('Task deleted successfully');
      handleClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  // Format deadline
  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Render complexity dots
  const renderComplexityDots = () => {
    const score = Math.min(selectedTask.complexity_score || 0, 10);
    const dots = [];

    for (let i = 0; i < 10; i++) {
      const isFilled = i < score;
      const colorClass = isFilled
        ? score <= 3
          ? 'bg-green-500'
          : score <= 6
          ? 'bg-yellow-500'
          : 'bg-red-500'
        : 'bg-gray-300 dark:bg-gray-600';

      dots.push(
        <div
          key={i}
          className={clsx(
            'w-2 h-2 rounded-full transition-all duration-300',
            colorClass
          )}
        />
      );
    }

    return dots;
  };

  const priorityColors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100',
  };

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  return (
    <AnimatePresence>
      {selectedTask && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
          />

          {/* Sidebar Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[450px] z-50 overflow-y-auto"
          >
            <div className="glass-light dark:glass-dark h-full p-6">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={24} className="text-gray-600 dark:text-gray-300" />
              </button>

              {/* Task Title */}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pr-10">
                {selectedTask.title}
              </h2>

              {/* Status and Priority */}
              <div className="flex gap-2 mb-6">
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700">
                  {statusLabels[selectedTask.status] || selectedTask.status}
                </span>
                <span
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-semibold',
                    priorityColors[selectedTask.priority] || priorityColors.medium
                  )}
                >
                  {(selectedTask.priority || 'medium').toUpperCase()}
                </span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {selectedTask.description || 'No description provided'}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="space-y-4 mb-6">
                {/* Deadline */}
                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Deadline
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDeadline(selectedTask.deadline)}
                    </p>
                  </div>
                </div>

                {/* Estimated Hours */}
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Estimated Time
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTask.estimated_hours || 0} hours
                    </p>
                  </div>
                </div>

                {/* Complexity */}
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Complexity Score
                    </p>
                    <div className="flex gap-1">{renderComplexityDots()}</div>
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    AI-Generated Subtasks ({selectedTask.subtasks.length})
                  </h3>
                  <ul className="space-y-2">
                    {selectedTask.subtasks.map((subtask, index) => {
                      const subtaskText =
                        typeof subtask === 'string'
                          ? subtask
                          : subtask.title || subtask.name || 'Subtask';

                      return (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="text-purple-600 mt-1">•</span>
                          <span>{subtaskText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 mt-8">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  <Trash2 size={18} />
                  Delete Task
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
