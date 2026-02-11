/**
 * Claims Hooks with React Query + Offline Support
 * Comprehensive hooks for all claims-related operations
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { claimsService } from '@services/claims';
import { useClaimsStore } from '@/store/claimsStore';
import NetInfo from '@react-native-community/netinfo';
import { ClaimFormData, ClaimActionRequest, ClaimFilters, ClaimSortOption } from '@/types/claims';

// ==================== List Hooks ====================

/**
 * Get paginated claims list with filters
 */
export function useClaimsList(enabled = true) {
  const { filters, sort, currentPage, pageSize } = useClaimsStore();

  return useQuery({
    queryKey: ['claims', 'list', filters, sort, currentPage, pageSize],
    queryFn: () =>
      claimsService.getClaims({
        page: currentPage,
        pageSize,
        filters,
        sort,
      }),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Infinite scroll hook for claims list
 */
export function useClaimsInfinite() {
  const { filters, sort, pageSize } = useClaimsStore();

  return useInfiniteQuery({
    queryKey: ['claims', 'infinite', filters, sort],
    queryFn: ({ pageParam = 1 }) =>
      claimsService.getClaims({
        page: pageParam,
        pageSize,
        filters,
        sort,
      }),
    getNextPageParam: (lastPage) => {
      if (Array.isArray(lastPage)) return undefined;
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Search claims with debounce
 */
export function useClaimsSearch(
  query: string,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  }
) {
  const { enabled = true, debounceMs = 300 } = options || {};

  return useQuery({
    queryKey: ['claims', 'search', query],
    queryFn: () => claimsService.searchClaims(query),
    enabled: enabled && query.length >= 2,
    staleTime: 1 * 60 * 1000,
  });
}

// ==================== Detail Hooks ====================

/**
 * Get claim details by ID
 */
export function useClaimDetails(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['claim', id],
    queryFn: () => claimsService.getClaimById(id!),
    enabled: !!id && enabled,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get claim comments
 */
export function useClaimComments(claimId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['claim', claimId, 'comments'],
    queryFn: () => claimsService.getClaimComments(claimId!),
    enabled: !!claimId && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get claim documents
 */
export function useClaimDocuments(claimId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['claim', claimId, 'documents'],
    queryFn: async () => {
      const claim = await claimsService.getClaimById(claimId!);
      return claim?.documents || [];
    },
    enabled: !!claimId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Mutation Hooks ====================

/**
 * Create a new claim
 */
export function useCreateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClaimFormData) => {
      return await claimsService.createClaim(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'stats'] });
    },
  });
}

/**
 * Update an existing claim
 */
export function useUpdateClaim(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ClaimFormData>) => {
      return await claimsService.updateClaim(id, data);
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['claim', id] });

      // Snapshot the previous value
      const previousClaim = queryClient.getQueryData(['claim', id]);

      // Optimistically update
      queryClient.setQueryData(['claim', id], (old: any) => ({
        ...old,
        ...newData,
      }));

      return { previousClaim };
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousClaim) {
        queryClient.setQueryData(['claim', id], context.previousClaim);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'infinite'] });
    },
  });
}

/**
 * Delete a claim
 */
export function useDeleteClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await claimsService.deleteClaim(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'stats'] });
    },
  });
}

/**
 * Perform action on claim (submit, approve, reject, etc.)
 */
export function useClaimAction(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: ClaimActionRequest) => {
      return await claimsService.performClaimAction(id, action);
    },
    onSuccess: (updatedClaim) => {
      queryClient.setQueryData(['claim', id], updatedClaim);
      queryClient.invalidateQueries({ queryKey: ['claims', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'stats'] });
    },
  });
}

// ==================== Comment Hooks ====================

/**
 * Add a comment to a claim
 */
export function useAddClaimComment(claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions?: string[] }) => {
      return await claimsService.addClaimComment(claimId, content, mentions);
    },
    onMutate: async (newComment) => {
      await queryClient.cancelQueries({ queryKey: ['claim', claimId, 'comments'] });

      const previousComments = queryClient.getQueryData(['claim', claimId, 'comments']);

      // Optimistically update
      queryClient.setQueryData(['claim', claimId, 'comments'], (old: any) => ({
        ...old,
        items: [
          ...(old?.items || []),
          {
            id: `temp-${Date.now()}`,
            content: newComment.content,
            author: { id: 'current', name: 'You' },
            createdAt: new Date(),
            isEdited: false,
            isPending: true,
          },
        ],
      }));

      return { previousComments };
    },
    onError: (_err, _newComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['claim', claimId, 'comments'], context.previousComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateClaimComment(claimId: string, commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return await claimsService.updateClaimComment(claimId, commentId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId, 'comments'] });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteClaimComment(claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await claimsService.deleteClaimComment(claimId, commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    },
  });
}

// ==================== Document Hooks ====================

/**
 * Upload documents to a claim
 */
export function useUploadClaimDocuments(claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: any[]) => {
      return await claimsService.uploadDocuments(claimId, files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteClaimDocument(claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      await claimsService.deleteDocument(claimId, documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    },
  });
}

// ==================== Draft Hooks ====================

/**
 * Get all drafts
 */
export function useDrafts() {
  return useQuery({
    queryKey: ['claims', 'drafts'],
    queryFn: () => claimsService.getDrafts(),
    staleTime: 0, // Always fresh
  });
}

/**
 * Save draft mutation
 */
export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: any) => {
      return await claimsService.saveDraft(draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'drafts'] });
    },
  });
}

/**
 * Delete draft mutation
 */
export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localId: string) => {
      await claimsService.deleteDraft(localId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'drafts'] });
    },
  });
}

// ==================== Stats Hooks ====================

/**
 * Get claim statistics
 */
export function useClaimStats() {
  return useQuery({
    queryKey: ['claims', 'stats'],
    queryFn: () => claimsService.getClaimStats(),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Sync Hooks ====================

/**
 * Get sync status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ['claims', 'sync', 'status'],
    queryFn: () => claimsService.getSyncStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

/**
 * Manually trigger sync
 */
export function useSyncClaims() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await claimsService.syncPendingClaims();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
}

// ==================== Network Status ====================

/**
 * Get network connection status
 */
export function useNetworkStatus() {
  return useQuery({
    queryKey: ['network', 'status'],
    queryFn: async () => {
      const netInfo = await NetInfo.fetch();
      return {
        isConnected: netInfo.isConnected,
        type: netInfo.type,
      };
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

