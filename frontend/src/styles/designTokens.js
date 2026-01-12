// Design System Tokens
// Consistent color palette and design values for the entire application

export const colors = {
  // Primary Brand Colors
  primary: '#7C3AED',      // Vibrant Purple - Main CTAs, highlights
  secondary: '#3B82F6',    // Sky Blue - Links, secondary actions

  // Accent Colors (Feature-specific)
  success: '#10B981',      // Green - Success states
  warning: '#F97316',      // Orange - Warnings
  danger: '#EF4444',       // Red - Errors, urgent actions
  pink: '#EC4899',         // Pink - Stress/wellness features
  cyan: '#06B6D4',         // Cyan - Chat/communication
  indigo: '#6366F1',       // Indigo - Focus/productivity

  // Neutrals
  bgLight: '#F9FAFB',      // Page background
  cardBg: '#FFFFFF',       // Card background
  textPrimary: '#111827',  // Main text
  textSecondary: '#6B7280', // Secondary text
  border: '#E5E7EB',       // Borders
};

// Gradient combinations
export const gradients = {
  purpleBlue: 'from-purple-600 to-blue-600',
  purpleIndigo: 'from-purple-600 to-indigo-600',
  purplePink: 'from-purple-600 to-pink-600',
  indigoPurple: 'from-indigo-600 to-purple-600',
  greenEmerald: 'from-green-600 to-emerald-600',

  // Background gradients (lighter)
  bgPurpleBlue: 'from-purple-50 to-blue-50',
  bgPurpleBlueGray: 'from-purple-50 via-blue-50 to-gray-50',
  bgPurplePinkBlue: 'from-purple-50 via-pink-50 to-blue-50',
  bgPurpleIndigoBlue: 'from-purple-50 via-indigo-50 to-blue-50',
};

// Typography scale
export const typography = {
  hero: 'text-6xl',       // 60px
  h1: 'text-5xl',         // 48px
  h2: 'text-4xl',         // 36px
  h3: 'text-3xl',         // 30px
  h4: 'text-2xl',         // 24px
  h5: 'text-xl',          // 20px
  body: 'text-base',      // 16px
  small: 'text-sm',       // 14px
  tiny: 'text-xs',        // 12px
};

// Spacing scale
export const spacing = {
  xs: 'p-2',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

// Shadow scale
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  purpleSm: 'shadow-sm shadow-purple-500/20',
  purpleMd: 'shadow-md shadow-purple-500/30',
  purpleLg: 'shadow-lg shadow-purple-500/50',
};

// Transition presets
export const transitions = {
  base: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  fast: 'transition-all duration-150',
};

// Common component styles
export const componentStyles = {
  card: 'bg-white rounded-lg shadow-md',
  glassCard: 'bg-white/80 backdrop-blur-sm rounded-lg shadow-md',
  input: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600',
  button: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
  buttonPrimary: 'px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200',
  buttonSecondary: 'px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200',
  buttonOutline: 'px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-all duration-200',
  badge: 'px-2 py-1 rounded-full text-xs font-semibold',
  badgePurple: 'px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold',
};

// Hover effects
export const hoverEffects = {
  scale: 'hover:scale-105',
  scaleSmall: 'hover:scale-102',
  shadow: 'hover:shadow-lg',
  shadowPurple: 'hover:shadow-lg hover:shadow-purple-500/50',
  opacity: 'hover:opacity-90',
};
