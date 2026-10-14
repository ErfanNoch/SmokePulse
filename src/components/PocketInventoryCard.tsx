import React from 'react';
import { motion } from 'motion/react';
import { SlidersHorizontal, Plus } from 'lucide-react';
import { UserProfile } from '../types';

interface PocketInventoryCardProps {
  inventory: {
    totalInventory: number;
    packsCount: number;
    looseInCurrentPack: number;
    packSize: number;
  };
  costPerStick: number;
  profile: UserProfile;
  onOpenBuyPack: () => void;
  onOpenCalibrate: () => void;
}

export const PocketInventoryCard: React.FC<PocketInventoryCardProps> = ({
  inventory,
  costPerStick,
  profile,
  onOpenBuyPack,
  onOpenCalibrate,
}) => {
  const { totalInventory, packsCount, looseInCurrentPack, packSize } = inventory;
  const isDepleted = totalInventory === 0;
  const isLow = totalInventory > 0 && totalInventory <= 4;
  const inventoryValue = (totalInventory * costPerStick).toFixed(2);

  const displaySlots = Math.min(20, packSize);
  const filledInActivePack = looseInCurrentPack > 0 ? looseInCurrentPack : (packsCount > 0 ? displaySlots : 0);

  return (
    <div className="rounded-3xl border border-stone-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 p-5 sm:p-6 text-stone-900 dark:text-neutral-100 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-neutral-400 font-mono tracking-wider uppercase">
            <span>Inventory Balance</span>
            <span aria-hidden="true">·</span>
            <span>{profile.defaultBrand}</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5">
            <motion.div
              key={totalInventory}
              initial={{ scale: 0.94, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="text-3xl sm:text-4xl font-light tracking-tight font-mono text-stone-950 dark:text-white"
            >
              {totalInventory}
            </motion.div>
            <span className="text-sm text-stone-500 dark:text-neutral-400 font-normal">
              sticks remaining
            </span>

            {isDepleted && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 font-medium">
                Depleted
              </span>
            )}

            {isLow && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-medium">
                Low Stock
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCalibrate}
            className="h-9 px-3 rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-900 hover:bg-stone-100 dark:hover:bg-neutral-800 text-stone-700 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Adjust physical stick count"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calibrate</span>
          </button>

          <button
            onClick={onOpenBuyPack}
            className="h-9 px-3.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Refill Pack</span>
          </button>
        </div>
      </div>

      {/* Visual Stick Chamber */}
      <div className="pt-4">
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-neutral-400 mb-2 font-mono">
          <span>Active Pack: {looseInCurrentPack}/{packSize}</span>
          <span>{packsCount} sealed pack(s)</span>
        </div>

        <div className="grid grid-cols-20 gap-1 sm:gap-1.5 h-8 bg-stone-100 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800/80 rounded-xl p-1.5 items-center">
          {Array.from({ length: displaySlots }).map((_, index) => {
            const isFilled = index < filledInActivePack;
            return (
              <div
                key={index}
                className={`h-full rounded-xs transition-all duration-300 flex flex-col justify-between ${
                  isFilled
                    ? 'bg-amber-500 dark:bg-amber-100/90 shadow-xs'
                    : 'bg-stone-200 dark:bg-neutral-800/40 opacity-40'
                }`}
              >
                <div
                  className={`h-1.5 w-full rounded-t-xs ${
                    isFilled ? 'bg-amber-700 dark:bg-amber-400/80' : 'bg-stone-300 dark:bg-neutral-700/50'
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 dark:text-neutral-400 font-mono">
          <span>Inventory Value: {profile.currency} {inventoryValue}</span>
          <span>~{profile.currency} {costPerStick.toFixed(2)} / stick</span>
        </div>
      </div>
    </div>
  );
};
