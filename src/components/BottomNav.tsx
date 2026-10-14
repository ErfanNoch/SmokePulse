import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, CalendarDays, BrainCircuit, WalletCards } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'habits', label: 'Habits', icon: BrainCircuit },
    { id: 'wallet', label: 'Expenses', icon: WalletCards },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-stone-200/80 dark:border-neutral-800/80 pb-safe text-stone-900 dark:text-neutral-100 transition-colors">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors relative"
            >
              <Icon
                className={`w-4 h-4 mb-1 transition-transform ${
                  isActive ? 'text-stone-950 dark:text-white scale-110' : 'text-stone-400 dark:text-neutral-500'
                }`}
              />
              <span
                className={`text-[10px] font-mono tracking-tight ${
                  isActive ? 'text-stone-950 dark:text-white font-medium' : 'text-stone-400 dark:text-neutral-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottom_active_dot"
                  className="absolute top-1.5 w-1 h-1 rounded-full bg-stone-950 dark:bg-white"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
