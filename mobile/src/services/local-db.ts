import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage instances
const simpleStorage = new MMKV({ id: 'local-db-simple' });
const metadataStorage = new MMKV({ id: 'local-db-metadata' });

export interface EntityMetadata {
  id: string;
  entity: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  version: number;
  deleted?: boolean;
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface Transaction {
  operations: Array<{
    type: 'set' | 'delete';
    key: string;
    value?: any;
  }>;
}

/**
 * Local database wrapper with entity repositories
 * Uses MMKV for simple key-value and AsyncStorage for complex objects
 */
class LocalDatabase {
  private readonly SCHEMA_VERSION = 1;
  private readonly METADATA_KEY = '_db_metadata';
  private indices: Map<string, Map<string, Set<string>>> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize database
   */
  private async initialize(): Promise<void> {
    try {
      const metadata = this.getMetadata();

      if (!metadata.version || metadata.version < this.SCHEMA_VERSION) {
        await this.migrate(metadata.version || 0, this.SCHEMA_VERSION);
        this.setMetadata({ version: this.SCHEMA_VERSION });
      }

      console.log('[LocalDB] Initialized, version:', this.SCHEMA_VERSION);
    } catch (error) {
      console.error('[LocalDB] Initialization failed:', error);
    }
  }

  /**
   * Get database metadata
   */
  private getMetadata(): { version?: number; [key: string]: any } {
    try {
      const data = metadataStorage.getString(this.METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[LocalDB] Failed to get metadata:', error);
      return {};
    }
  }

  /**
   * Set database metadata
   */
  private setMetadata(metadata: Record<string, any>): void {
    try {
      const existing = this.getMetadata();
      metadataStorage.set(this.METADATA_KEY, JSON.stringify({ ...existing, ...metadata }));
    } catch (error) {
      console.error('[LocalDB] Failed to set metadata:', error);
    }
  }

  /**
   * Run database migrations
   */
  private async migrate(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`[LocalDB] Migrating from version ${fromVersion} to ${toVersion}`);

    // Add migration logic here for future schema changes
    if (fromVersion === 0 && toVersion === 1) {
      // Initial migration
      console.log('[LocalDB] Running initial migration');
    }
  }

  // ==================== Simple Key-Value Operations (MMKV) ====================

  /**
   * Set simple value
   */
  setSimple(key: string, value: string | number | boolean): void {
    try {
      if (typeof value === 'string') {
        simpleStorage.set(key, value);
      } else if (typeof value === 'number') {
        simpleStorage.set(key, value);
      } else if (typeof value === 'boolean') {
        simpleStorage.set(key, value);
      }
    } catch (error) {
      console.error(`[LocalDB] Failed to set simple value for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get simple value
   */
  getSimple(key: string): string | number | boolean | undefined {
    try {
      const str = simpleStorage.getString(key);
      if (str !== undefined) return str;

      const num = simpleStorage.getNumber(key);
      if (num !== undefined) return num;

      return simpleStorage.getBoolean(key);
    } catch (error) {
      console.error(`[LocalDB] Failed to get simple value for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Delete simple value
   */
  deleteSimple(key: string): void {
    try {
      simpleStorage.delete(key);
    } catch (error) {
      console.error(`[LocalDB] Failed to delete simple value for key ${key}:`, error);
    }
  }

  // ==================== Entity Operations (AsyncStorage) ====================

  /**
   * Save entity
   */
  async save<T extends { id: string }>(entity: string, data: T): Promise<void> {
    try {
      const key = this.getEntityKey(entity, data.id);
      const metadata: EntityMetadata = {
        id: data.id,
        entity,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      // Check if entity exists
      const existing = await this.find<T>(entity, data.id);
      if (existing) {
        metadata.createdAt = (existing as any)._metadata?.createdAt || Date.now();
        metadata.version = ((existing as any)._metadata?.version || 0) + 1;
      }

      const dataWithMetadata = {
        ...data,
        _metadata: metadata,
      };

      await AsyncStorage.setItem(key, JSON.stringify(dataWithMetadata));
      this.updateIndices(entity, data);

      console.log(`[LocalDB] Saved ${entity}:${data.id}`);
    } catch (error) {
      console.error(`[LocalDB] Failed to save ${entity}:`, error);
      throw error;
    }
  }

  /**
   * Save multiple entities in batch
   */
  async saveMany<T extends { id: string }>(entity: string, items: T[]): Promise<void> {
    try {
      const pairs = await Promise.all(
        items.map(async (item) => {
          const key = this.getEntityKey(entity, item.id);
          const existing = await this.find<T>(entity, item.id);

          const metadata: EntityMetadata = {
            id: item.id,
            entity,
            createdAt: (existing as any)?._metadata?.createdAt || Date.now(),
            updatedAt: Date.now(),
            version: ((existing as any)?._metadata?.version || 0) + 1,
          };

          const dataWithMetadata = {
            ...item,
            _metadata: metadata,
          };

          this.updateIndices(entity, item);

          return [key, JSON.stringify(dataWithMetadata)] as [string, string];
        })
      );

      await AsyncStorage.multiSet(pairs);
      console.log(`[LocalDB] Saved ${items.length} ${entity} entities`);
    } catch (error) {
      console.error(`[LocalDB] Failed to save many ${entity}:`, error);
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async find<T>(entity: string, id: string): Promise<T | null> {
    try {
      const key = this.getEntityKey(entity, id);
      const data = await AsyncStorage.getItem(key);

      if (!data) return null;

      const parsed = JSON.parse(data);

      // Check if deleted
      if (parsed._metadata?.deleted) {
        return null;
      }

      return parsed as T;
    } catch (error) {
      console.error(`[LocalDB] Failed to find ${entity}:${id}:`, error);
      return null;
    }
  }

  /**
   * Find all entities
   */
  async findAll<T>(entity: string, options?: QueryOptions): Promise<T[]> {
    try {
      const prefix = `entity:${entity}:`;
      const keys = await AsyncStorage.getAllKeys();
      const entityKeys = keys.filter((key) => key.startsWith(prefix));

      if (entityKeys.length === 0) return [];

      const items = await AsyncStorage.multiGet(entityKeys);
      let results = items
        .map(([_, value]) => {
          if (!value) return null;
          try {
            const parsed = JSON.parse(value);
            // Exclude deleted entities
            if (parsed._metadata?.deleted) return null;
            return parsed;
          } catch {
            return null;
          }
        })
        .filter((item): item is T => item !== null);

      // Apply filters
      if (options?.where) {
        results = this.applyFilters(results, options.where);
      }

      // Apply sorting
      if (options?.orderBy) {
        results = this.applySort(results, options.orderBy);
      }

      // Apply pagination
      if (options?.offset !== undefined || options?.limit !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || results.length;
        results = results.slice(offset, offset + limit);
      }

      return results;
    } catch (error) {
      console.error(`[LocalDB] Failed to find all ${entity}:`, error);
      return [];
    }
  }

  /**
   * Query entities with filters
   */
  async query<T>(entity: string, options: QueryOptions): Promise<T[]> {
    return this.findAll<T>(entity, options);
  }

  /**
   * Count entities
   */
  async count(entity: string, where?: Record<string, any>): Promise<number> {
    try {
      const items = await this.findAll(entity);
      if (!where) return items.length;

      const filtered = this.applyFilters(items, where);
      return filtered.length;
    } catch (error) {
      console.error(`[LocalDB] Failed to count ${entity}:`, error);
      return 0;
    }
  }

  /**
   * Delete entity (soft delete)
   */
  async delete(entity: string, id: string, hard: boolean = false): Promise<boolean> {
    try {
      const key = this.getEntityKey(entity, id);

      if (hard) {
        await AsyncStorage.removeItem(key);
        this.removeFromIndices(entity, id);
        console.log(`[LocalDB] Hard deleted ${entity}:${id}`);
      } else {
        const existing = await this.find(entity, id);
        if (existing) {
          (existing as any)._metadata.deleted = true;
          (existing as any)._metadata.updatedAt = Date.now();
          await AsyncStorage.setItem(key, JSON.stringify(existing));
          console.log(`[LocalDB] Soft deleted ${entity}:${id}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`[LocalDB] Failed to delete ${entity}:${id}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(entity: string, ids: string[], hard: boolean = false): Promise<number> {
    try {
      let deleted = 0;
      for (const id of ids) {
        const success = await this.delete(entity, id, hard);
        if (success) deleted++;
      }
      return deleted;
    } catch (error) {
      console.error(`[LocalDB] Failed to delete many ${entity}:`, error);
      return 0;
    }
  }

  /**
   * Clear all entities of a type
   */
  async clear(entity: string): Promise<void> {
    try {
      const prefix = `entity:${entity}:`;
      const keys = await AsyncStorage.getAllKeys();
      const entityKeys = keys.filter((key) => key.startsWith(prefix));

      if (entityKeys.length > 0) {
        await AsyncStorage.multiRemove(entityKeys);
        this.indices.delete(entity);
        console.log(`[LocalDB] Cleared ${entityKeys.length} ${entity} entities`);
      }
    } catch (error) {
      console.error(`[LocalDB] Failed to clear ${entity}:`, error);
    }
  }

  // ==================== Transaction Support ====================

  /**
   * Execute operations in a transaction
   */
  async transaction(
    operations: Array<{
      type: 'save' | 'delete';
      entity: string;
      data?: any;
      id?: string;
    }>
  ): Promise<void> {
    const rollbackData: Array<{ key: string; value: string | null }> = [];

    try {
      // Backup current values
      for (const op of operations) {
        const key = this.getEntityKey(op.entity, op.id || op.data?.id);
        const existing = await AsyncStorage.getItem(key);
        rollbackData.push({ key, value: existing });
      }

      // Execute operations
      for (const op of operations) {
        if (op.type === 'save' && op.data) {
          await this.save(op.entity, op.data);
        } else if (op.type === 'delete' && op.id) {
          await this.delete(op.entity, op.id, true);
        }
      }

      console.log(`[LocalDB] Transaction completed: ${operations.length} operations`);
    } catch (error) {
      console.error('[LocalDB] Transaction failed, rolling back:', error);

      // Rollback
      for (const { key, value } of rollbackData) {
        if (value !== null) {
          await AsyncStorage.setItem(key, value);
        } else {
          await AsyncStorage.removeItem(key);
        }
      }

      throw error;
    }
  }

  // ==================== Indexing ====================

  /**
   * Create index for faster queries
   */
  createIndex(entity: string, field: string): void {
    if (!this.indices.has(entity)) {
      this.indices.set(entity, new Map());
    }
    const entityIndices = this.indices.get(entity)!;
    if (!entityIndices.has(field)) {
      entityIndices.set(field, new Set());
    }
    console.log(`[LocalDB] Created index on ${entity}.${field}`);
  }

  /**
   * Update indices for entity
   */
  private updateIndices<T extends { id: string }>(entity: string, data: T): void {
    if (!this.indices.has(entity)) return;

    const entityIndices = this.indices.get(entity)!;
    entityIndices.forEach((idSet, field) => {
      const value = (data as any)[field];
      if (value !== undefined) {
        idSet.add(data.id);
      }
    });
  }

  /**
   * Remove from indices
   */
  private removeFromIndices(entity: string, id: string): void {
    if (!this.indices.has(entity)) return;

    const entityIndices = this.indices.get(entity)!;
    entityIndices.forEach((idSet) => {
      idSet.delete(id);
    });
  }

  /**
   * Query using index
   */
  async queryByIndex<T>(entity: string, field: string, value: any): Promise<T[]> {
    if (!this.indices.has(entity) || !this.indices.get(entity)!.has(field)) {
      console.warn(`[LocalDB] No index on ${entity}.${field}, falling back to full scan`);
      return this.findAll<T>(entity, { where: { [field]: value } });
    }

    // Use index for fast lookup
    const idSet = this.indices.get(entity)!.get(field)!;
    const results: T[] = [];

    for (const id of idSet) {
      const item = await this.find<T>(entity, id);
      if (item && (item as any)[field] === value) {
        results.push(item);
      }
    }

    return results;
  }

  // ==================== Utility Methods ====================

  /**
   * Get entity storage key
   */
  private getEntityKey(entity: string, id: string): string {
    return `entity:${entity}:${id}`;
  }

  /**
   * Apply filters to results
   */
  private applyFilters<T>(items: T[], where: Record<string, any>): T[] {
    return items.filter((item) => {
      return Object.entries(where).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });
  }

  /**
   * Apply sorting to results
   */
  private applySort<T>(items: T[], orderBy: { field: string; direction: 'asc' | 'desc' }): T[] {
    return items.sort((a, b) => {
      const aVal = (a as any)[orderBy.field];
      const bVal = (b as any)[orderBy.field];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return orderBy.direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    entities: Record<string, number>;
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entityStats: Record<string, number> = {};

      keys.forEach((key) => {
        if (key.startsWith('entity:')) {
          const entity = key.split(':')[1];
          entityStats[entity] = (entityStats[entity] || 0) + 1;
        }
      });

      return {
        entities: entityStats,
        totalSize: keys.length,
      };
    } catch (error) {
      console.error('[LocalDB] Failed to get stats:', error);
      return { entities: {}, totalSize: 0 };
    }
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
      simpleStorage.clearAll();
      metadataStorage.clearAll();
      this.indices.clear();
      console.log('[LocalDB] Cleared all data');
    } catch (error) {
      console.error('[LocalDB] Failed to clear all data:', error);
    }
  }
}

// Export singleton instance
export const localDB = new LocalDatabase();
export default localDB;
