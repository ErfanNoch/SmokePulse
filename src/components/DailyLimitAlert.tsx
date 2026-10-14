import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface DailyLimitAlertProps {
  todayCount: number;
  dailyLimit: number;
}

export const DailyLimitAlert: React.FC<DailyLimitAlertProps> = ({ todayCount, dailyLimit }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || dailyLimit <= 0) return null;

  const isExceeded = todayCount > dailyLimit;
  const isApproaching = todayCount >= dailyLimit * 0.8 && !isExceeded;

  if (!isExceeded && !isApproaching) return null;

  return (
    <div
      className={`rounded-xl p-3.5 sm:p-4 mb-4 border transition-all ${
        isExceeded
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isExceeded ? (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-sm font-semibold">
              {isExceeded
                ? `Daily Limit Exceeded (${todayCount}/${dailyLimit} sticks)`
                : `Approaching Daily Limit (${todayCount}/${dailyLimit} sticks)`}
            </div>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
              {isExceeded
                ? "You've exceeded your daily target. Take a pause, drink a glass of cold water, or practice 2 minutes of box breathing to resist the next craving."
                : `You have ${
                    dailyLimit - todayCount
                  } stick(s) remaining for today. Pace your smoke breaks to stay within your goal.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
