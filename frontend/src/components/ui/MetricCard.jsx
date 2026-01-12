import { gradients, shadows, transitions } from '../../styles/designTokens';

export default function MetricCard({
  icon: Icon,
  label,
  value,
  gradient = 'purple-blue',
  trend,
  trendValue,
  className = ''
}) {
  // Gradient presets
  const gradientClasses = {
    'purple-blue': `bg-gradient-to-br ${gradients.purpleBlue}`,
    'purple-indigo': `bg-gradient-to-br ${gradients.purpleIndigo}`,
    'purple-pink': `bg-gradient-to-br ${gradients.purplePink}`,
    'blue': 'bg-gradient-to-br from-blue-600 to-blue-700',
    'green': 'bg-gradient-to-br from-green-600 to-emerald-600',
    'orange': 'bg-gradient-to-br from-orange-600 to-red-600',
    'pink': 'bg-gradient-to-br from-pink-600 to-rose-600',
    'cyan': 'bg-gradient-to-br from-cyan-600 to-blue-600',
  };

  const gradientClass = gradientClasses[gradient] || gradientClasses['purple-blue'];

  return (
    <div className={`${gradientClass} text-white rounded-lg ${shadows.lg} ${transitions.base} hover:scale-105 cursor-pointer p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
          <p className="text-4xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-white/90' : 'text-white/70'}`}>
              {trend === 'up' ? '↑' : '↓'}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
            <Icon size={32} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
