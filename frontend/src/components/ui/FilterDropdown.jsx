import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

/**
 * FilterDropdown - Custom dropdown for filtering
 *
 * Features:
 * - Purple checkmarks for selected items
 * - Single-select mode
 * - Accessible keyboard navigation
 * - Click outside to close
 */

export default function FilterDropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'All',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    // If clicking the same value, deselect it (set to null)
    onChange(value === optionValue ? null : optionValue);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : placeholder;
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', isOpen && 'z-[60]')}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-500 text-xs">{label}:</span>
        <span>{getDisplayText()}</span>
        <ChevronDown
          size={16}
          className={clsx(
            'transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[60] py-2">
          {/* All/None option */}
          <button
            onClick={() => handleSelect(null)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-between"
          >
            <span>{placeholder}</span>
            {value === null && (
              <Check size={16} className="text-purple-600" />
            )}
          </button>

          {/* Divider */}
          {options.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          )}

          {/* Options */}
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-between"
            >
              <span>{option.label}</span>
              {value === option.value && (
                <Check size={16} className="text-purple-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
