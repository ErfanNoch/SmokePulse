import Dexie, { type Table } from 'dexie';
import { CigaretteLog, PackPurchase, UserProfile } from '../types';

export interface MetaRecord {
  key: string;
  value: any;
  updatedAt: number;
}

/**
 * Modern Dexie.js database instance for SmokePulse.
 * Provides schema indexing, typed tables, and offline persistence.
 */
export class SmokePulseDB extends Dexie {
  profiles!: Table<UserProfile, string>;
  logs!: Table<CigaretteLog, string>;
  packs!: Table<PackPurchase, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('smokepulse_dexie_v1');

    // Schema version 1
    this.version(1).stores({
      profiles: 'id, username, updatedAt',
      logs: 'id, timestamp, reason, mood, updatedAt, isDeleted, [timestamp+reason]',
      packs: 'id, timestamp, brandName, updatedAt, isDeleted',
      meta: 'key',
    });
  }

  /**
   * Request browser persistent storage to prevent automatic cache eviction
   * by Safari (7-day rule) or low disk space conditions.
   */
  async requestPersistence(): Promise<boolean> {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        await this.meta.put({
          key: 'is_persisted',
          value: isPersisted,
          updatedAt: Date.now(),
        });
        return isPersisted;
      } catch (err) {
        console.warn('Storage persistence request failed:', err);
      }
    }
    return false;
  }

  /**
   * Check if persistent storage is already granted
   */
  async isPersisted(): Promise<boolean> {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const db = new SmokePulseDB();
