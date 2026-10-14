import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Plus,
  Clock,
  FileText,
} from 'lucide-react';
import { CigaretteLog, PackPurchase, UserProfile } from '../types';
import { formatTimeOnly, formatElapsedTime, getLocalDateKey } from '../lib/dateUtils';
import { PocketInventoryCard } from './PocketInventoryCard';

interface DashboardViewProps {
  logs: CigaretteLog[];
  packs: PackPurchase[];
  profile: UserProfile;
  inventory: {
    totalInventory: number;
    packsCount: number;
    looseInCurrentPack: number;
    packSize: number;
  };
  costPerStick: number;
  onQuickLogStick: () => void;
  onOpenDetailedLog: () => void;
  onOpenBuyPack: () => void;
  onOpenCalibrate: () => void;
  onDeleteLog: (id: string) => void;
  onOpenCalendarDate: (date: Date) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  packs,
  profile,
  inventory,
  costPerStick,
  onQuickLogStick,
  onOpenDetailedLog,
  onOpenBuyPack,
  onOpenCalibrate,
  onDeleteLog,
  onOpenCalendarDate,
}) => {
  const [nowTime, setNowTime] = useState(Date.now());
  const [floatParticles, setFloatParticles] = useState<{ id: number }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = getLocalDateKey(nowTime);
  const todayLogs = logs.filter((l) => getLocalDateKey(l.timestamp) === todayKey);
  const todayCount = todayLogs.reduce((acc, l) => acc + l.count, 0);
  const todayCost = (todayCount * costPerStick).toFixed(2);

  const lastLog = logs.length > 0 ? logs[0] : null;
  const limit = profile.dailyStickLimit || 8;
  const isOverLimit = todayCount > limit;
  const isNearLimit = todayCount >= limit * 0.8 && !isOverLimit;

  // 7-day average
  const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
  const recentWeekLogs = logs.filter((l) => l.timestamp >= sevenDaysAgo);
  const recentWeekSticks = recentWeekLogs.reduce((acc, l) => acc + l.count, 0);
  const dailyAverageWeek = (recentWeekSticks / 7).toFixed(1);

  const handleRapidClick = () => {
    const pId = Date.now();
    setFloatParticles((prev) => [...prev, { id: pId }]);
    setTimeout(() => {
      setFloatParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 900);
    onQuickLogStick();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      {/* 1. Pocket Inventory Balance Card */}
      <PocketInventoryCard
        inventory={inventory}
        costPerStick={costPerStick}
        profile={profile}
        onOpenBuyPack={onOpenBuyPack}
        onOpenCalibrate={onOpenCalibrate}
      />

      {/* 2. Hero Interactive Logger & Daily Pacing */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-7 text-stone-900 dark:text-neutral-100 shadow-xs transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Rapid 1-Tap Trigger with Spring Physics */}
          <div className="md:col-span-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative select-none">
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                onClick={handleRapidClick}
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-stone-900 text-white dark:bg-neutral-100 dark:text-neutral-950 flex flex-col items-center justify-center font-sans shadow-lg shadow-black/10 dark:shadow-black/40 group focus:outline-none transition-shadow"
                aria-label="Quick log 1 stick"
              >
                <Flame className="w-7 h-7 text-amber-400 dark:text-neutral-900 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold tracking-tight">+1 Stick</span>
                <span className="text-[10px] text-stone-400 dark:text-neutral-500 font-mono mt-0.5">tap to smoke</span>
              </motion.button>

              {/* Floating micro-animation particle */}
              <AnimatePresence>
                {floatParticles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -60, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-2 left-1/2 -translate-x-1/2 font-mono font-bold text-xs text-white bg-stone-900 dark:bg-neutral-800 dark:text-neutral-100 px-2.5 py-0.5 rounded-full pointer-events-none border border-stone-700 dark:border-neutral-700 shadow-md whitespace-nowrap"
                  >
                    -1 in pocket
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="text-center sm:text-left flex-1 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-neutral-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Last smoke:</span>
                <span className="text-stone-800 dark:text-neutral-200">
                  {lastLog ? formatElapsedTime(lastLog.timestamp) : 'No logs yet'}
                </span>
              </div>

              <div className="text-2xl font-light tracking-tight text-stone-950 dark:text-white font-sans">
                {todayCount === 0 ? (
                  <span>Smoke-free so far</span>
                ) : (
                  <span>
                    <strong className="font-mono font-semibold">{todayCount}</strong> sticks today
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-500 dark:text-neutral-400 leading-relaxed max-w-sm">
                Today's consumed value: <span className="font-mono text-stone-900 dark:text-neutral-200 font-medium">{profile.currency} {todayCost}</span>
              </p>

              <div className="pt-2">
                <button
                  onClick={onOpenDetailedLog}
                  className="h-8 px-3 rounded-lg border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-xs font-medium text-stone-700 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white hover:border-stone-300 dark:hover:border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Log with reason & reflection
                </button>
              </div>
            </div>
          </div>

          {/* Daily Limit Tracker */}
          <div className="md:col-span-6 p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200/80 dark:border-neutral-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-stone-500 dark:text-neutral-400 font-mono uppercase text-[11px]">Daily Limit Pacing</span>
              <span className="font-mono text-stone-800 dark:text-neutral-200">
                <strong className={isOverLimit ? 'text-rose-600 dark:text-rose-400' : isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-neutral-100'}>
                  {todayCount}
                </strong>{' '}
                / {limit} max
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (todayCount / limit) * 100)}%` }}
                transition={{ duration: 0.4 }}
                className={`h-full rounded-full transition-colors ${
                  isOverLimit
                    ? 'bg-rose-500'
                    : isNearLimit
                    ? 'bg-amber-400'
                    : 'bg-stone-900 dark:bg-neutral-200'
                }`}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 dark:text-neutral-400 font-mono">
              <span>{Math.max(0, limit - todayCount)} sticks available today</span>
              <span>Rolling avg: {dailyAverageWeek}/d</span>
            </div>

            {isOverLimit && (
              <div className="mt-2.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300">
                Limit reached for today. Take a pause and drink water to delay the next craving.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Today's Chronological Ledger */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 text-stone-900 dark:text-neutral-100 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-stone-950 dark:text-white">
              Today's Smoking Timeline
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              {todayLogs.length} logs recorded today
            </p>
          </div>
          <button
            onClick={onOpenDetailedLog}
            className="text-xs font-mono text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add entry
          </button>
        </div>

        {todayLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 dark:text-neutral-500 border border-dashed border-stone-200 dark:border-neutral-800 rounded-2xl font-mono">
            Zero sticks recorded today. Clean slate.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-neutral-800/60">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0 group"
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
                        +{log.count} stick · ~{profile.currency} {log.costEstimate.toFixed(2)}
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
                  className="opacity-0 group-hover:opacity-100 text-xs text-stone-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 transition-opacity p-1"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
