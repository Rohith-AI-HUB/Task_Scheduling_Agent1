import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import KanbanTaskCard from './KanbanTaskCard';

/**
 * KanbanColumn - Droppable column for Kanban board
 *
 * Features:
 * - Droppable zone using @dnd-kit
 * - Purple gradient header
 * - Task count badge
 * - Scrollable task list
 * - Empty state placeholder
 */

export default function KanbanColumn({ status, title, tasks, icon: Icon }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl shadow-lg',
        'min-h-[600px] w-full md:w-[350px]',
        'flex flex-col',
        // Glow effect when dragging over
        isOver && 'ring-2 ring-purple-500 ring-opacity-50 shadow-glow-purple'
      )}
    >
      {/* Column Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={20} className="text-white" />}
            <h2 className="text-white font-bold text-lg">{title}</h2>
          </div>
          <span className="bg-white bg-opacity-30 text-white px-3 py-1 rounded-full text-sm font-semibold">
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
      <span className="text-6xl mb-4">{emojis[title] || '📋'}</span>
      <p className="text-gray-400 dark:text-gray-500 text-sm">
        {messages[title] || 'No tasks here'}
      </p>
      <p className="text-gray-300 dark:text-gray-600 text-xs mt-2">
        Drag tasks here to update status
      </p>
    </motion.div>
  );
}
