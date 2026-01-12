import { gradients, transitions, shadows } from '../../styles/designTokens';

export default function GradientButton({
  variant = 'purple',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  children
}) {
  // Gradient variants
  const variantClasses = {
    purple: `bg-gradient-to-r ${gradients.purpleBlue} hover:from-purple-700 hover:to-blue-700`,
    indigo: `bg-gradient-to-r ${gradients.purpleIndigo} hover:from-purple-700 hover:to-indigo-700`,
    green: `bg-gradient-to-r ${gradients.greenEmerald} hover:from-green-700 hover:to-emerald-700`,
    blue: 'bg-blue-600 hover:bg-blue-700',
    red: 'bg-red-600 hover:bg-red-700',
    outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent',
  };

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const baseClass = `rounded-lg font-medium ${transitions.base} ${shadows.md}`;
  const textColor = variant === 'outline' ? '' : 'text-white';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer';
  const variantClass = variantClasses[variant] || variantClasses['purple'];
  const sizeClass = sizeClasses[size] || sizeClasses['md'];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${sizeClass} ${textColor} ${disabledClass} ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
