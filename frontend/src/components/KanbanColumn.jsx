import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import KanbanTaskCard from './KanbanTaskCard';

/**
 * KanbanColumn - Droppable column for Kanban board
 *
 * Features:
 * - Droppable zone using @dnd-kit
 * - Glassmorphic design
 * - Task count badge
 * - Scrollable task list
 * - Empty state placeholder
 */

export default function KanbanColumn({ status, title, tasks, icon: Icon, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  const statusColors = {
    todo: { border: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    in_progress: { border: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    completed: { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  };

  const colors = statusColors[status] || statusColors.todo;

  return (
    <div
      className={clsx(
        'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/40 dark:border-gray-700/50',
        'rounded-2xl shadow-xl',
        'min-h-[600px] w-full md:w-[400px]',
        'flex flex-col transition-all duration-300',
        `border-t-4 ${colors.border}`,
        // Glow effect when dragging over
        isOver && 'ring-2 ring-purple-500 ring-opacity-50 shadow-glow-purple scale-[1.02]'
      )}
    >
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`${colors.bg} p-2 rounded-lg`}>
            {Icon && <Icon size={18} className={colors.text} />}
          </div>
          <h2 className="text-gray-800 dark:text-white font-extrabold text-lg">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {onAddTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
              title="Add task to this column"
            >
              <Plus size={18} />
            </button>
          )}
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <KanbanTaskCard key={task.id} task={task} />)
          ) : (
            <EmptyState title={title} />
          )}
        </SortableContext>
      </div>
    </div>
  );
}

/**
 * EmptyState - Placeholder when column is empty
 */
function EmptyState({ title }) {
  const messages = {
    'To Do': 'No tasks to do yet',
    'In Progress': 'No tasks in progress',
    'Completed': 'No completed tasks',
  };

  const emojis = {
    'To Do': '📝',
    'In Progress': '⚡',
    'Completed': '🎉',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <span className="text-6xl mb-4 grayscale opacity-50">{emojis[title] || '📋'}</span>
      <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
        {messages[title] || 'No tasks here'}
      </p>
      <p className="text-gray-300 dark:text-gray-600 text-xs mt-2">
        Drag tasks here to update status
      </p>
    </motion.div>
  );
}
