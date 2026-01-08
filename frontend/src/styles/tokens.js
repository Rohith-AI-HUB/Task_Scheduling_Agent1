/**
 * Design Token System
 * Comprehensive design tokens for the Task Scheduling Agent
 *
 * This file defines all design constants used throughout the application:
 * - Colors (light/dark themes, role-based variants)
 * - Typography (fonts, sizes, weights)
 * - Spacing (8px grid system)
 * - Shadows (including glassmorphism effects)
 * - Border radius
 * - Animations (timing, easing)
 * - Glassmorphism settings
 */

export const tokens = {
  // ========================================
  // COLOR SYSTEM
  // ========================================

  colors: {
    // Light Theme Colors
    light: {
      // Primary Colors
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',  // Main primary
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },

      // Accent Colors
      accent: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },

      // Success Colors
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',  // Main success
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },

      // Error Colors
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',  // Main error
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },

      // Warning Colors
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',  // Main warning
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },

      // Neutral Colors
      neutral: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },

      // Background Colors
      background: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        tertiary: '#f3f4f6',
      },

      // Text Colors
      text: {
        primary: '#111827',
        secondary: '#6b7280',
        tertiary: '#9ca3af',
        inverse: '#ffffff',
      },

      // Border Colors
      border: {
        light: '#f3f4f6',
        medium: '#e5e7eb',
        dark: '#d1d5db',
      },
    },

    // Dark Theme Colors
    dark: {
      // Primary Colors (slightly brighter for dark mode)
      primary: {
        50: '#1e3a8a',
        100: '#1e40af',
        200: '#1d4ed8',
        300: '#2563eb',
        400: '#3b82f6',
        500: '#60a5fa',  // Main primary for dark
        600: '#93c5fd',
        700: '#bfdbfe',
        800: '#dbeafe',
        900: '#eff6ff',
      },

      // Accent Colors
      accent: {
        50: '#581c87',
        100: '#6b21a8',
        200: '#7e22ce',
        300: '#9333ea',
        400: '#a855f7',
        500: '#c084fc',  // Main accent for dark
        600: '#d8b4fe',
        700: '#e9d5ff',
        800: '#f3e8ff',
        900: '#faf5ff',
      },

      // Success Colors
      success: {
        50: '#14532d',
        100: '#166534',
        200: '#15803d',
        300: '#16a34a',
        400: '#22c55e',
        500: '#4ade80',  // Main success for dark
        600: '#86efac',
        700: '#bbf7d0',
        800: '#dcfce7',
        900: '#f0fdf4',
      },

      // Error Colors
      error: {
        50: '#7f1d1d',
        100: '#991b1b',
        200: '#b91c1c',
        300: '#dc2626',
        400: '#ef4444',
        500: '#f87171',  // Main error for dark
        600: '#fca5a5',
        700: '#fecaca',
        800: '#fee2e2',
        900: '#fef2f2',
      },

      // Warning Colors
      warning: {
        50: '#78350f',
        100: '#92400e',
        200: '#b45309',
        300: '#d97706',
        400: '#f59e0b',
        500: '#fbbf24',  // Main warning for dark
        600: '#fcd34d',
        700: '#fde68a',
        800: '#fef3c7',
        900: '#fffbeb',
      },

      // Neutral Colors
      neutral: {
        50: '#171717',
        100: '#262626',
        200: '#404040',
        300: '#525252',
        400: '#737373',
        500: '#a3a3a3',
        600: '#d4d4d4',
        700: '#e5e5e5',
        800: '#f5f5f5',
        900: '#fafafa',
      },

      // Background Colors
      background: {
        primary: '#0f172a',     // Slate 900
        secondary: '#1e293b',   // Slate 800
        tertiary: '#334155',    // Slate 700
      },

      // Text Colors
      text: {
        primary: '#f8fafc',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
        inverse: '#0f172a',
      },

      // Border Colors
      border: {
        light: '#334155',
        medium: '#475569',
        dark: '#64748b',
      },
    },

    // Role-Based Colors
    role: {
      student: {
        primary: '#3b82f6',      // Blue - learning, growth
        accent: '#8b5cf6',       // Purple - creativity
        gradient: {
          from: '#3b82f6',
          to: '#8b5cf6',
        },
      },
      teacher: {
        primary: '#c89968',      // Gold - authority, achievement
        accent: '#ef4444',       // Red - urgency, attention
        gradient: {
          from: '#f59e0b',       // Amber
          to: '#ef4444',         // Red
        },
      },
    },
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================

  typography: {
    // Font Families
    fonts: {
      display: '"Clash Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    },

    // Font Sizes (based on fluid typography)
    sizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
      '7xl': '4.5rem',   // 72px
    },

    // Font Weights
    weights: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },

    // Line Heights
    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },

    // Letter Spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // ========================================
  // SPACING (8px grid system)
  // ========================================

  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    3.5: '0.875rem',   // 14px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    9: '2.25rem',      // 36px
    10: '2.5rem',      // 40px
    11: '2.75rem',     // 44px
    12: '3rem',        // 48px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    28: '7rem',        // 112px
    32: '8rem',        // 128px
    36: '9rem',        // 144px
    40: '10rem',       // 160px
    44: '11rem',       // 176px
    48: '12rem',       // 192px
    52: '13rem',       // 208px
    56: '14rem',       // 224px
    60: '15rem',       // 240px
    64: '16rem',       // 256px
    72: '18rem',       // 288px
    80: '20rem',       // 320px
    96: '24rem',       // 384px
  },

  // ========================================
  // SHADOWS
  // ========================================

  shadows: {
    // Standard Shadows
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

    // Inner Shadows
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

    // Glassmorphism Shadows
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    glassHover: '0 12px 48px 0 rgba(31, 38, 135, 0.25)',

    // Colored Shadows (for priority indicators)
    glow: {
      blue: '0 0 20px rgba(59, 130, 246, 0.4)',
      purple: '0 0 20px rgba(168, 85, 247, 0.4)',
      green: '0 0 20px rgba(34, 197, 94, 0.4)',
      red: '0 0 20px rgba(239, 68, 68, 0.4)',
      amber: '0 0 20px rgba(245, 158, 11, 0.4)',
      gold: '0 0 20px rgba(200, 153, 104, 0.4)',
    },

    // None
    none: 'none',
  },

  // ========================================
  // BORDER RADIUS
  // ========================================

  borderRadius: {
    none: '0',
    sm: '0.125rem',      // 2px
    base: '0.25rem',     // 4px
    md: '0.375rem',      // 6px
    lg: '0.5rem',        // 8px
    xl: '0.75rem',       // 12px
    '2xl': '1rem',       // 16px
    '3xl': '1.5rem',     // 24px
    full: '9999px',
  },

  // ========================================
  // ANIMATIONS
  // ========================================

  animation: {
    // Duration
    duration: {
      fastest: '100ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slowest: '700ms',
    },

    // Easing Functions
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },

    // Keyframes (for Tailwind extend)
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0', transform: 'translateY(10px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
      fadeOut: {
        '0%': { opacity: '1', transform: 'translateY(0)' },
        '100%': { opacity: '0', transform: 'translateY(10px)' },
      },
      slideInRight: {
        '0%': { transform: 'translateX(100%)' },
        '100%': { transform: 'translateX(0)' },
      },
      slideInLeft: {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(0)' },
      },
      slideInUp: {
        '0%': { transform: 'translateY(100%)' },
        '100%': { transform: 'translateY(0)' },
      },
      slideInDown: {
        '0%': { transform: 'translateY(-100%)' },
        '100%': { transform: 'translateY(0)' },
      },
      scaleIn: {
        '0%': { transform: 'scale(0.9)', opacity: '0' },
        '100%': { transform: 'scale(1)', opacity: '1' },
      },
      scaleOut: {
        '0%': { transform: 'scale(1)', opacity: '1' },
        '100%': { transform: 'scale(0.9)', opacity: '0' },
      },
      pulse: {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.5' },
      },
      shimmer: {
        '0%': { backgroundPosition: '-1000px 0' },
        '100%': { backgroundPosition: '1000px 0' },
      },
      glow: {
        '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
        '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)' },
      },
    },
  },

  // ========================================
  // GLASSMORPHISM SETTINGS
  // ========================================

  glassmorphism: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backgroundHover: 'rgba(255, 255, 255, 0.85)',
      blur: '10px',
      blurIntense: '20px',
      border: 'rgba(255, 255, 255, 0.3)',
      borderHover: 'rgba(255, 255, 255, 0.5)',
      shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      shadowHover: '0 12px 48px 0 rgba(31, 38, 135, 0.25)',
    },
    dark: {
      background: 'rgba(15, 23, 42, 0.7)',      // Slate 900 with opacity
      backgroundHover: 'rgba(15, 23, 42, 0.85)',
      blur: '10px',
      blurIntense: '20px',
      border: 'rgba(148, 163, 184, 0.2)',       // Slate 400 with low opacity
      borderHover: 'rgba(148, 163, 184, 0.3)',
      shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      shadowHover: '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
    },
  },

  // ========================================
  // BREAKPOINTS (for reference)
  // ========================================

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ========================================
  // Z-INDEX SCALE
  // ========================================

  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Export individual token categories for convenience
export const colors = tokens.colors;
export const typography = tokens.typography;
export const spacing = tokens.spacing;
export const shadows = tokens.shadows;
export const borderRadius = tokens.borderRadius;
export const animation = tokens.animation;
export const glassmorphism = tokens.glassmorphism;
export const breakpoints = tokens.breakpoints;
export const zIndex = tokens.zIndex;

export default tokens;
