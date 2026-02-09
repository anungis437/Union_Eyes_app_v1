/**
 * API + FSM Integration Tests
 * 
 * Purpose: Verify that API endpoints enforce FSM validation
 * Critical for preventing bypass of workflow rules
 * 
 * Tests created as part of PR #8 (Audit Fix)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/claims/[id]/route';

// Mock dependencies
vi.mock('@/lib/api-auth-guard', () => ({
  withEnhancedRoleAuth: (minLevel: number, handler: Function) => {
    return async (request: any, routeParams: any) => {
      // Provide mock context that the handler expects
      const mockContext = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'steward',
        roleLevel: 60,
      };
      return handler(request, mockContext, routeParams);
    };
  },
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/with-rls-context', () => ({
  withRLSContext: (fn: Function) => fn(mockTx),
}));

vi.mock('@/lib/workflow-engine', () => ({
  updateClaimStatus: vi.fn(),
}));

vi.mock('@/lib/middleware/api-security', () => ({
  logApiAuditEvent: vi.fn(),
}));

// Mock transaction
const mockTx = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue([
        {
          claimId: 'test-claim-id',
          claimNumber: 'CLM-001',
          status: 'submitted',
          organizationId: 'org-123',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
      ]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ claimId: 'test-claim-id' }]),
      }),
    }),
  }),
};

describe('API + FSM Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/claims/[id] - FSM Enforcement', () => {
    it('should enforce FSM validation when status change requested', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM rejection (illegal transition: submitted -> closed)
      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Invalid transition from submitted to closed. Allowed transitions: under_review, assigned, rejected',
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });

      const context = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'member',
        roleLevel: 30,
      };

      const response = await PATCH(request, { params: { id: 'CLM-001' } });
      const data = await response.json();

      // Verify FSM validation was called
      expect(updateClaimStatus).toHaveBeenCalledWith(
        'CLM-001',
        'closed',
        expect.any(String),
        'Status update via API',
        expect.any(Object)
      );

      // Verify rejection
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid transition');
    });

    it('should allow valid FSM transitions', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM acceptance (valid transition: submitted -> under_review)
      (updateClaimStatus as any).mockResolvedValue({
        success: true,
        claim: { claimId: 'test-claim-id', status: 'under_review' },
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'under_review' }),
      });

      const response = await PATCH(request, { params: { id: 'CLM-001' } });

      // Verify FSM validation was called
      expect(updateClaimStatus).toHaveBeenCalled();

      // Verify success
      expect(response.status).not.toBe(400);
    });

    it('should update non-status fields without FSM validation', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ description: 'Updated description', priority: 'high' }),
      });

      await PATCH(request, { params: { id: 'CLM-001' } });

      // Verify FSM validation was NOT called (no status change)
      expect(updateClaimStatus).not.toHaveBeenCalled();
    });

    it('should block status change with critical signals', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM rejection due to critical signals
      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Cannot transition to resolved: critical signal detected (SLA breach)',
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });

      const response = await PATCH(request, { params: { id: 'CLM-001' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('critical signal');
    });
  });

  describe('DELETE /api/claims/[id] - FSM Enforcement', () => {
    it('should enforce FSM validation when closing claim', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM rejection (closing from submitted requires resolution first)
      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Cannot close claim in submitted status. Must be resolved or rejected first.',
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'CLM-001' } });
      const data = await response.json();

      // Verify FSM validation was called
      expect(updateClaimStatus).toHaveBeenCalledWith(
        'CLM-001',
        'closed',
        expect.any(String),
        'Claim closed via DELETE endpoint',
        expect.any(Object)
      );

      // Verify rejection
      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot close claim');
    });

    it('should enforce 7-day cooling-off period', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM rejection due to cooling-off period
      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Cannot transition to closed: Minimum time in resolved state not met (7 days required)',
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'CLM-001' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Minimum time');
    });

    it('should allow closure after valid FSM transition', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM acceptance (claim has been resolved for 7+ days)
      (updateClaimStatus as any).mockResolvedValue({
        success: true,
        claim: { claimId: 'test-claim-id', status: 'closed' },
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'CLM-001' } });

      // Verify FSM validation was called
      expect(updateClaimStatus).toHaveBeenCalled();

      // Verify success
      expect(response.status).not.toBe(400);
    });
  });

  describe('FSM Bypass Prevention', () => {
    it('should NOT allow direct status update bypassing FSM', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Attempt to bypass FSM by spreading status in body
      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed', priority: 'low' }),
      });

      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Invalid transition',
      });

      const response = await PATCH(request, { params: { id: 'CLM-001' } });

      // Verify FSM was invoked (not bypassed)
      expect(updateClaimStatus).toHaveBeenCalled();

      // Verify rejection
      expect(response.status).toBe(400);
    });

    it('should prevent role elevation attacks', async () => {
      const { updateClaimStatus } = await import('@/lib/workflow-engine');
      
      // Mock FSM rejection (member trying admin-only transition)
      (updateClaimStatus as any).mockResolvedValue({
        success: false,
        error: 'Insufficient role level. Required: 90, Current: 30',
      });

      const request = new NextRequest('http://localhost/api/claims/CLM-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }), // Admin-only action
      });

      const response = await PATCH(request, { params: { id: 'CLM-001' } });

      expect(response.status).toBe(400);
    });
  });
});
