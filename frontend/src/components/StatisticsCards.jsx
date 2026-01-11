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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          gradient={card.gradient}
          iconColor={card.iconColor}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

/**
 * StatCard - Individual statistic card component
 */
function StatCard({ title, value, icon: Icon, gradient, iconColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-light dark:glass-dark p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        {/* Content */}
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>

        {/* Icon with gradient background */}
        <div
          className={`bg-gradient-to-br ${gradient} p-4 rounded-xl shadow-md`}
        >
          <Icon size={28} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}
