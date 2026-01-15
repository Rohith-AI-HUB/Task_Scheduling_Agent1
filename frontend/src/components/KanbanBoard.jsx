import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { ListTodo, Clock, CheckCircle2 } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
import useTaskStore from '../store/useTaskStore';
import { taskService } from '../services/task.service';
import { useToast } from '../store/useStore';

/**
 * KanbanBoard - Main drag-and-drop Kanban board component
 *
 * Features:
 * - Three columns: To Do, In Progress, Completed
 * - Drag-and-drop with @dnd-kit
 * - Optimistic updates with error rollback
 * - Touch support for mobile devices
 * - Real-time task filtering
 */

export default function KanbanBoard({ onAddTask }) {
  const { getTasksByStatus, moveTask } = useTaskStore();
  // ... existing code ...
  const toast = useToast();
  const [activeTask, setActiveTask] = useState(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press before drag starts on touch devices
        tolerance: 5,
      },
    })
  );

  // Get tasks by status
  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in_progress');
  const completedTasks = getTasksByStatus('completed');

  // Column configurations
  const columns = [
    {
      id: 'todo',
      title: 'To Do',
      icon: ListTodo,
      tasks: todoTasks,
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      icon: Clock,
      tasks: inProgressTasks,
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: CheckCircle2,
      tasks: completedTasks,
    },
  ];

  /**
   * Handle drag start
   */
  const handleDragStart = (event) => {
    const { active } = event;
    const task = [...todoTasks, ...inProgressTasks, ...completedTasks].find(
      (t) => t.id === active.id
    );
    setActiveTask(task);
  };

  /**
   * Handle drag end - Update task status
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveTask(null);

    // If dropped outside a droppable area or in the same column
    if (!over || active.id === over.id) {
      return;
    }

    const taskId = active.id;
    const allowedStatuses = ['todo', 'in_progress', 'completed'];
    const overId = String(over.id);
    const containerId = over?.data?.current?.sortable?.containerId;
    const newStatus = allowedStatuses.includes(overId)
      ? overId
      : allowedStatuses.includes(containerId)
      ? containerId
      : null;

    // Find the task being moved
    const task = [...todoTasks, ...inProgressTasks, ...completedTasks].find(
      (t) => t.id === taskId
    );

    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    if (!newStatus) {
      return;
    }

    // Don't update if status hasn't changed
    if (task.status === newStatus) {
      return;
    }

    const oldStatus = task.status;

    // Optimistic update
    moveTask(taskId, newStatus);

    try {
      // Update on server
      await taskService.updateTask(taskId, { status: newStatus });

      // Show success toast
      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Error moving task:', error);

      // Rollback on error
      moveTask(taskId, oldStatus);

      // Show error toast
      toast.error(error.response?.data?.detail || 'Failed to move task. Please try again.');
    }
  };

  /**
   * Handle drag cancel
   */
  const handleDragCancel = () => {
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Kanban Columns */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 overflow-x-auto pb-4 max-w-[1400px] mx-auto">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tasks={column.tasks}
            icon={column.icon}
            onAddTask={() => onAddTask && onAddTask(column.id)}
          />
        ))}
      </div>

      {/* Drag Overlay - Shows dragging card */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-90">
            <KanbanTaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
