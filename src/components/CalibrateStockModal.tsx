import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, SlidersHorizontal } from 'lucide-react';
import { UserProfile } from '../types';

interface CalibrateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInventory: number;
  onCalibrate: (newCount: number) => void;
  profile: UserProfile;
}

export const CalibrateStockModal: React.FC<CalibrateStockModalProps> = ({
  isOpen,
  onClose,
  currentInventory,
  onCalibrate,
  profile,
}) => {
  const [count, setCount] = useState(currentInventory);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalibrate(Math.max(0, count));
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 text-stone-900 dark:text-neutral-100 rounded-3xl p-6 shadow-2xl transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-neutral-800 flex items-center justify-center text-stone-700 dark:text-neutral-300">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-stone-950 dark:text-white">
                Calibrate Inventory
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed mb-6">
            Count the physical sticks in your pocket or pack right now and update your inventory baseline.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-neutral-800/80 border border-stone-200 dark:border-neutral-700/60 hover:bg-stone-200 dark:hover:bg-neutral-800 text-lg font-bold text-stone-800 dark:text-neutral-200 transition-all active:scale-95 shadow-2xs"
              >
                -
              </button>
              <div className="text-center min-w-[100px]">
                <div className="text-4xl font-light tracking-tight text-stone-950 dark:text-white font-mono tabular-nums">
                  {count}
                </div>
                <span className="text-[11px] text-stone-500 dark:text-neutral-400">sticks in hand</span>
              </div>
              <button
                type="button"
                onClick={() => setCount((c) => c + 1)}
                className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-neutral-800/80 border border-stone-200 dark:border-neutral-700/60 hover:bg-stone-200 dark:hover:bg-neutral-800 text-lg font-bold text-stone-800 dark:text-neutral-200 transition-all active:scale-95 shadow-2xs"
              >
                +
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {[0, 5, 10, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCount(preset)}
                  className={`py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                    count === preset
                      ? 'border-stone-900 bg-stone-900 text-white dark:border-neutral-400 dark:bg-neutral-800 dark:text-white'
                      : 'border-stone-200 bg-stone-50 dark:border-neutral-800 dark:bg-neutral-900/50 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-neutral-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Update Stock
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
