import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * FloatingActionButton - Purple gradient FAB for creating new tasks
 *
 * Features:
 * - Fixed position bottom-right
 * - Purple gradient background
 * - Scale animation on hover
 * - Purple glow effect
 */

export default function FloatingActionButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full shadow-2xl hover:shadow-purple-500/50 z-40 flex items-center justify-center transition-shadow"
      aria-label="Create new task"
    >
      <Plus size={32} className="text-white" />
    </motion.button>
  );
}
