import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { DailySummary, UserProfile } from '../types';
import { formatTimeOnly, formatFullDate } from '../lib/dateUtils';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  daySummary: DailySummary | null;
  selectedDate: Date | null;
  profile: UserProfile;
  costPerStick: number;
  onDeleteLog: (id: string) => void;
  onDeletePack: (id: string) => void;
  onAddLogForDate: (date: Date) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  daySummary,
  selectedDate,
  profile,
  costPerStick,
  onDeleteLog,
  onDeletePack,
  onAddLogForDate,
}) => {
  if (!isOpen || !selectedDate) return null;

  const totalSticks = daySummary?.totalSticks || 0;
  const isOverLimit = totalSticks > profile.dailyStickLimit;
  const estimatedCost =
    daySummary?.estimatedCost !== undefined
      ? daySummary.estimatedCost.toFixed(2)
      : (totalSticks * costPerStick).toFixed(2);
  const logs = daySummary?.logs || [];
  const packs = daySummary?.packsPurchased || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 text-stone-900 dark:text-neutral-100 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden transition-colors"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
                Daily Breakdown
              </span>
              <h2 className="text-base font-semibold text-stone-950 dark:text-white tracking-tight">
                {formatFullDate(selectedDate.getTime())}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Bar: Consumed sticks & estimated price burned */}
          <div className="p-4 bg-stone-50 dark:bg-neutral-950/70 border-b border-stone-200 dark:border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-stone-500 dark:text-neutral-400 block text-[11px]">Consumed</span>
                <span className={`text-sm font-semibold ${isOverLimit ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-white'}`}>
                  {totalSticks} {totalSticks === 1 ? 'stick' : 'sticks'}
                </span>
              </div>
              <span aria-hidden="true" className="text-stone-300 dark:text-neutral-700">·</span>
              <div>
                <span className="text-stone-500 dark:text-neutral-400 block text-[11px]">Cost Value</span>
                <span className="text-sm font-semibold text-stone-900 dark:text-white">
                  {profile.currency} {estimatedCost}
                </span>
              </div>
            </div>

            <button
              onClick={() => onAddLogForDate(selectedDate)}
              className="h-8 px-3 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stick
            </button>
          </div>

          {/* Content list */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Packs purchased on this date */}
            {packs.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-neutral-400 mb-2">
                  Pack Purchases & Refills ({packs.length})
                </h3>
                <div className="space-y-2">
                  {packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-900 dark:text-white">
                          {pack.brandName} · {pack.quantity} pack(s)
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-neutral-400 font-mono mt-0.5">
                          Refilled +{pack.sticksPerPack * pack.quantity} sticks
                          {pack.storeName ? ` · ${pack.storeName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {profile.currency} {(pack.cost * pack.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => onDeletePack(pack.id)}
                          className="text-stone-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cigarettes timeline */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-neutral-400 mb-2">
                Smoking Activity ({logs.length})
              </h3>

              {logs.length === 0 ? (
                <div className="py-8 text-center rounded-2xl border border-dashed border-stone-200 dark:border-neutral-800 text-stone-400 dark:text-neutral-500 text-xs font-mono">
                  Zero sticks logged for this day.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-neutral-800/60">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex items-start justify-between gap-3 group first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-stone-500 dark:text-neutral-400 pt-0.5 w-12">
                          {formatTimeOnly(log.timestamp)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-stone-900 dark:text-white">
                              {log.reason === 'Other' && log.customReason ? log.customReason : log.reason}
                            </span>
                            <span className="text-[11px] text-stone-400 dark:text-neutral-500 font-mono">
                              +{log.count} stick · {profile.currency} {log.costEstimate.toFixed(2)}
                            </span>
                          </div>
                          {log.note && (
                            <p className="text-xs text-stone-600 dark:text-neutral-400 mt-1 italic font-sans leading-relaxed">
                              "{log.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 p-1 transition-opacity"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
