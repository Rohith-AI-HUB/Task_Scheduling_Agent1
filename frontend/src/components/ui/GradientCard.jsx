import { gradients, shadows, transitions } from '../../styles/designTokens';

export default function GradientCard({
  gradient,
  className = '',
  hoverEffect = false,
  children
}) {
  // Gradient presets
  const gradientClasses = {
    'purple-blue': `bg-gradient-to-br ${gradients.purpleBlue}`,
    'purple-indigo': `bg-gradient-to-br ${gradients.purpleIndigo}`,
    'purple-pink': `bg-gradient-to-br ${gradients.purplePink}`,
    'indigo-purple': `bg-gradient-to-br ${gradients.indigoPurple}`,
    'green-emerald': `bg-gradient-to-br ${gradients.greenEmerald}`,
    'none': 'bg-white'
  };

  const baseClass = `rounded-lg ${shadows.md} ${transitions.base}`;
  const hoverClass = hoverEffect ? 'hover:scale-105 cursor-pointer' : '';
  const gradientClass = gradientClasses[gradient] || gradientClasses['none'];
  const textColorClass = gradient && gradient !== 'none' ? 'text-white' : '';

  return (
    <div className={`${baseClass} ${gradientClass} ${textColorClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
