import { conflictResolver, ConflictResolutionStrategy } from '../conflict-resolver';

// Mock dependencies
jest.mock('react-native-mmkv');

describe('ConflictResolver', () => {
  beforeEach(() => {
    conflictResolver.clearResolvedConflicts(0); // Clear all
  });

  describe('detectAndResolve', () => {
    const localData = {
      id: '1',
      title: 'Local Title',
      description: 'Local Description',
      updatedAt: 1000,
    };

    const serverData = {
      id: '1',
      title: 'Server Title',
      description: 'Server Description',
      updatedAt: 2000,
    };

    it('should return resolved when no conflict', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        localData, // Same data
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(result.resolved).toBe(true);
      expect(result.data).toEqual(localData);
    });

    it('should resolve with SERVER_WINS strategy', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.SERVER_WINS
      );

      expect(result.resolved).toBe(true);
      expect(result.data).toEqual(serverData);
    });

    it('should resolve with CLIENT_WINS strategy', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.CLIENT_WINS
      );

      expect(result.resolved).toBe(true);
      expect(result.data).toEqual(localData);
    });

    it('should resolve with LAST_WRITE_WINS strategy', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(result.resolved).toBe(true);
      expect(result.data).toEqual(serverData); // Server has newer timestamp
    });

    it('should require manual resolution with MANUAL strategy', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.MANUAL
      );

      expect(result.resolved).toBe(false);
      expect(result.requiresManualResolution).toBe(true);
      expect(result.conflict).toBeDefined();
    });

    it('should detect field conflicts', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.MANUAL
      );

      expect(result.conflict?.fieldConflicts).toBeDefined();
      expect(result.conflict?.fieldConflicts?.length).toBeGreaterThan(0);

      const titleConflict = result.conflict?.fieldConflicts?.find((fc) => fc.field === 'title');
      expect(titleConflict).toBeDefined();
      expect(titleConflict?.localValue).toBe('Local Title');
      expect(titleConflict?.serverValue).toBe('Server Title');
    });

    it('should store conflict for later resolution', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.MANUAL
      );

      const unresolved = conflictResolver.getUnresolvedConflicts('claims');
      expect(unresolved.length).toBe(1);
      expect(unresolved[0].entityId).toBe('1');
    });
  });

  describe('resolveManually', () => {
    it('should manually resolve conflict', async () => {
      const localData = { id: '1', title: 'Local', updatedAt: 1000 };
      const serverData = { id: '1', title: 'Server', updatedAt: 2000 };

      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.MANUAL
      );

      expect(result.conflict).toBeDefined();

      const resolved = await conflictResolver.resolveManually(result.conflict!.id, {
        id: '1',
        title: 'Manually Resolved',
        updatedAt: 3000,
      });

      expect(resolved).toBe(true);

      const conflict = conflictResolver.getConflict(result.conflict!.id);
      expect(conflict?.resolved).toBe(true);
      expect(conflict?.resolution?.title).toBe('Manually Resolved');
    });

    it('should return false for non-existent conflict', async () => {
      const resolved = await conflictResolver.resolveManually('non-existent', {});
      expect(resolved).toBe(false);
    });
  });

  describe('getUnresolvedConflicts', () => {
    it('should return unresolved conflicts', async () => {
      const localData = { id: '1', title: 'Local', updatedAt: 1000 };
      const serverData = { id: '1', title: 'Server', updatedAt: 2000 };

      await conflictResolver.detectAndResolve(
        'claims',
        '1',
        localData,
        serverData,
        ConflictResolutionStrategy.MANUAL
      );

      const unresolved = conflictResolver.getUnresolvedConflicts();
      expect(unresolved.length).toBe(1);
      expect(unresolved[0].resolved).toBe(false);
    });

    it('should filter by entity', async () => {
      await conflictResolver.detectAndResolve(
        'claims',
        '1',
        { id: '1', title: 'Local', updatedAt: 1000 },
        { id: '1', title: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.MANUAL
      );

      await conflictResolver.detectAndResolve(
        'documents',
        '2',
        { id: '2', name: 'Local', updatedAt: 1000 },
        { id: '2', name: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.MANUAL
      );

      const claimConflicts = conflictResolver.getUnresolvedConflicts('claims');
      expect(claimConflicts.length).toBe(1);
      expect(claimConflicts[0].entity).toBe('claims');
    });
  });

  describe('getStats', () => {
    it('should return conflict statistics', async () => {
      await conflictResolver.detectAndResolve(
        'claims',
        '1',
        { id: '1', title: 'Local', updatedAt: 1000 },
        { id: '1', title: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.MANUAL
      );

      const stats = conflictResolver.getStats();
      expect(stats.total).toBe(1);
      expect(stats.unresolved).toBe(1);
      expect(stats.resolved).toBe(0);
      expect(stats.byEntity.claims).toBe(1);
    });
  });

  describe('listeners', () => {
    it('should notify listeners of new conflicts', async () => {
      const listener = jest.fn();
      conflictResolver.addListener(listener);

      await conflictResolver.detectAndResolve(
        'claims',
        '1',
        { id: '1', title: 'Local', updatedAt: 1000 },
        { id: '1', title: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.MANUAL
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'claims',
          entityId: '1',
        })
      );
    });

    it('should remove listener', async () => {
      const listener = jest.fn();
      const unsubscribe = conflictResolver.addListener(listener);
      unsubscribe();

      await conflictResolver.detectAndResolve(
        'claims',
        '1',
        { id: '1', title: 'Local', updatedAt: 1000 },
        { id: '1', title: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.MANUAL
      );

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearResolvedConflicts', () => {
    it('should clear old resolved conflicts', async () => {
      const result = await conflictResolver.detectAndResolve(
        'claims',
        '1',
        { id: '1', title: 'Local', updatedAt: 1000 },
        { id: '1', title: 'Server', updatedAt: 2000 },
        ConflictResolutionStrategy.SERVER_WINS
      );

      // Manually set resolved time to past
      const conflict = conflictResolver.getConflict(result.conflict?.id || '');
      if (conflict) {
        conflict.resolvedAt = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      }

      conflictResolver.clearResolvedConflicts(7); // Clear older than 7 days

      const stats = conflictResolver.getStats();
      expect(stats.total).toBe(0);
    });
  });
});

