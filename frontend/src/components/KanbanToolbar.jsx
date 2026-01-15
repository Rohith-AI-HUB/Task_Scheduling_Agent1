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

export default function KanbanToolbar() {
  const { filters, setFilter, clearFilters } = useTaskStore();
  const { isTeacher } = useAuth();

  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  return (
    <div className="relative z-50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-2xl shadow-sm p-4 mb-8">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilter('search', value)}
            placeholder="Search tasks..."
          />
        </div>

        {/* Priority Filter */}
        <FilterDropdown
          label="Priority"
          options={priorityOptions}
          value={filters.priority}
          onChange={(value) => setFilter('priority', value)}
          placeholder="All Priorities"
        />

        {/* Clear Filters Button */}
        {(filters.search || filters.priority) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
