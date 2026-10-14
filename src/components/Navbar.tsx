import React, { useRef } from 'react';
import { Moon, Sun, Lock, User, Radio } from 'lucide-react';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  profile: UserProfile;
  todayCount: number;
  dailyLimit: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAccount: () => void;
  onLockVault: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onTriggerEasterEgg?: () => void;
  onOpenP2PSync?: () => void;
  p2pStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  todayCount,
  dailyLimit,
  darkMode,
  onToggleDarkMode,
  onOpenAccount,
  onLockVault,
  activeTab,
  onSelectTab,
  onTriggerEasterEgg,
  onOpenP2PSync,
  p2pStatus,
}) => {
  // Easter egg
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleBrandClick = () => {
    onSelectTab('dashboard');

    const now = Date.now();
    const diff = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    if (diff < 600) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      if (onTriggerEasterEgg) {
        onTriggerEasterEgg();
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md text-stone-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Single text wordmark with rapid-click Easter Egg */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBrandClick}
            className="flex items-center gap-2 text-left group focus:outline-none select-none active:scale-95 transition-transform"
            title="SmokePulse"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 group-hover:scale-125 transition-transform" />
            <span className="text-base font-semibold tracking-tight text-stone-950 dark:text-white font-sans">
              SmokePulse
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-neutral-400">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`transition-colors hover:text-stone-900 dark:hover:text-white ${
              activeTab === 'dashboard' ? 'text-stone-950 dark:text-white font-semibold' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('calendar')}
            className={`transition-colors hover:text-stone-900 dark:hover:text-white ${
              activeTab === 'calendar' ? 'text-stone-950 dark:text-white font-semibold' : ''
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => onSelectTab('habits')}
            className={`transition-colors hover:text-stone-900 dark:hover:text-white ${
              activeTab === 'habits' ? 'text-stone-950 dark:text-white font-semibold' : ''
            }`}
          >
            Habits & Notes
          </button>
          <button
            onClick={() => onSelectTab('wallet')}
            className={`transition-colors hover:text-stone-900 dark:hover:text-white ${
              activeTab === 'wallet' ? 'text-stone-950 dark:text-white font-semibold' : ''
            }`}
          >
            Expenses
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* P2P Sync Trigger Button */}
          {onOpenP2PSync && (
            <button
              onClick={onOpenP2PSync}
              title={p2pStatus === 'connected' ? 'P2P Sync Active' : 'P2P Multi-Device Sync'}
              className={`h-8 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-lg border transition-colors ${
                p2pStatus === 'connected'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-900'
              }`}
            >
              {p2pStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono hidden sm:inline font-semibold">P2P Live</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="text-[11px] font-mono hidden sm:inline">P2P</span>
                </>
              )}
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-900 transition-colors"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700" />
            )}
          </button>

          {/* PIN Lock button if PIN is set */}
          {profile.pin && (
            <button
              onClick={onLockVault}
              title="Lock Vault"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Local Account & Sync button */}
          <button
            onClick={onOpenAccount}
            className="h-8 px-2.5 flex items-center gap-2 rounded-lg border border-stone-200 dark:border-neutral-800 bg-stone-100 dark:bg-neutral-900 hover:bg-stone-200 dark:hover:bg-neutral-800 text-stone-800 dark:text-neutral-200 text-xs font-medium transition-colors"
          >
            <User className="w-3.5 h-3.5 text-stone-500 dark:text-neutral-400" />
            <span className="max-w-[80px] sm:max-w-[110px] truncate">{profile.displayName || profile.username}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
