import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, AlertCircle, Calendar, Trash2, Edit, GraduationCap, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import useTaskStore from '../store/useTaskStore';
import { taskService } from '../services/task.service';
import { useToast } from '../store/useStore';
import EditTaskModal from './EditTaskModal';

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
  const { selectedTask, setSelectedTask, deleteTask: removeTask, updateTask } = useTaskStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [subtasksBase, setSubtasksBase] = useState([]);
  const [subtasksDraft, setSubtasksDraft] = useState([]);
  const [subtasksSaving, setSubtasksSaving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const normalizeSubtasks = (subtasks) => {
    const list = Array.isArray(subtasks) ? subtasks : [];
    return list.map((st) => {
      if (typeof st === 'string') {
        return { title: st, text: st, completed: false, status: 'todo' };
      }

      const title = st.title || st.text || st.name || st.subtask || '';
      const completed = Boolean(st.completed ?? (st.status === 'completed'));
      const status = completed ? 'completed' : 'todo';

      return {
        ...st,
        title,
        text: typeof st.text === 'string' ? title : st.text,
        completed,
        status,
      };
    });
  };

  useEffect(() => {
    if (!selectedTask) {
      setSubtasksBase([]);
      setSubtasksDraft([]);
      return;
    }

    const normalized = normalizeSubtasks(selectedTask.subtasks);
    setSubtasksBase(normalized);
    setSubtasksDraft(normalized);
  }, [selectedTask?.id]);

  if (!selectedTask) return null;

  const isTeacherAssigned = selectedTask.is_teacher_assigned === true;
  const teacherInfo = selectedTask.teacher_info || {};
  const subject = selectedTask.subject || '';

  const persistSubtasks = async (nextDraft, successMessage) => {
    const taskId = selectedTask.id;
    const prevSubtasks = selectedTask.subtasks;
    const nextSubtasks = normalizeSubtasks(nextDraft);

    setSubtasksSaving(true);
    setSelectedTask({ ...selectedTask, subtasks: nextSubtasks });
    updateTask(taskId, { subtasks: nextSubtasks });

    try {
      await taskService.updateTask(taskId, { subtasks: nextSubtasks });
      setSubtasksBase(nextSubtasks);
      setSubtasksDraft(nextSubtasks);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      const currentSelectedTask = useTaskStore.getState().selectedTask;
      if (currentSelectedTask?.id === taskId) {
        setSelectedTask({ ...currentSelectedTask, subtasks: prevSubtasks });
        updateTask(taskId, { subtasks: prevSubtasks });
        const normalizedPrev = normalizeSubtasks(prevSubtasks);
        setSubtasksBase(normalizedPrev);
        setSubtasksDraft(normalizedPrev);
      }
      toast.error(error.response?.data?.detail || 'Failed to update subtasks');
    } finally {
      setSubtasksSaving(false);
    }
  };

  const handleToggleSubtask = async (index) => {
    const next = subtasksDraft.map((st, i) =>
      i === index ? { ...st, completed: !st.completed, status: st.completed ? 'todo' : 'completed' } : st
    );
    setSubtasksDraft(next);
    await persistSubtasks(next);
  };

  const handleChangeSubtaskTitle = (index, value) => {
    setSubtasksDraft((prev) =>
      prev.map((st, i) =>
        i === index ? { ...st, title: value, text: typeof st.text === 'string' ? value : st.text } : st
      )
    );
  };

  const handleCommitSubtaskTitle = async (index) => {
    const draft = subtasksDraft[index];
    const base = subtasksBase[index];
    if (!draft || !base) return;
    if ((draft.title || '').trim() === (base.title || '').trim()) return;
    const next = subtasksDraft.map((st, i) =>
      i === index
        ? { ...st, title: (st.title || '').trim(), text: typeof st.text === 'string' ? (st.title || '').trim() : st.text }
        : st
    );
    setSubtasksDraft(next);
    await persistSubtasks(next, 'Subtask updated');
  };

  const handleAddSubtask = async () => {
    const title = (newSubtaskTitle || '').trim();
    if (!title) return;

    const next = [...subtasksDraft, { title, completed: false, status: 'todo', ai_generated: false }];
    setNewSubtaskTitle('');
    setSubtasksDraft(next);
    await persistSubtasks(next, 'Subtask added');
  };

  const handleClose = () => {
    setSelectedTask(null);
  };

  const handleEdit = async (taskId, formData) => {
    setEditLoading(true);
    setEditError('');
    try {
      await taskService.updateTask(taskId, {
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      });
      // Update the task in the store
      updateTask(taskId, {
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      });
      // Update selectedTask to reflect changes
      setSelectedTask({
        ...selectedTask,
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      });
      toast.success('Task updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating task:', error);
      setEditError(error.response?.data?.detail || 'Failed to update task');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRequestExtension = () => {
    // Navigate to extensions page with the task pre-selected
    navigate('/extensions', { state: { preSelectedTaskId: selectedTask.id } });
    handleClose();
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
              {subtasksDraft && subtasksDraft.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Subtasks ({subtasksDraft.length})
                  </h3>
                  <ul className="space-y-2">
                    {subtasksDraft.map((subtask, index) => {
                      return (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
                            checked={Boolean(subtask.completed)}
                            disabled={subtasksSaving}
                            onChange={() => handleToggleSubtask(index)}
                          />
                          <input
                            value={subtask.title || ''}
                            disabled={subtasksSaving}
                            onChange={(e) => handleChangeSubtaskTitle(index, e.target.value)}
                            onBlur={() => handleCommitSubtaskTitle(index)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            className={clsx(
                              'w-full bg-transparent outline-none rounded-md px-1 py-0.5',
                              'focus:ring-2 focus:ring-purple-500/40',
                              subtask.completed && 'line-through text-gray-400 dark:text-gray-500'
                            )}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newSubtaskTitle}
                      disabled={subtasksSaving}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask();
                      }}
                      placeholder="Add a subtask…"
                      className="flex-1 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      disabled={subtasksSaving || !newSubtaskTitle.trim()}
                      onClick={handleAddSubtask}
                      className="px-3 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Teacher Assignment Info - Only show for teacher-assigned tasks */}
              {isTeacherAssigned && (
                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border border-indigo-200 dark:border-indigo-700">
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                    <GraduationCap size={18} />
                    Assigned by Teacher
                  </h3>
                  <div className="space-y-2">
                    {teacherInfo.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{teacherInfo.name}</span>
                      </div>
                    )}
                    {teacherInfo.usn && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-gray-600 dark:text-gray-400">USN:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{teacherInfo.usn}</span>
                      </div>
                    )}
                    {subject && (
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-gray-600 dark:text-gray-400">Subject:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{subject}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 mt-8">
                {/* Edit Button - Always visible for own tasks */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <Edit size={18} />
                  Edit Task
                </button>

                {/* Extension Request Shortcut - Only for teacher-assigned tasks */}
                {isTeacherAssigned && (
                  <button
                    onClick={handleRequestExtension}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <ExternalLink size={18} />
                    Request Extension
                  </button>
                )}

                {/* Delete Button - Only for self-created tasks (not teacher-assigned) */}
                {!isTeacherAssigned && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                  >
                    <Trash2 size={18} />
                    Delete Task
                  </button>
                )}

                {/* Info for teacher-assigned tasks */}
                {isTeacherAssigned && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
                    Tasks assigned by teachers cannot be deleted
                  </p>
                )}
              </div>
            </div>
          </motion.aside>

          {/* Edit Task Modal */}
          <EditTaskModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditError('');
            }}
            onSubmit={handleEdit}
            task={selectedTask}
            loading={editLoading}
            error={editError}
          />
        </>
      )}
    </AnimatePresence>
  );
}
