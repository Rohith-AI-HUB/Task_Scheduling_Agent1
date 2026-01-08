import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Global State Management with Zustand
 *
 * This store manages:
 * - Authentication state (user, token)
 * - Theme state (dark mode, role-based theming)
 * - Notification state
 * - UI state (modals, toasts)
 */

// ========================================
// AUTH STORE
// ========================================

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      role: null, // 'student' or 'teacher'

      // Actions
      login: (userData, authToken) => {
        set({
          user: userData,
          token: authToken,
          isAuthenticated: true,
          role: userData?.role || null,
        });

        // Also store in localStorage for backward compatibility
        localStorage.setItem('token', authToken);
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          role: null,
        });

        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },

      updateUser: (userData) => {
        set({ user: userData, role: userData?.role || null });
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
      },

      // Initialize from localStorage (for backward compatibility)
      initAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({
              user,
              token,
              isAuthenticated: true,
              role: user?.role || null,
            });
          } catch (error) {
            console.error('Failed to parse user from localStorage:', error);
            get().logout();
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        role: state.role,
      }),
    }
  )
);

// ========================================
// THEME STORE
// ========================================

export const useThemeStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'light', // 'light' or 'dark'
      systemPreference: null,

      // Actions
      setTheme: (newTheme) => {
        set({ theme: newTheme });

        // Apply theme to document
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      detectSystemPreference: () => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        set({ systemPreference: prefersDark ? 'dark' : 'light' });
        return prefersDark ? 'dark' : 'light';
      },

      useSystemPreference: () => {
        const systemTheme = get().detectSystemPreference();
        get().setTheme(systemTheme);
      },

      // Initialize theme on app load
      initTheme: () => {
        const { theme, detectSystemPreference } = get();

        // If no theme set, use system preference
        if (!theme) {
          const systemTheme = detectSystemPreference();
          get().setTheme(systemTheme);
        } else {
          // Apply stored theme
          get().setTheme(theme);
        }

        // Listen for system theme changes
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (e) => {
            set({ systemPreference: e.matches ? 'dark' : 'light' });
          });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

// ========================================
// NOTIFICATION STORE
// ========================================

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,

  // Actions
  addNotification: (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(), // Unique ID
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: (notificationId) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.read;

      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },

  clearAllNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },
}));

// ========================================
// UI STORE (Modals, Toasts, etc.)
// ========================================

export const useUIStore = create((set) => ({
  // Modal state
  activeModal: null,
  modalData: null,

  // Toast state
  toasts: [],

  // Actions
  openModal: (modalName, data = null) => {
    set({ activeModal: modalName, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  addToast: (toast) => {
    const newToast = {
      id: Date.now() + Math.random(),
      type: 'info', // 'success', 'error', 'warning', 'info'
      duration: 3000, // Auto-dismiss after 3 seconds
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== newToast.id),
        }));
      }, newToast.duration);
    }

    return newToast.id;
  },

  removeToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// ========================================
// GAMIFICATION STORE (for future use)
// ========================================

export const useGamificationStore = create(
  persist(
    (set, get) => ({
      // State
      xp: 0,
      level: 1,
      badges: [],
      currentStreak: 0,
      bestStreak: 0,
      totalTasksCompleted: 0,
      totalFocusHours: 0,
      lastActiveDate: null,

      // Actions
      addXP: (amount) => {
        set((state) => {
          const newXP = state.xp + amount;
          const newLevel = Math.floor(newXP / 100) + 1;
          return { xp: newXP, level: newLevel };
        });
      },

      awardBadge: (badge) => {
        set((state) => {
          if (state.badges.some((b) => b.id === badge.id)) {
            return state; // Already has this badge
          }
          return {
            badges: [...state.badges, { ...badge, earnedAt: new Date() }],
          };
        });
      },

      incrementTasksCompleted: () => {
        set((state) => ({
          totalTasksCompleted: state.totalTasksCompleted + 1,
        }));
      },

      updateStreak: () => {
        const today = new Date().toDateString();
        const lastActive = get().lastActiveDate;

        if (lastActive !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const isConsecutive = lastActive === yesterday.toDateString();

          set((state) => {
            const newStreak = isConsecutive ? state.currentStreak + 1 : 1;
            return {
              currentStreak: newStreak,
              bestStreak: Math.max(newStreak, state.bestStreak),
              lastActiveDate: today,
            };
          });
        }
      },

      addFocusHours: (hours) => {
        set((state) => ({
          totalFocusHours: state.totalFocusHours + hours,
        }));
      },

      reset: () => {
        set({
          xp: 0,
          level: 1,
          badges: [],
          currentStreak: 0,
          bestStreak: 0,
          totalTasksCompleted: 0,
          totalFocusHours: 0,
          lastActiveDate: null,
        });
      },
    }),
    {
      name: 'gamification-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ========================================
// INITIALIZE STORES
// ========================================

// Call this function in your app's main entry point (main.jsx or App.jsx)
export const initializeStores = () => {
  useAuthStore.getState().initAuth();
  useThemeStore.getState().initTheme();
};

// ========================================
// UTILITY HOOKS
// ========================================

// Combined auth + role hook
export const useAuth = () => {
  const { user, token, isAuthenticated, role, login, logout, updateUser } =
    useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    role,
    isStudent: role === 'student',
    isTeacher: role === 'teacher',
    login,
    logout,
    updateUser,
  };
};

// Theme hook with role-based theming
export const useTheme = () => {
  const { theme, setTheme, toggleTheme, useSystemPreference } = useThemeStore();
  const { role } = useAuthStore();

  return {
    theme,
    isDark: theme === 'dark',
    role,
    isStudent: role === 'student',
    isTeacher: role === 'teacher',
    setTheme,
    toggleTheme,
    useSystemPreference,
  };
};

// Toast helper hook
export const useToast = () => {
  const { addToast } = useUIStore();

  return {
    success: (message, options = {}) =>
      addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) =>
      addToast({ type: 'error', message, duration: 5000, ...options }),
    warning: (message, options = {}) =>
      addToast({ type: 'warning', message, duration: 4000, ...options }),
    info: (message, options = {}) =>
      addToast({ type: 'info', message, ...options }),
  };
};

// ========================================
// CALENDAR STORE
// ========================================

export const useCalendarStore = create(
  persist(
    (set, get) => ({
      // State
      isConnected: false,
      syncEnabled: false,
      lastSyncAt: null,
      pendingConflicts: 0,
      totalSynced: 0,
      calendarId: null,

      // Actions
      setConnected: (connected) => set({ isConnected: connected }),

      setSyncStatus: (status) =>
        set({
          isConnected: status.connected || false,
          syncEnabled: status.sync_enabled || false,
          lastSyncAt: status.last_sync_at || null,
          pendingConflicts: status.pending_conflicts || 0,
          totalSynced: status.total_synced || 0,
          calendarId: status.calendar_id || null,
        }),

      updateLastSync: () => set({ lastSyncAt: new Date().toISOString() }),

      incrementConflicts: () =>
        set((state) => ({ pendingConflicts: state.pendingConflicts + 1 })),

      decrementConflicts: () =>
        set((state) => ({
          pendingConflicts: Math.max(0, state.pendingConflicts - 1),
        })),

      reset: () =>
        set({
          isConnected: false,
          syncEnabled: false,
          lastSyncAt: null,
          pendingConflicts: 0,
          totalSynced: 0,
          calendarId: null,
        }),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default {
  useAuthStore,
  useThemeStore,
  useNotificationStore,
  useUIStore,
  useGamificationStore,
  useCalendarStore,
  useAuth,
  useTheme,
  useToast,
  initializeStores,
};
