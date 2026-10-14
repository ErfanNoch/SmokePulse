import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CigaretteLog,
  PackPurchase,
  UserProfile,
  DailySummary,
} from './types';
import {
  storageManager,
  DEFAULT_PROFILE,
  calculateLiveInventory,
  getCostPerStick,
} from './lib/storage';
import { sound } from './lib/audio';
import { getLocalDateKey } from './lib/dateUtils';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { HabitsView } from './components/HabitsView';
import { WalletView } from './components/WalletView';
import { LogCigaretteModal } from './components/LogCigaretteModal';
import { BuyPackModal } from './components/BuyPackModal';
import { AccountModal } from './components/AccountModal';
import { DayDetailsModal } from './components/DayDetailsModal';
import { CalibrateStockModal } from './components/CalibrateStockModal';
import { PinLockScreen } from './components/PinLockScreen';
import { YamadaEasterEgg } from './components/YamadaEasterEgg';
import { useP2PSync } from './hooks/useP2PSync';
import { P2PSyncModal } from './components/p2p/P2PSyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useTheme } from './components/theme-provider';

export default function App() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === 'dark' : true;

  const handleToggleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  const [profiles, setProfiles] = useState<UserProfile[]>([DEFAULT_PROFILE]);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [logs, setLogs] = useState<CigaretteLog[]>([]);
  const [packs, setPacks] = useState<PackPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Easter Egg modal state
  const [isYamadaOpen, setIsYamadaOpen] = useState(false);

  // P2P Multi-device Sync modal state
  const [isP2PModalOpen, setIsP2PModalOpen] = useState(false);

  // P2P WebRTC State Manager with CRDT Sync
  const p2p = useP2PSync({
    activeProfile,
    profiles,
    logs,
    packs,
    onDataMerged: ({ profiles: p, logs: l, packs: pk }) => {
      setProfiles(p);
      setLogs(l);
      setPacks(pk);
    },
  });

  // Automatically open and connect if URL contains ?pair=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pair = params.get('pair');
      if (pair) {
        setIsP2PModalOpen(true);
        p2p.connectToPeer(pair);
      }
    }
  }, []);

  // Navigation & modals
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'habits' | 'wallet'>('dashboard');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalInitialDate, setLogModalInitialDate] = useState<Date | undefined>(undefined);
  const [isBuyPackModalOpen, setIsBuyPackModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);

  // Calendar day detail modal
  const [selectedDaySummary, setSelectedDaySummary] = useState<DailySummary | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

  // Security Lock
  const [isLocked, setIsLocked] = useState(false);

  // Load database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await storageManager.getAllData();
        setProfiles(data.profiles);
        setActiveProfile(data.activeProfile);
        setLogs(data.logs);
        setPacks(data.packs);

        if (data.activeProfile.pin) {
          setIsLocked(true);
        }
      } catch (err) {
        console.error('Failed to load storage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Inventory calculation
  const inventory = calculateLiveInventory(activeProfile, packs, logs);
  const costPerStick = getCostPerStick(activeProfile, packs);

  // Persist helper
  const persistChanges = useCallback(
    async (
      updatedProfiles: UserProfile[],
      updatedLogs: CigaretteLog[],
      updatedPacks: PackPurchase[]
    ) => {
      setProfiles(updatedProfiles);
      setLogs(updatedLogs);
      setPacks(updatedPacks);
      await storageManager.saveAll(updatedProfiles, updatedLogs, updatedPacks);
    },
    []
  );

  // Quick log +1 stick with instant tactile sound
  const handleQuickLogStick = () => {
    sound.playClick(activeProfile.soundFeedback);
    const newLog: CigaretteLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      count: 1,
      reason: 'Craving',
      mood: 'Neutral',
      costEstimate: parseFloat(costPerStick.toFixed(2)),
    };
    const updated = [newLog, ...logs];
    persistChanges(profiles, updated, packs);
    p2p.broadcastLiveLog(newLog);
  };

  // Detailed log save
  const handleSaveDetailedLog = (logData: Omit<CigaretteLog, 'id'>) => {
    sound.playClick(activeProfile.soundFeedback);
    const newLog: CigaretteLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      costEstimate: logData.costEstimate || parseFloat((logData.count * costPerStick).toFixed(2)),
    };
    const updated = [newLog, ...logs];
    updated.sort((a, b) => b.timestamp - a.timestamp);
    persistChanges(profiles, updated, packs);
    p2p.broadcastLiveLog(newLog);

    if (selectedCalendarDate) {
      const selectedKey = getLocalDateKey(selectedCalendarDate.getTime());
      const logKey = getLocalDateKey(newLog.timestamp);
      if (selectedKey === logKey) {
        setSelectedDaySummary((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            totalSticks: prev.totalSticks + newLog.count,
            estimatedCost: prev.estimatedCost + newLog.costEstimate,
            logs: [newLog, ...prev.logs],
          };
        });
      }
    }
  };

  // Record pack purchase
  const handleSavePackPurchase = (packData: Omit<PackPurchase, 'id'>) => {
    sound.playSuccess(activeProfile.soundFeedback);
    const newPack: PackPurchase = {
      ...packData,
      id: `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [newPack, ...packs];
    updated.sort((a, b) => b.timestamp - a.timestamp);
    persistChanges(profiles, logs, updated);
    p2p.broadcastLivePack(newPack);
  };

  // Calibrate physical stock
  const handleCalibrateStock = (newPhysicalCount: number) => {
    sound.playClick(activeProfile.soundFeedback);
    const packSize = activeProfile.defaultPackSize || 20;
    const totalPurchased = packs.reduce(
      (acc, p) => acc + (p.sticksPerPack || packSize) * (p.quantity || 1),
      0
    );
    const totalSmoked = logs.reduce((acc, l) => acc + l.count, 0);
    const newBase = newPhysicalCount - totalPurchased + totalSmoked;

    const updatedProfile: UserProfile = {
      ...activeProfile,
      manualStockCalibration: newBase,
      updatedAt: Date.now(),
    };
    handleUpdateProfile(updatedProfile);
  };

  // Delete cigarette log
  const handleDeleteLog = (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    persistChanges(profiles, updated, packs);

    if (selectedDaySummary) {
      setSelectedDaySummary((prev) => {
        if (!prev) return null;
        const remaining = prev.logs.filter((l) => l.id !== id);
        const newTotal = remaining.reduce((acc, l) => acc + l.count, 0);
        return {
          ...prev,
          logs: remaining,
          totalSticks: newTotal,
        };
      });
    }
  };

  // Delete pack record
  const handleDeletePack = (id: string) => {
    const updated = packs.filter((p) => p.id !== id);
    persistChanges(profiles, logs, updated);

    if (selectedDaySummary) {
      setSelectedDaySummary((prev) => {
        if (!prev) return null;
        const remaining = prev.packsPurchased.filter((p) => p.id !== id);
        return {
          ...prev,
          packsPurchased: remaining,
        };
      });
    }
  };

  // Reset all data
  const handleResetAllData = async () => {
    const fresh = await storageManager.clearAllData();
    setProfiles(fresh.profiles);
    setActiveProfile(fresh.activeProfile);
    setLogs(fresh.logs);
    setPacks(fresh.packs);
    setSelectedDaySummary(null);
    setSelectedCalendarDate(null);
    sound.playSuccess(true);
  };

  // Profile management
  const handleSelectProfile = (id: string) => {
    const target = profiles.find((p) => p.id === id);
    if (target) {
      setActiveProfile(target);
      storageManager.setActiveProfileId(id);
      if (target.pin) {
        setIsLocked(true);
      }
    }
  };

  const handleCreateProfile = (data: Partial<UserProfile>) => {
    const newProf: UserProfile = {
      ...DEFAULT_PROFILE,
      id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: data.username || 'user',
      displayName: data.displayName || 'Personal',
      currency: data.currency || activeProfile.currency,
      dailyStickLimit: data.dailyStickLimit || activeProfile.dailyStickLimit,
      defaultPackCost: data.defaultPackCost || activeProfile.defaultPackCost,
      defaultPackSize: data.defaultPackSize || activeProfile.defaultPackSize,
      defaultBrand: data.defaultBrand || activeProfile.defaultBrand,
      manualStockCalibration: 20,
      soundFeedback: data.soundFeedback ?? true,
      theme: activeProfile.theme,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedProfs = [...profiles, newProf];
    persistChanges(updatedProfs, logs, packs);
    setActiveProfile(newProf);
    storageManager.setActiveProfileId(newProf.id);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    const updatedProfs = profiles.map((p) =>
      p.id === updatedProfile.id ? updatedProfile : p
    );
    persistChanges(updatedProfs, logs, packs);
    setActiveProfile(updatedProfile);
  };

  const handleImportData = (imported: {
    profiles: UserProfile[];
    logs: CigaretteLog[];
    packs: PackPurchase[];
  }) => {
    persistChanges(imported.profiles, imported.logs, imported.packs);
    if (imported.profiles.length > 0) {
      setActiveProfile(imported.profiles[0]);
    }
  };

  // Calendar selection
  const handleSelectCalendarDate = (date: Date, summary: DailySummary | null) => {
    setSelectedCalendarDate(date);
    setSelectedDaySummary(summary);
    setIsDayDetailsOpen(true);
  };

  const handleAddLogForDate = (date: Date) => {
    setLogModalInitialDate(date);
    setIsLogModalOpen(true);
  };

  // Calculate today's sticks
  const todayKey = getLocalDateKey(Date.now());
  const todayLogs = logs.filter((l) => getLocalDateKey(l.timestamp) === todayKey);
  const todayCount = todayLogs.reduce((acc, l) => acc + l.count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex items-center justify-center text-stone-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-300 dark:border-neutral-400 border-t-stone-900 dark:border-t-white rounded-full animate-spin" />
          <span className="text-xs font-mono text-stone-500 dark:text-neutral-400">Loading SmokePulse...</span>
        </div>
      </div>
    );
  }

  if (isLocked && activeProfile.pin) {
    return (
      <PinLockScreen
        profile={activeProfile}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-neutral-100 flex flex-col font-sans transition-colors antialiased">
      {/* Top Navbar */}
      <Navbar
        profile={activeProfile}
        todayCount={todayCount}
        dailyLimit={activeProfile.dailyStickLimit}
        darkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onLockVault={() => setIsLocked(true)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        onTriggerEasterEgg={() => setIsYamadaOpen(true)}
        onOpenP2PSync={() => setIsP2PModalOpen(true)}
        p2pStatus={p2p.status}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DashboardView
                logs={logs}
                packs={packs}
                profile={activeProfile}
                inventory={inventory}
                costPerStick={costPerStick}
                onQuickLogStick={handleQuickLogStick}
                onOpenDetailedLog={() => {
                  setLogModalInitialDate(new Date());
                  setIsLogModalOpen(true);
                }}
                onOpenBuyPack={() => setIsBuyPackModalOpen(true)}
                onOpenCalibrate={() => setIsCalibrateModalOpen(true)}
                onDeleteLog={handleDeleteLog}
                onOpenCalendarDate={(d) => {
                  setSelectedCalendarDate(d);
                  setIsDayDetailsOpen(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <CalendarView
                logs={logs}
                packs={packs}
                profile={activeProfile}
                costPerStick={costPerStick}
                onSelectDate={handleSelectCalendarDate}
                onOpenBuyPack={() => setIsBuyPackModalOpen(true)}
                onOpenLogModal={(d) => {
                  setLogModalInitialDate(d || new Date());
                  setIsLogModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <HabitsView logs={logs} profile={activeProfile} />
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <WalletView
                packs={packs}
                logs={logs}
                profile={activeProfile}
                costPerStick={costPerStick}
                totalInventory={inventory.totalInventory}
                onOpenBuyPack={() => setIsBuyPackModalOpen(true)}
                onDeletePack={handleDeletePack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      {/* Modals & Drawers */}
      <LogCigaretteModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleSaveDetailedLog}
        initialDate={logModalInitialDate}
        costPerStick={costPerStick}
        currency={activeProfile.currency}
        inventoryCount={inventory.totalInventory}
      />

      <BuyPackModal
        isOpen={isBuyPackModalOpen}
        onClose={() => setIsBuyPackModalOpen(false)}
        onSave={handleSavePackPurchase}
        profile={activeProfile}
      />

      <CalibrateStockModal
        isOpen={isCalibrateModalOpen}
        onClose={() => setIsCalibrateModalOpen(false)}
        currentInventory={inventory.totalInventory}
        onCalibrate={handleCalibrateStock}
        profile={activeProfile}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onUpdateProfile={handleUpdateProfile}
        logs={logs}
        packs={packs}
        onImportData={handleImportData}
        onResetAllData={handleResetAllData}
      />

      <DayDetailsModal
        isOpen={isDayDetailsOpen}
        onClose={() => setIsDayDetailsOpen(false)}
        daySummary={selectedDaySummary}
        selectedDate={selectedCalendarDate}
        profile={activeProfile}
        costPerStick={costPerStick}
        onDeleteLog={handleDeleteLog}
        onDeletePack={handleDeletePack}
        onAddLogForDate={handleAddLogForDate}
      />

      {/* Yamada Goofy Easter Egg */}
      <YamadaEasterEgg
        isOpen={isYamadaOpen}
        onClose={() => setIsYamadaOpen(false)}
      />

      {/* P2P Multi-Device WebRTC Sync Modal */}
      <P2PSyncModal
        isOpen={isP2PModalOpen}
        onClose={() => setIsP2PModalOpen(false)}
        status={p2p.status}
        pairingCode={p2p.pairingCode}
        peerInfo={p2p.peerInfo}
        errorMessage={p2p.errorMessage}
        lastSyncTime={p2p.lastSyncTime}
        syncStats={p2p.syncStats}
        isSyncing={p2p.isSyncing}
        onStartHost={p2p.startHost}
        onConnectToPeer={p2p.connectToPeer}
        onSyncNow={p2p.syncNow}
        onDisconnect={p2p.disconnect}
      />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
