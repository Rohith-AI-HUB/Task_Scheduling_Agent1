import { motion } from 'framer-motion';
import GlassCard from '../ui/Card/GlassCard';

/**
 * Dark-themed metric card with gradient icon background
 * Used for displaying key metrics in the analytics dashboard
 */
export default function DarkMetricCard({
  title,
  value,
  icon: Icon,
  gradient = 'from-purple-600 to-blue-600',
  trend,
  suffix = '',
  loading = false
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <GlassCard
        className="bg-slate-800/70 border border-slate-700/50 hover:border-purple-500/50 transition-all h-full"
        hover
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>

            {loading ? (
              <div className="h-10 w-24 bg-slate-700 rounded animate-pulse mb-1"></div>
            ) : (
              <p className="text-4xl font-bold text-white mb-1">
                {value}
                <span className="text-2xl">{suffix}</span>
              </p>
            )}

            {trend !== undefined && !loading && (
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-medium ${
                    trend >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
                <span className="text-xs text-slate-500">from last week</span>
              </div>
            )}
          </div>

          <div
            className={`bg-gradient-to-br ${gradient} p-4 rounded-xl shadow-lg flex-shrink-0`}
          >
            <Icon size={32} className="text-white" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
