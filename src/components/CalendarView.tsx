import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CigaretteLog, PackPurchase, UserProfile, DailySummary } from '../types';
import {
  groupLogsByDay,
  generateMonthGrid,
  formatMonthYear,
  getLocalDateKey,
} from '../lib/dateUtils';

interface CalendarViewProps {
  logs: CigaretteLog[];
  packs: PackPurchase[];
  profile: UserProfile;
  costPerStick: number;
  onSelectDate: (date: Date, summary: DailySummary | null) => void;
  onOpenBuyPack: () => void;
  onOpenLogModal: (date?: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  logs,
  packs,
  profile,
  costPerStick,
  onSelectDate,
  onOpenBuyPack,
  onOpenLogModal,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const dailyData = groupLogsByDay(logs, packs, profile);
  const calendarCells = generateMonthGrid(year, month, dailyData, profile.dailyStickLimit);

  // Month totals
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthLogs = logs.filter((l) => getLocalDateKey(l.timestamp).startsWith(currentMonthPrefix));
  const thisMonthPacks = packs.filter((p) => getLocalDateKey(p.timestamp).startsWith(currentMonthPrefix));

  const monthSticksConsumed = thisMonthLogs.reduce((acc, l) => acc + l.count, 0);
  const monthBurnedCost = thisMonthLogs.reduce(
    (acc, l) => acc + (l.costEstimate > 0 ? l.costEstimate * l.count : costPerStick * l.count),
    0
  );
  const monthPacksRefilled = thisMonthPacks.reduce((acc, p) => acc + p.quantity, 0);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 pb-24 md:pb-10 text-stone-900 dark:text-neutral-100 transition-colors">
      {/* Month Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            Monthly Consumption
          </span>
          <div className="mt-1">
            <span className="text-2xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
              {monthSticksConsumed}
            </span>
            <span className="text-xs text-stone-500 dark:text-neutral-400 ml-1.5">sticks smoked</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            Burned Smoke Value
          </span>
          <div className="mt-1">
            <span className="text-2xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
              {profile.currency} {monthBurnedCost.toFixed(2)}
            </span>
            <span className="text-xs text-stone-500 dark:text-neutral-400 ml-1.5">financial cost</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            Pack Refills Bought
          </span>
          <div className="mt-1">
            <span className="text-2xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
              {monthPacksRefilled}
            </span>
            <span className="text-xs text-stone-500 dark:text-neutral-400 ml-1.5">pack(s) purchased</span>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-4 sm:p-6 shadow-xs">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-medium text-stone-950 dark:text-white tracking-tight">
              {formatMonthYear(year, month)}
            </h2>
            <button
              onClick={handleToday}
              className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors font-mono"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 rounded-lg border border-stone-200 dark:border-neutral-800 flex items-center justify-center text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-lg border border-stone-200 dark:border-neutral-800 flex items-center justify-center text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenLogModal(new Date(year, month, 1))}
              className="h-8 px-3 ml-2 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-neutral-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors"
            >
              + Log Stick
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] font-mono uppercase tracking-wider text-stone-400 dark:text-neutral-500">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            const hasSmoked = cell.totalSticks > 0;
            const isExceeded = cell.totalSticks > profile.dailyStickLimit;
            const isNear = cell.totalSticks >= profile.dailyStickLimit * 0.8 && !isExceeded;

            return (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                key={`${cell.dateStr}_${idx}`}
                onClick={() => {
                  const summary = dailyData.get(cell.dateStr) || null;
                  onSelectDate(cell.date, summary);
                }}
                className={`min-h-[72px] sm:min-h-[88px] p-2 sm:p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between group focus:outline-none ${
                  cell.isToday
                    ? 'border-stone-900 dark:border-neutral-400 ring-1 ring-stone-900 dark:ring-neutral-400'
                    : cell.isCurrentMonth
                    ? 'border-stone-200 dark:border-neutral-800/80 bg-stone-50/60 hover:bg-white dark:bg-neutral-950/40 dark:hover:bg-neutral-950/80'
                    : 'border-transparent bg-transparent opacity-30'
                }`}
              >
                {/* Top: Day Number & Pack Refill Tag */}
                <div className="flex items-start justify-between w-full">
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      cell.isToday
                        ? 'font-bold text-stone-950 dark:text-white'
                        : 'text-stone-600 dark:text-neutral-400 group-hover:text-stone-950 dark:group-hover:text-white'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.hasPacks && (
                    <span
                      title={`Refilled ${cell.packsCount} pack(s)`}
                      className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-50 dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-700"
                    >
                      +{cell.packsCount}p
                    </span>
                  )}
                </div>

                {/* Bottom: Sticks smoked & Estimated Price */}
                <div className="mt-1">
                  {hasSmoked ? (
                    <div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-mono font-medium ${
                            isExceeded
                              ? 'text-rose-600 dark:text-rose-400'
                              : isNear
                              ? 'text-amber-600 dark:text-amber-300'
                              : 'text-stone-900 dark:text-neutral-200'
                          }`}
                        >
                          {cell.totalSticks} {cell.totalSticks === 1 ? 'stk' : 'stks'}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-neutral-400 font-mono">
                        {profile.currency} {cell.estimatedCost.toFixed(2)}
                      </div>
                    </div>
                  ) : cell.isCurrentMonth ? (
                    <span className="text-[10px] text-stone-400 dark:text-neutral-600 font-mono">0 stks</span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-neutral-800/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-stone-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-900 dark:bg-neutral-200" />
              <span>Within target (&le;{profile.dailyStickLimit})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
              <span>Exceeded target</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] px-1 rounded bg-emerald-50 dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-700">
                +1p
              </span>
              <span>Pack refilled</span>
            </span>
          </div>

          <span className="text-[11px] text-stone-400 dark:text-neutral-500">Tap date to inspect logs & reflections</span>
        </div>
      </div>
    </div>
  );
};
