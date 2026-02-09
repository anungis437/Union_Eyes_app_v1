/**
 * Claim Workflow FSM Tests
 * 
 * These tests PROVE that bad practice is impossible:
 * - Illegal state transitions are rejected
 * - Role-based permissions are enforced
 * - Critical signals block closure
 * - Minimum time-in-state is enforced
 * - Required documentation is enforced
 */

import { describe, it, expect } from 'vitest';
import {
  validateClaimTransition,
  getAllowedClaimTransitions,
  getTransitionRequirements,
  type ClaimTransitionContext,
} from '@/lib/services/claim-workflow-fsm';

describe('Claim Workflow FSM - Enforcement Layer', () => {
  describe('Illegal Transition Blocking', () => {
    it('should reject transition from submitted to closed', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'submitted',
        targetStatus: 'closed',
        userId: 'user_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(),
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid transition');
      expect(result.requiredActions).toBeDefined();
    });

    it('should reject transition from investigation to closed', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'closed',
        userId: 'user_456',
        userRole: 'admin',
        priority: 'high',
        statusChangedAt: new Date(),
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should reject any transition from closed state (terminal)', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'closed',
        targetStatus: 'reopened' as any, // Attempt illegal reopen
        userId: 'user_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(),
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });
  });

  describe('Role-Based Permission Enforcement', () => {
    it('should allow admin to reject claim from submitted', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'submitted',
        targetStatus: 'rejected',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(),
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });

    it('should block member from rejecting claim', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'submitted',
        targetStatus: 'rejected',
        userId: 'member_456',
        userRole: 'member',
        priority: 'medium',
        statusChangedAt: new Date(),
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User role');
      expect(result.reason).toContain('not authorized');
    });

    it('should block steward from closing claim (admin-only)', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not authorized');
      expect(result.requiredActions).toBeDefined();
    });

    it('should allow system role to perform any valid transition', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'system',
        userRole: 'system',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Critical Signal Blocking', () => {
    it('should block closure when critical signals unresolved', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        hasUnresolvedCriticalSignals: true, // BLOCKER
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('critical signals');
      expect(result.requiredActions).toContain('Resolve all CRITICAL severity signals');
    });

    it('should allow closure when critical signals resolved', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        hasUnresolvedCriticalSignals: false, // All clear
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });

    it('should block rejected claim closure with critical signals', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'rejected',
        targetStatus: 'closed',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        hasUnresolvedCriticalSignals: true, // Member not properly notified
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('critical signals');
    });
  });

  describe('Minimum Time-in-State Enforcement', () => {
    it('should block transition from under_review before 24 hours', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'under_review',
        targetStatus: 'investigation',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // Only 12 hours ago
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('minimum duration');
      expect(result.reason).toContain('hours remaining');
    });

    it('should allow transition from under_review after 24 hours', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'under_review',
        targetStatus: 'investigation',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        hasRequiredDocumentation: false,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });

    it('should block transition from investigation before 3 days', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Only 2 days
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('minimum duration');
    });

    it('should allow transition from investigation after 3 days', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });

    it('should block closure of resolved claim before 7 days (cooling-off period)', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Only 5 days
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('minimum duration');
      expect(result.reason).toContain('hours remaining'); // 7 days - 5 days = 48 hours
    });
  });

  describe('Documentation Requirement Enforcement', () => {
    it('should block investigation transition without documentation', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        hasRequiredDocumentation: false, // Missing docs
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('documentation');
      expect(result.requiredActions).toBeDefined();
    });

    it('should allow investigation transition with notes even without formal docs', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        hasRequiredDocumentation: false,
        notes: 'Detailed investigation findings: member complaint was valid, employer agreed to remedy...', // Sufficient notes
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
    });

    it('should block closure without documentation', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'resolved',
        targetStatus: 'closed',
        userId: 'admin_456',
        userRole: 'admin',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        hasRequiredDocumentation: false,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('documentation');
    });
  });

  describe('SLA Compliance Tracking', () => {
    it('should include SLA warning for overdue claim', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days (SLA breach)
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true); // Transition allowed but with warning
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('SLA BREACH');
      expect(result.metadata?.slaCompliant).toBe(false);
    });

    it('should include SLA at-risk warning for near-deadline claim', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'medium',
        statusChangedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days (close to 10-day SLA)
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('SLA AT RISK');
      expect(result.metadata?.slaCompliant).toBe(true);
    });

    it('should calculate faster SLA for critical priority', () => {
      const context: ClaimTransitionContext = {
        claimId: 'claim_123',
        currentStatus: 'investigation',
        targetStatus: 'resolved',
        userId: 'steward_456',
        userRole: 'steward',
        priority: 'critical', // 0.5x multiplier = 5 days instead of 10
        statusChangedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days (breach for critical)
        hasRequiredDocumentation: true,
      };

      const result = validateClaimTransition(context);

      expect(result.allowed).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('SLA BREACH'); // Breached critical SLA
    });
  });

  describe('Helper Functions', () => {
    it('should return role-filtered allowed transitions', () => {
      const memberTransitions = getAllowedClaimTransitions('submitted', 'member');
      expect(memberTransitions).toEqual([]); // Members can't transition from submitted

      const stewardTransitions = getAllowedClaimTransitions('submitted', 'steward');
      expect(stewardTransitions).toContain('under_review');
      expect(stewardTransitions).toContain('assigned');
      expect(stewardTransitions).not.toContain('rejected'); // Stewards can't reject

      const adminTransitions = getAllowedClaimTransitions('submitted', 'admin');
      expect(adminTransitions).toContain('under_review');
      expect(adminTransitions).toContain('assigned');
      expect(adminTransitions).toContain('rejected'); // Admins can reject
    });

    it('should return transition requirements', () => {
      const requirements = getTransitionRequirements('investigation', 'resolved');
      
      expect(requirements.requiresRole).toEqual(['steward', 'admin']);
      expect(requirements.minHours).toBe(72); // 3 days
      expect(requirements.requiresDocumentation).toBe(true);
    });

    it('should identify closed state as terminal', () => {
      const transitions = getAllowedClaimTransitions('closed', 'admin');
      expect(transitions).toEqual([]); // No transitions from closed
    });
  });
});
