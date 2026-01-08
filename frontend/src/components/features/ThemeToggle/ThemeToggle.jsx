import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../store/useStore';

/**
 * ThemeToggle Component
 *
 * A beautiful, animated toggle button for switching between light and dark themes.
 *
 * Features:
 * - Smooth icon transition
 * - Visual feedback on hover
 * - Accessible with keyboard navigation
 * - Uses Zustand store for theme management
 */

const ThemeToggle = ({ className = '' }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative
        p-2
        rounded-lg
        transition-all
        duration-300
        ease-out
        hover:scale-110
        active:scale-95
        focus:outline-none
        focus:ring-2
        focus:ring-primary-500
        focus:ring-offset-2
        dark:focus:ring-offset-gray-800
        ${
          isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Icon container with smooth transition */}
      <div className="relative w-5 h-5">
        {/* Sun icon (light mode) */}
        <Sun
          className={`
            absolute
            inset-0
            w-5
            h-5
            transition-all
            duration-300
            ${
              isDark
                ? 'opacity-0 rotate-90 scale-0'
                : 'opacity-100 rotate-0 scale-100'
            }
          `}
        />

        {/* Moon icon (dark mode) */}
        <Moon
          className={`
            absolute
            inset-0
            w-5
            h-5
            transition-all
            duration-300
            ${
              isDark
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-0'
            }
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
