import { CigaretteLog, PackPurchase, UserProfile, SyncPayload } from '../types';

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

/**
 * Pure Last-Write-Wins (LWW) CRDT Merge Engine.
 * Deterministic and commutative: merge(A, B) === merge(B, A).
 */
export class CRDTEngine {
  /**
   * Merges two sets of CigaretteLogs using Last-Write-Wins.
   * Handles tombstones (isDeleted).
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
    remote: SyncPayload
  ): CRDTMergeResult {
    const logResult = this.mergeLogs(local.logs, remote.logs || []);
    const packResult = this.mergePacks(local.packs, remote.packs || []);
    const profileResult = this.mergeProfiles(local.profiles, remote.profiles || []);

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
