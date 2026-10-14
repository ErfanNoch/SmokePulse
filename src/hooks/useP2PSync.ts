import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PConnectionStatus, P2PPeerInfo, P2PMessage } from '../lib/p2p/types';
import { peerService } from '../lib/p2p/peerService';
import { storageManager } from '../lib/storage';
import { CRDTEngine } from '../lib/crdt';
import { CigaretteLog, PackPurchase, UserProfile, SyncPayload } from '../types';

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

  // Keep fresh references for incoming async socket handlers
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const packsRef = useRef(packs);
  packsRef.current = packs;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const activeProfileRef = useRef(activeProfile);
  activeProfileRef.current = activeProfile;

  // Handle incoming P2P message
  const handleMessage = useCallback(
    async (msg: P2PMessage) => {
      switch (msg.type) {
        case 'SYNC_REQUEST': {
          // Remote peer requested our payload
          const payload = await storageManager.generateSyncPayload(msg.sinceTimestamp || 0);
          peerService.send({
            type: 'SYNC_PAYLOAD',
            payload,
          });
          break;
        }

        case 'SYNC_PAYLOAD': {
          setIsSyncing(true);
          try {
            // Apply pure CRDT merge
            const currentData = {
              profiles: profilesRef.current,
              logs: logsRef.current,
              packs: packsRef.current,
            };
            const result = CRDTEngine.mergePayload(currentData, msg.payload);

            // Persist merged data to Dexie
            await storageManager.saveAll(result.mergedProfiles, result.mergedLogs, result.mergedPacks);

            // Notify React UI
            onDataMerged({
              profiles: result.mergedProfiles,
              logs: result.mergedLogs,
              packs: result.mergedPacks,
            });

            setLastSyncTime(Date.now());
            setSyncStats({
              logsSynced: result.stats.logsAdded + result.stats.logsUpdated,
              packsSynced: result.stats.packsAdded + result.stats.packsUpdated,
            });

            // Send acknowledge back
            peerService.send({
              type: 'SYNC_ACK',
              itemsReceived: (msg.payload.logs?.length || 0) + (msg.payload.packs?.length || 0),
              timestamp: Date.now(),
            });
          } catch (err: any) {
            console.warn('Sync merge failed:', err);
          } finally {
            setIsSyncing(false);
          }
          break;
        }

        case 'SYNC_ACK': {
          setLastSyncTime(Date.now());
          setIsSyncing(false);
          break;
        }

        case 'LIVE_LOG': {
          // Realtime live stick logged on other device
          const currentLogs = logsRef.current;
          const { merged, added, updated } = CRDTEngine.mergeLogs(currentLogs, [msg.log]);
          if (added > 0 || updated > 0) {
            await storageManager.saveAll(profilesRef.current, merged, packsRef.current);
            onDataMerged({
              profiles: profilesRef.current,
              logs: merged,
              packs: packsRef.current,
            });
            setLastSyncTime(Date.now());
          }
          break;
        }

        case 'LIVE_PACK': {
          // Realtime live pack purchased on other device
          const currentPacks = packsRef.current;
          const { merged, added, updated } = CRDTEngine.mergePacks(currentPacks, [msg.pack]);
          if (added > 0 || updated > 0) {
            await storageManager.saveAll(profilesRef.current, logsRef.current, merged);
            onDataMerged({
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
    [onDataMerged]
  );

  // Bind PeerService callbacks
  useEffect(() => {
    peerService.setCallbacks({
      onStatusChange: (newStatus, err) => {
        setStatus(newStatus);
        if (err) setErrorMessage(err);
        else if (newStatus === 'connected') setErrorMessage(null);
      },
      onPeerConnected: (info) => {
        setPeerInfo(info);
        // Automatically request handshake sync upon connection
        peerService.send({
          type: 'HELLO',
          deviceId: 'sp_device',
          deviceName: activeProfileRef.current.displayName || activeProfileRef.current.username || 'Device',
          appVersion: 3,
          timestamp: Date.now(),
        });
        // Auto trigger initial delta sync
        peerService.send({
          type: 'SYNC_REQUEST',
          sinceTimestamp: 0,
        });
      },
      onPeerDisconnected: () => {
        setPeerInfo(null);
      },
      onMessage: handleMessage,
    });

    return () => {
      // Don't kill host unless unmounting or explicitly requested
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
      setErrorMessage(err?.message || 'Could not find or connect to peer');
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!peerService.isConnected()) return;
    setIsSyncing(true);
    try {
      const payload = await storageManager.generateSyncPayload(0);
      peerService.send({
        type: 'SYNC_PAYLOAD',
        payload,
      });
    } catch (err: any) {
      console.warn('Failed to dispatch sync payload:', err);
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
