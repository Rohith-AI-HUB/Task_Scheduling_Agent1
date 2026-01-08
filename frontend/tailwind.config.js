import { tokens } from './src/styles/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Enable dark mode with class strategy
  darkMode: 'class',

  theme: {
    extend: {
      // ========================================
      // COLORS
      // ========================================
      colors: {
        // Light theme colors
        primary: tokens.colors.light.primary,
        accent: tokens.colors.light.accent,
        success: tokens.colors.light.success,
        error: tokens.colors.light.error,
        warning: tokens.colors.light.warning,
        neutral: tokens.colors.light.neutral,

        // Role-based colors
        student: {
          primary: tokens.colors.role.student.primary,
          accent: tokens.colors.role.student.accent,
        },
        teacher: {
          primary: tokens.colors.role.teacher.primary,
          accent: tokens.colors.role.teacher.accent,
        },
      },

      // ========================================
      // TYPOGRAPHY
      // ========================================
      fontFamily: {
        display: tokens.typography.fonts.display.split(','),
        body: tokens.typography.fonts.body.split(','),
        mono: tokens.typography.fonts.mono.split(','),
        sans: tokens.typography.fonts.body.split(','), // Default sans
      },

      fontSize: tokens.typography.sizes,
      fontWeight: tokens.typography.weights,
      lineHeight: tokens.typography.lineHeights,
      letterSpacing: tokens.typography.letterSpacing,

      // ========================================
      // SPACING
      // ========================================
      spacing: tokens.spacing,

      // ========================================
      // SHADOWS
      // ========================================
      boxShadow: {
        ...tokens.shadows,
        // Add glassmorphism shadows
        'glass': tokens.shadows.glass,
        'glass-hover': tokens.shadows.glassHover,
        // Add glow shadows
        'glow-blue': tokens.shadows.glow.blue,
        'glow-purple': tokens.shadows.glow.purple,
        'glow-green': tokens.shadows.glow.green,
        'glow-red': tokens.shadows.glow.red,
        'glow-amber': tokens.shadows.glow.amber,
        'glow-gold': tokens.shadows.glow.gold,
      },

      // ========================================
      // BORDER RADIUS
      // ========================================
      borderRadius: tokens.borderRadius,

      // ========================================
      // ANIMATIONS
      // ========================================

      // Animation durations
      transitionDuration: {
        fastest: tokens.animation.duration.fastest,
        fast: tokens.animation.duration.fast,
        normal: tokens.animation.duration.normal,
        slow: tokens.animation.duration.slow,
        slowest: tokens.animation.duration.slowest,
      },

      // Animation timing functions
      transitionTimingFunction: tokens.animation.easing,

      // Keyframe animations
      keyframes: tokens.animation.keyframes,

      // Animation names
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'fade-out': 'fadeOut 300ms ease-in',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'slide-in-up': 'slideInUp 300ms ease-out',
        'slide-in-down': 'slideInDown 300ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'scale-out': 'scaleOut 200ms ease-in',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },

      // ========================================
      // BACKDROP BLUR
      // ========================================
      backdropBlur: {
        glass: tokens.glassmorphism.light.blur,
        'glass-intense': tokens.glassmorphism.light.blurIntense,
      },

      // ========================================
      // Z-INDEX
      // ========================================
      zIndex: tokens.zIndex,

      // ========================================
      // BACKGROUND GRADIENTS
      // ========================================
      backgroundImage: {
        'gradient-student': `linear-gradient(135deg, ${tokens.colors.role.student.gradient.from} 0%, ${tokens.colors.role.student.gradient.to} 100%)`,
        'gradient-teacher': `linear-gradient(135deg, ${tokens.colors.role.teacher.gradient.from} 0%, ${tokens.colors.role.teacher.gradient.to} 100%)`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
    },
  },

  plugins: [
    // Custom plugin for glassmorphism utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Light mode glassmorphism
        '.glass-light': {
          background: tokens.glassmorphism.light.background,
          backdropFilter: `blur(${tokens.glassmorphism.light.blur})`,
          WebkitBackdropFilter: `blur(${tokens.glassmorphism.light.blur})`,
          border: `1px solid ${tokens.glassmorphism.light.border}`,
          boxShadow: tokens.glassmorphism.light.shadow,
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-light:hover': {
          background: tokens.glassmorphism.light.backgroundHover,
          border: `1px solid ${tokens.glassmorphism.light.borderHover}`,
          boxShadow: tokens.glassmorphism.light.shadowHover,
          transform: 'scale(1.02)',
        },

        // Dark mode glassmorphism
        '.glass-dark': {
          background: tokens.glassmorphism.dark.background,
          backdropFilter: `blur(${tokens.glassmorphism.dark.blur})`,
          WebkitBackdropFilter: `blur(${tokens.glassmorphism.dark.blur})`,
          border: `1px solid ${tokens.glassmorphism.dark.border}`,
          boxShadow: tokens.glassmorphism.dark.shadow,
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-dark:hover': {
          background: tokens.glassmorphism.dark.backgroundHover,
          border: `1px solid ${tokens.glassmorphism.dark.borderHover}`,
          boxShadow: tokens.glassmorphism.dark.shadowHover,
          transform: 'scale(1.02)',
        },

        // Intense blur variant
        '.glass-intense': {
          backdropFilter: `blur(${tokens.glassmorphism.light.blurIntense})`,
          WebkitBackdropFilter: `blur(${tokens.glassmorphism.light.blurIntense})`,
        },

        // Shimmer effect for loading states
        '.shimmer': {
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '1000px 100%',
          animation: 'shimmer 2s linear infinite',
        },
        '.dark .shimmer': {
          background: 'linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%)',
          backgroundSize: '1000px 100%',
        },

        // Glow effects
        '.glow-on-hover': {
          transition: 'box-shadow 300ms ease-in-out',
        },
        '.glow-on-hover:hover': {
          boxShadow: tokens.shadows.glow.blue,
        },
      };

      addUtilities(newUtilities);
    },

    // Custom plugin for role-based theming
    function({ addUtilities }) {
      const roleUtilities = {
        // Student theme utilities
        '.theme-student': {
          '--theme-primary': tokens.colors.role.student.primary,
          '--theme-accent': tokens.colors.role.student.accent,
          '--theme-gradient-from': tokens.colors.role.student.gradient.from,
          '--theme-gradient-to': tokens.colors.role.student.gradient.to,
        },

        // Teacher theme utilities
        '.theme-teacher': {
          '--theme-primary': tokens.colors.role.teacher.primary,
          '--theme-accent': tokens.colors.role.teacher.accent,
          '--theme-gradient-from': tokens.colors.role.teacher.gradient.from,
          '--theme-gradient-to': tokens.colors.role.teacher.gradient.to,
        },
      };

      addUtilities(roleUtilities);
    },
  ],
};
