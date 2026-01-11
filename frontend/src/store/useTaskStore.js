import { create } from 'zustand';

/**
 * Task Store - Centralized state management for Kanban board
 *
 * Features:
 * - Task CRUD operations
 * - Search and filter functionality
 * - Selected task for sidebar
 * - Optimistic updates with error handling
 */

const useTaskStore = create((set, get) => ({
  // State
  tasks: [],
  filters: {
    search: '',
    priority: null, // 'low' | 'medium' | 'high' | 'urgent' | null
    assignee: null,
    dueDateRange: null,
  },
  selectedTask: null,
  loading: false,
  error: null,

  // Actions
  setTasks: (tasks) => set({ tasks, loading: false }),

  addTask: (task) =>
    set((state) => {
      // Prevent duplicates
      if (state.tasks.find((t) => t.id === task.id)) {
        return state;
      }
      return { tasks: [task, ...state.tasks] };
    }),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask,
    })),

  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ),
    })),

  setFilter: (filterType, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [filterType]: value,
      },
    })),

  clearFilters: () =>
    set({
      filters: {
        search: '',
        priority: null,
        assignee: null,
        dueDateRange: null,
      },
    }),

  setSelectedTask: (task) => set({ selectedTask: task }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Computed getters
  getFilteredTasks: () => {
    const { tasks, filters } = get();
    let filtered = [...tasks];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    // Assignee filter
    if (filters.assignee) {
      filtered = filtered.filter((task) => task.assigned_to === filters.assignee);
    }

    // Due date range filter
    if (filters.dueDateRange) {
      const { start, end } = filters.dueDateRange;
      filtered = filtered.filter((task) => {
        const deadline = new Date(task.deadline);
        return deadline >= start && deadline <= end;
      });
    }

    return filtered;
  },

  getTasksByStatus: (status) => {
    const filteredTasks = get().getFilteredTasks();
    return filteredTasks.filter((task) => task.status === status);
  },

  getStatistics: () => {
    const tasks = get().tasks;
    const totalTasks = tasks.length;
    const todoTasks = tasks.filter((t) => t.status === 'todo').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      completionRate,
    };
  },
}));

export default useTaskStore;
