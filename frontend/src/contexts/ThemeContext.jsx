import React, { createContext, useContext, useEffect } from 'react';
import { useThemeStore } from '../store/useStore';

/**
 * ThemeContext
 *
 * Provides theme-related functionality throughout the application:
 * - Dark mode management
 * - System preference detection
 * - Role-based theming (student/teacher)
 * - CSS custom property management
 */

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const {
    theme,
    setTheme,
    toggleTheme,
    detectSystemPreference,
    useSystemPreference,
    initTheme,
  } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Apply CSS custom properties for theme
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme class for Tailwind dark mode
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Add data attribute for additional theme-based styling
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
    detectSystemPreference,
    useSystemPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
