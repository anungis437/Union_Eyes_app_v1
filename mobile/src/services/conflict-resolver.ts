import { MMKV } from 'react-native-mmkv';

const conflictStorage = new MMKV({ id: 'conflicts' });

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  LAST_WRITE_WINS = 'last_write_wins',
  MANUAL = 'manual',
  MERGE = 'merge',
}

export interface ConflictData<T = any> {
  id: string;
  entity: string; // 'claim', 'document', 'member', etc.
  entityId: string;
  localVersion: T;
  serverVersion: T;
  localTimestamp: number;
  serverTimestamp: number;
  strategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolution?: T;
  resolvedAt?: number;
  userId?: string;
  fieldConflicts?: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  localValue: any;
  serverValue: any;
  selectedValue?: any;
}

export interface ConflictResolutionResult<T = any> {
  resolved: boolean;
  data?: T;
  requiresManualResolution?: boolean;
  conflict?: ConflictData<T>;
}

type ConflictListener = (conflict: ConflictData) => void;

/**
 * Advanced conflict resolution system for offline sync
 */
class ConflictResolver {
  private conflicts: Map<string, ConflictData> = new Map();
  private listeners: Set<ConflictListener> = new Set();
  private strategyHandlers: Map<
    ConflictResolutionStrategy,
    (conflict: ConflictData) => ConflictResolutionResult
  >;

  constructor() {
    this.loadPersistedConflicts();
    this.strategyHandlers = this.initializeStrategyHandlers();
  }

  /**
   * Initialize strategy handlers
   */
  private initializeStrategyHandlers() {
    const handlers = new Map<
      ConflictResolutionStrategy,
      (conflict: ConflictData) => ConflictResolutionResult
    >();

    handlers.set(ConflictResolutionStrategy.SERVER_WINS, this.serverWinsStrategy.bind(this));
    handlers.set(ConflictResolutionStrategy.CLIENT_WINS, this.clientWinsStrategy.bind(this));
    handlers.set(ConflictResolutionStrategy.LAST_WRITE_WINS, this.lastWriteWinsStrategy.bind(this));
    handlers.set(ConflictResolutionStrategy.MANUAL, this.manualStrategy.bind(this));
    handlers.set(ConflictResolutionStrategy.MERGE, this.mergeStrategy.bind(this));

    return handlers;
  }

  /**
   * Load persisted conflicts from storage
   */
  private loadPersistedConflicts(): void {
    try {
      const serialized = conflictStorage.getString('conflicts');
      if (serialized) {
        const conflicts: ConflictData[] = JSON.parse(serialized);
        conflicts.forEach((conflict) => this.conflicts.set(conflict.id, conflict));
        console.log(`[ConflictResolver] Loaded ${conflicts.length} persisted conflicts`);
      }
    } catch (error) {
      console.error('[ConflictResolver] Failed to load persisted conflicts:', error);
    }
  }

  /**
   * Persist conflicts to storage
   */
  private persistConflicts(): void {
    try {
      const conflicts = Array.from(this.conflicts.values());
      conflictStorage.set('conflicts', JSON.stringify(conflicts));
    } catch (error) {
      console.error('[ConflictResolver] Failed to persist conflicts:', error);
    }
  }

  /**
   * Detect and resolve conflicts between local and server data
   */
  async detectAndResolve<T>(
    entity: string,
    entityId: string,
    localData: T,
    serverData: T,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS
  ): Promise<ConflictResolutionResult<T>> {
    // Check if data is different
    const hasConflict = this.hasDataConflict(localData, serverData);

    if (!hasConflict) {
      console.log(`[ConflictResolver] No conflict detected for ${entity}:${entityId}`);
      return {
        resolved: true,
        data: serverData,
      };
    }

    console.log(
      `[ConflictResolver] Conflict detected for ${entity}:${entityId}, strategy: ${strategy}`
    );

    // Create conflict record
    const conflict: ConflictData<T> = {
      id: `conflict_${entity}_${entityId}_${Date.now()}`,
      entity,
      entityId,
      localVersion: localData,
      serverVersion: serverData,
      localTimestamp: (localData as any).updatedAt || Date.now(),
      serverTimestamp: (serverData as any).updatedAt || Date.now(),
      strategy,
      resolved: false,
      fieldConflicts: this.detectFieldConflicts(localData, serverData),
    };

    // Store conflict
    this.conflicts.set(conflict.id, conflict);
    this.persistConflicts();
    this.notifyListeners(conflict);

    // Attempt automatic resolution
    const handler = this.strategyHandlers.get(strategy);
    if (!handler) {
      console.error(`[ConflictResolver] Unknown strategy: ${strategy}`);
      return {
        resolved: false,
        requiresManualResolution: true,
        conflict,
      };
    }

    const result = handler(conflict);

    if (result.resolved && result.data) {
      conflict.resolved = true;
      conflict.resolution = result.data;
      conflict.resolvedAt = Date.now();
      this.persistConflicts();
    }

    return result;
  }

  /**
   * Check if two data objects have conflicts
   */
  private hasDataConflict<T>(local: T, server: T): boolean {
    const localJson = JSON.stringify(this.normalizeForComparison(local));
    const serverJson = JSON.stringify(this.normalizeForComparison(server));
    return localJson !== serverJson;
  }

  /**
   * Normalize data for comparison (remove timestamps, etc.)
   */
  private normalizeForComparison(data: any): any {
    const { updatedAt, createdAt, _synced, ...rest } = data;
    return rest;
  }

  /**
   * Detect conflicts in individual fields
   */
  private detectFieldConflicts<T>(local: T, server: T): FieldConflict[] {
    const conflicts: FieldConflict[] = [];
    const localObj = local as Record<string, any>;
    const serverObj = server as Record<string, any>;

    const allKeys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)]);

    allKeys.forEach((key) => {
      // Skip metadata fields
      if (['updatedAt', 'createdAt', '_synced', 'id'].includes(key)) {
        return;
      }

      const localValue = localObj[key];
      const serverValue = serverObj[key];

      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        conflicts.push({
          field: key,
          localValue,
          serverValue,
        });
      }
    });

    return conflicts;
  }

  /**
   * Server wins strategy - always use server data
   */
  private serverWinsStrategy<T>(conflict: ConflictData<T>): ConflictResolutionResult<T> {
    console.log(
      `[ConflictResolver] Resolving with SERVER_WINS for ${conflict.entity}:${conflict.entityId}`
    );
    return {
      resolved: true,
      data: conflict.serverVersion,
    };
  }

  /**
   * Client wins strategy - always use local data
   */
  private clientWinsStrategy<T>(conflict: ConflictData<T>): ConflictResolutionResult<T> {
    console.log(
      `[ConflictResolver] Resolving with CLIENT_WINS for ${conflict.entity}:${conflict.entityId}`
    );
    return {
      resolved: true,
      data: conflict.localVersion,
    };
  }

  /**
   * Last write wins strategy - use most recent timestamp
   */
  private lastWriteWinsStrategy<T>(conflict: ConflictData<T>): ConflictResolutionResult<T> {
    const useServer = conflict.serverTimestamp >= conflict.localTimestamp;
    console.log(
      `[ConflictResolver] Resolving with LAST_WRITE_WINS for ${conflict.entity}:${conflict.entityId}, winner: ${
        useServer ? 'server' : 'client'
      }`
    );

    return {
      resolved: true,
      data: useServer ? conflict.serverVersion : conflict.localVersion,
    };
  }

  /**
   * Manual strategy - requires user intervention
   */
  private manualStrategy<T>(conflict: ConflictData<T>): ConflictResolutionResult<T> {
    console.log(
      `[ConflictResolver] Manual resolution required for ${conflict.entity}:${conflict.entityId}`
    );
    return {
      resolved: false,
      requiresManualResolution: true,
      conflict,
    };
  }

  /**
   * Merge strategy - intelligently merge non-conflicting fields
   */
  private mergeStrategy<T>(conflict: ConflictData<T>): ConflictResolutionResult<T> {
    console.log(`[ConflictResolver] Attempting merge for ${conflict.entity}:${conflict.entityId}`);

    const merged = { ...conflict.serverVersion } as any;
    const localObj = conflict.localVersion as any;
    const serverObj = conflict.serverVersion as any;

    // Use server timestamp as base
    merged.updatedAt = Math.max(localObj.updatedAt || 0, serverObj.updatedAt || 0);

    // Merge non-conflicting fields
    const hasUnresolvableConflicts = conflict.fieldConflicts?.some((fc) => {
      // For arrays and objects, defer to manual resolution
      if (typeof fc.localValue === 'object' || typeof fc.serverValue === 'object') {
        return true;
      }
      return false;
    });

    if (hasUnresolvableConflicts) {
      console.log(
        `[ConflictResolver] Merge has unresolvable conflicts, requiring manual resolution`
      );
      return {
        resolved: false,
        requiresManualResolution: true,
        conflict,
      };
    }

    // Simple merge: take newer value for each field
    conflict.fieldConflicts?.forEach((fc) => {
      const useLocal = (localObj.updatedAt || 0) > (serverObj.updatedAt || 0);
      merged[fc.field] = useLocal ? fc.localValue : fc.serverValue;
    });

    return {
      resolved: true,
      data: merged as T,
    };
  }

  /**
   * Manually resolve a conflict
   */
  async resolveManually<T>(conflictId: string, resolution: T): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      console.error(`[ConflictResolver] Conflict not found: ${conflictId}`);
      return false;
    }

    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();

    this.persistConflicts();
    console.log(`[ConflictResolver] Manually resolved conflict ${conflictId}`);

    return true;
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolvedConflicts(entity?: string): ConflictData[] {
    let conflicts = Array.from(this.conflicts.values()).filter((c) => !c.resolved);

    if (entity) {
      conflicts = conflicts.filter((c) => c.entity === entity);
    }

    return conflicts;
  }

  /**
   * Get conflict by ID
   */
  getConflict(id: string): ConflictData | undefined {
    return this.conflicts.get(id);
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  clearResolvedConflicts(olderThanDays: number = 7): void {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const conflicts = Array.from(this.conflicts.values());

    let cleared = 0;
    conflicts.forEach((conflict) => {
      if (conflict.resolved && conflict.resolvedAt && conflict.resolvedAt < cutoffTime) {
        this.conflicts.delete(conflict.id);
        cleared++;
      }
    });

    this.persistConflicts();
    console.log(`[ConflictResolver] Cleared ${cleared} resolved conflicts`);
  }

  /**
   * Add conflict listener
   */
  addListener(listener: ConflictListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of new conflict
   */
  private notifyListeners(conflict: ConflictData): void {
    this.listeners.forEach((listener) => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('[ConflictResolver] Listener error:', error);
      }
    });
  }

  /**
   * Get conflict statistics
   */
  getStats() {
    const conflicts = Array.from(this.conflicts.values());
    return {
      total: conflicts.length,
      unresolved: conflicts.filter((c) => !c.resolved).length,
      resolved: conflicts.filter((c) => c.resolved).length,
      byEntity: conflicts.reduce(
        (acc, c) => {
          acc[c.entity] = (acc[c.entity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byStrategy: conflicts.reduce(
        (acc, c) => {
          acc[c.strategy] = (acc[c.strategy] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();
export default conflictResolver;
