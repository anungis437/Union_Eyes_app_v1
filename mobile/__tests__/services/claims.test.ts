/**
 * Claims Service Test Suite
 * Tests for comprehensive claims management system
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { claimsService } from '../../src/services/claims';
import { claimsApi } from '../../src/api/claims';
import { ClaimFormData } from '../../src/types/claims';

// Mock dependencies
jest.mock('../../src/api/claims');
jest.mock('../../src/services/offline-queue');
jest.mock('../../src/services/local-db');
jest.mock('@react-native-community/netinfo');

describe('ClaimsService', () => {
  const mockClaim: ClaimFormData = {
    type: 'grievance',
    title: 'Test Claim',
    description: 'This is a test claim description that is long enough to pass validation.',
    incidentDate: new Date('2024-01-15'),
    incidentLocation: 'Main Office',
    priority: 'high',
    witnesses: [
      {
        name: 'John Witness',
        email: 'john@example.com',
        phone: '555-1234',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClaim', () => {
    it('should create a claim when online', async () => {
      const mockCreatedClaim = { ...mockClaim, id: 'claim-123' };
      (claimsApi.createClaim as any).mockResolvedValue(mockCreatedClaim);

      const result = await claimsService.createClaim(mockClaim);

      expect((result as any).id).toBe('claim-123');
      expect(claimsApi.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          type: mockClaim.type,
          title: mockClaim.title,
        })
      );
    });

    it('should save as draft when isDraft is true', async () => {
      const draft = await claimsService.createClaim(mockClaim, true);

      expect(draft).toHaveProperty('localId');
      expect(draft).toHaveProperty('createdAt');
      expect(claimsApi.createClaim).not.toHaveBeenCalled();
    });

    it('should queue claim creation when offline', async () => {
      // Mock offline state
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const result = await claimsService.createClaim(mockClaim);

      expect(result).toHaveProperty('isPending', true);
      expect(result).toHaveProperty('localId');
    });
  });

  describe('updateClaim', () => {
    it('should update a claim when online', async () => {
      const claimId = 'claim-123';
      const updates = { title: 'Updated Title' };
      const mockUpdatedClaim = { ...mockClaim, id: claimId, ...updates };

      (claimsApi.updateClaim as any).mockResolvedValue(mockUpdatedClaim);

      const result = await claimsService.updateClaim(claimId, updates);

      expect(result.title).toBe('Updated Title');
      expect(claimsApi.updateClaim).toHaveBeenCalledWith(claimId, updates);
    });

    it('should queue update when offline', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const claimId = 'claim-123';
      const updates = { title: 'Updated Offline' };

      await claimsService.updateClaim(claimId, updates);

      // Verify offline queue was called
      const { offlineQueue } = require('../src/services/offline-queue');
      expect(offlineQueue.addOperation).toHaveBeenCalled();
    });
  });

  describe('addClaimComment', () => {
    it('should add a comment when online', async () => {
      const claimId = 'claim-123';
      const content = 'This is a test comment';
      const mockComment = {
        id: 'comment-1',
        claimId,
        content,
        author: { id: 'user-1', name: 'Test User' },
        createdAt: new Date(),
        isEdited: false,
      };

      (claimsApi.addClaimComment as any).mockResolvedValue(mockComment);

      const result = await claimsService.addClaimComment(claimId, content);

      expect(result.id).toBe('comment-1');
      expect(result.content).toBe(content);
    });

    it('should create pending comment when offline', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const claimId = 'claim-123';
      const content = 'Offline comment';

      const result = await claimsService.addClaimComment(claimId, content);

      expect(result).toHaveProperty('isPending', true);
      expect(result.content).toBe(content);
    });

    it('should extract mentions from comment content', async () => {
      const claimId = 'claim-123';
      const content = 'Hey @john and @jane, please review this';
      const mentions = ['john', 'jane'];

      await claimsService.addClaimComment(claimId, content, mentions);

      expect(claimsApi.addClaimComment).toHaveBeenCalledWith(
        claimId,
        expect.objectContaining({ content, mentions })
      );
    });
  });

  describe('Draft Management', () => {
    it('should save a draft', async () => {
      const draft = {
        localId: 'draft-123',
        ...mockClaim,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await claimsService.saveDraft(draft);

      expect(result.localId).toBe('draft-123');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should get all drafts', async () => {
      const draft1 = {
        localId: 'draft-1',
        ...mockClaim,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await claimsService.saveDraft(draft1);
      const drafts = await claimsService.getDrafts();

      expect(drafts.length).toBeGreaterThan(0);
      expect(drafts[0].localId).toBe('draft-1');
    });

    it('should delete a draft', async () => {
      const draft = {
        localId: 'draft-to-delete',
        ...mockClaim,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await claimsService.saveDraft(draft);
      await claimsService.deleteDraft('draft-to-delete');

      const foundDraft = await claimsService.getDraft('draft-to-delete');
      expect(foundDraft).toBeNull();
    });

    it('should start and stop auto-save', () => {
      const draftId = 'draft-123';
      const getData = jest.fn(() => ({ title: 'Auto-saved title' }));

      claimsService.startAutosave(draftId, getData);

      // Verify timer is set
      expect(claimsService['autosaveTimers'].has(draftId)).toBe(true);

      claimsService.stopAutosave(draftId);

      // Verify timer is cleared
      expect(claimsService['autosaveTimers'].has(draftId)).toBe(false);
    });
  });

  describe('Document Management', () => {
    it('should upload documents to a claim', async () => {
      const claimId = 'claim-123';
      const files = [
        { uri: 'file://doc1.pdf', name: 'Document 1.pdf', type: 'application/pdf' },
        { uri: 'file://doc2.jpg', name: 'Image.jpg', type: 'image/jpeg' },
      ];

      const mockDocs = files.map((file, i) => ({
        id: `doc-${i}`,
        claimId,
        name: file.name,
        type: file.type,
        url: `https://example.com/${file.name}`,
        uploadedAt: new Date(),
        uploadedBy: 'user-1',
        status: 'uploaded' as const,
      }));

      (claimsApi.uploadClaimDocument as any)
        .mockResolvedValueOnce(mockDocs[0])
        .mockResolvedValueOnce(mockDocs[1]);

      const result = await claimsService.uploadDocuments(claimId, files);

      expect(result).toHaveLength(2);
      expect(claimsApi.uploadClaimDocument).toHaveBeenCalledTimes(2);
    });

    it('should handle upload failures gracefully', async () => {
      const claimId = 'claim-123';
      const files = [{ uri: 'file://doc1.pdf', name: 'Document 1.pdf', type: 'application/pdf' }];

      (claimsApi.uploadClaimDocument as any).mockRejectedValue(new Error('Upload failed'));

      const result = await claimsService.uploadDocuments(claimId, files);

      expect(result).toHaveLength(0);
    });
  });

  describe('Search and Filter', () => {
    it('should search claims', async () => {
      const query = 'overtime';
      const mockResults = {
        items: [{ id: 'claim-1', title: 'Overtime Claim', type: 'overtime' }],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      };

      (claimsApi.searchClaims as any).mockResolvedValue(mockResults);

      const result = await claimsService.searchClaims(query);

      expect(result.items).toHaveLength(1);
      expect(claimsApi.searchClaims).toHaveBeenCalledWith(query, undefined);
    });

    it('should get claim statistics', async () => {
      const mockStats = {
        total: 100,
        byStatus: {
          draft: 10,
          submitted: 20,
          approved: 50,
          rejected: 15,
          closed: 5,
        },
        byType: {
          grievance: 30,
          overtime: 25,
          safety: 20,
          leave: 15,
          other: 10,
        },
        avgResolutionTime: 7.5,
      };

      (claimsApi.getClaimStats as any).mockResolvedValue(mockStats);

      const result = await claimsService.getClaimStats();

      expect(result.total).toBe(100);
      expect(result.byStatus.approved).toBe(50);
    });
  });

  describe('Claim Actions', () => {
    it('should perform claim action (approve)', async () => {
      const claimId = 'claim-123';
      const action = {
        action: 'approve' as const,
        notes: 'Approved by manager',
      };

      const mockUpdatedClaim = {
        ...mockClaim,
        id: claimId,
        status: 'approved' as const,
      };

      (claimsApi.performClaimAction as any).mockResolvedValue(mockUpdatedClaim);

      const result = await claimsService.performClaimAction(claimId, action);

      expect(result.status).toBe('approved');
      expect(claimsApi.performClaimAction).toHaveBeenCalledWith(claimId, action);
    });

    it('should throw error when performing action offline', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const claimId = 'claim-123';
      const action = { action: 'approve' as const };

      await expect(claimsService.performClaimAction(claimId, action)).rejects.toThrow(
        'Cannot perform claim actions while offline'
      );
    });
  });
});

describe('ClaimsApi', () => {
  const mockClaim: ClaimFormData = {
    type: 'grievance',
    title: 'Test Claim',
    description: 'This is a test claim description that is long enough to pass validation.',
  };

  it('should handle API errors correctly', async () => {
    const error = {
      response: {
        status: 400,
        data: { message: 'Invalid claim data' },
      },
    };

    (claimsApi.createClaim as any).mockRejectedValue(error);

    await expect(claimsService.createClaim(mockClaim)).rejects.toThrow();
  });

  it('should cancel requests correctly', () => {
    claimsApi.cancelRequest('search');
    expect(claimsApi['cancelTokens'].has('search')).toBe(false);
  });

  it('should retry failed requests', async () => {
    let attempts = 0;
    const mockFn = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary error');
      }
      return Promise.resolve({ success: true });
    }) as any;

    const result = await claimsApi.retryRequest(mockFn, 3, 100);

    expect(result).toEqual({ success: true });
    expect(attempts).toBe(3);
  });
});

