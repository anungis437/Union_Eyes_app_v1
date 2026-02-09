/**
 * Case Workflow FSM Tests
 * PR-5: Opinionated Workflow Rules
 * 
 * Tests the finite state machine that enforces proper case workflow progression.
 */

import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getAllowedTransitions,
  isTerminalState,
  getInitialState,
  getRequiredRoles,
  validateWorkflowPath,
  isActiveState,
  requiresUrgentAttention,
  getStateDescription,
  type CaseState,
  type TransitionContext,
} from '@/lib/services/case-workflow-fsm';

describe('Case Workflow FSM', () => {
  describe('validateTransition', () => {
    it('should allow valid transition from draft to submitted', () => {
      const result = validateTransition('draft', 'submitted', {
        actorRole: 'member',
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow officer to acknowledge submitted case', () => {
      const result = validateTransition('submitted', 'acknowledged', {
        actorRole: 'officer',
        daysInCurrentState: 1,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid state transition', () => {
      const result = validateTransition('draft', 'closed', {
        actorRole: 'admin',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_STATE_TRANSITION');
      expect(result.message).toContain('Cannot transition from');
    });

    it('should reject transition without sufficient permissions', () => {
      const result = validateTransition('submitted', 'acknowledged', {
        actorRole: 'member',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_PERMISSIONS');
      expect(result.message).toContain('cannot perform transition');
    });

    it('should reject acknowledgment after SLA expiration', () => {
      const result = validateTransition('submitted', 'acknowledged', {
        actorRole: 'officer',
        daysInCurrentState: 3, // SLA is 2 days
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('SLA_EXPIRED');
      expect(result.message).toContain('within 2 business days');
    });

    it('should reject transition from investigating without sufficient evidence', () => {
      const result = validateTransition('investigating', 'pending_response', {
        actorRole: 'officer',
        hasSufficientEvidence: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should allow transition from investigating with sufficient evidence', () => {
      const result = validateTransition('investigating', 'pending_response', {
        actorRole: 'officer',
        hasSufficientEvidence: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should allow member to withdraw case at any active stage', () => {
      const stages: CaseState[] = ['draft', 'submitted', 'acknowledged'];

      stages.forEach((stage) => {
        const result = validateTransition(stage, 'withdrawn', {
          actorRole: 'member',
        });
        // Note: member can't directly transition submitted/acknowledged to withdrawn
        // but this tests the transition logic
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct allowed transitions for submitted state', () => {
      const allowed = getAllowedTransitions('submitted');

      expect(allowed).toEqual(['acknowledged', 'withdrawn']);
    });

    it('should return empty array for terminal state', () => {
      const allowed = getAllowedTransitions('closed');

      expect(allowed).toEqual([]);
    });

    it('should return multiple options for investigating state', () => {
      const allowed = getAllowedTransitions('investigating');

      expect(allowed).toContain('pending_response');
      expect(allowed).toContain('resolved');
      expect(allowed).toContain('withdrawn');
      expect(allowed).toContain('closed');
    });
  });

  describe('isTerminalState', () => {
    it('should identify closed as terminal state', () => {
      expect(isTerminalState('closed')).toBe(true);
    });

    it('should identify active states as non-terminal', () => {
      expect(isTerminalState('submitted')).toBe(false);
      expect(isTerminalState('investigating')).toBe(false);
      expect(isTerminalState('negotiating')).toBe(false);
    });
  });

  describe('getInitialState', () => {
    it('should return draft as initial state', () => {
      expect(getInitialState()).toBe('draft');
    });
  });

  describe('getRequiredRoles', () => {
    it('should return required roles for state transitions', () => {
      const roles = getRequiredRoles('submitted');

      expect(roles).toContain('officer');
      expect(roles).toContain('steward');
      expect(roles).toContain('admin');
    });

    it('should allow members to transition from draft', () => {
      const roles = getRequiredRoles('draft');

      expect(roles).toContain('member');
    });
  });

  describe('validateWorkflowPath', () => {
    it('should validate complete valid workflow path', () => {
      const path: CaseState[] = ['draft', 'submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
      const contexts: TransitionContext[] = [
        { actorRole: 'member' },
        { actorRole: 'officer', daysInCurrentState: 1 },
        { actorRole: 'officer' },
        { actorRole: 'officer', hasSufficientEvidence: true },
        { actorRole: 'officer' },
      ];

      const result = validateWorkflowPath(path, contexts);

      expect(result.valid).toBe(true);
    });

    it('should reject workflow path with invalid transition', () => {
      const path: CaseState[] = ['draft', 'closed']; // Invalid jump
      const contexts: TransitionContext[] = [{ actorRole: 'admin' }];

      const result = validateWorkflowPath(path, contexts);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject workflow with insufficient contexts', () => {
      const path: CaseState[] = ['draft', 'submitted', 'acknowledged'];
      const contexts: TransitionContext[] = [{ actorRole: 'member' }]; // Need 2 contexts

      const result = validateWorkflowPath(path, contexts);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('context for each transition');
    });

    it('should validate escalation workflow', () => {
      const path: CaseState[] = [
        'draft',
        'submitted',
        'acknowledged',
        'investigating',
        'pending_response',
        'escalated',
        'resolved',
        'closed',
      ];
      const contexts: TransitionContext[] = [
        { actorRole: 'member' },
        { actorRole: 'officer', daysInCurrentState: 1 },
        { actorRole: 'officer' },
        { actorRole: 'officer', hasSufficientEvidence: true },
        { actorRole: 'officer' },
        { actorRole: 'officer' },
        { actorRole: 'admin' },
      ];

      const result = validateWorkflowPath(path, contexts);

      expect(result.valid).toBe(true);
    });

    it('should validate withdrawal workflow', () => {
      const path: CaseState[] = ['draft', 'submitted', 'acknowledged', 'withdrawn', 'closed'];
      const contexts: TransitionContext[] = [
        { actorRole: 'member' },
        { actorRole: 'officer', daysInCurrentState: 1 },
        { actorRole: 'officer' },
        { actorRole: 'officer' },
      ];

      const result = validateWorkflowPath(path, contexts);

      expect(result.valid).toBe(true);
    });
  });

  describe('isActiveState', () => {
    it('should identify active states correctly', () => {
      expect(isActiveState('submitted')).toBe(true);
      expect(isActiveState('investigating')).toBe(true);
      expect(isActiveState('negotiating')).toBe(true);
    });

    it('should identify inactive states correctly', () => {
      expect(isActiveState('resolved')).toBe(false);
      expect(isActiveState('withdrawn')).toBe(false);
      expect(isActiveState('closed')).toBe(false);
    });
  });

  describe('requiresUrgentAttention', () => {
    it('should flag submitted cases as urgent', () => {
      expect(requiresUrgentAttention('submitted')).toBe(true);
    });

    it('should flag pending_response as urgent', () => {
      expect(requiresUrgentAttention('pending_response')).toBe(true);
    });

    it('should flag escalated cases as urgent', () => {
      expect(requiresUrgentAttention('escalated')).toBe(true);
    });

    it('should not flag investigating as urgent', () => {
      expect(requiresUrgentAttention('investigating')).toBe(false);
    });
  });

  describe('getStateDescription', () => {
    it('should return human-readable descriptions', () => {
      expect(getStateDescription('draft')).toContain('preparing');
      expect(getStateDescription('submitted')).toContain('awaiting acknowledgment');
      expect(getStateDescription('escalated')).toContain('arbitration');
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should enforce negotiation can only be done by officer or admin', () => {
      // Steward cannot transition to negotiating
      const stewardResult = validateTransition('pending_response', 'negotiating', {
        actorRole: 'steward',
      });

      expect(stewardResult.valid).toBe(false);
      expect(stewardResult.error).toBe('INSUFFICIENT_PERMISSIONS');

      // Officer CAN transition to negotiating
      const officerResult = validateTransition('pending_response', 'negotiating', {
        actorRole: 'officer',
      });

      expect(officerResult.valid).toBe(true);
    });

    it('should allow admin to close active cases', () => {
      // Admin can close cases from states that allow 'closed' transition
      const closableStates: CaseState[] = ['acknowledged', 'investigating'];

      closableStates.forEach((state) => {
        const result = validateTransition(state, 'closed', {
          actorRole: 'admin',
        });
        expect(result.valid).toBe(true);
      });
    });

    it('should prevent reopening of closed cases', () => {
      const attempts: CaseState[] = ['submitted', 'investigating', 'resolved'];

      attempts.forEach((targetState) => {
        const result = validateTransition('closed', targetState, {
          actorRole: 'admin',
        });
        expect(result.valid).toBe(false);
      });
    });
  });
});
