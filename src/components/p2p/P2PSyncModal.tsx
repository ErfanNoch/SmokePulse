import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Radio,
  QrCode,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { QRDisplay } from './QRDisplay';
import { QRScanner } from './QRScanner';
import { P2PConnectionStatus, P2PPeerInfo } from '../../lib/p2p/types';

interface P2PSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: P2PConnectionStatus;
  pairingCode: string;
  peerInfo: P2PPeerInfo | null;
  errorMessage: string | null;
  lastSyncTime: number | null;
  syncStats: { logsSynced: number; packsSynced: number } | null;
  isSyncing: boolean;
  onStartHost: () => void;
  onConnectToPeer: (code: string) => void;
  onSyncNow: () => void;
  onDisconnect: () => void;
}

export const P2PSyncModal: React.FC<P2PSyncModalProps> = ({
  isOpen,
  onClose,
  status,
  pairingCode,
  peerInfo,
  errorMessage,
  lastSyncTime,
  syncStats,
  isSyncing,
  onStartHost,
  onConnectToPeer,
  onSyncNow,
  onDisconnect,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [joinMode, setJoinMode] = useState<'code' | 'camera'>('code');
  const [inputCode, setInputCode] = useState('');

  // Start host when switching to host tab if idle
  useEffect(() => {
    if (isOpen && tab === 'host' && status === 'idle') {
      onStartHost();
    }
  }, [isOpen, tab, status, onStartHost]);

  if (!isOpen) return null;

  const isConnected = status === 'connected' || status === 'syncing';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onConnectToPeer(inputCode.trim());
  };

  const handleScanSuccess = (code: string) => {
    onConnectToPeer(code);
    setJoinMode('code');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-md w-full bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-stone-900 dark:text-neutral-100"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">P2P Multi-Device Sync</h2>
                <p className="text-[11px] text-stone-500 dark:text-neutral-400 font-mono">
                  Direct WebRTC with CRDT (No Cloud Server)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* View 1: When connected */}
            {isConnected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-3 h-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/40 absolute blur-[2px]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                        Connected: {peerInfo?.name || 'Remote Peer'}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                        WebRTC DataChannel Active
                      </div>
                    </div>
                  </div>
                  {peerInfo?.lastPingMs !== undefined && peerInfo.lastPingMs > 0 && (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      {peerInfo.lastPingMs}ms
                    </span>
                  )}
                </div>

                {/* Sync Details */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-neutral-950/60 border border-stone-200 dark:border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-neutral-400 font-mono">Last Synchronized</span>
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'In progress...'}
                    </span>
                  </div>

                  {syncStats && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 dark:text-neutral-400 font-mono">CRDT Merged Items</span>
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {syncStats.logsSynced} logs · {syncStats.packsSynced} packs
                      </span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-stone-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Real-time sync active: logging on either device updates both instantly.</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="flex-1 h-11 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronizing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={onDisconnect}
                    className="h-11 px-4 rounded-xl border border-stone-200 dark:border-neutral-800 text-xs font-mono text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              /* View 2: When Not Connected */
              <div className="space-y-4">
                {/* Segmented Control */}
                <div className="p-1 rounded-2xl bg-stone-100 dark:bg-neutral-800 flex text-xs font-medium">
                  <button
                    onClick={() => {
                      setTab('host');
                      if (status === 'idle') onStartHost();
                    }}
                    className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'host'
                        ? 'bg-white dark:bg-neutral-900 text-stone-900 dark:text-white shadow-xs font-semibold'
                        : 'text-stone-500 dark:text-neutral-400'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Share / Host
                  </button>
                  <button
                    onClick={() => setTab('join')}
                    className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'join'
                        ? 'bg-white dark:bg-neutral-900 text-stone-900 dark:text-white shadow-xs font-semibold'
                        : 'text-stone-500 dark:text-neutral-400'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Join / Scan Peer
                  </button>
                </div>

                {tab === 'host' ? (
                  /* Host Mode: Show QR Code & Pairing Code */
                  <div className="flex flex-col items-center py-2 text-center space-y-3">
                    {status === 'initializing' ? (
                      <div className="py-12 flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                        <span className="text-xs font-mono text-stone-500 dark:text-neutral-400">
                          Creating P2P channel...
                        </span>
                      </div>
                    ) : pairingCode ? (
                      <>
                        <QRDisplay code={pairingCode} size={170} />
                        <p className="text-xs text-stone-500 dark:text-neutral-400 max-w-xs leading-relaxed">
                          Scan this QR code or enter the pairing code ({pairingCode}) on your other device to connect.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-amber-600 dark:text-amber-400 pt-1">
                          <Zap className="w-3.5 h-3.5 animate-pulse" />
                          <span>Waiting for remote device to join...</span>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={onStartHost}
                        className="h-10 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
                      >
                        Generate Pairing Code
                      </button>
                    )}
                  </div>
                ) : (
                  /* Join Mode: Enter Code or Scan Camera */
                  <div className="space-y-4">
                    {/* Mode Sub-toggle */}
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setJoinMode('code')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                          joinMode === 'code'
                            ? 'bg-stone-200 dark:bg-neutral-700 text-stone-900 dark:text-white font-bold'
                            : 'text-stone-500 dark:text-neutral-400'
                        }`}
                      >
                        Enter Code
                      </button>
                      <button
                        onClick={() => setJoinMode('camera')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                          joinMode === 'camera'
                            ? 'bg-stone-200 dark:bg-neutral-700 text-stone-900 dark:text-white font-bold'
                            : 'text-stone-500 dark:text-neutral-400'
                        }`}
                      >
                        Scan with Camera
                      </button>
                    </div>

                    {joinMode === 'code' ? (
                      <form onSubmit={handleJoinSubmit} className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-mono text-stone-500 dark:text-neutral-400 mb-1.5">
                            Enter Remote Pairing Code:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SP-8JR2F6"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                            className="w-full h-12 px-4 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-white font-mono text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                            maxLength={12}
                            autoFocus
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!inputCode.trim() || status === 'connecting'}
                          className="w-full h-11 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-xs"
                        >
                          {status === 'connecting' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting to Peer...</span>
                            </>
                          ) : (
                            <>
                              <span>Connect & Sync</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <QRScanner
                        onScanSuccess={handleScanSuccess}
                        onCancel={() => setJoinMode('code')}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
