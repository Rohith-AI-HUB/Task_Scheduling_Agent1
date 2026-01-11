import { Plus } from 'lucide-react';
import SearchInput from './ui/SearchInput';
import FilterDropdown from './ui/FilterDropdown';
import useTaskStore from '../store/useTaskStore';
import { useAuth } from '../store/useStore';

/**
 * KanbanToolbar - Top toolbar with search, filters, and new task button
 *
 * Features:
 * - Purple background (#7C3AED)
 * - Search input with debouncing
 * - Priority filter dropdown
 * - New Task button (purple gradient)
 * - Role-based rendering
 */

export default function KanbanToolbar({ onNewTask }) {
  const { filters, setFilter, clearFilters } = useTaskStore();
  const { isTeacher } = useAuth();

  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  return (
    <div className="bg-purple-600 dark:bg-purple-800 rounded-xl shadow-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Bar */}
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Search tasks..."
        />

        {/* Priority Filter */}
        <FilterDropdown
          label="Priority"
          options={priorityOptions}
          value={filters.priority}
          onChange={(value) => setFilter('priority', value)}
          placeholder="All"
        />

        {/* Clear Filters Button */}
        {(filters.search || filters.priority) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm font-medium rounded-lg transition-all"
          >
            Clear Filters
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-[20px]" />

        {/* New Task Button - Show for teachers */}
        {isTeacher && (
          <button
            onClick={onNewTask}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            New Task
          </button>
        )}
      </div>
    </div>
  );
}
