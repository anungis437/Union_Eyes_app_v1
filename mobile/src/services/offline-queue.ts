import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';

// Storage instance for queue persistence
const queueStorage = new MMKV({ id: 'offline-queue' });

export enum OperationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  UPLOAD = 'upload',
}

export interface QueuedOperation {
  id: string;
  type: OperationType;
  entity: string; // 'claim', 'document', 'member', etc.
  priority: OperationPriority;
  data: any;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  userId?: string;
}

export interface QueueConfig {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  backoffMultiplier?: number;
  enablePersistence?: boolean;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  byPriority: Record<OperationPriority, number>;
  byEntity: Record<string, number>;
}

type QueueEventType = 'added' | 'completed' | 'failed' | 'retrying' | 'cleared';
type QueueEventListener = (operation: QueuedOperation, eventType: QueueEventType) => void;

const DEFAULT_CONFIG: Required<QueueConfig> = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 60000,
  backoffMultiplier: 2,
  enablePersistence: true,
};

class OfflineQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private processingIds: Set<string> = new Set();
  private config: Required<QueueConfig>;
  private listeners: Set<QueueEventListener> = new Set();
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;

  constructor(config: QueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadPersistedQueue();
    this.setupNetworkListener();
  }

  /**
   * Load queue from persistent storage
   */
  private loadPersistedQueue(): void {
    if (!this.config.enablePersistence) return;

    try {
      const serialized = queueStorage.getString('queue');
      if (serialized) {
        const operations: QueuedOperation[] = JSON.parse(serialized);
        operations.forEach((op) => this.queue.set(op.id, op));
      }
    } catch {
    }
  }

  /**
   * Persist queue to storage
   */
  private persistQueue(): void {
    if (!this.config.enablePersistence) return;

    try {
      const operations = Array.from(this.queue.values());
      queueStorage.set('queue', JSON.stringify(operations));
    } catch {
    }
  }

  /**
   * Setup network state listener for auto-processing
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  /**
   * Add operation to queue
   */
  async enqueue(
    operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    const id = `${operation.entity}_${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries ?? this.config.maxRetries,
    };

    this.queue.set(id, queuedOp);
    this.persistQueue();
    this.notifyListeners(queuedOp, 'added');

    // Auto-process if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Remove operation from queue
   */
  dequeue(id: string): boolean {
    const removed = this.queue.delete(id);
    if (removed) {
      this.persistQueue();
    }
    return removed;
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): QueuedOperation | undefined {
    return this.queue.get(id);
  }

  /**
   * Get all operations, optionally filtered
   */
  getOperations(filter?: {
    entity?: string;
    priority?: OperationPriority;
    type?: OperationType;
  }): QueuedOperation[] {
    let operations = Array.from(this.queue.values());

    if (filter) {
      operations = operations.filter((op) => {
        if (filter.entity && op.entity !== filter.entity) return false;
        if (filter.priority && op.priority !== filter.priority) return false;
        if (filter.type && op.type !== filter.type) return false;
        return true;
      });
    }

    return operations;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const operations = Array.from(this.queue.values());

    const stats: QueueStats = {
      total: operations.length,
      pending: operations.filter((op) => !this.processingIds.has(op.id)).length,
      processing: this.processingIds.size,
      failed: operations.filter((op) => op.retryCount >= op.maxRetries).length,
      byPriority: {
        [OperationPriority.HIGH]: 0,
        [OperationPriority.MEDIUM]: 0,
        [OperationPriority.LOW]: 0,
      },
      byEntity: {},
    };

    operations.forEach((op) => {
      stats.byPriority[op.priority]++;
      stats.byEntity[op.entity] = (stats.byEntity[op.entity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Process queue with priority ordering
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return this.processingPromise!;
    }

    this.isProcessing = true;
    this.processingPromise = this._processQueue();

    try {
      await this.processingPromise;
    } finally {
      this.isProcessing = false;
      this.processingPromise = null;
    }
  }

  private async _processQueue(): Promise<void> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      return;
    }

    const operations = this.getSortedOperations();

    for (const operation of operations) {
      if (this.processingIds.has(operation.id)) {
        continue; // Already processing
      }

      if (operation.retryCount >= operation.maxRetries) {
        continue;
      }

      await this.processOperation(operation);
    }
  }

  /**
   * Get operations sorted by priority
   */
  private getSortedOperations(): QueuedOperation[] {
    const priorityOrder = {
      [OperationPriority.HIGH]: 0,
      [OperationPriority.MEDIUM]: 1,
      [OperationPriority.LOW]: 2,
    };

    return Array.from(this.queue.values()).sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Process single operation with retry logic
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    this.processingIds.add(operation.id);

    try {
      const response = await this.executeOperation(operation);
      this.notifyListeners(operation, 'completed');
      this.dequeue(operation.id);
    } catch (error: any) {
      operation.retryCount++;
      operation.lastError = error.message || 'Unknown error';

      if (operation.retryCount < operation.maxRetries) {
        // Schedule retry with exponential backoff
        const backoffMs = this.calculateBackoff(operation.retryCount);
        this.notifyListeners(operation, 'retrying');
        this.persistQueue();

        setTimeout(() => {
          this.processingIds.delete(operation.id);
          this.processOperation(operation);
        }, backoffMs);
      } else {
        this.notifyListeners(operation, 'failed');
        this.persistQueue();
      }
    } finally {
      this.processingIds.delete(operation.id);
    }
  }

  /**
   * Execute HTTP operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<any> {
    const { url, method, data, headers } = operation;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    const delay = Math.min(
      this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, retryCount),
      this.config.maxBackoffMs
    );

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  /**
   * Clear all operations
   */
  clear(): void {
    const operations = Array.from(this.queue.values());
    this.queue.clear();
    this.processingIds.clear();
    this.persistQueue();

    operations.forEach((op) => this.notifyListeners(op, 'cleared'));
  }

  /**
   * Clear failed operations
   */
  clearFailed(): void {
    const operations = Array.from(this.queue.values());
    const failedOps = operations.filter((op) => op.retryCount >= op.maxRetries);

    failedOps.forEach((op) => {
      this.dequeue(op.id);
      this.notifyListeners(op, 'cleared');
    });

  }

  /**
   * Add event listener
   */
  addListener(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(operation: QueuedOperation, eventType: QueueEventType): void {
    this.listeners.forEach((listener) => {
      try {
        listener(operation, eventType);
      } catch {
      }
    });
  }

  /**
   * Check if queue has pending operations
   */
  hasPendingOperations(): boolean {
    const operations = Array.from(this.queue.values());
    return operations.some((op) => op.retryCount < op.maxRetries);
  }

  /**
   * Force retry all failed operations
   */
  retryFailed(): void {
    const operations = Array.from(this.queue.values());
    const failedOps = operations.filter((op) => op.retryCount >= op.maxRetries);

    failedOps.forEach((op) => {
      op.retryCount = 0;
      op.lastError = undefined;
    });

    this.persistQueue();
    this.processQueue();
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
export default offlineQueue;

