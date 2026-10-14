import { CigaretteLog, PackPurchase, UserProfile, SyncPayload } from '../types';
import { db } from './db';

const ACTIVE_PROFILE_KEY = 'smokepulse_active_profile_id';
const LOCAL_STORAGE_BACKUP = 'smokepulse_offline_state_v2';
const LEGACY_IDB_NAME = 'smokepulse_v2_db';
const DEVICE_ID_KEY = 'smokepulse_device_id';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'vault_default',
  username: 'self',
  displayName: 'Personal Tracker',
  currency: 'USD',
  dailyStickLimit: 8,
  defaultPackCost: 9.0,
  defaultPackSize: 20,
  defaultBrand: 'Marlboro Gold',
  manualStockCalibration: 16,
  soundFeedback: true,
  theme: 'dark',
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  updatedAt: Date.now(),
};

export function getCostPerStick(profile: UserProfile, packs: PackPurchase[]): number {
  if (packs.length > 0) {
    const latest = packs[0];
    if (latest.sticksPerPack > 0 && latest.cost > 0) {
      return latest.cost / latest.sticksPerPack;
    }
  }
  return profile.defaultPackSize > 0 ? profile.defaultPackCost / profile.defaultPackSize : 0.45;
}

export function calculateLiveInventory(
  profile: UserProfile,
  packs: PackPurchase[],
  logs: CigaretteLog[]
): {
  totalInventory: number;
  packsCount: number;
  looseInCurrentPack: number;
  packSize: number;
} {
  const packSize = profile.defaultPackSize || 20;
  const initialBase = profile.manualStockCalibration ?? 16;
  const totalPurchasedSticks = packs
    .filter((p) => !p.isDeleted)
    .reduce((acc, p) => acc + (p.sticksPerPack || packSize) * (p.quantity || 1), 0);
  const totalSmokedSticks = logs
    .filter((l) => !l.isDeleted)
    .reduce((acc, l) => acc + l.count, 0);

  const totalInventory = Math.max(0, initialBase + totalPurchasedSticks - totalSmokedSticks);
  const packsCount = Math.floor(totalInventory / packSize);
  const looseInCurrentPack = totalInventory % packSize;

  return {
    totalInventory,
    packsCount,
    looseInCurrentPack,
    packSize,
  };
}

export function generateSeedData(profile: UserProfile): { logs: CigaretteLog[]; packs: PackPurchase[] } {
  const logs: CigaretteLog[] = [];
  const packs: PackPurchase[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const unitCost = profile.defaultPackCost / (profile.defaultPackSize || 20);

  packs.push(
    {
      id: 'pack_seed_1',
      timestamp: now - 16 * dayMs + 9 * 3600 * 1000,
      brandName: profile.defaultBrand,
      sticksPerPack: profile.defaultPackSize,
      cost: profile.defaultPackCost,
      quantity: 1,
      storeName: 'Corner Store',
      updatedAt: now - 16 * dayMs,
    },
    {
      id: 'pack_seed_2',
      timestamp: now - 8 * dayMs + 18 * 3600 * 1000,
      brandName: profile.defaultBrand,
      sticksPerPack: profile.defaultPackSize,
      cost: profile.defaultPackCost,
      quantity: 1,
      storeName: 'Gas Station',
      updatedAt: now - 8 * dayMs,
    },
    {
      id: 'pack_seed_3',
      timestamp: now - 2 * dayMs + 11 * 3600 * 1000,
      brandName: profile.defaultBrand,
      sticksPerPack: profile.defaultPackSize,
      cost: profile.defaultPackCost,
      quantity: 1,
      storeName: 'Bodega',
      updatedAt: now - 2 * dayMs,
    }
  );

  const reasons: Array<CigaretteLog['reason']> = [
    'Morning Coffee',
    'Work Break',
    'After Meal',
    'Stress',
    'Social',
    'Craving',
  ];

  for (let d = 14; d >= 0; d--) {
    const dayTimestamp = now - d * dayMs;
    const stickCountForDay = d === 0 ? 3 : Math.floor(3 + Math.random() * 4);
    const hours = [8, 11, 13, 16, 19, 21];

    for (let s = 0; s < stickCountForDay; s++) {
      const h = hours[s % hours.length] || 14;
      const m = Math.floor(Math.random() * 50);
      const logTime = new Date(dayTimestamp);
      logTime.setHours(h, m, 0, 0);

      const chosenReason = reasons[Math.floor(Math.random() * reasons.length)];
      let note: string | undefined = undefined;
      if (chosenReason === 'Stress') {
        note = 'Deadline meeting wrap-up';
      } else if (chosenReason === 'After Meal') {
        note = 'Quick smoke outside cafeteria';
      } else if (chosenReason === 'Morning Coffee') {
        note = 'First morning routine';
      }

      logs.push({
        id: `seed_log_${d}_${s}`,
        timestamp: logTime.getTime(),
        count: 1,
        reason: chosenReason,
        mood: 'Neutral',
        note,
        costEstimate: parseFloat(unitCost.toFixed(2)),
        updatedAt: logTime.getTime(),
      });
    }
  }

  return { logs, packs };
}

/**
 * Storage manager refactored to use Dexie.js as primary storage engine.
 * Includes automatic migration from legacy IndexedDB/localStorage,
 * persistent storage request, and CRDT/P2P merge foundations.
 */
class DexieStorageManager {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private deviceId: string = '';

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'node_env';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  /**
   * One-time initialization and migration runner
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Request persistent storage in browser to avoid eviction
        db.requestPersistence().catch(() => {});

        // Check if Dexie already has records
        const profileCount = await db.profiles.count();
        if (profileCount === 0) {
          // Check for legacy data to migrate
          const legacyData = await this.readLegacyData();
          if (legacyData && legacyData.profiles.length > 0) {
            await this.saveAll(legacyData.profiles, legacyData.logs, legacyData.packs);
            console.log('Successfully migrated legacy data to Dexie.js');
          } else {
            // Seed default
            const defaultProf = { ...DEFAULT_PROFILE };
            const seed = generateSeedData(defaultProf);
            await this.saveAll([defaultProf], seed.logs, seed.packs);
          }
        }
        this.initialized = true;
      } catch (err) {
        console.warn('Dexie initialization error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Reads old data from previous version if exists
   */
  private async readLegacyData(): Promise<{
    profiles: UserProfile[];
    logs: CigaretteLog[];
    packs: PackPurchase[];
  } | null> {
    // 1. Try old localStorage backup
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.profiles && parsed.profiles.length > 0) {
          return {
            profiles: parsed.profiles,
            logs: parsed.logs || [],
            packs: parsed.packs || [],
          };
        }
      }
    } catch {
      // ignore
    }

    // 2. Try old raw IndexedDB
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const oldData = await new Promise<{
          profiles: UserProfile[];
          logs: CigaretteLog[];
          packs: PackPurchase[];
        } | null>((resolve) => {
          const req = window.indexedDB.open(LEGACY_IDB_NAME, 2);
          req.onsuccess = () => {
            const oldDb = req.result;
            if (!oldDb.objectStoreNames.contains('profiles')) {
              oldDb.close();
              return resolve(null);
            }
            try {
              const tx = oldDb.transaction(['profiles', 'logs', 'packs'], 'readonly');
              const pReq = tx.objectStore('profiles').getAll();
              const lReq = tx.objectStore('logs').getAll();
              const pkReq = tx.objectStore('packs').getAll();

              tx.oncomplete = () => {
                oldDb.close();
                resolve({
                  profiles: pReq.result || [],
                  logs: lReq.result || [],
                  packs: pkReq.result || [],
                });
              };
              tx.onerror = () => {
                oldDb.close();
                resolve(null);
              };
            } catch {
              oldDb.close();
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        });

        if (oldData && oldData.profiles.length > 0) {
          return oldData;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  public async getAllData(): Promise<{
    profiles: UserProfile[];
    activeProfile: UserProfile;
    logs: CigaretteLog[];
    packs: PackPurchase[];
  }> {
    await this.ensureInitialized();

    const [profiles, rawLogs, rawPacks] = await Promise.all([
      db.profiles.toArray(),
      db.logs.filter((l) => !l.isDeleted).toArray(),
      db.packs.filter((p) => !p.isDeleted).toArray(),
    ]);

    // Active profile selection
    let activeProfileId: string | null = null;
    if (typeof window !== 'undefined') {
      activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    }
    const activeProfile =
      profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILE;

    rawLogs.sort((a, b) => b.timestamp - a.timestamp);
    rawPacks.sort((a, b) => b.timestamp - a.timestamp);

    // Keep localStorage backup as quick snapshot
    this.saveQuickLocalStorageSnapshot(profiles, rawLogs, rawPacks);

    return {
      profiles,
      activeProfile,
      logs: rawLogs,
      packs: rawPacks,
    };
  }

  private saveQuickLocalStorageSnapshot(
    profiles: UserProfile[],
    logs: CigaretteLog[],
    packs: PackPurchase[]
  ) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_BACKUP,
        JSON.stringify({
          profiles,
          logs: logs.slice(0, 100), // lightweight snapshot
          packs: packs.slice(0, 50),
          lastSaved: Date.now(),
        })
      );
    } catch {
      // quota safeguard
    }
  }

  public async saveAll(
    profiles: UserProfile[],
    logs: CigaretteLog[],
    packs: PackPurchase[]
  ): Promise<void> {
    const now = Date.now();

    // Assign updatedAt to ensure CRDT LWW sync readiness
    const normalizedLogs = logs.map((l) => ({
      ...l,
      updatedAt: l.updatedAt || l.timestamp || now,
    }));

    const normalizedPacks = packs.map((p) => ({
      ...p,
      updatedAt: p.updatedAt || p.timestamp || now,
    }));

    const normalizedProfiles = profiles.map((p) => ({
      ...p,
      updatedAt: p.updatedAt || now,
    }));

    await db.transaction('rw', [db.profiles, db.logs, db.packs], async () => {
      await db.profiles.clear();
      await db.profiles.bulkPut(normalizedProfiles);

      await db.logs.clear();
      await db.logs.bulkPut(normalizedLogs);

      await db.packs.clear();
      await db.packs.bulkPut(normalizedPacks);
    });

    this.saveQuickLocalStorageSnapshot(normalizedProfiles, normalizedLogs, normalizedPacks);
  }

  public async clearAllData(): Promise<{
    profiles: UserProfile[];
    activeProfile: UserProfile;
    logs: CigaretteLog[];
    packs: PackPurchase[];
  }> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_BACKUP);
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }

    const cleanProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      id: `vault_${Date.now()}`,
      manualStockCalibration: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const cleanProfiles = [cleanProfile];
    const cleanLogs: CigaretteLog[] = [];
    const cleanPacks: PackPurchase[] = [];

    await db.transaction('rw', [db.profiles, db.logs, db.packs], async () => {
      await db.profiles.clear();
      await db.logs.clear();
      await db.packs.clear();
      await db.profiles.put(cleanProfile);
    });

    this.setActiveProfileId(cleanProfile.id);

    return {
      profiles: cleanProfiles,
      activeProfile: cleanProfile,
      logs: cleanLogs,
      packs: cleanPacks,
    };
  }

  public setActiveProfileId(id: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    }
  }

  public exportBackupJson(
    profiles: UserProfile[],
    logs: CigaretteLog[],
    packs: PackPurchase[]
  ): string {
    return JSON.stringify(
      {
        app: 'SmokePulse',
        version: 3,
        engine: 'Dexie.js',
        exportedAt: new Date().toISOString(),
        deviceId: this.deviceId,
        profiles,
        logs,
        packs,
      },
      null,
      2
    );
  }

  public importBackupJson(jsonString: string): {
    profiles: UserProfile[];
    logs: CigaretteLog[];
    packs: PackPurchase[];
  } {
    const parsed = JSON.parse(jsonString);
    if (!parsed.profiles || !Array.isArray(parsed.logs) || !Array.isArray(parsed.packs)) {
      throw new Error('Invalid SmokePulse backup format');
    }
    return {
      profiles: parsed.profiles,
      logs: parsed.logs,
      packs: parsed.packs,
    };
  }

  /**
   * CRDT Last-Write-Wins (LWW) Merge Engine for P2P Sync.
   * Merges incoming logs and packs without destroying newer edits.
   */
  public async mergeSyncPayload(payload: SyncPayload): Promise<{
    addedLogs: number;
    updatedLogs: number;
    addedPacks: number;
  }> {
    await this.ensureInitialized();
    let addedLogs = 0;
    let updatedLogs = 0;
    let addedPacks = 0;

    await db.transaction('rw', [db.logs, db.packs], async () => {
      // 1. Merge Logs using LWW
      for (const incoming of payload.logs) {
        const existing = await db.logs.get(incoming.id);
        if (!existing) {
          await db.logs.put(incoming);
          addedLogs++;
        } else {
          const incomingUpdated = incoming.updatedAt || incoming.timestamp || 0;
          const existingUpdated = existing.updatedAt || existing.timestamp || 0;
          if (incomingUpdated > existingUpdated) {
            await db.logs.put(incoming);
            updatedLogs++;
          }
        }
      }

      // 2. Merge Packs using LWW
      for (const incoming of payload.packs) {
        const existing = await db.packs.get(incoming.id);
        if (!existing) {
          await db.packs.put(incoming);
          addedPacks++;
        } else {
          const incomingUpdated = incoming.updatedAt || incoming.timestamp || 0;
          const existingUpdated = existing.updatedAt || existing.timestamp || 0;
          if (incomingUpdated > existingUpdated) {
            await db.packs.put(incoming);
          }
        }
      }
    });

    return { addedLogs, updatedLogs, addedPacks };
  }

  /**
   * Generates a sync delta payload to transmit via WebRTC or QR
   */
  public async generateSyncPayload(sinceTimestamp = 0): Promise<SyncPayload> {
    await this.ensureInitialized();

    const [profiles, logs, packs] = await Promise.all([
      db.profiles.toArray(),
      sinceTimestamp > 0
        ? db.logs.where('updatedAt').aboveOrEqual(sinceTimestamp).toArray()
        : db.logs.toArray(),
      sinceTimestamp > 0
        ? db.packs.where('updatedAt').aboveOrEqual(sinceTimestamp).toArray()
        : db.packs.toArray(),
    ]);

    return {
      app: 'SmokePulse',
      version: 3,
      senderDeviceId: this.deviceId,
      timestamp: Date.now(),
      profiles,
      logs,
      packs,
    };
  }

  /**
   * Fast base64 compact string for QR code transmission
   */
  public generateCompactSyncCode(data: { logs: CigaretteLog[]; packs: PackPurchase[] }): string {
    try {
      const minData = {
        d: this.deviceId,
        t: Date.now(),
        l: data.logs.slice(0, 100).map((x) => [
          x.id,
          x.timestamp,
          x.count,
          x.reason,
          x.costEstimate || 0,
          x.note || '',
          x.updatedAt || x.timestamp,
        ]),
        p: data.packs.slice(0, 50).map((x) => [
          x.id,
          x.timestamp,
          x.brandName,
          x.sticksPerPack,
          x.cost,
          x.quantity,
          x.updatedAt || x.timestamp,
        ]),
      };
      return btoa(unescape(encodeURIComponent(JSON.stringify(minData))));
    } catch {
      return '';
    }
  }

  public parseCompactSyncCode(code: string): { logs: CigaretteLog[]; packs: PackPurchase[] } | null {
    try {
      const decoded = decodeURIComponent(escape(atob(code.trim())));
      const parsed = JSON.parse(decoded);
      if (!parsed.l || !parsed.p) return null;

      const logs: CigaretteLog[] = parsed.l.map((row: any[]) => ({
        id: row[0],
        timestamp: row[1],
        count: row[2],
        reason: row[3],
        costEstimate: row[4] || 0,
        note: row[5] || undefined,
        updatedAt: row[6] || row[1],
      }));

      const packs: PackPurchase[] = parsed.p.map((row: any[]) => ({
        id: row[0],
        timestamp: row[1],
        brandName: row[2],
        sticksPerPack: row[3],
        cost: row[4],
        quantity: row[5],
        updatedAt: row[6] || row[1],
      }));

      return { logs, packs };
    } catch {
      return null;
    }
  }

  public async isStoragePersisted(): Promise<boolean> {
    return db.isPersisted();
  }

  public async requestStoragePersistence(): Promise<boolean> {
    return db.requestPersistence();
  }
}

export const storageManager = new DexieStorageManager();
export { db };
