import Peer, { DataConnection } from 'peerjs';
import { P2PConnectionStatus, P2PMessage, P2PPeerInfo } from './types';

export interface PeerServiceCallbacks {
  onStatusChange: (status: P2PConnectionStatus, error?: string) => void;
  onPeerConnected: (info: P2PPeerInfo) => void;
  onPeerDisconnected: () => void;
  onMessage: (msg: P2PMessage) => void;
}

export class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private callbacks: PeerServiceCallbacks | null = null;
  private myPeerId: string = '';
  private remotePeerInfo: P2PPeerInfo | null = null;
  private pingInterval: any = null;

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
   * Generates a readable 6-character code (e.g. "SP-7X9M2")
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

    this.callbacks?.onStatusChange('initializing');

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer(pairingId.toLowerCase(), {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });

        this.peer = peer;

        peer.on('open', (id) => {
          this.myPeerId = id;
          this.callbacks?.onStatusChange('hosting');
          resolve(id);
        });

        peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        peer.on('error', (err) => {
          console.warn('PeerJS Host Error:', err);
          if (err.type === 'unavailable-id') {
            // Retry with randomized code if ID is collision
            this.initAsHost().then(resolve).catch(reject);
            return;
          }
          this.callbacks?.onStatusChange('error', err.message || 'Connection error');
          reject(err);
        });

        peer.on('disconnected', () => {
          // Reconnect to signaling server if disconnected
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });
      } catch (err: any) {
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

    this.callbacks?.onStatusChange('connecting');

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });

        this.peer = peer;

        peer.on('open', (myId) => {
          this.myPeerId = myId;
          const conn = peer.connect(cleanId, {
            reliable: true,
          });

          this.setupConnectionHandlers(conn);
          resolve();
        });

        peer.on('error', (err) => {
          console.warn('PeerJS Connect Error:', err);
          this.callbacks?.onStatusChange('error', err.message || 'Could not find peer');
          reject(err);
        });
      } catch (err: any) {
        this.callbacks?.onStatusChange('error', err?.message || 'Connection failed');
        reject(err);
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    if (this.connection && this.connection.open) {
      // Already connected to a peer, close extra
      conn.close();
      return;
    }
    this.setupConnectionHandlers(conn);
  }

  private setupConnectionHandlers(conn: DataConnection) {
    this.connection = conn;

    conn.on('open', () => {
      this.remotePeerInfo = {
        id: conn.peer,
        name: 'Peer Device',
        connectedAt: Date.now(),
        lastPingMs: 0,
      };

      this.callbacks?.onStatusChange('connected');
      this.callbacks?.onPeerConnected(this.remotePeerInfo);

      // Start ping loop
      this.startHeartbeat();
    });

    conn.on('data', (data: any) => {
      try {
        const msg = data as P2PMessage;
        if (msg.type === 'PING') {
          this.send({ type: 'PONG', timestamp: msg.timestamp });
          return;
        }
        if (msg.type === 'PONG') {
          if (this.remotePeerInfo) {
            this.remotePeerInfo.lastPingMs = Date.now() - msg.timestamp;
          }
          return;
        }
        if (msg.type === 'HELLO') {
          if (this.remotePeerInfo) {
            this.remotePeerInfo.name = msg.deviceName || 'Peer Device';
            this.callbacks?.onPeerConnected({ ...this.remotePeerInfo });
          }
          this.send({
            type: 'HELLO_ACK',
            deviceId: 'sp_device',
            deviceName: 'SmokePulse Client',
            timestamp: Date.now(),
          });
          return;
        }
        if (msg.type === 'HELLO_ACK') {
          if (this.remotePeerInfo) {
            this.remotePeerInfo.name = msg.deviceName || 'Peer Device';
            this.callbacks?.onPeerConnected({ ...this.remotePeerInfo });
          }
          return;
        }

        this.callbacks?.onMessage(msg);
      } catch (err) {
        console.warn('Failed to parse peer message:', err);
      }
    });

    conn.on('close', () => {
      this.handleDisconnect();
    });

    conn.on('error', (err) => {
      console.warn('DataConnection Error:', err);
      this.handleDisconnect();
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 12000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
      console.warn('Error sending P2P message:', err);
      return false;
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.remotePeerInfo = null;
    this.callbacks?.onStatusChange('idle');
  }

  public cleanup() {
    this.disconnect();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = '';
  }
}

export const peerService = new PeerService();
