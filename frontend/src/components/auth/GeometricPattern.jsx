import React from 'react';
import { motion } from 'framer-motion';

/**
 * GeometricPattern Component
 *
 * Abstract geometric background with animated shapes on purple-to-blue gradient.
 * Features slow floating animations with rotation and breathing effects.
 */
const GeometricPattern = () => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] overflow-hidden">
      {/* Large Circle - Top Right */}
      <motion.div
        className="absolute -top-20 -right-20 w-80 h-80 lg:w-96 lg:h-96 rounded-full bg-white/10 backdrop-blur-sm"
        animate={{
          y: [0, 20, 0],
          rotate: [0, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Triangle - Middle Left */}
      <motion.div
        className="absolute top-1/3 left-10 w-24 h-24 lg:w-32 lg:h-32"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg viewBox="0 0 100 100" className="text-white/10">
          <polygon points="50,10 90,90 10,90" fill="currentColor" />
        </svg>
      </motion.div>

      {/* Rectangle - Bottom Center */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-40 h-28 lg:w-48 lg:h-32 bg-white/5 rounded-2xl rotate-12"
        animate={{
          x: [-10, 10, -10],
          y: [0, -10, 0],
          rotate: [12, 17, 12],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small Circle 1 - Top Left */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-white/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small Circle 2 - Middle Right */}
      <motion.div
        className="absolute top-1/2 right-1/4 w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-white/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small Circle 3 - Bottom Left */}
      <motion.div
        className="absolute bottom-1/3 left-1/5 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-white/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small Circle 4 - Top Center */}
      <motion.div
        className="absolute top-1/5 left-1/2 w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-white/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small Circle 5 - Bottom Right */}
      <motion.div
        className="absolute bottom-1/4 right-1/3 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-white/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Medium Circle - Center */}
      <motion.div
        className="absolute top-2/3 right-1/5 w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-white/10 backdrop-blur-sm"
        animate={{
          y: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Abstract Line/Path - Diagonal */}
      <motion.div
        className="absolute top-1/2 left-0 w-full h-px bg-white/5"
        style={{ transform: 'rotate(-15deg)', transformOrigin: 'left center' }}
        animate={{
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default GeometricPattern;
