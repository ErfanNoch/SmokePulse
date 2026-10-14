import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

interface YamadaEasterEggProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YamadaEasterEgg: React.FC<YamadaEasterEggProps> = ({ isOpen, onClose }) => {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCanClose(false);
      return;
    }

    // 400ms buffer so accidental clicks during spam don't immediately trigger close
    const bufferTimer = setTimeout(() => {
      setCanClose(true);
    }, 400);

    // Auto-dismiss after 6 seconds
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 6000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(bufferTimer);
      clearTimeout(autoCloseTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCloseButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop: Clicking outside does NOT close the modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none"
        onClick={(e) => {
          // Explicitly prevent closing when clicking backdrop/outside
          e.stopPropagation();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.15, rotate: -18 }}
          animate={{
            opacity: 1,
            scale: [0.15, 1.15, 0.92, 1.04, 1],
            rotate: [-18, 12, -6, 3, 0],
          }}
          exit={{ opacity: 0, scale: 0.2, rotate: 15 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-xs sm:max-w-sm w-full bg-white dark:bg-neutral-900 border-2 border-amber-400 dark:border-amber-400 rounded-3xl p-5 shadow-[0_0_50px_rgba(251,191,36,0.35)] flex flex-col items-center text-center overflow-hidden"
        >
          {/* Only the X button closes the modal */}
          <button
            onClick={handleCloseButton}
            aria-label="Close easter egg"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Goofy Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 text-[11px] font-mono font-bold uppercase tracking-wider mb-3 animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wild Yamada Appeared!</span>
          </div>

          {/* Animated GIF */}
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative w-full aspect-square max-w-[260px] rounded-2xl overflow-hidden border border-stone-200 dark:border-neutral-800 bg-stone-100 dark:bg-neutral-950 shadow-inner my-1 flex items-center justify-center pointer-events-none"
          >
            <img
              src="/features/yamada.gif"
              alt="Yamada Easter Egg"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>

          {/* Goofy text */}
          <div className="mt-3.5">
            <p className="text-sm font-semibold text-stone-900 dark:text-white">
              Stop spamming the logo!
            </p>
            <p className="text-[11px] text-stone-500 dark:text-neutral-400 mt-1 font-mono">
              Take a deep breath and keep your lungs clean.
            </p>
          </div>

          {/* Auto-closing indicator bar */}
          <div className="w-full mt-4 bg-stone-100 dark:bg-neutral-800 h-1 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 6, ease: 'linear' }}
              className="h-full bg-amber-400"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
