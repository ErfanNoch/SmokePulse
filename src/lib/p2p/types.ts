import { CigaretteLog, PackPurchase, UserProfile, SyncPayload } from '../../types';

export type P2PConnectionStatus =
  | 'idle'
  | 'initializing'
  | 'hosting'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'error';

export type P2PMessage =
  | {
      type: 'HELLO';
      deviceId: string;
      deviceName: string;
      appVersion: number;
      timestamp: number;
    }
  | {
      type: 'HELLO_ACK';
      deviceId: string;
      deviceName: string;
      timestamp: number;
    }
  | {
      type: 'SYNC_REQUEST';
      sinceTimestamp: number;
    }
  | {
      type: 'SYNC_PAYLOAD';
      payload: SyncPayload;
    }
  | {
      type: 'SYNC_ACK';
      itemsReceived: number;
      timestamp: number;
    }
  | {
      type: 'LIVE_LOG';
      log: CigaretteLog;
    }
  | {
      type: 'LIVE_PACK';
      pack: PackPurchase;
    }
  | {
      type: 'LIVE_PROFILE';
      profile: UserProfile;
    }
  | {
      type: 'PING';
      timestamp: number;
    }
  | {
      type: 'PONG';
      timestamp: number;
    };

export interface P2PPeerInfo {
  id: string;
  name: string;
  connectedAt: number;
  lastPingMs: number;
}
