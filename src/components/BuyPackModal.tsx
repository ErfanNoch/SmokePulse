import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { PackPurchase, UserProfile } from '../types';

interface BuyPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pack: Omit<PackPurchase, 'id'>) => void;
  profile: UserProfile;
}

export const BuyPackModal: React.FC<BuyPackModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profile,
}) => {
  const [brandName, setBrandName] = useState(profile.defaultBrand || 'Marlboro Gold');
  const [sticksPerPack, setSticksPerPack] = useState(profile.defaultPackSize || 20);
  const [cost, setCost] = useState(profile.defaultPackCost || 9.0);
  const [quantity, setQuantity] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [note, setNote] = useState('');

  const formatForDatetimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [dateTimeStr, setDateTimeStr] = useState<string>(() =>
    formatForDatetimeLocal(new Date())
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(dateTimeStr).getTime() || Date.now();
    onSave({
      timestamp,
      brandName: brandName.trim() || profile.defaultBrand,
      sticksPerPack: Number(sticksPerPack) || 20,
      cost: Number(cost) || 0,
      quantity: Number(quantity) || 1,
      storeName: storeName.trim() || undefined,
      note: note.trim() || undefined,
    });
    setQuantity(1);
    setStoreName('');
    setNote('');
    onClose();
  };

  const refillSticks = quantity * sticksPerPack;
  const totalCost = (quantity * cost).toFixed(2);

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
                Inventory Refill
              </span>
              <h2 className="text-base font-semibold text-stone-950 dark:text-white tracking-tight">
                Record Pack Purchase
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Live Refill Banner */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/70 border border-stone-200 dark:border-neutral-800/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-stone-500 dark:text-neutral-400 block text-[11px]">Refill Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">+{refillSticks} sticks</span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 dark:text-neutral-400 block text-[11px]">Total Expense</span>
                <span className="text-stone-900 dark:text-white font-semibold text-sm">
                  {profile.currency} {totalCost}
                </span>
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                Brand / Product
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Marlboro Gold, Sampoerna, Camel..."
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
              />
            </div>

            {/* 3-Column: Cost, Quantity, Sticks per pack */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                  Pack Cost ({profile.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                  Quantity (Packs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                  Sticks / Pack
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={sticksPerPack}
                  onChange={(e) => setSticksPerPack(parseInt(e.target.value) || 20)}
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Store & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                  Store / Vendor (Optional)
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Minimart, Gas station..."
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                  Purchase Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={dateTimeStr}
                  onChange={(e) => setDateTimeStr(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Bought for weekend trip..."
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
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
                Save & Refill Stock (+{refillSticks})
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
