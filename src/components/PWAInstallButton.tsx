import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Standalone guard
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    await install();
    setIsInstalling(false);
  };

  // Chromium / Desktop
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-stone-900 dark:text-neutral-100">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block">Install SmokePulse</span>
              <span className="text-[11px] text-stone-500 dark:text-neutral-400">
                Launch instantly offline from home screen
              </span>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Install SmokePulse as App"
        aria-label="Install SmokePulse"
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Install on iPhone / iPad"
          aria-label="Install on iOS"
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-900 text-xs font-medium transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4 text-stone-900 dark:text-neutral-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold tracking-tight">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-neutral-800 flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-neutral-400 leading-relaxed font-mono">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> icon in the Safari bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-10 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
