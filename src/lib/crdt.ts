import { CigaretteLog, PackPurchase, UserProfile, SyncPayload, SmokingTrigger, MoodType } from '../types';

export interface CRDTMergeResult {
  mergedLogs: CigaretteLog[];
  mergedPacks: PackPurchase[];
  mergedProfiles: UserProfile[];
  stats: {
    logsAdded: number;
    logsUpdated: number;
    packsAdded: number;
    packsUpdated: number;
    profilesUpdated: number;
  };
}

const MAX_PAYLOAD_LOGS = 10000;
const MAX_PAYLOAD_PACKS = 2000;
const MAX_STRING_LENGTH = 120;

const VALID_TRIGGERS: Set<string> = new Set([
  'After Meal',
  'Work Break',
  'Morning Coffee',
  'Stress',
  'Social',
  'Boredom',
  'Commute',
  'Craving',
  'Night Out',
  'Stress & Pressure',
  'Social Gathering',
  'Driving / Commute',
  'Craving & Habit',
  'Alcohol & Evening',
  'Other',
]);

const VALID_MOODS: Set<string> = new Set(['Neutral', 'Stressed', 'Relaxed', 'Restless', 'Social', 'Tired']);

export class CRDTEngine {
  /**
   * Validates and sanitizes incoming remote payload for security and overload safety
   */
  public static sanitizePayload(remote: any): SyncPayload {
    if (!remote || typeof remote !== 'object') {
      return {
        app: 'SmokePulse',
        version: 3,
        senderDeviceId: 'remote_peer',
        timestamp: Date.now(),
        logs: [],
        packs: [],
        profiles: [],
      };
    }

    const sanitizedLogs: CigaretteLog[] = [];
    if (Array.isArray(remote.logs)) {
      const bound = Math.min(remote.logs.length, MAX_PAYLOAD_LOGS);
      for (let i = 0; i < bound; i++) {
        const item = remote.logs[i];
        if (item && typeof item === 'object' && typeof item.id === 'string' && typeof item.timestamp === 'number') {
          const reason: SmokingTrigger = VALID_TRIGGERS.has(item.reason) ? (item.reason as SmokingTrigger) : 'Craving';
          const mood: MoodType | undefined = VALID_MOODS.has(item.mood) ? (item.mood as MoodType) : undefined;

          sanitizedLogs.push({
            id: String(item.id).slice(0, 64),
            timestamp: Number(item.timestamp),
            count: Math.max(1, Math.min(Number(item.count) || 1, 100)),
            reason,
            mood,
            note: item.note ? String(item.note).slice(0, 300) : undefined,
            packId: item.packId ? String(item.packId).slice(0, 64) : undefined,
            costEstimate: Math.max(0, Number(item.costEstimate) || 0),
            isDeleted: Boolean(item.isDeleted),
            updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : item.timestamp,
          });
        }
      }
    }

    const sanitizedPacks: PackPurchase[] = [];
    if (Array.isArray(remote.packs)) {
      const bound = Math.min(remote.packs.length, MAX_PAYLOAD_PACKS);
      for (let i = 0; i < bound; i++) {
        const item = remote.packs[i];
        if (item && typeof item === 'object' && typeof item.id === 'string' && typeof item.timestamp === 'number') {
          sanitizedPacks.push({
            id: String(item.id).slice(0, 64),
            timestamp: Number(item.timestamp),
            brandName: String(item.brandName || 'Brand').slice(0, MAX_STRING_LENGTH),
            sticksPerPack: Math.max(1, Math.min(Number(item.sticksPerPack) || 20, 100)),
            cost: Math.max(0, Number(item.cost) || 0),
            quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 50)),
            storeName: item.storeName ? String(item.storeName).slice(0, MAX_STRING_LENGTH) : undefined,
            note: item.note ? String(item.note).slice(0, 300) : undefined,
            isDeleted: Boolean(item.isDeleted),
            updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : item.timestamp,
          });
        }
      }
    }

    const sanitizedProfiles: UserProfile[] = [];
    if (Array.isArray(remote.profiles)) {
      for (const item of remote.profiles) {
        if (item && typeof item === 'object' && typeof item.id === 'string') {
          sanitizedProfiles.push({
            id: String(item.id).slice(0, 64),
            username: String(item.username || 'user').slice(0, 40),
            displayName: String(item.displayName || 'User').slice(0, 60),
            currency: String(item.currency || 'USD').slice(0, 6),
            dailyStickLimit: Math.max(1, Math.min(Number(item.dailyStickLimit) || 8, 100)),
            defaultPackCost: Math.max(0, Number(item.defaultPackCost) || 9.0),
            defaultPackSize: Math.max(1, Math.min(Number(item.defaultPackSize) || 20, 100)),
            defaultBrand: String(item.defaultBrand || '').slice(0, MAX_STRING_LENGTH),
            soundFeedback: Boolean(item.soundFeedback ?? true),
            theme: item.theme === 'light' ? 'light' : 'dark',
            createdAt: Number(item.createdAt) || Date.now(),
            updatedAt: Number(item.updatedAt) || Date.now(),
          });
        }
      }
    }

    return {
      app: 'SmokePulse',
      version: typeof remote.version === 'number' ? remote.version : 3,
      senderDeviceId: String(remote.senderDeviceId || 'remote_peer').slice(0, 64),
      timestamp: Number(remote.timestamp) || Date.now(),
      logs: sanitizedLogs,
      packs: sanitizedPacks,
      profiles: sanitizedProfiles,
    };
  }

  /**
   * Merges two sets of CigaretteLogs using Last-Write-Wins.
   */
  public static mergeLogs(
    localLogs: CigaretteLog[],
    remoteLogs: CigaretteLog[]
  ): { merged: CigaretteLog[]; added: number; updated: number } {
    const map = new Map<string, CigaretteLog>();
    let added = 0;
    let updated = 0;

    for (const log of localLogs) {
      map.set(log.id, log);
    }

    for (const remote of remoteLogs) {
      const local = map.get(remote.id);
      if (!local) {
        map.set(remote.id, remote);
        added++;
      } else {
        const remoteTs = remote.updatedAt || remote.timestamp || 0;
        const localTs = local.updatedAt || local.timestamp || 0;

        if (remoteTs > localTs) {
          map.set(remote.id, remote);
          updated++;
        }
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    return { merged, added, updated };
  }

  /**
   * Merges two sets of PackPurchases using Last-Write-Wins.
   */
  public static mergePacks(
    localPacks: PackPurchase[],
    remotePacks: PackPurchase[]
  ): { merged: PackPurchase[]; added: number; updated: number } {
    const map = new Map<string, PackPurchase>();
    let added = 0;
    let updated = 0;

    for (const pack of localPacks) {
      map.set(pack.id, pack);
    }

    for (const remote of remotePacks) {
      const local = map.get(remote.id);
      if (!local) {
        map.set(remote.id, remote);
        added++;
      } else {
        const remoteTs = remote.updatedAt || remote.timestamp || 0;
        const localTs = local.updatedAt || local.timestamp || 0;

        if (remoteTs > localTs) {
          map.set(remote.id, remote);
          updated++;
        }
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    return { merged, added, updated };
  }

  /**
   * Merges user profiles using Last-Write-Wins.
   */
  public static mergeProfiles(
    localProfiles: UserProfile[],
    remoteProfiles: UserProfile[]
  ): { merged: UserProfile[]; updated: number } {
    const map = new Map<string, UserProfile>();
    let updated = 0;

    for (const p of localProfiles) {
      map.set(p.id, p);
    }

    for (const remote of remoteProfiles) {
      const local = map.get(remote.id);
      if (!local) {
        map.set(remote.id, remote);
        updated++;
      } else {
        const remoteTs = remote.updatedAt || remote.createdAt || 0;
        const localTs = local.updatedAt || local.createdAt || 0;
        if (remoteTs > localTs) {
          map.set(remote.id, remote);
          updated++;
        }
      }
    }

    return { merged: Array.from(map.values()), updated };
  }

  /**
   * Full state merge against an incoming SyncPayload
   */
  public static mergePayload(
    local: { profiles: UserProfile[]; logs: CigaretteLog[]; packs: PackPurchase[] },
    rawRemote: SyncPayload
  ): CRDTMergeResult {
    const sanitized = this.sanitizePayload(rawRemote);
    const logResult = this.mergeLogs(local.logs, sanitized.logs || []);
    const packResult = this.mergePacks(local.packs, sanitized.packs || []);
    const profileResult = this.mergeProfiles(local.profiles, sanitized.profiles || []);

    return {
      mergedLogs: logResult.merged,
      mergedPacks: packResult.merged,
      mergedProfiles: profileResult.merged,
      stats: {
        logsAdded: logResult.added,
        logsUpdated: logResult.updated,
        packsAdded: packResult.added,
        packsUpdated: packResult.updated,
        profilesUpdated: profileResult.updated,
      },
    };
  }
}
