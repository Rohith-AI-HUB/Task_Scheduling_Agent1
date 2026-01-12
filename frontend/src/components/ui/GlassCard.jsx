import { shadows, transitions } from '../../styles/designTokens';

export default function GlassCard({
  blurAmount = 'sm',
  borderColor = 'purple',
  hoverEffect = false,
  className = '',
  children
}) {
  // Blur amount options
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  };

  // Border color options
  const borderClasses = {
    purple: 'border-t-4 border-purple-600',
    blue: 'border-t-4 border-blue-600',
    pink: 'border-t-4 border-pink-600',
    green: 'border-t-4 border-green-600',
    orange: 'border-t-4 border-orange-600',
    none: '',
  };

  const blurClass = blurClasses[blurAmount] || blurClasses['sm'];
  const borderClass = borderClasses[borderColor] || borderClasses['purple'];
  const hoverClass = hoverEffect ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : '';

  return (
    <div className={`bg-white/80 ${blurClass} ${borderClass} rounded-lg ${shadows.md} ${transitions.base} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
