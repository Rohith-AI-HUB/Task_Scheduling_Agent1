import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, X, Check, HelpCircle } from 'lucide-react';

export default function FlashcardViewer({ flashcards, onClose, title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const totalCards = flashcards.length;

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setDirection(1);
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 50);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 50);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div>
            <h3 className="font-bold text-xl">{title || 'Flashcards'}</h3>
            <p className="text-sm opacity-80">{currentIndex + 1} of {totalCards} cards</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700">
          <motion.div 
            className="h-full bg-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>

        {/* Card Area */}
        <div className="flex-1 p-8 flex items-center justify-center min-h-[350px]">
          <AnimatePresence mode="wait">
            {!showSummary ? (
              <motion.div
                key={currentIndex}
                initial={{ x: direction * 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -direction * 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="w-full h-full perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="w-full h-full relative cursor-pointer preserve-3d transition-transform duration-500"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front Side */}
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-700 rounded-2xl p-8 border-2 border-purple-100 dark:border-purple-900 shadow-xl flex flex-col items-center justify-center text-center">
                    <span className="absolute top-4 left-4 text-purple-500 font-bold text-xs uppercase tracking-widest">Question</span>
                    <HelpCircle className="text-purple-400 mb-6" size={40} />
                    <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {flashcards[currentIndex].question}
                    </h4>
                    <p className="mt-8 text-gray-400 text-sm italic">Click to flip</p>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 backface-hidden bg-purple-50 dark:bg-gray-900 rounded-2xl p-8 border-2 border-purple-200 dark:border-purple-800 shadow-xl flex flex-col items-center justify-center text-center rotate-y-180" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                    <span className="absolute top-4 left-4 text-indigo-500 font-bold text-xs uppercase tracking-widest">Answer</span>
                    <Check className="text-indigo-400 mb-6" size={40} />
                    <p className="text-xl text-gray-700 dark:text-gray-200 leading-relaxed">
                      {flashcards[currentIndex].answer}
                    </p>
                    <p className="mt-8 text-indigo-400 text-sm italic">Click to flip back</p>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full inline-block mb-6">
                  <Check className="text-green-600 dark:text-green-400" size={48} />
                </div>
                <h3 className="text-3xl font-bold mb-2">Session Complete!</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  You've reviewed all {totalCards} flashcards for this resource.
                </p>
                <button
                  onClick={handleRestart}
                  className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <RotateCcw size={20} />
                  Review Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {!showSummary && (
          <div className="p-8 border-t dark:border-gray-700 flex justify-between items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg"
            >
              {currentIndex === totalCards - 1 ? 'Finish' : 'Next'}
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
