import { localDB } from './local-db';
import { offlineQueue, OperationPriority, OperationType } from './offline-queue';
import { conflictResolver, ConflictResolutionStrategy } from './conflict-resolver';
import { networkStatus, NetworkQuality } from './network-status';
import * as SecureStore from 'expo-secure-store';

export interface SyncConfig {
  apiBaseUrl: string;
  syncInterval?: number; // Auto-sync interval in ms
  batchSize?: number;
  wifiOnlyForLargeSync?: boolean;
  enableBackgroundSync?: boolean;
  conflictStrategy?: ConflictResolutionStrategy;
}

export interface SyncStatus {
  issyncing: boolean;
  lastSyncAt?: number;
  lastSuccessfulSyncAt?: number;
  pendingChanges: number;
  failedOperations: number;
  entity?: string;
  progress?: number; // 0-100
  error?: string;
}

export interface EntitySyncStrategy<T = any> {
  entity: string;
  endpoint: string;
  pullEndpoint?: string; // For delta sync
  lastSyncKey: string; // Key to store last sync timestamp
  priority: OperationPriority;
  conflictStrategy: ConflictResolutionStrategy;
  transform?: (data: any) => T;
  shouldPull?: () => Promise<boolean>;
  shouldPush?: () => Promise<boolean>;
  pullPageSize?: number;
}

type SyncEventType = 'started' | 'progress' | 'completed' | 'failed' | 'conflict';
type SyncListener = (status: SyncStatus, event: SyncEventType) => void;

const DEFAULT_CONFIG: Required<SyncConfig> = {
  apiBaseUrl: process.env.API_URL || 'https://api.unioneyes.com',
  syncInterval: 5 * 60 * 1000, // 5 minutes
  batchSize: 50,
  wifiOnlyForLargeSync: true,
  enableBackgroundSync: true,
  conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
};

/**
 * Comprehensive sync engine for offline-first architecture
 */
class SyncEngine {
  private config: Required<SyncConfig>;
  private strategies: Map<string, EntitySyncStrategy> = new Map();
  private syncStatus: Map<string, SyncStatus> = new Map();
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private authToken: string | null = null;

  constructor(config: SyncConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize sync engine
   */
  private async initialize(): Promise<void> {
    // Load auth token
    this.authToken = await SecureStore.getItemAsync('auth_token');

    // Register default strategies
    this.registerDefaultStrategies();

    // Setup auto-sync
    if (this.config.enableBackgroundSync) {
      this.startAutoSync();
    }

    // Listen to network changes
    networkStatus.addConnectionListener((isConnected) => {
      if (isConnected) {
        this.syncAll();
      }
    });
  }

  /**
   * Register default sync strategies
   */
  private registerDefaultStrategies(): void {
    // Claims sync strategy
    this.registerStrategy({
      entity: 'claims',
      endpoint: '/claims',
      lastSyncKey: 'claims_last_sync',
      priority: OperationPriority.HIGH,
      conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      pullPageSize: 50,
    });

    // Documents sync strategy
    this.registerStrategy({
      entity: 'documents',
      endpoint: '/documents',
      lastSyncKey: 'documents_last_sync',
      priority: OperationPriority.MEDIUM,
      conflictStrategy: ConflictResolutionStrategy.SERVER_WINS,
      pullPageSize: 30,
    });

    // Members sync strategy
    this.registerStrategy({
      entity: 'members',
      endpoint: '/members',
      lastSyncKey: 'members_last_sync',
      priority: OperationPriority.LOW,
      conflictStrategy: ConflictResolutionStrategy.SERVER_WINS,
      pullPageSize: 100,
    });

    // Notifications sync strategy
    this.registerStrategy({
      entity: 'notifications',
      endpoint: '/notifications',
      lastSyncKey: 'notifications_last_sync',
      priority: OperationPriority.MEDIUM,
      conflictStrategy: ConflictResolutionStrategy.SERVER_WINS,
      pullPageSize: 50,
    });
  }

  /**
   * Register entity sync strategy
   */
  registerStrategy(strategy: EntitySyncStrategy): void {
    this.strategies.set(strategy.entity, strategy);
  }

  /**
   * Start auto-sync interval
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (networkStatus.isOnline() && !this.isSyncing) {
        this.syncAll();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync all registered entities
   */
  async syncAll(force: boolean = false): Promise<void> {
    if (this.isSyncing && !force) {
      return;
    }

    if (!networkStatus.isOnline()) {
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    this.notifyListeners({ issyncing: true, pendingChanges: 0, failedOperations: 0 }, 'started');

    try {
      // Push local changes first
      await this.pushAll();

      // Then pull remote changes
      await this.pullAll();

      // Process offline queue
      await offlineQueue.processQueue();
      const duration = Date.now() - startTime;

      this.notifyListeners(
        {
          issyncing: false,
          lastSyncAt: Date.now(),
          lastSuccessfulSyncAt: Date.now(),
          pendingChanges: 0,
          failedOperations: 0,
        },
        'completed'
      );
    } catch (error: any) {
      this.notifyListeners(
        {
          issyncing: false,
          lastSyncAt: Date.now(),
          pendingChanges: offlineQueue.getStats().pending,
          failedOperations: offlineQueue.getStats().failed,
          error: error.message,
        },
        'failed'
      );
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync specific entity
   */
  async sync(entity: string, direction: 'push' | 'pull' | 'both' = 'both'): Promise<void> {
    const strategy = this.strategies.get(entity);
    if (!strategy) {
      throw new Error(`No sync strategy registered for entity: ${entity}`);
    }

    if (!networkStatus.isOnline()) {
      return;
    }

    this.updateStatus(entity, { issyncing: true, pendingChanges: 0, failedOperations: 0 });

    try {
      if (direction === 'push' || direction === 'both') {
        await this.pushEntity(strategy);
      }

      if (direction === 'pull' || direction === 'both') {
        await this.pullEntity(strategy);
      }

      this.updateStatus(entity, {
        issyncing: false,
        lastSyncAt: Date.now(),
        lastSuccessfulSyncAt: Date.now(),
        pendingChanges: 0,
        failedOperations: 0,
      });

    } catch (error: any) {
      this.updateStatus(entity, {
        issyncing: false,
        lastSyncAt: Date.now(),
        pendingChanges: 0,
        failedOperations: 0,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Push all local changes to server
   */
  private async pushAll(): Promise<void> {
    const strategies = Array.from(this.strategies.values());

    for (const strategy of strategies) {
      if (strategy.shouldPush) {
        const should = await strategy.shouldPush();
        if (!should) continue;
      }

      await this.pushEntity(strategy);
    }
  }

  /**
   * Push entity changes to server
   */
  private async pushEntity(strategy: EntitySyncStrategy): Promise<void> {
    const { entity, endpoint } = strategy;

    // Get all local entities that need syncing
    const localEntities = await localDB.findAll(entity);
    const unsynced = localEntities.filter((item: any) => {
      const metadata = item._metadata;
      return !metadata?.syncedAt || metadata.updatedAt > metadata.syncedAt;
    });

    if (unsynced.length === 0) {
      return;
    }

    // Batch push
    const batches = this.chunkArray(unsynced, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const progress = ((i + 1) / batches.length) * 50; // Push is first 50% of progress

      this.updateStatus(entity, {
        issyncing: true,
        progress,
        pendingChanges: unsynced.length - i * this.config.batchSize,
        failedOperations: 0,
      });

      try {
        await this.pushBatch(strategy, batch);
      } catch {
        // Continue with next batch
      }
    }
  }

  /**
   * Push batch of entities
   */
  private async pushBatch(strategy: EntitySyncStrategy, entities: any[]): Promise<void> {
    const { endpoint, entity } = strategy;

    for (const item of entities) {
      const { _metadata, ...data } = item;
      const itemId = (item as any).id || (data as any).id;
      const url = `${this.config.apiBaseUrl}${endpoint}/${itemId}`;

      try {
        const response = await this.makeRequest(url, {
          method: 'PUT',
          body: JSON.stringify(data),
        });

        // Update sync timestamp
        if (response.ok && itemId) {
          const updated = await localDB.find(entity, itemId);
          if (updated && (updated as any).id) {
            (updated as any)._metadata.syncedAt = Date.now();
            await localDB.save(entity, updated as any);
          }
        }
      } catch (error: any) {
        // Queue for retry
        await offlineQueue.enqueue({
          type: OperationType.UPDATE,
          entity,
          priority: strategy.priority,
          data,
          url,
          method: 'PUT',
          maxRetries: 3,
        });
      }
    }
  }

  /**
   * Pull remote changes from server
   */
  private async pullAll(): Promise<void> {
    const strategies = Array.from(this.strategies.values());

    for (const strategy of strategies) {
      if (strategy.shouldPull) {
        const should = await strategy.shouldPull();
        if (!should) continue;
      }

      await this.pullEntity(strategy);
    }
  }

  /**
   * Pull entity changes from server (delta sync)
   */
  private async pullEntity(strategy: EntitySyncStrategy): Promise<void> {
    const { entity, endpoint, pullEndpoint, lastSyncKey, transform, pullPageSize = 50 } = strategy;

    // Get last sync timestamp for delta sync
    const lastSync = localDB.getSimple(lastSyncKey) as number | undefined;
    const url = pullEndpoint || endpoint;

    try {
      let page = 0;
      let hasMore = true;
      let totalPulled = 0;

      while (hasMore) {
        const params = new URLSearchParams({
          limit: pullPageSize.toString(),
          offset: (page * pullPageSize).toString(),
          ...(lastSync ? { updatedAfter: lastSync.toString() } : {}),
        });

        const response = await this.makeRequest(`${this.config.apiBaseUrl}${url}?${params}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];
        hasMore = result.hasMore || false;

        // Process and save entities
        for (const serverItem of data) {
          const transformed = transform ? transform(serverItem) : serverItem;
          await this.mergeEntity(entity, transformed, strategy.conflictStrategy);
          totalPulled++;
        }

        page++;
        const progress = 50 + Math.min(50, (totalPulled / 100) * 50); // Pull is second 50% of progress
        this.updateStatus(entity, {
          issyncing: true,
          progress,
          pendingChanges: 0,
          failedOperations: 0,
        });

        // Check if we should continue (bandwidth-aware)
        if (!networkStatus.shouldSyncNow({ minQuality: NetworkQuality.GOOD })) {
          break;
        }
      }

      // Update last sync timestamp
      localDB.setSimple(lastSyncKey, Date.now());
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Merge entity with conflict resolution
   */
  private async mergeEntity(
    entity: string,
    serverData: any,
    strategy: ConflictResolutionStrategy
  ): Promise<void> {
    const localData = await localDB.find(entity, serverData.id);

    if (!localData) {
      // New entity, just save
      await localDB.save(entity, serverData);
      return;
    }

    // Check for conflicts
    const result = await conflictResolver.detectAndResolve(
      entity,
      serverData.id,
      localData,
      serverData,
      strategy
    );

    if (result.resolved && result.data) {
      // Conflict resolved, save merged data
      await localDB.save(entity, result.data);
    } else if (result.requiresManualResolution && result.conflict) {
      // Notify listeners of conflict
      this.notifyListeners(
        {
          issyncing: false,
          entity,
          pendingChanges: 1,
          failedOperations: 0,
          error: 'Conflict requires manual resolution',
        },
        'conflict'
      );
    }
  }

  /**
   * Make authenticated HTTP request
   */
  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const token = await SecureStore.getItemAsync('auth_token');

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update sync status
   */
  private updateStatus(entity: string, status: Partial<SyncStatus>): void {
    const current = this.syncStatus.get(entity) || {
      issyncing: false,
      pendingChanges: 0,
      failedOperations: 0,
    };

    const updated = { ...current, ...status, entity };
    this.syncStatus.set(entity, updated);
    this.notifyListeners(updated, 'progress');
  }

  /**
   * Get sync status for entity
   */
  getStatus(entity?: string): SyncStatus | Map<string, SyncStatus> {
    if (entity) {
      return (
        this.syncStatus.get(entity) || {
          issyncing: false,
          pendingChanges: 0,
          failedOperations: 0,
        }
      );
    }
    return this.syncStatus;
  }

  /**
   * Get overall sync statistics
   */
  getStats() {
    const queueStats = offlineQueue.getStats();
    const conflictStats = conflictResolver.getStats();

    return {
      queue: queueStats,
      conflicts: conflictStats,
      issyncing: this.isSyncing,
      syncStatuses: Object.fromEntries(this.syncStatus),
    };
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<void> {
    await this.syncAll(true);
  }

  /**
   * Add sync listener
   */
  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(status: SyncStatus, event: SyncEventType): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status, event);
      } catch {
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSync();
    this.listeners.clear();
    this.syncStatus.clear();
    this.strategies.clear();
  }
}

// Create and export singleton instance
let syncEngineInstance: SyncEngine | null = null;

export function createSyncEngine(config: SyncConfig): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  }
  return syncEngineInstance;
}

export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    throw new Error('SyncEngine not initialized. Call createSyncEngine first.');
  }
  return syncEngineInstance;
}

export default SyncEngine;

