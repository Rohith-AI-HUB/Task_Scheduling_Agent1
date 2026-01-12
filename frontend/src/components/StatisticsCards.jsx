import { motion } from 'framer-motion';
import { CheckSquare, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import useTaskStore from '../store/useTaskStore';

/**
 * StatisticsCards - Display task statistics at the top of Kanban board
 *
 * Features:
 * - Total tasks count
 * - In Progress count
 * - Completed count
 * - Completion rate percentage
 * - Purple/blue gradient icons
 * - Smooth count-up animations
 */

export default function StatisticsCards() {
  const { getStatistics } = useTaskStore();
  const stats = getStatistics();

  const cards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckSquare,
      gradient: 'from-purple-600 to-blue-500',
      iconColor: 'text-purple-600',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      gradient: 'from-purple-600 to-pink-500',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.iconColor}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

/**
 * StatCard - Individual statistic card component
 */
function StatCard({ title, value, icon: Icon, color, delay }) {
  // Extract color class for background (e.g., text-purple-600 -> bg-purple-100)
  const bgColor = color.replace('text-', 'bg-').replace('600', '100').replace('500', '100');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${bgColor} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className={color} />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-1">
          {value}
        </h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
      </div>
    </motion.div>
  );
}
