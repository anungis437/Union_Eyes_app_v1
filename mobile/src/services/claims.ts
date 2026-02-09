/**
 * Comprehensive Claims Service
 * Handles CRUD operations, offline queue, drafts, and sync
 */

import { claimsApi } from '@/api/claims';
import { offlineQueue, OperationType, OperationPriority } from './offline-queue';
import { localDB } from './local-db';
import { storage, STORAGE_KEYS } from './storage';
import NetInfo from '@react-native-community/netinfo';
import {
  Claim,
  ClaimListItem,
  ClaimFormData,
  ClaimFilters,
  ClaimSortOption,
  ClaimComment,
  ClaimDocument,
  AddCommentRequest,
  ClaimActionRequest,
  CreateClaimRequest,
  UpdateClaimRequest,
} from '@/types/claims';
import { v4 as uuidv4 } from 'uuid';

const DRAFT_AUTOSAVE_INTERVAL = 30000; // 30 seconds
const DRAFTS_STORAGE_KEY = 'claims_drafts';

export interface DraftClaim extends ClaimFormData {
  localId: string;
  createdAt: Date;
  updatedAt: Date;
  autoSaved?: boolean;
}

class ClaimsService {
  private autosaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private drafts: Map<string, DraftClaim> = new Map();

  constructor() {
    this.loadDrafts();
  }

  // ==================== CRUD Operations ====================

  /**
   * Get paginated list of claims
   */
  async getClaims(params?: {
    page?: number;
    pageSize?: number;
    filters?: ClaimFilters;
    sort?: ClaimSortOption;
  }) {
    try {
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        // Return cached claims from local DB (without filters in offline mode)
        return await localDB.findAll<Claim>('claims');
      }

      const response = await claimsApi.getClaims(params);

      // Cache claims locally
      await localDB.saveMany('claims', response.items);

      return response;
    } catch (error) {
      console.error('Failed to get claims:', error);
      // Fallback to local DB (without filters in offline mode)
      return await localDB.findAll<Claim>('claims');
    }
  }

  /**
   * Get claim by ID
   */
  async getClaimById(id: string): Promise<Claim | null> {
    try {
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        return await localDB.find<Claim>('claims', id);
      }

      const claim = await claimsApi.getClaimById(id);

      // Cache claim locally
      await localDB.save('claims', claim);

      return claim;
    } catch (error) {
      console.error(`Failed to get claim ${id}:`, error);
      return await localDB.find<Claim>('claims', id);
    }
  }

  /**
   * Create a new claim
   */
  async createClaim(data: ClaimFormData, isDraft = false): Promise<Claim | DraftClaim> {
    const netInfo = await NetInfo.fetch();

    if (isDraft) {
      // Save as draft locally
      const draft = await this.saveDraft({
        ...data,
        localId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return draft as any;
    }

    // Prepare request data
    const requestData: CreateClaimRequest = {
      type: data.type,
      title: data.title,
      description: data.description,
      incidentDate: data.incidentDate?.toISOString(),
      incidentTime: data.incidentTime,
      incidentLocation: data.incidentLocation,
      amount: data.amount,
      priority: data.priority,
      witnesses: data.witnesses,
      isDraft: false,
    };

    if (!netInfo.isConnected) {
      // Queue for later sync
      const localId = uuidv4();
      const pendingClaim: any = {
        ...requestData,
        localId,
        id: localId,
        isPending: true,
        createdAt: new Date(),
      };

      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'claim',
        priority: OperationPriority.HIGH,
        data: requestData,
        url: '/claims',
        method: 'POST',
        maxRetries: 3,
      });

      await localDB.save('claims', pendingClaim);
      return pendingClaim;
    }

    try {
      const claim = await claimsApi.createClaim(requestData);
      await localDB.save('claims', claim);

      // Handle document uploads if any
      if (data.documents && data.documents.length > 0) {
        await this.uploadDocuments(claim.id, data.documents);
      }

      return claim;
    } catch (error) {
      console.error('Failed to create claim:', error);
      throw error;
    }
  }

  /**
   * Update an existing claim
   */
  async updateClaim(id: string, data: Partial<ClaimFormData>): Promise<Claim> {
    const netInfo = await NetInfo.fetch();

    const requestData: UpdateClaimRequest = {
      title: data.title,
      description: data.description,
      incidentDate: data.incidentDate?.toISOString(),
      incidentTime: data.incidentTime,
      incidentLocation: data.incidentLocation,
      amount: data.amount,
      priority: data.priority,
      witnesses: data.witnesses,
    };

    // Clean undefined values
    Object.keys(requestData).forEach(
      (key) =>
        requestData[key as keyof UpdateClaimRequest] === undefined &&
        delete requestData[key as keyof UpdateClaimRequest]
    );

    if (!netInfo.isConnected) {
      // Queue for later sync
      await offlineQueue.enqueue({
        type: OperationType.UPDATE,
        entity: 'claim',
        priority: OperationPriority.MEDIUM,
        data: { ...requestData, id },
        url: `/claims/${id}`,
        method: 'PATCH',
        maxRetries: 3,
      });

      // Update local cache optimistically
      const cached = await localDB.find<Claim>('claims', id);
      if (cached) {
        const updated = { ...cached, ...data, isPending: true } as Claim;
        await localDB.save('claims', updated);
        return updated;
      }

      throw new Error('Claim not found in local cache');
    }

    try {
      const claim = await claimsApi.updateClaim(id, requestData);
      await localDB.save('claims', claim);
      return claim;
    } catch (error) {
      console.error(`Failed to update claim ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a claim (only drafts)
   */
  async deleteClaim(id: string): Promise<void> {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      // Queue for later sync
      await offlineQueue.enqueue({
        type: OperationType.DELETE,
        entity: 'claim',
        priority: OperationPriority.LOW,
        data: { id },
        url: `/claims/${id}`,
        method: 'DELETE',
        maxRetries: 3,
      });

      // Remove from local cache
      await localDB.delete('claims', id);
      return;
    }

    try {
      await claimsApi.deleteClaim(id);
      await localDB.delete('claims', id);
    } catch (error) {
      console.error(`Failed to delete claim ${id}:`, error);
      throw error;
    }
  }

  /**
   * Perform action on claim (submit, approve, reject, etc.)
   */
  async performClaimAction(id: string, action: ClaimActionRequest): Promise<Claim> {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      throw new Error('Cannot perform claim actions while offline');
    }

    try {
      const claim = await claimsApi.performClaimAction(id, action);
      await localDB.save('claims', claim);
      return claim;
    } catch (error) {
      console.error(`Failed to perform action on claim ${id}:`, error);
      throw error;
    }
  }

  // ==================== Comments ====================

  /**
   * Get comments for a claim
   */
  async getClaimComments(claimId: string) {
    try {
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        return await localDB.findAll<ClaimComment>('claim_comments', { where: { claimId } });
      }

      const response = await claimsApi.getClaimComments(claimId);

      // Cache comments locally
      await localDB.saveMany('claim_comments', response.items);

      return response;
    } catch (error) {
      console.error(`Failed to get comments for claim ${claimId}:`, error);
      return await localDB.findAll<ClaimComment>('claim_comments', { where: { claimId } });
    }
  }

  /**
   * Add a comment to a claim
   */
  async addClaimComment(
    claimId: string,
    content: string,
    mentions?: string[]
  ): Promise<ClaimComment> {
    const netInfo = await NetInfo.fetch();
    const data: AddCommentRequest = { claimId, content, mentions };

    if (!netInfo.isConnected) {
      // Create pending comment
      const pendingComment: ClaimComment = {
        id: uuidv4(),
        claimId,
        content,
        author: {
          id: 'current_user', // Should be replaced with actual user ID
          name: 'You',
        },
        createdAt: new Date(),
        isEdited: false,
        mentions,
        isPending: true,
      };

      // Queue for later sync
      await offlineQueue.enqueue({
        type: OperationType.CREATE,
        entity: 'comment',
        priority: OperationPriority.MEDIUM,
        data: { ...data, tempId: pendingComment.id },
        url: `/claims/${claimId}/comments`,
        method: 'POST',
        maxRetries: 3,
      });

      await localDB.save('claim_comments', pendingComment);
      return pendingComment;
    }

    try {
      const comment = await claimsApi.addClaimComment(claimId, data);
      await localDB.save('claim_comments', { ...comment, claimId });
      return comment;
    } catch (error) {
      console.error(`Failed to add comment to claim ${claimId}:`, error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateClaimComment(
    claimId: string,
    commentId: string,
    content: string
  ): Promise<ClaimComment> {
    const comment = await claimsApi.updateClaimComment(claimId, commentId, { content });
    await localDB.save('claim_comments', comment);
    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteClaimComment(claimId: string, commentId: string): Promise<void> {
    await claimsApi.deleteClaimComment(claimId, commentId);
    await localDB.delete('claim_comments', commentId);
  }

  // ==================== Documents ====================

  /**
   * Upload documents to a claim
   */
  async uploadDocuments(claimId: string, files: any[]): Promise<ClaimDocument[]> {
    const uploadedDocs: ClaimDocument[] = [];

    for (const file of files) {
      try {
        const doc = await claimsApi.uploadClaimDocument(claimId, file);
        uploadedDocs.push(doc);
      } catch (error) {
        console.error(`Failed to upload document ${file.name}:`, error);
      }
    }

    return uploadedDocs;
  }

  /**
   * Delete a document
   */
  async deleteDocument(claimId: string, documentId: string): Promise<void> {
    await claimsApi.deleteClaimDocument(claimId, documentId);
  }

  // ==================== Draft Management ====================

  /**
   * Save draft claim
   */
  async saveDraft(draft: DraftClaim): Promise<DraftClaim> {
    draft.updatedAt = new Date();
    this.drafts.set(draft.localId, draft);
    await this.persistDrafts();
    return draft;
  }

  /**
   * Get all drafts
   */
  async getDrafts(): Promise<DraftClaim[]> {
    return Array.from(this.drafts.values());
  }

  /**
   * Get draft by ID
   */
  async getDraft(localId: string): Promise<DraftClaim | null> {
    return this.drafts.get(localId) || null;
  }

  /**
   * Delete draft
   */
  async deleteDraft(localId: string): Promise<void> {
    this.drafts.delete(localId);
    this.stopAutosave(localId);
    await this.persistDrafts();
  }

  /**
   * Start auto-save for a draft
   */
  startAutosave(localId: string, getData: () => Partial<ClaimFormData>) {
    // Clear existing timer
    this.stopAutosave(localId);

    const timer = setInterval(async () => {
      try {
        const draft = this.drafts.get(localId);
        if (draft) {
          const updatedData = getData();
          await this.saveDraft({
            ...draft,
            ...updatedData,
            autoSaved: true,
          });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, DRAFT_AUTOSAVE_INTERVAL);

    this.autosaveTimers.set(localId, timer);
  }

  /**
   * Stop auto-save for a draft
   */
  stopAutosave(localId: string) {
    const timer = this.autosaveTimers.get(localId);
    if (timer) {
      clearInterval(timer);
      this.autosaveTimers.delete(localId);
    }
  }

  /**
   * Load drafts from storage
   */
  private async loadDrafts() {
    try {
      const stored = await storage.getItem<string>(DRAFTS_STORAGE_KEY);
      if (stored) {
        const drafts = JSON.parse(stored) as DraftClaim[];
        drafts.forEach((draft) => {
          // Parse dates
          draft.createdAt = new Date(draft.createdAt);
          draft.updatedAt = new Date(draft.updatedAt);
          if (draft.incidentDate) {
            draft.incidentDate = new Date(draft.incidentDate);
          }
          this.drafts.set(draft.localId, draft);
        });
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }

  /**
   * Persist drafts to storage
   */
  private async persistDrafts() {
    try {
      const drafts = Array.from(this.drafts.values());
      await storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Failed to persist drafts:', error);
    }
  }

  // ==================== Search & Filter ====================

  /**
   * Search claims
   */
  async searchClaims(
    query: string,
    options?: {
      page?: number;
      pageSize?: number;
    }
  ) {
    return await claimsApi.searchClaims(query, options);
  }

  /**
   * Get claim statistics
   */
  async getClaimStats() {
    return await claimsApi.getClaimStats();
  }

  // ==================== Export ====================

  /**
   * Export claim as PDF
   */
  async exportClaimPDF(
    claimId: string,
    options?: {
      includeDocuments?: boolean;
      includeComments?: boolean;
    }
  ) {
    return await claimsApi.exportClaimPDF(claimId, options);
  }

  // ==================== Sync ====================

  /**
   * Sync pending operations
   */
  async syncPendingClaims() {
    await offlineQueue.processQueue();
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    return await offlineQueue.getStats();
  }
}

export const claimsService = new ClaimsService();
