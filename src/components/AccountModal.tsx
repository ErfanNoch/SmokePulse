import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Shield,
  KeyRound,
  Download,
  Upload,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { UserProfile, CigaretteLog, PackPurchase } from '../types';
import { storageManager } from '../lib/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfile: UserProfile;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (profile: Partial<UserProfile>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  logs: CigaretteLog[];
  packs: PackPurchase[];
  onImportData: (data: { profiles: UserProfile[]; logs: CigaretteLog[]; packs: PackPurchase[] }) => void;
  onResetAllData: () => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah (Rp)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (RM)' },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  logs,
  packs,
  onImportData,
  onResetAllData,
}) => {
  const [tab, setTab] = useState<'profile' | 'security' | 'sync' | 'danger'>('profile');
  const [copiedSync, setCopiedSync] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(activeProfile.displayName || activeProfile.username);
  const [currency, setCurrency] = useState(activeProfile.currency || 'USD');
  const [dailyLimit, setDailyLimit] = useState(activeProfile.dailyStickLimit || 8);
  const [defaultPackCost, setDefaultPackCost] = useState(activeProfile.defaultPackCost || 9.0);
  const [defaultPackSize, setDefaultPackSize] = useState(activeProfile.defaultPackSize || 20);
  const [defaultBrand, setDefaultBrand] = useState(activeProfile.defaultBrand || 'Marlboro Gold');
  const [soundFeedback, setSoundFeedback] = useState(activeProfile.soundFeedback ?? true);

  const [pinInput, setPinInput] = useState(activeProfile.pin || '');
  const [newUsername, setNewUsername] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Danger reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...activeProfile,
      displayName: displayName.trim() || activeProfile.username,
      currency,
      dailyStickLimit: Number(dailyLimit) || 8,
      defaultPackCost: Number(defaultPackCost) || 9.0,
      defaultPackSize: Number(defaultPackSize) || 20,
      defaultBrand: defaultBrand.trim() || 'Standard',
      soundFeedback,
      pin: pinInput.trim() || undefined,
      updatedAt: Date.now(),
    });
    setSyncStatusMsg('Preferences updated.');
    setTimeout(() => setSyncStatusMsg(null), 2500);
  };

  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    onCreateProfile({
      username: newUsername.trim().toLowerCase().replace(/\s+/g, '_'),
      displayName: newUsername.trim(),
      currency,
      dailyStickLimit: dailyLimit,
      defaultPackCost,
      defaultPackSize,
      defaultBrand,
      manualStockCalibration: 20,
      soundFeedback: true,
      theme: activeProfile.theme,
    });
    setNewUsername('');
    setShowNewUserForm(false);
  };

  const handleExportJson = () => {
    const jsonStr = storageManager.exportBackupJson(profiles, logs, packs);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smokepulse_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = storageManager.importBackupJson(content);
        onImportData(data);
        setSyncStatusMsg('Backup imported successfully.');
      } catch (err: any) {
        setSyncStatusMsg(`Import failed: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
  };

  const compactSyncCode = storageManager.generateCompactSyncCode({ logs, packs });

  const handleCopyCompactSync = () => {
    navigator.clipboard.writeText(compactSyncCode);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2000);
  };

  const handleApplySyncCode = () => {
    if (!syncCodeInput.trim()) return;
    const result = storageManager.parseCompactSyncCode(syncCodeInput);
    if (!result) {
      setSyncStatusMsg('Invalid sync string.');
      return;
    }
    const existingLogIds = new Set(logs.map((l) => l.id));
    const newLogs = [...logs];
    result.logs.forEach((l) => {
      if (!existingLogIds.has(l.id)) newLogs.push(l);
    });

    const existingPackIds = new Set(packs.map((p) => p.id));
    const newPacks = [...packs];
    result.packs.forEach((p) => {
      if (!existingPackIds.has(p.id)) newPacks.push(p);
    });

    onImportData({
      profiles,
      logs: newLogs,
      packs: newPacks,
    });
    setSyncCodeInput('');
    setSyncStatusMsg(`Synced ${result.logs.length} logs & ${result.packs.length} packs.`);
  };

  const handleExecuteReset = () => {
    onResetAllData();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 text-stone-900 dark:text-neutral-100 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-neutral-400">
                Local Vault
              </span>
              <h2 className="text-base font-semibold text-stone-900 dark:text-white tracking-tight">
                Vault Settings & Privacy
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Minimal Tab Switcher */}
          <div className="flex border-b border-stone-100 dark:border-neutral-800/80 px-5 pt-2 overflow-x-auto">
            {[
              { id: 'profile', label: 'Preferences' },
              { id: 'security', label: 'Passcode & Vaults' },
              { id: 'sync', label: 'Backup & Sync' },
              { id: 'danger', label: 'Reset Data' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`pb-3 px-3 text-xs font-mono transition-colors relative whitespace-nowrap ${
                  tab === t.id
                    ? t.id === 'danger'
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-stone-900 dark:text-white font-semibold'
                    : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="account_tab_line"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      t.id === 'danger' ? 'bg-rose-500' : 'bg-stone-900 dark:bg-white'
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          {syncStatusMsg && (
            <div className="mx-5 mt-3 p-2.5 rounded-xl bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 text-stone-800 dark:text-neutral-200 text-xs font-mono">
              {syncStatusMsg}
            </div>
          )}

          <div className="p-5 sm:p-6 overflow-y-auto flex-1">
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.symbol}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                      Daily Limit (Sticks / Day)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      required
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(parseInt(e.target.value) || 8)}
                      className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                      Default Pack Cost ({currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={defaultPackCost}
                      onChange={(e) => setDefaultPackCost(parseFloat(e.target.value) || 0)}
                      className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                      Default Pack Size (Sticks)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      required
                      value={defaultPackSize}
                      onChange={(e) => setDefaultPackSize(parseInt(e.target.value) || 20)}
                      className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-neutral-300 mb-1">
                    Cigarette Brand
                  </label>
                  <input
                    type="text"
                    required
                    value={defaultBrand}
                    onChange={(e) => setDefaultBrand(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-400 dark:focus:border-neutral-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50/80 dark:bg-neutral-950/60">
                  <span className="text-xs text-stone-700 dark:text-neutral-300 font-medium">Haptic & Tactile Audio Click</span>
                  <input
                    type="checkbox"
                    checked={soundFeedback}
                    onChange={(e) => setSoundFeedback(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 dark:text-white focus:ring-0"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            )}

            {tab === 'security' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-stone-700 dark:text-neutral-300" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-white">
                      Passcode Lock
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed">
                    Set a 4-digit PIN to lock your log activity on this browser. Leave empty to disable.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Enter 4-digit PIN..."
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="flex-1 h-11 px-3.5 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none font-mono tracking-widest"
                    />
                    <button
                      onClick={() => {
                        onUpdateProfile({ ...activeProfile, pin: pinInput.trim() || undefined });
                        setSyncStatusMsg(pinInput.trim() ? 'PIN lock updated.' : 'PIN removed.');
                        setTimeout(() => setSyncStatusMsg(null), 2500);
                      }}
                      className="h-11 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors"
                    >
                      Save PIN
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-neutral-400">
                      Local Vault Accounts ({profiles.length})
                    </h3>
                    <button
                      onClick={() => setShowNewUserForm(!showNewUserForm)}
                      className="text-xs font-mono text-stone-900 dark:text-white flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Add Profile
                    </button>
                  </div>

                  {showNewUserForm && (
                    <form onSubmit={handleCreateNewProfile} className="mb-3 p-3 rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Profile name..."
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="flex-1 h-9 px-3 text-xs rounded-lg border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-stone-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-3 h-9 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
                      >
                        Create
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {profiles.map((p) => {
                      const isActive = p.id === activeProfile.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                            isActive
                              ? 'border-stone-400 dark:border-neutral-400 bg-stone-100/80 dark:bg-neutral-800/60'
                              : 'border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/40'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-stone-900 dark:text-white">
                              {p.displayName || p.username}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-neutral-400 font-mono">
                              Limit: {p.dailyStickLimit} stks · {p.currency}
                            </div>
                          </div>

                          {isActive ? (
                            <span className="text-[11px] font-mono text-stone-900 dark:text-white flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => onSelectProfile(p.id)}
                              className="px-3 py-1 rounded-lg border border-stone-300 dark:border-neutral-700 text-xs font-mono text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-neutral-800"
                            >
                              Switch
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === 'sync' && (
              <div className="space-y-5">
                <PWAInstallButton variant="banner" />

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800 space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-white">
                    Offline File Backup (.json)
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed">
                    Export your complete local ledger ({logs.length} smoking logs, {packs.length} pack purchases) into an offline JSON file.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={handleExportJson}
                      className="flex-1 h-11 px-3 rounded-xl border border-stone-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-stone-800 dark:text-neutral-200 flex items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export File
                    </button>
                    <label className="flex-1 h-11 px-3 rounded-xl border border-stone-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-stone-800 dark:text-neutral-200 flex items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Import File
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJsonFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800 space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-white">
                    Cross-Device Sync Key
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed">
                    Transfer data across devices with a compact compressed string without any external account:
                  </p>
                  <div className="relative">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 font-mono text-[11px] text-stone-600 dark:text-neutral-400 truncate pr-16 select-all">
                      {compactSyncCode || 'No logs recorded yet'}
                    </div>
                    <button
                      onClick={handleCopyCompactSync}
                      className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs rounded-lg bg-stone-900 dark:bg-white text-white dark:text-neutral-950 font-medium flex items-center gap-1 shadow-xs"
                    >
                      {copiedSync ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedSync ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste sync key here..."
                        value={syncCodeInput}
                        onChange={(e) => setSyncCodeInput(e.target.value)}
                        className="flex-1 h-10 px-3 text-xs rounded-xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-stone-900 dark:text-white focus:outline-none font-mono"
                      />
                      <button
                        onClick={handleApplySyncCode}
                        className="px-3 h-10 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dexie.js Storage Engine Status */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-white font-semibold">
                        Storage Engine: Dexie.js
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      IndexedDB v1
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed">
                    SmokePulse uses high-performance Dexie.js indexing with automatic migration and persistent storage protection against browser cache eviction. Prepared for CRDT & P2P sync.
                  </p>
                </div>
              </div>
            )}

            {tab === 'danger' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-rose-900 dark:text-rose-300 font-semibold">
                      Reset & Clear All Local Data
                    </h3>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed mb-4">
                    This action will wipe all recorded cigarette logs ({logs.length}), pack purchases ({packs.length}), and reset your stick inventory back to 0. You will start with a fresh clean slate.
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="w-full h-10 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-neutral-900 text-xs font-medium text-stone-800 dark:text-neutral-200 flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Backup (.json) First
                    </button>

                    {!showResetConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All Data
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-rose-300 dark:border-rose-900 space-y-2">
                        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                          Are you absolutely sure? All local data will be permanently wiped.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 h-9 rounded-lg border border-stone-200 dark:border-neutral-800 text-xs font-medium text-stone-600 dark:text-neutral-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteReset}
                            className="flex-1 h-9 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                          >
                            Confirm Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
