import Peer, { DataConnection } from 'peerjs';
import { P2PConnectionStatus, P2PMessage, P2PPeerInfo } from './types';

export interface PeerServiceCallbacks {
  onStatusChange: (status: P2PConnectionStatus, error?: string) => void;
  onPeerConnected: (info: P2PPeerInfo) => void;
  onPeerDisconnected: () => void;
  onMessage: (msg: P2PMessage) => void;
}

const STUN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
];

export class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private callbacks: PeerServiceCallbacks | null = null;
  private myPeerId: string = '';
  private remotePeerInfo: P2PPeerInfo | null = null;
  private pingInterval: any = null;
  private lastPongReceivedTime: number = 0;

  // Rate-limiting / DoS guard
  private messageCountWindow: number = 0;
  private messageWindowResetTimer: any = null;
  private static readonly MAX_MESSAGES_PER_SEC = 25;

  public setCallbacks(callbacks: PeerServiceCallbacks) {
    this.callbacks = callbacks;
  }

  public getMyPeerId(): string {
    return this.myPeerId;
  }

  public getRemotePeerInfo(): P2PPeerInfo | null {
    return this.remotePeerInfo;
  }

  public isConnected(): boolean {
    return this.connection !== null && this.connection.open;
  }

  /**
   * Generates a readable 9-character code (e.g. "SP-8JR2F6")
   */
  public static generatePairingCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SP-${code}`;
  }

  /**
   * Clean code input: removes spaces, dashes, converts to uppercase
   */
  public static sanitizePairingCode(input: string): string {
    const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('SP')) {
      return `SP-${clean.slice(2)}`;
    }
    return `SP-${clean}`;
  }

  /**
   * Initialize Peer as Host with a readable pairing code
   */
  public async initAsHost(customCode?: string): Promise<string> {
    this.cleanup();
    const pairingId = customCode ? PeerService.sanitizePairingCode(customCode) : PeerService.generatePairingCode();
    const cleanId = pairingId.toLowerCase();

    console.log('[SmokePulse P2P] Initializing Host with ID:', cleanId);
    this.callbacks?.onStatusChange('initializing');

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer(cleanId, {
          debug: 1,
          config: {
            iceServers: STUN_ICE_SERVERS,
          },
        });

        this.peer = peer;

        peer.on('open', (id) => {
          this.myPeerId = id;
          console.log('[SmokePulse P2P] Host listening on ID:', id.toUpperCase());
          this.callbacks?.onStatusChange('hosting');
          resolve(id);
        });

        peer.on('connection', (conn) => {
          console.log('[SmokePulse P2P] Host accepted incoming connection from:', conn.peer);
          this.handleIncomingConnection(conn);
        });

        peer.on('error', (err: any) => {
          console.warn('[SmokePulse P2P] Host error:', err);
          if (err.type === 'unavailable-id') {
            console.log('[SmokePulse P2P] ID collision, generating fresh pairing code...');
            this.initAsHost().then(resolve).catch(reject);
            return;
          }
          this.callbacks?.onStatusChange('error', err.message || 'Host connection error');
          reject(err);
        });

        peer.on('disconnected', () => {
          console.log('[SmokePulse P2P] Host disconnected from signaling server, attempting reconnect...');
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });
      } catch (err: any) {
        console.error('[SmokePulse P2P] Failed to initialize peer host:', err);
        this.callbacks?.onStatusChange('error', err?.message || 'Failed to start peer host');
        reject(err);
      }
    });
  }

  /**
   * Connect to a remote Host Peer using pairing code
   */
  public async connectToPeer(targetCode: string): Promise<void> {
    this.cleanup();
    const cleanId = PeerService.sanitizePairingCode(targetCode).toLowerCase();

    console.log('[SmokePulse P2P] Joining remote host:', cleanId);
    this.callbacks?.onStatusChange('connecting');

    return new Promise((resolve, reject) => {
      let isSettled = false;

      // 20-second timeout guard to prevent infinite spinning
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn('[SmokePulse P2P] Connection timed out after 20s');
          const msg = `Connection timed out. Ensure the host is active with code "${targetCode.toUpperCase()}".`;
          this.callbacks?.onStatusChange('error', msg);
          this.cleanup();
          reject(new Error(msg));
        }
      }, 20000);

      try {
        const peer = new Peer({
          debug: 1,
          config: {
            iceServers: STUN_ICE_SERVERS,
          },
        });

        this.peer = peer;

        peer.on('open', (myId) => {
          this.myPeerId = myId;
          console.log('[SmokePulse P2P] Joiner Peer registered with local ID:', myId);

          const conn = peer.connect(cleanId);

          conn.on('open', () => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeoutId);
              console.log('[SmokePulse P2P] DataConnection OPEN with Host:', cleanId);
              resolve();
            }
          });

          this.setupConnectionHandlers(conn);
        });

        peer.on('error', (err: any) => {
          console.error('[SmokePulse P2P] Connect error:', err);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            let userMsg = err.message || 'Could not find peer';
            if (err.type === 'peer-unavailable') {
              userMsg = `Pairing code "${targetCode.toUpperCase()}" not found or Host is offline.`;
            }
            this.callbacks?.onStatusChange('error', userMsg);
            this.cleanup();
            reject(new Error(userMsg));
          }
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          console.error('[SmokePulse P2P] Unexpected connection error:', err);
          this.callbacks?.onStatusChange('error', err?.message || 'Connection failed');
          this.cleanup();
          reject(err);
        }
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    if (this.connection && this.connection.open) {
      console.log('[SmokePulse P2P] Rejecting duplicate connection from:', conn.peer);
      conn.close();
      return;
    }
    this.setupConnectionHandlers(conn);
  }

  private setupConnectionHandlers(conn: DataConnection) {
    this.connection = conn;

    conn.on('open', () => {
      console.log('[SmokePulse P2P] DataChannel established with:', conn.peer);
      this.lastPongReceivedTime = Date.now();

      this.remotePeerInfo = {
        id: conn.peer,
        name: 'Peer Device',
        connectedAt: Date.now(),
        lastPingMs: 0,
      };

      this.callbacks?.onStatusChange('connected');
      this.callbacks?.onPeerConnected(this.remotePeerInfo);

      // Steady heartbeat (every 30s)
      this.startHeartbeat();
    });

    conn.on('data', (data: any) => {
      // Rate limiting guard
      if (this.isIncomingRateLimited()) {
        console.warn('[SmokePulse P2P] Rate limit exceeded, dropping packet');
        return;
      }

      try {
        const msg = data as P2PMessage;
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        if (msg.type === 'PING') {
          this.send({ type: 'PONG', timestamp: msg.timestamp });
          return;
        }

        if (msg.type === 'PONG') {
          this.lastPongReceivedTime = Date.now();
          if (this.remotePeerInfo && typeof msg.timestamp === 'number') {
            this.remotePeerInfo.lastPingMs = Math.max(1, Date.now() - msg.timestamp);
          }
          return;
        }

        if (msg.type === 'HELLO') {
          console.log('[SmokePulse P2P] Received HELLO from:', msg.deviceName);
          if (this.remotePeerInfo) {
            this.remotePeerInfo.name = String(msg.deviceName || 'Peer Device').slice(0, 50);
          }
          this.send({
            type: 'HELLO_ACK',
            deviceId: 'sp_device',
            deviceName: 'SmokePulse Device',
            timestamp: Date.now(),
          });
          return;
        }

        if (msg.type === 'HELLO_ACK') {
          console.log('[SmokePulse P2P] Received HELLO_ACK from:', msg.deviceName);
          if (this.remotePeerInfo) {
            this.remotePeerInfo.name = String(msg.deviceName || 'Peer Device').slice(0, 50);
          }
          return;
        }

        this.callbacks?.onMessage(msg);
      } catch (err) {
        console.warn('[SmokePulse P2P] Failed to parse message:', err);
      }
    });

    conn.on('close', () => {
      console.log('[SmokePulse P2P] Connection closed');
      this.handleDisconnect();
    });

    conn.on('error', (err: any) => {
      console.warn('[SmokePulse P2P] DataConnection error:', err);
      this.callbacks?.onStatusChange('error', err?.message || 'DataChannel interrupted');
      this.handleDisconnect();
    });

    // Monitor ICE connection state on underlying RTCPeerConnection
    const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          this.callbacks?.onStatusChange('error', 'Direct peer connection failed (NAT/Firewall).');
          this.handleDisconnect();
        }
      };
    }
  }

  private isIncomingRateLimited(): boolean {
    this.messageCountWindow++;
    if (!this.messageWindowResetTimer) {
      this.messageWindowResetTimer = setTimeout(() => {
        this.messageCountWindow = 0;
        this.messageWindowResetTimer = null;
      }, 1000);
    }
    return this.messageCountWindow > PeerService.MAX_MESSAGES_PER_SEC;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongReceivedTime = Date.now();

    // Heartbeat every 25 seconds (steady, no flickering or rapid polling)
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        // Zombie peer check: if no pong response in 65s, disconnect cleanly
        if (this.lastPongReceivedTime > 0 && Date.now() - this.lastPongReceivedTime > 65000) {
          console.warn('[SmokePulse P2P] Heartbeat lost with peer, closing...');
          this.handleDisconnect();
          return;
        }
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.messageWindowResetTimer) {
      clearTimeout(this.messageWindowResetTimer);
      this.messageWindowResetTimer = null;
    }
  }

  private handleDisconnect() {
    this.stopHeartbeat();
    this.connection = null;
    this.remotePeerInfo = null;
    this.callbacks?.onStatusChange('idle');
    this.callbacks?.onPeerDisconnected();
  }

  public send(msg: P2PMessage): boolean {
    if (!this.connection || !this.connection.open) {
      return false;
    }
    try {
      this.connection.send(msg);
      return true;
    } catch (err) {
      console.warn('[SmokePulse P2P] Error sending message:', err);
      return false;
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    this.remotePeerInfo = null;
    this.callbacks?.onStatusChange('idle');
  }

  public cleanup() {
    this.disconnect();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.myPeerId = '';
  }
}

export const peerService = new PeerService();
