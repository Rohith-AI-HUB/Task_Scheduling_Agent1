import { useState } from 'react';
import { Clock, AlertCircle, CheckCircle2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * TaskCard Component (Enhanced with Glassmorphism)
 *
 * Features:
 * - Glassmorphic design with backdrop blur
 * - Priority color accent with glow effect
 * - Animated hover states
 * - Expandable AI analysis section
 * - Visual complexity indicator
 * - Smooth transitions
 */

export default function TaskCard({ task, onUpdate, onDelete }) {
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Safe accessors with defaults
  const title = task?.title || 'Untitled Task';
  const description = task?.description || 'No description';
  const priority = task?.priority || 'medium';
  const estimatedHours = task?.estimated_hours || 0;
  const complexityScore = task?.complexity_score || 0;
  const subtasks = task?.subtasks || [];

  // Priority colors with glow effects
  const priorityConfig = {
    low: {
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      border: 'border-green-500',
      glow: 'hover:shadow-glow-green',
    },
    medium: {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      border: 'border-yellow-500',
      glow: 'hover:shadow-glow-amber',
    },
    high: {
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      border: 'border-orange-500',
      glow: 'hover:shadow-glow-amber',
    },
    urgent: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      border: 'border-red-500',
      glow: 'hover:shadow-glow-red',
    },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;

  // Complexity visual indicator (colored dots)
  const renderComplexityDots = () => {
    const dots = [];
    const score = Math.min(complexityScore, 10); // Cap at 10

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
            'w-1.5 h-1.5 rounded-full transition-all duration-300',
            colorClass
          )}
        />
      );
    }

    return dots;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        // Glassmorphism effect
        'glass-light dark:glass-dark',
        'rounded-xl p-6',
        // Border with priority color
        'border-l-4',
        config.border,
        // Hover effects
        'hover:scale-[1.02]',
        config.glow,
        // Transition
        'transition-all duration-300'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
        <span
          className={clsx(
            'px-3 py-1 rounded-lg text-xs font-semibold',
            config.badge
          )}
        >
          {priority.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        {description}
      </p>

      {/* Metrics Row */}
      <div className="flex items-center gap-6 mt-4">
        {/* Estimated Hours */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock size={16} className="text-blue-500" />
          <span className="font-medium">{estimatedHours}h</span>
        </div>

        {/* Complexity Score */}
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="text-purple-500" />
          <span className="font-medium text-gray-600 dark:text-gray-400">
            Complexity:
          </span>
          <div className="flex gap-0.5 ml-1">{renderComplexityDots()}</div>
        </div>
      </div>

      {/* AI-Generated Subtasks (Expandable) */}
      {subtasks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {showSubtasks ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
            AI-Generated Subtasks ({subtasks.length})
          </button>

          <AnimatePresence>
            {showSubtasks && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-600 dark:text-gray-400 ml-6 mt-2 space-y-1 overflow-hidden"
              >
                {subtasks.map((st, i) => {
                  // Handle all possible subtask formats
                  let subtaskText = 'Subtask';
                  if (typeof st === 'string') {
                    subtaskText = st;
                  } else if (st && typeof st === 'object') {
                    subtaskText = String(
                      st.title || st.name || st.text || 'Subtask'
                    );
                  }

                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="list-disc"
                    >
                      {subtaskText}
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onUpdate(task.id, { status: 'completed' })}
          className={clsx(
            'flex items-center gap-2',
            'px-4 py-2 rounded-lg',
            'text-sm font-medium',
            'bg-green-500 hover:bg-green-600',
            'text-white',
            'transition-all duration-200',
            'hover:scale-105 active:scale-95',
            'shadow-md hover:shadow-lg'
          )}
        >
          <CheckCircle2 size={16} />
          Complete
        </button>

        <button
          onClick={() => onDelete(task.id)}
          className={clsx(
            'flex items-center gap-2',
            'px-4 py-2 rounded-lg',
            'text-sm font-medium',
            'bg-red-500 hover:bg-red-600',
            'text-white',
            'transition-all duration-200',
            'hover:scale-105 active:scale-95',
            'shadow-md hover:shadow-lg'
          )}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </motion.div>
  );
}
