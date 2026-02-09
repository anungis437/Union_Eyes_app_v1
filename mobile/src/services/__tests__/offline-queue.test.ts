import { offlineQueue, OperationPriority, OperationType } from '../offline-queue';

// Mock dependencies
jest.mock('react-native-mmkv');
jest.mock('@react-native-community/netinfo');

describe('OfflineQueue', () => {
  beforeEach(() => {
    offlineQueue.clear();
  });

  describe('enqueue', () => {
    it('should add operation to queue', async () => {
      const operation = {
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: { id: '1', title: 'Test Claim' },
        url: 'https://api.example.com/claims',
        method: 'POST' as const,
        maxRetries: 3,
      };

      const id = await offlineQueue.enqueue(operation);

      expect(id).toBeDefined();
      expect(id).toContain('claims_create_');

      const added = offlineQueue.getOperation(id);
      expect(added).toBeDefined();
      expect(added?.entity).toBe('claims');
      expect(added?.priority).toBe(OperationPriority.HIGH);
    });

    it('should assign correct priority', async () => {
      const highPriority = await offlineQueue.enqueue({
        type: OperationType.UPDATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: { id: '1' },
        url: 'https://api.example.com/claims/1',
        method: 'PUT',
        maxRetries: 3,
      });

      const lowPriority = await offlineQueue.enqueue({
        type: OperationType.UPDATE,
        entity: 'documents',
        priority: OperationPriority.LOW,
        data: { id: '2' },
        url: 'https://api.example.com/documents/2',
        method: 'PUT',
        maxRetries: 3,
      });

      const highOp = offlineQueue.getOperation(highPriority);
      const lowOp = offlineQueue.getOperation(lowPriority);

      expect(highOp?.priority).toBe(OperationPriority.HIGH);
      expect(lowOp?.priority).toBe(OperationPriority.LOW);
    });
  });

  describe('dequeue', () => {
    it('should remove operation from queue', async () => {
      const id = await offlineQueue.enqueue({
        type: OperationType.DELETE,
        entity: 'claims',
        priority: OperationPriority.MEDIUM,
        data: { id: '1' },
        url: 'https://api.example.com/claims/1',
        method: 'DELETE',
        maxRetries: 3,
      });

      expect(offlineQueue.getOperation(id)).toBeDefined();

      const removed = offlineQueue.dequeue(id);
      expect(removed).toBe(true);
      expect(offlineQueue.getOperation(id)).toBeUndefined();
    });

    it('should return false for non-existent operation', () => {
      const removed = offlineQueue.dequeue('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('getOperations', () => {
    beforeEach(async () => {
      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: { id: '1' },
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      await offlineQueue.enqueue({
        type: OperationType.UPDATE,
        entity: 'documents',
        priority: OperationPriority.MEDIUM,
        data: { id: '2' },
        url: 'https://api.example.com/documents/2',
        method: 'PUT',
        maxRetries: 3,
      });

      await offlineQueue.enqueue({
        type: OperationType.DELETE,
        entity: 'claims',
        priority: OperationPriority.LOW,
        data: { id: '3' },
        url: 'https://api.example.com/claims/3',
        method: 'DELETE',
        maxRetries: 3,
      });
    });

    it('should return all operations', () => {
      const operations = offlineQueue.getOperations();
      expect(operations).toHaveLength(3);
    });

    it('should filter by entity', () => {
      const claimOps = offlineQueue.getOperations({ entity: 'claims' });
      expect(claimOps).toHaveLength(2);
      expect(claimOps.every((op) => op.entity === 'claims')).toBe(true);
    });

    it('should filter by priority', () => {
      const highPriorityOps = offlineQueue.getOperations({ priority: OperationPriority.HIGH });
      expect(highPriorityOps).toHaveLength(1);
      expect(highPriorityOps[0].priority).toBe(OperationPriority.HIGH);
    });

    it('should filter by type', () => {
      const createOps = offlineQueue.getOperations({ type: OperationType.CREATE });
      expect(createOps).toHaveLength(1);
      expect(createOps[0].type).toBe(OperationType.CREATE);
    });

    it('should filter by multiple criteria', () => {
      const filteredOps = offlineQueue.getOperations({
        entity: 'claims',
        priority: OperationPriority.HIGH,
      });
      expect(filteredOps).toHaveLength(1);
      expect(filteredOps[0].entity).toBe('claims');
      expect(filteredOps[0].priority).toBe(OperationPriority.HIGH);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: {},
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      await offlineQueue.enqueue({
        type: OperationType.UPDATE,
        entity: 'documents',
        priority: OperationPriority.MEDIUM,
        data: {},
        url: 'https://api.example.com/documents/1',
        method: 'PUT',
        maxRetries: 3,
      });
    });

    it('should return correct statistics', () => {
      const stats = offlineQueue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.byPriority[OperationPriority.HIGH]).toBe(1);
      expect(stats.byPriority[OperationPriority.MEDIUM]).toBe(1);
      expect(stats.byEntity.claims).toBe(1);
      expect(stats.byEntity.documents).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all operations', async () => {
      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: {},
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      expect(offlineQueue.getStats().total).toBe(1);

      offlineQueue.clear();

      expect(offlineQueue.getStats().total).toBe(0);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on enqueue', async () => {
      const listener = jest.fn();
      offlineQueue.addListener(listener);

      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: {},
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'claims',
          type: OperationType.CREATE,
        }),
        'added'
      );
    });

    it('should remove listener', async () => {
      const listener = jest.fn();
      const unsubscribe = offlineQueue.addListener(listener);

      unsubscribe();

      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: {},
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('hasPendingOperations', () => {
    it('should return true when has pending operations', async () => {
      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claims',
        priority: OperationPriority.HIGH,
        data: {},
        url: 'https://api.example.com/claims',
        method: 'POST',
        maxRetries: 3,
      });

      expect(offlineQueue.hasPendingOperations()).toBe(true);
    });

    it('should return false when no pending operations', () => {
      offlineQueue.clear();
      expect(offlineQueue.hasPendingOperations()).toBe(false);
    });
  });
});
