import NetInfo from '@react-native-community/netinfo';
import { apiService } from './api';
import { storage, fastStorage, STORAGE_KEYS } from './storage';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'claim' | 'document' | 'profile';
  data: any;
  timestamp: number;
  retries: number;
}

class SyncService {
  private syncInProgress = false;
  private maxRetries = 3;

  async initialize() {
    // Listen for network changes
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncData();
      }
    });

    // Check if we need to sync on startup
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (isConnected) {
      this.syncData();
    }
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) {
    const queue = await this.getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newItem);
    await storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return (await storage.getItem<SyncQueueItem[]>(STORAGE_KEYS.OFFLINE_QUEUE)) || [];
  }

  async syncData(): Promise<void> {
    if (this.syncInProgress) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('No internet connection, skipping sync');
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getSyncQueue();
      const failedItems: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          await this.processSyncItem(item);
        } catch (error) {
          console.error('Sync item failed:', item, error);
          if (item.retries < this.maxRetries) {
            failedItems.push({ ...item, retries: item.retries + 1 });
          }
        }
      }

      // Update queue with only failed items
      await storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, failedItems);

      // Update last sync timestamp
      fastStorage.setNumber(STORAGE_KEYS.LAST_SYNC, Date.now());

      // Sync down latest data
      await this.syncDownData();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    switch (item.resource) {
      case 'claim':
        await this.syncClaim(item);
        break;
      case 'document':
        await this.syncDocument(item);
        break;
      case 'profile':
        await this.syncProfile(item);
        break;
    }
  }

  private async syncClaim(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'create':
        await apiService.createClaim(item.data);
        break;
      case 'update':
        await apiService.updateClaim(item.data.id, item.data);
        break;
      // Add delete case if needed
    }
  }

  private async syncDocument(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'create':
        await apiService.uploadDocument(item.data);
        break;
      case 'delete':
        await apiService.deleteDocument(item.data.id);
        break;
    }
  }

  private async syncProfile(item: SyncQueueItem): Promise<void> {
    if (item.type === 'update') {
      await apiService.updateProfile(item.data);
    }
  }

  private async syncDownData(): Promise<void> {
    try {
      // Fetch and cache latest claims
      const claims = await apiService.getClaims({ limit: 50 });
      await storage.setItem(STORAGE_KEYS.CLAIMS_CACHE, claims);

      // Fetch and cache latest documents
      const documents = await apiService.getDocuments({ limit: 50 });
      await storage.setItem(STORAGE_KEYS.DOCUMENTS_CACHE, documents);

      // Fetch and cache profile
      const profile = await apiService.getProfile();
      await storage.setItem(STORAGE_KEYS.USER_DATA, profile);
    } catch (error) {
      console.error('Error syncing down data:', error);
    }
  }

  async getLastSyncTime(): Promise<number | null> {
    return fastStorage.getNumber(STORAGE_KEYS.LAST_SYNC) || null;
  }

  async forceSyncNow(): Promise<void> {
    await this.syncData();
  }
}

export const syncService = new SyncService();
export default syncService;
