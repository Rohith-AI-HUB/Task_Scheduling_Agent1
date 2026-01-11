import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Clock, Star, User } from 'lucide-react';
import clsx from 'clsx';
import useTaskStore from '../store/useTaskStore';

/**
 * KanbanTaskCard - Draggable task card for Kanban board
 *
 * Features:
 * - Drag-and-drop with @dnd-kit
 * - Due date color coding (emerald/orange/pink)
 * - Purple priority stars (1-4 stars)
 * - Assignee avatar
 * - Subtask progress bar
 * - Glassmorphic design
 */

export default function KanbanTaskCard({ task }) {
  const { setSelectedTask } = useTaskStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Safe accessors with defaults
  const title = task?.title || 'Untitled Task';
  const description = task?.description || '';
  const priority = task?.priority || 'medium';
  const deadline = task?.deadline;
  const subtasks = task?.subtasks || [];

  // Due date color coding
  const getDueDateColor = () => {
    if (!deadline) return 'text-gray-500';

    const now = new Date();
    const due = new Date(deadline);
    const daysUntil = (due - now) / (1000 * 60 * 60 * 24);

    if (daysUntil > 7) return 'text-emerald-500'; // #10B981
    if (daysUntil > 3) return 'text-orange-500'; // #F97316
    return 'text-pink-500'; // #EC4899
  };

  // Format deadline
  const formatDeadline = () => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  // Priority stars (1-4 based on priority level)
  const renderPriorityStars = () => {
    const starCount = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    };

    const count = starCount[priority] || 2;

    return Array(count)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={14}
          className="fill-purple-600 text-purple-600"
        />
      ));
  };

  // Priority colors with borders
  const priorityConfig = {
    low: 'border-green-500',
    medium: 'border-yellow-500',
    high: 'border-orange-500',
    urgent: 'border-red-500',
  };

  const borderColor = priorityConfig[priority] || priorityConfig.medium;

  // Subtask progress calculation
  const completedSubtasks = subtasks.filter(
    (st) => st.status === 'completed' || st.status === 'done'
  ).length;
  const subtaskProgress =
    subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  // Get user initials for avatar (placeholder)
  const getUserInitials = () => {
    // This is a placeholder - in real implementation, fetch from user data
    return 'U';
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={() => setSelectedTask(task)}
      className={clsx(
        // Glassmorphism effect
        'glass-light dark:glass-dark',
        'rounded-lg p-4',
        // Priority border
        'border-l-4',
        borderColor,
        // Drag cursor
        'cursor-grab active:cursor-grabbing',
        // Hover effects
        'hover:scale-[1.02]',
        'hover:shadow-lg',
        // Transition
        'transition-all duration-200',
        // Dragging state
        isDragging && 'shadow-2xl scale-105 rotate-2'
      )}
    >
      {/* Title */}
      <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description (truncated to 2 lines) */}
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
          {description}
        </p>
      )}

      {/* Due Date Badge */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className={getDueDateColor()} />
        <span className={clsx('text-xs font-medium', getDueDateColor())}>
          {formatDeadline()}
        </span>
      </div>

      {/* Priority Stars */}
      <div className="flex items-center gap-1 mb-3">
        {renderPriorityStars()}
      </div>

      {/* Bottom Row: Avatar + Progress Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Assignee Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-xs font-semibold"
          title="Assignee"
        >
          {getUserInitials()}
        </div>

        {/* Subtask Progress Bar */}
        {subtasks.length > 0 && (
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">
                {completedSubtasks}/{subtasks.length}
              </span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
