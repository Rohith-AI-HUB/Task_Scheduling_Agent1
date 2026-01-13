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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div>
            <h3 className="font-extrabold text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {title || 'Flashcards'}
            </h3>
            <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest mt-0.5">
              CARD {currentIndex + 1} OF {totalCards}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all shadow-sm group"
          >
            <X size={24} className="text-gray-400 group-hover:text-rose-500" />
          </button>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>

        {/* Card Area */}
        <div className="flex-1 p-12 flex items-center justify-center min-h-[400px]">
          <AnimatePresence mode="wait">
            {!showSummary ? (
              <motion.div
                key={currentIndex}
                initial={{ x: direction * 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -direction * 50, opacity: 0 }}
                className="w-full h-full"
                style={{ perspective: '1200px' }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="w-full h-full relative cursor-pointer"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front Side */}
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-800 rounded-3xl p-10 border border-indigo-100 dark:border-indigo-900/50 shadow-xl flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <HelpCircle size={150} />
                    </div>
                    <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em]">QUESTION</span>

                    <h4 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                      {flashcards[currentIndex].question}
                    </h4>

                    <div className="mt-12 flex items-center gap-2 text-indigo-400 font-bold text-xs animate-pulse">
                      <span>CLICK TO REVEAL</span>
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-3xl p-10 border border-indigo-200 dark:border-indigo-800 shadow-xl flex flex-col items-center justify-center text-center rotate-y-180" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Check size={150} />
                    </div>
                    <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-purple-400/50 uppercase tracking-[0.2em]">ANSWER</span>

                    <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 font-medium leading-relaxed">
                      {flashcards[currentIndex].answer}
                    </p>

                    <div className="mt-12 flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <span>CLICK TO HIDE</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Check className="text-emerald-600 dark:text-emerald-400" size={48} strokeWidth={3} />
                </div>
                <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tighter">Session Complete!</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg font-medium">
                  Outstanding! You've successfully finished all {totalCards} items in this set.
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRestart}
                    className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-2"
                  >
                    <RotateCcw size={20} />
                    REVIEW AGAIN
                  </button>
                  <button
                    onClick={onClose}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    DONE
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {!showSummary && (
          <div className="px-12 py-8 bg-gray-50/50 dark:bg-gray-950/20 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="group flex-1 flex items-center justify-center gap-3 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-400 hover:text-indigo-600 transition-all"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              BACK
            </button>
            <button
              onClick={handleNext}
              className="group flex-1 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black hover:scale-[1.02] transition-all shadow-xl shadow-indigo-200 dark:shadow-none"
            >
              {currentIndex === totalCards - 1 ? 'FINISH' : 'NEXT'}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
