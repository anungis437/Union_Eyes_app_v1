import { localDB } from '../local-db';

// Mock dependencies
jest.mock('react-native-mmkv');
jest.mock('@react-native-async-storage/async-storage');

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('LocalDatabase', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('save and find', () => {
    it('should save and retrieve entity', async () => {
      const claim = {
        id: '1',
        title: 'Test Claim',
        description: 'Test Description',
        status: 'pending' as const,
      };

      await localDB.save('claims', claim);

      const retrieved = await localDB.find('claims', '1');
      expect(retrieved).toBeDefined();
      expect((retrieved as any).id).toBe('1');
      expect((retrieved as any).title).toBe('Test Claim');
    });

    it('should include metadata with saved entity', async () => {
      const claim = { id: '1', title: 'Test' };
      await localDB.save('claims', claim);

      const retrieved = await localDB.find('claims', '1');
      expect((retrieved as any)._metadata).toBeDefined();
      expect((retrieved as any)._metadata.id).toBe('1');
      expect((retrieved as any)._metadata.entity).toBe('claims');
      expect((retrieved as any)._metadata.version).toBe(1);
    });

    it('should increment version on update', async () => {
      const claim = { id: '1', title: 'Test' };

      await localDB.save('claims', claim);
      let retrieved = await localDB.find('claims', '1');
      expect((retrieved as any)._metadata.version).toBe(1);

      await localDB.save('claims', { ...claim, title: 'Updated' });
      retrieved = await localDB.find('claims', '1');
      expect((retrieved as any)._metadata.version).toBe(2);
    });

    it('should return null for non-existent entity', async () => {
      const retrieved = await localDB.find('claims', 'non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('saveMany', () => {
    it('should save multiple entities', async () => {
      const claims = [
        { id: '1', title: 'Claim 1' },
        { id: '2', title: 'Claim 2' },
        { id: '3', title: 'Claim 3' },
      ];

      await localDB.saveMany('claims', claims);

      const claim1 = await localDB.find('claims', '1');
      const claim2 = await localDB.find('claims', '2');
      const claim3 = await localDB.find('claims', '3');

      expect(claim1).toBeDefined();
      expect(claim2).toBeDefined();
      expect(claim3).toBeDefined();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await localDB.saveMany('claims', [
        { id: '1', title: 'Claim 1', status: 'pending' },
        { id: '2', title: 'Claim 2', status: 'approved' },
        { id: '3', title: 'Claim 3', status: 'pending' },
      ]);
    });

    it('should retrieve all entities', async () => {
      const claims = await localDB.findAll('claims');
      expect(claims.length).toBe(3);
    });

    it('should filter with where clause', async () => {
      const pending = await localDB.findAll('claims', {
        where: { status: 'pending' },
      });

      expect(pending.length).toBe(2);
      expect(pending.every((c: any) => c.status === 'pending')).toBe(true);
    });

    it('should sort results', async () => {
      const sorted = await localDB.findAll('claims', {
        orderBy: { field: 'title', direction: 'desc' },
      });

      expect((sorted[0] as any).title).toBe('Claim 3');
      expect((sorted[2] as any).title).toBe('Claim 1');
    });

    it('should paginate results', async () => {
      const page1 = await localDB.findAll('claims', {
        limit: 2,
        offset: 0,
      });

      const page2 = await localDB.findAll('claims', {
        limit: 2,
        offset: 2,
      });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await localDB.saveMany('claims', [
        { id: '1', title: 'Claim 1', status: 'pending', amount: 100 },
        { id: '2', title: 'Claim 2', status: 'approved', amount: 200 },
        { id: '3', title: 'Claim 3', status: 'pending', amount: 300 },
      ]);
    });

    it('should query with complex filters', async () => {
      const results = await localDB.query('claims', {
        where: { status: 'pending' },
        orderBy: { field: 'amount', direction: 'desc' },
        limit: 1,
      });

      expect(results.length).toBe(1);
      expect((results[0] as any).id).toBe('3');
      expect((results[0] as any).amount).toBe(300);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await localDB.saveMany('claims', [
        { id: '1', status: 'pending' },
        { id: '2', status: 'approved' },
        { id: '3', status: 'pending' },
      ]);
    });

    it('should count all entities', async () => {
      const count = await localDB.count('claims');
      expect(count).toBe(3);
    });

    it('should count with filter', async () => {
      const count = await localDB.count('claims', { status: 'pending' });
      expect(count).toBe(2);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await localDB.save('claims', { id: '1', title: 'Test' });
    });

    it('should soft delete by default', async () => {
      await localDB.delete('claims', '1');

      const deleted = await localDB.find('claims', '1');
      expect(deleted).toBeNull();
    });

    it('should hard delete when specified', async () => {
      await localDB.delete('claims', '1', true);

      const deleted = await localDB.find('claims', '1');
      expect(deleted).toBeNull();
    });
  });

  describe('deleteMany', () => {
    beforeEach(async () => {
      await localDB.saveMany('claims', [
        { id: '1', title: 'Claim 1' },
        { id: '2', title: 'Claim 2' },
        { id: '3', title: 'Claim 3' },
      ]);
    });

    it('should delete multiple entities', async () => {
      const deleted = await localDB.deleteMany('claims', ['1', '2']);
      expect(deleted).toBe(2);

      const remaining = await localDB.findAll('claims');
      expect(remaining.length).toBe(1);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await localDB.saveMany('claims', [
        { id: '1', title: 'Claim 1' },
        { id: '2', title: 'Claim 2' },
      ]);
    });

    it('should clear all entities of type', async () => {
      await localDB.clear('claims');

      const claims = await localDB.findAll('claims');
      expect(claims.length).toBe(0);
    });
  });

  describe('transaction', () => {
    it('should execute multiple operations atomically', async () => {
      await localDB.transaction([
        { type: 'save', entity: 'claims', data: { id: '1', title: 'Claim 1' } },
        { type: 'save', entity: 'claims', data: { id: '2', title: 'Claim 2' } },
        { type: 'save', entity: 'documents', data: { id: 'd1', name: 'Doc 1' } },
      ]);

      const claims = await localDB.findAll('claims');
      const documents = await localDB.findAll('documents');

      expect(claims.length).toBe(2);
      expect(documents.length).toBe(1);
    });
  });

  describe('simple key-value operations', () => {
    it('should set and get simple values', () => {
      localDB.setSimple('test_key', 'test_value');
      const value = localDB.getSimple('test_key');
      expect(value).toBe('test_value');
    });

    it('should handle numbers', () => {
      localDB.setSimple('number_key', 42);
      const value = localDB.getSimple('number_key');
      expect(value).toBe(42);
    });

    it('should handle booleans', () => {
      localDB.setSimple('bool_key', true);
      const value = localDB.getSimple('bool_key');
      expect(value).toBe(true);
    });

    it('should delete simple values', () => {
      localDB.setSimple('test_key', 'test_value');
      localDB.deleteSimple('test_key');
      const value = localDB.getSimple('test_key');
      expect(value).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return database statistics', async () => {
      await localDB.saveMany('claims', [
        { id: '1', title: 'Claim 1' },
        { id: '2', title: 'Claim 2' },
      ]);

      await localDB.save('documents', { id: 'd1', name: 'Doc 1' });

      const stats = await localDB.getStats();
      expect(stats.entities.claims).toBe(2);
      expect(stats.entities.documents).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
});
