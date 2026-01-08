import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * GlassCard Component
 *
 * A beautiful glassmorphic card with backdrop blur effect.
 *
 * Features:
 * - Automatic light/dark mode support
 * - Hover animations (scale, glow)
 * - Optional entrance animation
 * - Customizable padding, rounded corners
 * - Click handler support
 *
 * Props:
 * - children: Card content
 * - className: Additional CSS classes
 * - hover: Enable hover animation (default: true)
 * - animate: Enable entrance animation (default: false)
 * - onClick: Click handler (makes card interactive)
 * - padding: Padding size - 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 * - rounded: Border radius - 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'xl')
 * - intensity: Glass effect intensity - 'light' | 'medium' | 'intense' (default: 'medium')
 */

const GlassCard = ({
  children,
  className = '',
  hover = true,
  animate = false,
  onClick,
  padding = 'md',
  rounded = 'xl',
  intensity = 'medium',
  ...props
}) => {
  // Padding variants
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Border radius variants
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  // Glass intensity variants
  const glassClasses = {
    light: 'glass-light',
    medium: 'glass-light backdrop-blur-glass',
    intense: 'glass-light glass-intense',
  };

  // Base classes
  const baseClasses = clsx(
    // Glass effect (uses Tailwind custom utilities)
    glassClasses[intensity],
    // Dark mode variant
    'dark:glass-dark',
    // Padding
    paddingClasses[padding],
    // Border radius
    roundedClasses[rounded],
    // Hover effect
    hover && 'hover:scale-[1.02] hover:shadow-glass-hover',
    // Transition
    'transition-all duration-300',
    // Interactive cursor
    onClick && 'cursor-pointer',
    // Custom classes
    className
  );

  // Animation variants for framer-motion
  const animationVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1], // easeInOut
      },
    },
  };

  // Use motion.div if animation is enabled, regular div otherwise
  const Component = animate ? motion.div : 'div';

  const motionProps = animate
    ? {
        initial: 'hidden',
        animate: 'visible',
        variants: animationVariants,
      }
    : {};

  return (
    <Component
      className={baseClasses}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
};

export default GlassCard;

/**
 * Usage Examples:
 *
 * // Basic glass card
 * <GlassCard>
 *   <h2>Hello World</h2>
 * </GlassCard>
 *
 * // With hover disabled
 * <GlassCard hover={false}>
 *   <p>Static card</p>
 * </GlassCard>
 *
 * // With entrance animation
 * <GlassCard animate>
 *   <p>Animated entrance</p>
 * </GlassCard>
 *
 * // Interactive card
 * <GlassCard onClick={() => console.log('Clicked!')}>
 *   <p>Click me!</p>
 * </GlassCard>
 *
 * // Custom styling
 * <GlassCard
 *   padding="lg"
 *   rounded="2xl"
 *   intensity="intense"
 *   className="border-2 border-primary-500"
 * >
 *   <p>Custom card</p>
 * </GlassCard>
 */
