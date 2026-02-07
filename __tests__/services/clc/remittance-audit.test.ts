import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock the email service
vi.mock('@/services/email', () => ({
  sendEmail: vi.fn(() => Promise.resolve())
}));

// Import after mocking
import {
  submitForApproval,
  approveRemittance,
  rejectRemittance,
  getApprovalWorkflowState,
  getApprovalHistory,
  runComplianceChecks,
  type ApprovalLevel,
  type RemittanceStatus
} from '@/services/clc/remittance-audit';
import { db } from '@/db';

const mockDb = db as any;

describe('remittance-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('submitForApproval', () => {
    it('should submit a draft remittance for approval successfully', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      
      // Mock remittance data
      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'draft',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        remittanceMonth: '2024-01'
      };

      // Mock database responses - get remittance
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      // Mock update remittance status
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      // Mock insert approval log
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({})
      });

      // Mock select for getApproversForLevel (returns empty array for notifications)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      // Mock select for remittance details for notifications
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                remittance: mockRemittance,
                organization: { name: 'Test Org' }
              }])
            })
          })
        })
      });

      const result = await submitForApproval(remittanceId, userId);

      expect(result.success).toBe(true);
      expect(result.remittanceId).toBe(remittanceId);
      expect(result.nextLevel).toBe('local');
      expect(result.status).toBe('pending_local');
    });

    it('should return error if remittance not found', async () => {
      const remittanceId = 'non-existent';
      const userId = 'user-456';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await submitForApproval(remittanceId, userId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance not found');
      expect(result.errors).toContain('Remittance not found');
    });

    it('should return error if remittance already submitted', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      const result = await submitForApproval(remittanceId, userId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance already submitted');
      expect(result.errors).toContain('Remittance is not in draft status');
    });

    it('should fail compliance checks with invalid data', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'draft',
        totalMembers: 0, // Invalid
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date().toISOString()
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      const result = await submitForApproval(remittanceId, userId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Compliance checks failed');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const result = await submitForApproval(remittanceId, userId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database connection failed');
      expect(result.errors).toContain('Database connection failed');
    });
  });

  describe('approveRemittance', () => {
    it('should approve remittance at current level and move to next level', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';
      const comment = 'Looks good';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      const mockMembership = {
        userId,
        organizationId: 'org-789',
        role: 'local_admin'
      };

      // Mock get remittance
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      // Mock verify user authority
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMembership])
          })
        })
      });

      // Mock update remittance
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      // Mock insert approval log
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({})
      });

      // Mock select for remittance details for notifications
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                remittance: mockRemittance,
                organization: { name: 'Test Org' }
              }])
            })
          })
        })
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel, comment);

      expect(result.success).toBe(true);
      expect(result.currentLevel).toBe('local');
      expect(result.nextLevel).toBe('regional');
      expect(result.status).toBe('pending_regional');
    });

    it('should complete final approval when at last level', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'clc';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_clc',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      const mockMembership = {
        userId,
        organizationId: 'org-789',
        role: 'clc_admin'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMembership])
          })
        })
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({})
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel);

      expect(result.success).toBe(true);
      expect(result.currentLevel).toBe('clc');
      expect(result.nextLevel).toBeNull();
      expect(result.status).toBe('approved');
      expect(result.message).toBe('Final approval completed');
    });

    it('should return error if remittance not found', async () => {
      const remittanceId = 'non-existent';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance not found');
    });

    it('should return error if remittance not at expected approval level', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'regional';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance not at this approval level');
      expect(result.errors).toContain('Expected status pending_regional, got pending_local');
    });

    it('should return error if user does not have approval authority', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      // No membership found
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User does not have approval authority');
      expect(result.errors).toContain('Insufficient approval permissions');
    });

    it('should handle exceptions gracefully', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const result = await approveRemittance(remittanceId, userId, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('rejectRemittance', () => {
    it('should reject remittance with reason and comment', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'regional';
      const rejectionReason = 'Data discrepancy found';
      const comment = 'Member count does not match records';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_regional',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      const mockMembership = {
        userId,
        organizationId: 'org-789',
        role: 'regional_admin'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMembership])
          })
        })
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({})
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason, comment);

      expect(result.success).toBe(true);
      expect(result.currentLevel).toBe('regional');
      expect(result.nextLevel).toBeNull();
      expect(result.status).toBe('rejected');
      expect(result.message).toContain('Rejected at regional level');
      expect(result.message).toContain(rejectionReason);
    });

    it('should reject remittance without optional comment', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';
      const rejectionReason = 'Invalid calculation';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      const mockMembership = {
        userId,
        organizationId: 'org-789',
        role: 'local_admin'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMembership])
          })
        })
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({})
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason);

      expect(result.success).toBe(true);
      expect(result.status).toBe('rejected');
    });

    it('should return error if remittance not found', async () => {
      const remittanceId = 'non-existent';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';
      const rejectionReason = 'Test reason';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance not found');
    });

    it('should return error if remittance not at expected level', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'national';
      const rejectionReason = 'Test reason';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_local',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remittance not at this approval level');
    });

    it('should return error if user lacks authority', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'regional';
      const rejectionReason = 'Test reason';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_regional',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRemittance])
          })
        })
      });

      // Mock user with insufficient role
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId, organizationId: 'org-789', role: 'local_admin' }])
          })
        })
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User does not have approval authority');
    });

    it('should handle exceptions gracefully', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';
      const currentLevel: ApprovalLevel = 'local';
      const rejectionReason = 'Test reason';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const result = await rejectRemittance(remittanceId, userId, currentLevel, rejectionReason);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getApprovalWorkflowState', () => {
    it('should return complete workflow state for pending remittance', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_regional',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        remittanceMonth: '2024-01'
      };

      const mockOrganization = {
        id: 'org-789',
        name: 'Test Organization'
      };

      const mockMembership = {
        userId,
        organizationId: 'org-789',
        role: 'regional_admin'
      };

      // Mock remittance query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                remittance: mockRemittance,
                organization: mockOrganization
              }])
            })
          })
        })
      });

      // Mock approval history query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      // Mock membership query for authority check
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMembership])
          })
        })
      });

      const result = await getApprovalWorkflowState(remittanceId, userId);

      expect(result).not.toBeNull();
      expect(result?.remittanceId).toBe(remittanceId);
      expect(result?.organizationName).toBe('Test Organization');
      expect(result?.status).toBe('pending_regional');
      expect(result?.currentLevel).toBe('regional');
      expect(result?.nextLevel).toBe('national');
      expect(result?.canApprove).toBe(true);
      expect(result?.canReject).toBe(true);
    });

    it('should return null if remittance not found', async () => {
      const remittanceId = 'non-existent';
      const userId = 'user-456';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const result = await getApprovalWorkflowState(remittanceId, userId);

      expect(result).toBeNull();
    });

    it('should show canApprove=false when user lacks authority', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'pending_regional',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        remittanceMonth: '2024-01'
      };

      const mockOrganization = {
        id: 'org-789',
        name: 'Test Organization'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                remittance: mockRemittance,
                organization: mockOrganization
              }])
            })
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      // User has no membership
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await getApprovalWorkflowState(remittanceId, userId);

      expect(result).not.toBeNull();
      expect(result?.canApprove).toBe(false);
      expect(result?.canReject).toBe(false);
    });

    it('should handle approved remittances with no current level', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      const mockRemittance = {
        id: remittanceId,
        organizationId: 'org-789',
        approvalStatus: 'approved',
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        remittanceMonth: '2024-01'
      };

      const mockOrganization = {
        id: 'org-789',
        name: 'Test Organization'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                remittance: mockRemittance,
                organization: mockOrganization
              }])
            })
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const result = await getApprovalWorkflowState(remittanceId, userId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('approved');
      expect(result?.currentLevel).toBeNull();
      expect(result?.nextLevel).toBeNull();
      expect(result?.canApprove).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const remittanceId = 'rem-123';
      const userId = 'user-456';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        })
      });

      const result = await getApprovalWorkflowState(remittanceId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history entries', async () => {
      const remittanceId = 'rem-123';

      const mockHistory = [
        {
          approval: {
            id: 'approval-1',
            remittanceId,
            approvalLevel: 'local',
            action: 'approved',
            approverUserId: 'user-1',
            comment: 'Approved',
            rejectionReason: null,
            createdAt: '2024-01-15T10:00:00Z'
          },
          user: {
            userId: 'user-1',
            displayName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await getApprovalHistory(remittanceId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('approval-1');
      expect(result[0].level).toBe('local');
      expect(result[0].action).toBe('approved');
      expect(result[0].approverName).toBe('John Doe');
      expect(result[0].approverEmail).toBe('john@example.com');
    });

    it('should handle missing user data gracefully', async () => {
      const remittanceId = 'rem-123';

      const mockHistory = [
        {
          approval: {
            id: 'approval-1',
            remittanceId,
            approvalLevel: 'regional',
            action: 'rejected',
            approverUserId: 'user-2',
            comment: 'Need corrections',
            rejectionReason: 'Data error',
            createdAt: '2024-01-16T10:00:00Z'
          },
          user: null
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await getApprovalHistory(remittanceId);

      expect(result).toHaveLength(1);
      expect(result[0].approverName).toBe('Unknown');
      expect(result[0].approverEmail).toBe('');
    });

    it('should return empty array for remittance with no history', async () => {
      const remittanceId = 'rem-new';

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const result = await getApprovalHistory(remittanceId);

      expect(result).toHaveLength(0);
    });
  });

  describe('runComplianceChecks', () => {
    it('should pass compliance checks for valid remittance', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if total members is zero or negative', async () => {
      const remittance = {
        totalMembers: 0,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date().toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Total members must be greater than zero');
    });

    it('should fail if per capita rate is zero or negative', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 0,
        totalAmount: '1000.00',
        dueDate: new Date().toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Per capita rate must be greater than zero');
    });

    it('should fail if total amount is zero or negative', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '0',
        dueDate: new Date().toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Total amount must be greater than zero');
    });

    it('should fail if calculated amount does not match total amount', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '999.00', // Should be 1000.00
        dueDate: new Date().toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Calculated amount');
    });

    it('should add warning if remittance is overdue', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('overdue');
    });

    it('should not add overdue warning if already paid', async () => {
      const remittance = {
        totalMembers: 100,
        perCapitaRate: 10,
        totalAmount: '1000.00',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        paidDate: new Date().toISOString()
      };

      const result = await runComplianceChecks(remittance);

      expect(result.warnings).toHaveLength(0);
    });

    it('should accumulate multiple errors', async () => {
      const remittance = {
        totalMembers: 0,
        perCapitaRate: 0,
        totalAmount: '0',
        dueDate: new Date().toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow small rounding differences in amount calculation', async () => {
      const remittance = {
        totalMembers: 33,
        perCapitaRate: 10.03,
        totalAmount: '330.99', // 33 * 10.03 = 330.99
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        paidDate: null
      };

      const result = await runComplianceChecks(remittance);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
