import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { PackPurchase, CigaretteLog, UserProfile } from '../types';
import { formatFullDate, formatTimeOnly } from '../lib/dateUtils';

interface WalletViewProps {
  packs: PackPurchase[];
  logs: CigaretteLog[];
  profile: UserProfile;
  costPerStick: number;
  totalInventory: number;
  onOpenBuyPack: () => void;
  onDeletePack: (id: string) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  packs,
  logs,
  profile,
  costPerStick,
  totalInventory,
  onOpenBuyPack,
  onDeletePack,
}) => {
  const [targetReductionSticks, setTargetReductionSticks] = useState(2);

  const monthlySpending = new Map<string, number>();
  const now = new Date();

  const monthsList: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    monthsList.push({ key, label });
    monthlySpending.set(key, 0);
  }

  packs.forEach((p) => {
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cost = p.cost * (p.quantity || 1);
    if (monthlySpending.has(key)) {
      monthlySpending.set(key, (monthlySpending.get(key) || 0) + cost);
    }
  });

  const maxMonthSpend = Math.max(...Array.from(monthlySpending.values()), 1);

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthSpend = monthlySpending.get(currentMonthKey) || 0;
  const totalAllTimeSpend = packs.reduce((acc, p) => acc + p.cost * (p.quantity || 1), 0);
  const totalPacksCount = packs.reduce((acc, p) => acc + (p.quantity || 1), 0);

  const monthlySavings = targetReductionSticks * 30 * costPerStick;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="space-y-6 pb-24 md:pb-10 text-stone-900 dark:text-neutral-100 transition-colors">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <div className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            This Month's Pack Spend
          </div>
          <div className="my-2">
            <div className="text-3xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
              {profile.currency} {thisMonthSpend.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-1">
              Current calendar month expenses
            </p>
          </div>
          <div className="text-[11px] font-mono text-stone-400 dark:text-neutral-500">
            ~{profile.currency} {costPerStick.toFixed(2)} / stick burned
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <div className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            All-Time Purchase Total
          </div>
          <div className="my-2">
            <div className="text-3xl font-light font-mono text-stone-950 dark:text-white tabular-nums">
              {profile.currency} {totalAllTimeSpend.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-1">
              {totalPacksCount} pack(s) recorded in ledger
            </p>
          </div>
          <div className="text-[11px] font-mono text-stone-400 dark:text-neutral-500">
            Current stock: {totalInventory} sticks
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 flex flex-col justify-between shadow-xs">
          <div className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
            Record Refill
          </div>
          <div className="my-2">
            <h3 className="text-sm font-semibold text-stone-950 dark:text-white">
              Bought another pack?
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Refill your digital pocket stock immediately.
            </p>
          </div>
          <button
            onClick={onOpenBuyPack}
            className="w-full h-10 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Pack Record
          </button>
        </div>
      </div>

      {/* Monthly Expenditure Trend */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
            Monthly Expense Ledger (Past 6 Months)
          </h3>
          <p className="text-xs text-stone-500 dark:text-neutral-400 font-mono mt-0.5">
            Spending on packs in {profile.currency}
          </p>
        </div>

        <div className="h-44 flex items-end gap-3 sm:gap-6 px-2">
          {monthsList.map((m) => {
            const spend = monthlySpending.get(m.key) || 0;
            const heightPercent = maxMonthSpend > 0 ? (spend / maxMonthSpend) * 100 : 0;
            const isCurrent = m.key === currentMonthKey;

            return (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] text-stone-500 dark:text-neutral-400 font-mono mb-1.5 tabular-nums">
                  {spend > 0 ? Math.round(spend) : '0'}
                </span>
                <div className="w-full bg-stone-100 dark:bg-neutral-950 rounded-xl h-full flex items-end p-1 max-w-[52px] border border-stone-200 dark:border-neutral-800/60">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: spend === 0 ? '4px' : `${Math.max(10, heightPercent)}%` }}
                    transition={{ duration: 0.5 }}
                    className={`w-full rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-stone-900 dark:bg-white'
                        : 'bg-stone-400 dark:bg-neutral-600'
                    }`}
                  />
                </div>
                <span className="text-xs font-mono text-stone-600 dark:text-neutral-400 mt-2">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Projection Simulator */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
          Financial Tapering Calculator
        </h3>
        <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
          Project how much money you save by smoking fewer sticks each day
        </p>

        <div className="mt-4 p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/70 border border-stone-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-xs text-stone-700 dark:text-neutral-300 block mb-2 font-mono">
              Reduce daily smoking by:
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => setTargetReductionSticks(num)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                    targetReductionSticks === num
                      ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-neutral-950 dark:border-white font-semibold'
                      : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-400 border-stone-200 dark:border-neutral-800 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  -{num} stick(s)
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8 sm:text-right font-mono">
            <div>
              <span className="text-[11px] text-stone-500 dark:text-neutral-400 block uppercase tracking-wider">
                Monthly Savings
              </span>
              <span className="text-lg font-light text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{profile.currency} {monthlySavings.toFixed(0)}
              </span>
            </div>
            <div className="border-l border-stone-200 dark:border-neutral-800 pl-8">
              <span className="text-[11px] text-stone-500 dark:text-neutral-400 block uppercase tracking-wider">
                Annual Savings
              </span>
              <span className="text-xl font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{profile.currency} {yearlySavings.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pack Ledger History */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-950 dark:text-white tracking-tight">
              Recorded Pack Purchases ({packs.length})
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Historical ledger of pack refills
            </p>
          </div>
          <button
            onClick={onOpenBuyPack}
            className="text-xs font-mono text-stone-600 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record pack
          </button>
        </div>

        {packs.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 dark:text-neutral-500 border border-dashed border-stone-200 dark:border-neutral-800 rounded-2xl font-mono">
            No pack purchases recorded. Tap "Record pack" to refill inventory.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-neutral-800/60">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="py-3.5 flex items-start justify-between gap-3 group first:pt-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900 dark:text-white">
                      {pack.brandName}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-neutral-400 font-mono">
                      · {pack.quantity} pack(s) (+{pack.sticksPerPack * pack.quantity} sticks)
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 dark:text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>{formatFullDate(pack.timestamp)}</span>
                    <span>·</span>
                    <span>{formatTimeOnly(pack.timestamp)}</span>
                    {pack.storeName && (
                      <>
                        <span>·</span>
                        <span>{pack.storeName}</span>
                      </>
                    )}
                  </div>
                  {pack.note && (
                    <p className="text-xs text-stone-600 dark:text-neutral-400 mt-1 italic font-sans leading-relaxed">
                      "{pack.note}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono">
                    <div className="text-xs font-medium text-stone-900 dark:text-white">
                      {profile.currency} {(pack.cost * pack.quantity).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-neutral-500">
                      {profile.currency} {pack.cost.toFixed(2)}/pack
                    </div>
                  </div>
                  <button
                    onClick={() => onDeletePack(pack.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 p-1 transition-opacity"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
