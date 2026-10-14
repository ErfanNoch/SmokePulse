import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus } from 'lucide-react';
import { SmokingTrigger, MoodType, CigaretteLog } from '../types';

interface LogCigaretteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<CigaretteLog, 'id'>) => void;
  initialDate?: Date;
  costPerStick: number;
  currency: string;
  inventoryCount: number;
}

const COMMON_TRIGGERS: SmokingTrigger[] = [
  'After Meal',
  'Work Break',
  'Morning Coffee',
  'Stress',
  'Social',
  'Boredom',
  'Commute',
  'Craving',
  'Night Out',
  'Other',
];

const MOODS: MoodType[] = ['Neutral', 'Stressed', 'Relaxed', 'Restless', 'Social', 'Tired'];

export const LogCigaretteModal: React.FC<LogCigaretteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  costPerStick,
  currency,
  inventoryCount,
}) => {
  const [count, setCount] = useState(1);
  const [reason, setReason] = useState<SmokingTrigger>('After Meal');
  const [customReason, setCustomReason] = useState('');
  const [mood, setMood] = useState<MoodType>('Neutral');
  const [note, setNote] = useState('');

  const formatForDatetimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [dateTimeStr, setDateTimeStr] = useState<string>(() =>
    formatForDatetimeLocal(initialDate || new Date())
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(dateTimeStr).getTime() || Date.now();
    const costEstimate = parseFloat((count * costPerStick).toFixed(2));

    onSave({
      timestamp,
      count,
      reason,
      customReason: reason === 'Other' ? customReason.trim() : undefined,
      mood,
      note: note.trim() || undefined,
      costEstimate,
    });

    setCount(1);
    setNote('');
    setCustomReason('');
    onClose();
  };

  const estimatedDeductionCost = (count * costPerStick).toFixed(2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 text-stone-900 dark:text-neutral-100 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden transition-colors"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
                Log Consumption
              </span>
              <h2 className="text-base font-semibold text-stone-950 dark:text-white tracking-tight">
                Record Cigarette Break
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Quantity Stepper & Cost Impact */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700/60 flex items-center justify-center text-stone-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-700 active:scale-95 transition-all shadow-2xs"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-center min-w-[60px]">
                  <div className="text-3xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
                    {count}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-neutral-400 font-sans">
                    {count === 1 ? 'stick' : 'sticks'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCount((c) => c + 1)}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700/60 flex items-center justify-center text-stone-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-700 active:scale-95 transition-all shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-right border-t sm:border-t-0 sm:border-l border-stone-200 dark:border-neutral-800 pt-2 sm:pt-0 sm:pl-4 text-xs font-mono text-stone-500 dark:text-neutral-400 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                <span>Deducts {count} from inventory</span>
                <span className="text-stone-900 dark:text-white font-semibold">
                  ~{currency} {estimatedDeductionCost}
                </span>
              </div>
            </div>

            {/* Trigger selection */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-2">
                Primary Reason / Trigger
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TRIGGERS.map((t) => {
                  const isSelected = reason === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReason(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-xs'
                          : 'bg-stone-100/80 dark:bg-neutral-800/60 text-stone-700 dark:text-neutral-300 hover:bg-stone-200 dark:hover:bg-neutral-800 hover:text-stone-950 dark:hover:text-white border border-stone-200/80 dark:border-neutral-800'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {reason === 'Other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Specify custom trigger..."
                  className="mt-3 w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
                  autoFocus
                />
              )}
            </div>

            {/* State of Mind */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-2">
                State of Mind
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {MOODS.map((m) => {
                  const isSelected = mood === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m)}
                      className={`h-9 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-stone-900 text-white dark:bg-neutral-200 dark:text-neutral-950 font-semibold'
                          : 'bg-stone-50 dark:bg-neutral-800/40 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200 border border-stone-200 dark:border-neutral-800'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTimeStr}
                onChange={(e) => setDateTimeStr(e.target.value)}
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono"
              />
            </div>

            {/* Reflection Note */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                Craving Reflection (Why did you smoke?)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What triggered this craving? What are you feeling right now?"
                rows={2}
                className="w-full p-3 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 resize-none leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-neutral-950 font-semibold text-xs dark:hover:bg-neutral-200 transition-colors active:scale-[0.99]"
              >
                Record & Deduct Stock
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
