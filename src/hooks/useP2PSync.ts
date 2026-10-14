import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PConnectionStatus, P2PPeerInfo, P2PMessage } from '../lib/p2p/types';
import { peerService } from '../lib/p2p/peerService';
import { storageManager } from '../lib/storage';
import { CRDTEngine } from '../lib/crdt';
import { CigaretteLog, PackPurchase, UserProfile } from '../types';

interface UseP2PSyncOptions {
  activeProfile: UserProfile;
  profiles: UserProfile[];
  logs: CigaretteLog[];
  packs: PackPurchase[];
  onDataMerged: (data: { profiles: UserProfile[]; logs: CigaretteLog[]; packs: PackPurchase[] }) => void;
}

export function useP2PSync({
  activeProfile,
  profiles,
  logs,
  packs,
  onDataMerged,
}: UseP2PSyncOptions) {
  const [status, setStatus] = useState<P2PConnectionStatus>('idle');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [peerInfo, setPeerInfo] = useState<P2PPeerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncStats, setSyncStats] = useState<{ logsSynced: number; packsSynced: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // State refs
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const packsRef = useRef(packs);
  packsRef.current = packs;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const activeProfileRef = useRef(activeProfile);
  activeProfileRef.current = activeProfile;
  const onDataMergedRef = useRef(onDataMerged);
  onDataMergedRef.current = onDataMerged;

  // Overload & concurrency locks
  const isSyncInProgressRef = useRef(false);
  const lastSyncRequestTimeRef = useRef(0);
  const lastSyncNowTimeRef = useRef(0);

  // Message handler
  const handleMessage = useCallback(
    async (msg: P2PMessage) => {
      if (!msg || typeof msg !== 'object' || !msg.type) return;

      switch (msg.type) {
        case 'SYNC_REQUEST': {
          // Rate-limit incoming sync requests to at most 1 every 2 seconds
          const now = Date.now();
          if (now - lastSyncRequestTimeRef.current < 2000) {
            console.log('[SmokePulse P2P] Debouncing rapid SYNC_REQUEST');
            return;
          }
          lastSyncRequestTimeRef.current = now;

          try {
            const payload = await storageManager.generateSyncPayload(msg.sinceTimestamp || 0);
            peerService.send({
              type: 'SYNC_PAYLOAD',
              payload,
            });
          } catch (err) {
            console.warn('[SmokePulse P2P] Failed to generate sync payload:', err);
          }
          break;
        }

        case 'SYNC_PAYLOAD': {
          // Lock to prevent overlapping concurrent IndexedDB writes
          if (isSyncInProgressRef.current) {
            console.log('[SmokePulse P2P] Sync already in progress, queuing or ignoring burst');
            return;
          }
          isSyncInProgressRef.current = true;
          setIsSyncing(true);

          try {
            const currentData = {
              profiles: profilesRef.current,
              logs: logsRef.current,
              packs: packsRef.current,
            };

            // Sanitized CRDT merge
            const result = CRDTEngine.mergePayload(currentData, msg.payload);

            // Persist
            await storageManager.saveAll(result.mergedProfiles, result.mergedLogs, result.mergedPacks);

            // UI update
            onDataMergedRef.current({
              profiles: result.mergedProfiles,
              logs: result.mergedLogs,
              packs: result.mergedPacks,
            });

            setLastSyncTime(Date.now());
            setSyncStats({
              logsSynced: result.stats.logsAdded + result.stats.logsUpdated,
              packsSynced: result.stats.packsAdded + result.stats.packsUpdated,
            });

            // Ack with count
            const totalItems = (msg.payload?.logs?.length || 0) + (msg.payload?.packs?.length || 0);
            peerService.send({
              type: 'SYNC_ACK',
              itemsReceived: totalItems,
              timestamp: Date.now(),
            });
          } catch (err: any) {
            console.warn('[SmokePulse P2P] Sync merge error:', err);
          } finally {
            isSyncInProgressRef.current = false;
            setIsSyncing(false);
          }
          break;
        }

        case 'SYNC_ACK': {
          setLastSyncTime(Date.now());
          setIsSyncing(false);
          isSyncInProgressRef.current = false;
          break;
        }

        case 'LIVE_LOG': {
          if (!msg.log || typeof msg.log !== 'object' || !msg.log.id) return;
          const currentLogs = logsRef.current;
          const { merged, added, updated } = CRDTEngine.mergeLogs(currentLogs, [msg.log]);
          if (added > 0 || updated > 0) {
            await storageManager.saveAll(profilesRef.current, merged, packsRef.current);
            onDataMergedRef.current({
              profiles: profilesRef.current,
              logs: merged,
              packs: packsRef.current,
            });
            setLastSyncTime(Date.now());
          }
          break;
        }

        case 'LIVE_PACK': {
          if (!msg.pack || typeof msg.pack !== 'object' || !msg.pack.id) return;
          const currentPacks = packsRef.current;
          const { merged, added, updated } = CRDTEngine.mergePacks(currentPacks, [msg.pack]);
          if (added > 0 || updated > 0) {
            await storageManager.saveAll(profilesRef.current, logsRef.current, merged);
            onDataMergedRef.current({
              profiles: profilesRef.current,
              logs: logsRef.current,
              packs: merged,
            });
            setLastSyncTime(Date.now());
          }
          break;
        }
      }
    },
    []
  );

  // Callbacks
  useEffect(() => {
    peerService.setCallbacks({
      onStatusChange: (newStatus, err) => {
        setStatus(newStatus);
        if (err) setErrorMessage(err);
        else if (newStatus === 'connected') setErrorMessage(null);
      },
      onPeerConnected: (info) => {
        setPeerInfo(info);
        console.log('[SmokePulse P2P] Peer connection active, establishing handshake...');

        // 1. Send HELLO
        peerService.send({
          type: 'HELLO',
          deviceId: 'sp_device',
          deviceName: activeProfileRef.current.displayName || activeProfileRef.current.username || 'Device',
          appVersion: 3,
          timestamp: Date.now(),
        });

        // 2. Request initial sync delta
        peerService.send({
          type: 'SYNC_REQUEST',
          sinceTimestamp: 0,
        });
      },
      onPeerDisconnected: () => {
        setPeerInfo(null);
        setIsSyncing(false);
        isSyncInProgressRef.current = false;
      },
      onMessage: handleMessage,
    });

    return () => {
      // Keepalive
    };
  }, [handleMessage]);

  const startHost = useCallback(async () => {
    setErrorMessage(null);
    try {
      const id = await peerService.initAsHost();
      setPairingCode(id.toUpperCase());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize Host');
    }
  }, []);

  const connectToPeer = useCallback(async (code: string) => {
    setErrorMessage(null);
    try {
      await peerService.connectToPeer(code);
      setPairingCode(code.toUpperCase());
    } catch (err: any) {
      console.warn('[SmokePulse P2P] Connection failed:', err);
      setErrorMessage(err?.message || 'Could not find or connect to peer');
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!peerService.isConnected()) return;

    // Throttle user trigger to at most once per 3s
    const now = Date.now();
    if (now - lastSyncNowTimeRef.current < 3000) {
      return;
    }
    lastSyncNowTimeRef.current = now;

    setIsSyncing(true);
    try {
      // Send both a fresh request and our payload
      peerService.send({
        type: 'SYNC_REQUEST',
        sinceTimestamp: 0,
      });

      const payload = await storageManager.generateSyncPayload(0);
      peerService.send({
        type: 'SYNC_PAYLOAD',
        payload,
      });
    } catch (err: any) {
      console.warn('[SmokePulse P2P] syncNow error:', err);
      setIsSyncing(false);
    }
  }, []);

  const broadcastLiveLog = useCallback((log: CigaretteLog) => {
    if (peerService.isConnected()) {
      peerService.send({
        type: 'LIVE_LOG',
        log,
      });
    }
  }, []);

  const broadcastLivePack = useCallback((pack: PackPurchase) => {
    if (peerService.isConnected()) {
      peerService.send({
        type: 'LIVE_PACK',
        pack,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    peerService.cleanup();
    setStatus('idle');
    setPairingCode('');
    setPeerInfo(null);
    setErrorMessage(null);
    setIsSyncing(false);
    isSyncInProgressRef.current = false;
  }, []);

  return {
    status,
    pairingCode,
    peerInfo,
    errorMessage,
    lastSyncTime,
    syncStats,
    isSyncing,
    startHost,
    connectToPeer,
    syncNow,
    broadcastLiveLog,
    broadcastLivePack,
    disconnect,
  };
}
