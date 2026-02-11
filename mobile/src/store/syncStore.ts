import { create } from 'zustand';

interface SyncStore {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  setIsSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  incrementPendingChanges: () => void;
  decrementPendingChanges: () => void;
  resetPendingChanges: () => void;
  startSync: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: 0,

  setIsSyncing: (isSyncing) => set({ isSyncing }),

  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  incrementPendingChanges: () => set((state) => ({ pendingChanges: state.pendingChanges + 1 })),

  decrementPendingChanges: () =>
    set((state) => ({ pendingChanges: Math.max(0, state.pendingChanges - 1) })),

  resetPendingChanges: () => set({ pendingChanges: 0 }),

  startSync: async () => {
    set({ isSyncing: true });
    try {
      // Implement actual sync logic here
      await new Promise((resolve) => setTimeout(resolve, 2000));
      set({ lastSyncTime: new Date(), pendingChanges: 0 });
    } catch {
    } finally {
      set({ isSyncing: false });
    }
  },
}));

