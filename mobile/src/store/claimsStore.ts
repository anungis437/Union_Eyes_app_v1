/**
 * Claims Zustand Store
 * State management for claims with filters, sort, and UI state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import {
  Claim,
  ClaimListItem,
  ClaimFilters,
  ClaimSortOption,
  ClaimStatus,
  ClaimType,
  ClaimPriority,
} from '@/types/claims';
import { DraftClaim } from '@/services/claims';

// Create MMKV instance for persistence
const claimsStorage = new MMKV({ id: 'claims-store' });

// Create Zustand storage adapter
const zustandStorage = {
  getItem: (name: string) => {
    const value = claimsStorage.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: any) => {
    claimsStorage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    claimsStorage.delete(name);
  },
};

interface ClaimsState {
  // Current selection
  selectedClaimId: string | null;
  activeClaim: Claim | null;

  // Drafts
  drafts: DraftClaim[];
  activeDraftId: string | null;

  // Filters & Sort
  filters: ClaimFilters;
  sort: ClaimSortOption;
  searchQuery: string;

  // UI State
  isFilterSheetOpen: boolean;
  selectedStatuses: ClaimStatus[];
  selectedTypes: ClaimType[];
  selectedPriorities: ClaimPriority[];
  dateRange: {
    from?: Date;
    to?: Date;
  };

  // List state
  currentPage: number;
  pageSize: number;
  hasLoadedInitial: boolean;

  // Actions - Selection
  setSelectedClaimId: (id: string | null) => void;
  setActiveClaim: (claim: Claim | null) => void;

  // Actions - Drafts
  setDrafts: (drafts: DraftClaim[]) => void;
  addDraft: (draft: DraftClaim) => void;
  updateDraft: (localId: string, data: Partial<DraftClaim>) => void;
  removeDraft: (localId: string) => void;
  setActiveDraftId: (id: string | null) => void;

  // Actions - Filters
  setFilters: (filters: ClaimFilters) => void;
  updateFilters: (filters: Partial<ClaimFilters>) => void;
  clearFilters: () => void;

  // Actions - Sort
  setSort: (sort: ClaimSortOption) => void;

  // Actions - Search
  setSearchQuery: (query: string) => void;

  // Actions - UI
  setFilterSheetOpen: (isOpen: boolean) => void;
  toggleStatus: (status: ClaimStatus) => void;
  toggleType: (type: ClaimType) => void;
  togglePriority: (priority: ClaimPriority) => void;
  setDateRange: (from?: Date, to?: Date) => void;

  // Actions - Pagination
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Actions - State
  reset: () => void;
  setHasLoadedInitial: (loaded: boolean) => void;
}

const defaultFilters: ClaimFilters = {
  status: [],
  type: [],
  priority: [],
  search: '',
  assignedToMe: false,
  submittedByMe: false,
  hasDrafts: false,
};

const defaultSort: ClaimSortOption = {
  field: 'updatedAt',
  direction: 'desc',
};

export const useClaimsStore = create<ClaimsState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedClaimId: null,
      activeClaim: null,
      drafts: [],
      activeDraftId: null,
      filters: defaultFilters,
      sort: defaultSort,
      searchQuery: '',
      isFilterSheetOpen: false,
      selectedStatuses: [],
      selectedTypes: [],
      selectedPriorities: [],
      dateRange: {},
      currentPage: 1,
      pageSize: 20,
      hasLoadedInitial: false,

      // Selection actions
      setSelectedClaimId: (id) => set({ selectedClaimId: id }),

      setActiveClaim: (claim) =>
        set({
          activeClaim: claim,
          selectedClaimId: claim?.id || null,
        }),

      // Draft actions
      setDrafts: (drafts) => set({ drafts }),

      addDraft: (draft) =>
        set((state) => ({
          drafts: [...state.drafts, draft],
        })),

      updateDraft: (localId, data) =>
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.localId === localId ? { ...draft, ...data, updatedAt: new Date() } : draft
          ),
        })),

      removeDraft: (localId) =>
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.localId !== localId),
          activeDraftId: state.activeDraftId === localId ? null : state.activeDraftId,
        })),

      setActiveDraftId: (id) => set({ activeDraftId: id }),

      // Filter actions
      setFilters: (filters) =>
        set({
          filters,
          currentPage: 1, // Reset pagination
        }),

      updateFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1,
        })),

      clearFilters: () =>
        set({
          filters: defaultFilters,
          selectedStatuses: [],
          selectedTypes: [],
          selectedPriorities: [],
          dateRange: {},
          searchQuery: '',
          currentPage: 1,
        }),

      // Sort actions
      setSort: (sort) =>
        set({
          sort,
          currentPage: 1,
        }),

      // Search actions
      setSearchQuery: (query) =>
        set({
          searchQuery: query,
          currentPage: 1,
        }),

      // UI actions
      setFilterSheetOpen: (isOpen) => set({ isFilterSheetOpen: isOpen }),

      toggleStatus: (status) =>
        set((state) => {
          const statuses = state.selectedStatuses.includes(status)
            ? state.selectedStatuses.filter((s) => s !== status)
            : [...state.selectedStatuses, status];

          return {
            selectedStatuses: statuses,
            filters: { ...state.filters, status: statuses },
            currentPage: 1,
          };
        }),

      toggleType: (type) =>
        set((state) => {
          const types = state.selectedTypes.includes(type)
            ? state.selectedTypes.filter((t) => t !== type)
            : [...state.selectedTypes, type];

          return {
            selectedTypes: types,
            filters: { ...state.filters, type: types },
            currentPage: 1,
          };
        }),

      togglePriority: (priority) =>
        set((state) => {
          const priorities = state.selectedPriorities.includes(priority)
            ? state.selectedPriorities.filter((p) => p !== priority)
            : [...state.selectedPriorities, priority];

          return {
            selectedPriorities: priorities,
            filters: { ...state.filters, priority: priorities },
            currentPage: 1,
          };
        }),

      setDateRange: (from, to) =>
        set((state) => ({
          dateRange: { from, to },
          filters: { ...state.filters, dateFrom: from, dateTo: to },
          currentPage: 1,
        })),

      // Pagination actions
      setCurrentPage: (page) => set({ currentPage: page }),

      nextPage: () =>
        set((state) => ({
          currentPage: state.currentPage + 1,
        })),

      previousPage: () =>
        set((state) => ({
          currentPage: Math.max(1, state.currentPage - 1),
        })),

      setPageSize: (size) =>
        set({
          pageSize: size,
          currentPage: 1,
        }),

      // State actions
      setHasLoadedInitial: (loaded) => set({ hasLoadedInitial: loaded }),

      reset: () =>
        set({
          selectedClaimId: null,
          activeClaim: null,
          filters: defaultFilters,
          sort: defaultSort,
          searchQuery: '',
          isFilterSheetOpen: false,
          selectedStatuses: [],
          selectedTypes: [],
          selectedPriorities: [],
          dateRange: {},
          currentPage: 1,
        }),
    }),
    {
      name: 'claims-store',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist certain fields
      partialize: (state) => ({
        filters: state.filters,
        sort: state.sort,
        pageSize: state.pageSize,
        selectedStatuses: state.selectedStatuses,
        selectedTypes: state.selectedTypes,
        selectedPriorities: state.selectedPriorities,
      }),
    }
  )
);

// Selectors (for better performance with React components)
export const useActiveFiltersCount = () =>
  useClaimsStore((state) => {
    let count = 0;
    if (state.selectedStatuses.length > 0) count++;
    if (state.selectedTypes.length > 0) count++;
    if (state.selectedPriorities.length > 0) count++;
    if (state.dateRange.from || state.dateRange.to) count++;
    if (state.searchQuery) count++;
    return count;
  });

export const useHasActiveFilters = () =>
  useClaimsStore(
    (state) =>
      state.selectedStatuses.length > 0 ||
      state.selectedTypes.length > 0 ||
      state.selectedPriorities.length > 0 ||
      !!state.dateRange.from ||
      !!state.dateRange.to ||
      !!state.searchQuery
  );

export const useDraftCount = () => useClaimsStore((state) => state.drafts.length);
