import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CigaretteLog, SmokingTrigger, UserProfile } from '../types';
import { formatFullDate, formatTimeOnly } from '../lib/dateUtils';

interface HabitsViewProps {
  logs: CigaretteLog[];
  profile: UserProfile;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ logs, profile }) => {
  const [selectedTriggerFilter, setSelectedTriggerFilter] = useState<string>('all');

  const totalSticks = logs.reduce((acc, l) => acc + l.count, 0);

  // 1. Triggers breakdown
  const triggerCounts = new Map<SmokingTrigger, number>();
  logs.forEach((log) => {
    triggerCounts.set(log.reason, (triggerCounts.get(log.reason) || 0) + log.count);
  });

  const triggerStats = Array.from(triggerCounts.entries())
    .map(([trigger, count]) => ({
      trigger,
      count,
      percentage: totalSticks > 0 ? (count / totalSticks) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const topTrigger = triggerStats[0];

  // 2. 24-Hour peak distribution
  const hourCounts = new Array(24).fill(0);
  logs.forEach((log) => {
    const h = new Date(log.timestamp).getHours();
    hourCounts[h] += log.count;
  });
  const maxHourCount = Math.max(...hourCounts, 1);

  // 3. Day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = new Array(7).fill(0);
  logs.forEach((log) => {
    const d = new Date(log.timestamp).getDay();
    dayCounts[d] += log.count;
  });
  const maxDayCount = Math.max(...dayCounts, 1);

  // 4. Notes feed
  const logsWithNotes = logs.filter((l) => Boolean(l.note));
  const filteredNotes =
    selectedTriggerFilter === 'all'
      ? logsWithNotes
      : logsWithNotes.filter((l) => l.reason === selectedTriggerFilter);

  return (
    <div className="space-y-6 pb-24 md:pb-10 text-stone-900 dark:text-neutral-100 transition-colors">
      {/* Top Habit Trigger Callout */}
      {topTrigger && (
        <div className="p-5 sm:p-6 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 shadow-xs">
          <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            Primary Habit Driver
          </span>
          <h2 className="text-xl sm:text-2xl font-light text-stone-950 dark:text-white tracking-tight mt-1">
            "{topTrigger.trigger}" accounts for {topTrigger.percentage.toFixed(0)}% of your smoking
          </h2>
          <p className="text-xs text-stone-600 dark:text-neutral-400 mt-2 max-w-2xl leading-relaxed">
            Pattern detected: you reach for a cigarette most consistently during {topTrigger.trigger.toLowerCase()} moments. Replacing this specific routine with a 2-minute breath pause or a glass of water has the highest leverage on reducing your habit.
          </p>
        </div>
      )}

      {/* Grid: Trigger Breakdown & 24h Peak Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triggers Breakdown */}
        <div className="lg:col-span-6 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
              Craving Triggers Breakdown
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 font-mono mt-0.5">
              {totalSticks} total sticks catalogued
            </p>
          </div>

          {triggerStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 dark:text-neutral-500 font-mono">
              No triggers catalogued yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {triggerStats.map((item) => (
                <div key={item.trigger}>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="text-stone-800 dark:text-neutral-200">{item.trigger}</span>
                    <span className="text-stone-500 dark:text-neutral-400">
                      {item.count} stks · {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-neutral-950 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full bg-stone-900 dark:bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: 24-Hour Peak Hours */}
        <div className="lg:col-span-6 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
                24-Hour Craving Rhythm
              </h3>
              <p className="text-xs text-stone-500 dark:text-neutral-400 font-mono mt-0.5">
                Hourly frequency from 00:00 to 23:00
              </p>
            </div>

            <div className="pt-4 pb-2">
              <div className="flex items-end gap-1 h-36 w-full">
                {hourCounts.map((val, h) => {
                  const heightPercent = maxHourCount > 0 ? (val / maxHourCount) * 100 : 0;
                  const isSpike = val > 0 && heightPercent >= 75;

                  return (
                    <div
                      key={h}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 px-1.5 py-0.5 rounded bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-[10px] pointer-events-none whitespace-nowrap z-10 font-mono font-semibold">
                        {String(h).padStart(2, '0')}:00 · {val}
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: val === 0 ? '3px' : `${Math.max(8, heightPercent)}%` }}
                        transition={{ duration: 0.4 }}
                        className={`w-full rounded-t-xs transition-colors ${
                          val === 0
                            ? 'bg-stone-200 dark:bg-neutral-800/40'
                            : isSpike
                            ? 'bg-stone-900 dark:bg-white'
                            : 'bg-stone-400 dark:bg-neutral-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] text-stone-400 dark:text-neutral-500 mt-2 font-mono">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-neutral-800/60 text-xs font-mono text-stone-500 dark:text-neutral-400 flex items-center justify-between">
            <span>Critical windows:</span>
            <span className="text-stone-900 dark:text-neutral-200">Morning & Post-Meal Spikes</span>
          </div>
        </div>
      </div>

      {/* Day of Week */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight mb-1">
          Weekly Day-by-Day Distribution
        </h3>
        <p className="text-xs text-stone-500 dark:text-neutral-400 font-mono mb-6">
          Stick frequency by weekday
        </p>

        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {dayNames.map((name, i) => {
            const count = dayCounts[i];
            const pct = (count / maxDayCount) * 100;

            return (
              <div key={name} className="flex flex-col items-center">
                <div className="w-full h-24 bg-stone-50 dark:bg-neutral-950 rounded-xl p-1 flex items-end justify-center border border-stone-200 dark:border-neutral-800/60">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: count === 0 ? '3px' : `${Math.max(10, pct)}%` }}
                    transition={{ duration: 0.4 }}
                    className="w-full rounded-lg bg-stone-900 dark:bg-white"
                  />
                </div>
                <span className="text-xs font-mono text-stone-700 dark:text-neutral-300 mt-2">{name}</span>
                <span className="text-[11px] font-mono text-stone-400 dark:text-neutral-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Craving Notes & Personal Reflections */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
              Personal Craving Reflections ({logsWithNotes.length})
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 font-mono mt-0.5">
              Personal reasons recorded when taking cigarette breaks
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedTriggerFilter('all')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                selectedTriggerFilter === 'all'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-neutral-950 font-semibold'
                  : 'bg-stone-100 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              All Notes
            </button>
            {triggerStats.slice(0, 4).map((t) => (
              <button
                key={t.trigger}
                onClick={() => setSelectedTriggerFilter(t.trigger)}
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                  selectedTriggerFilter === t.trigger
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-neutral-950 font-semibold'
                    : 'bg-stone-100 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t.trigger}
              </button>
            ))}
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 dark:text-neutral-500 font-mono border border-dashed border-stone-200 dark:border-neutral-800 rounded-2xl">
            No reflection notes recorded for this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNotes.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-stone-50/60 dark:bg-neutral-950/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-stone-900 dark:text-white font-medium">{log.reason}</span>
                    {log.mood && <span className="text-stone-500 dark:text-neutral-500">{log.mood}</span>}
                  </div>
                  <p className="text-xs text-stone-700 dark:text-neutral-300 leading-relaxed font-sans italic">
                    "{log.note}"
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200/80 dark:border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-stone-400 dark:text-neutral-500">
                  <span>{formatFullDate(log.timestamp)}</span>
                  <span>{formatTimeOnly(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
