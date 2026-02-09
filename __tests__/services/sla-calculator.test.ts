/**
 * SLA Calculator Tests
 * PR-5: Opinionated Workflow Rules
 * 
 * Tests SLA compliance calculation for union grievance cases.
 */

import { describe, it, expect } from 'vitest';
import { addBusinessDays, subBusinessDays } from 'date-fns';
import {
  calculateAcknowledgmentSla,
  calculateFirstResponseSla,
  calculateInvestigationSla,
  calculateCaseSlaStatus,
  getAtRiskCases,
  getBreachedCases,
  SLA_STANDARDS,
  type TimelineEvent,
} from '@/lib/services/sla-calculator';

describe('SLA Calculator', () => {
  const baseDate = new Date('2026-01-13T09:00:00Z'); // Monday morning

  describe('calculateAcknowledgmentSla', () => {
    it('should mark as within_sla when acknowledged within 2 business days', () => {
      const submittedAt = baseDate;
      const acknowledgedAt = addBusinessDays(submittedAt, 1); // 1 business day later

      const result = calculateAcknowledgmentSla(submittedAt, acknowledgedAt);

      expect(result.status).toBe('within_sla');
      expect(result.daysElapsed).toBe(1);
      expect(result.daysAllowed).toBe(2);
      expect(result.daysRemaining).toBe(1);
      expect(result.breachDate).toBeNull();
    });

    it('should mark as breached when acknowledged after 2 business days', () => {
      const submittedAt = baseDate;
      const acknowledgedAt = addBusinessDays(submittedAt, 3); // 3 business days later

      const result = calculateAcknowledgmentSla(submittedAt, acknowledgedAt);

      expect(result.status).toBe('breached');
      expect(result.daysElapsed).toBe(3);
      expect(result.daysRemaining).toBe(-1);
      expect(result.breachDate).not.toBeNull();
      expect(result.description).toContain('SLA breach');
    });

    it('should mark as at_risk when 80% of time elapsed without acknowledgment', () => {
      const submittedAt = baseDate;
      const currentDate = addBusinessDays(submittedAt, 1.6); // 1.6 days (80% of 2)

      const result = calculateAcknowledgmentSla(submittedAt, null, currentDate);

      expect(result.status).toBe('at_risk');
      expect(result.description).toContain('due soon');
    });

    it('should mark as breached when not acknowledged after 2 business days', () => {
      const submittedAt = baseDate;
      const currentDate = addBusinessDays(submittedAt, 3);

      const result = calculateAcknowledgmentSla(submittedAt, null, currentDate);

      expect(result.status).toBe('breached');
      expect(result.daysElapsed).toBe(3);
      expect(result.description).toContain('overdue');
    });

    it('should show within_sla when partially elapsed', () => {
      const submittedAt = baseDate;
      const currentDate = addBusinessDays(submittedAt, 0.5); // Half day

      const result = calculateAcknowledgmentSla(submittedAt, null, currentDate);

      expect(result.status).toBe('within_sla');
      expect(result.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('calculateFirstResponseSla', () => {
    it('should mark as within_sla when response within 5 business days', () => {
      const acknowledgedAt = baseDate;
      const firstResponseAt = addBusinessDays(acknowledgedAt, 3);

      const result = calculateFirstResponseSla(acknowledgedAt, firstResponseAt);

      expect(result.status).toBe('within_sla');
      expect(result.daysElapsed).toBe(3);
      expect(result.daysAllowed).toBe(5);
    });

    it('should mark as breached when response after 5 business days', () => {
      const acknowledgedAt = baseDate;
      const firstResponseAt = addBusinessDays(acknowledgedAt, 6);

      const result = calculateFirstResponseSla(acknowledgedAt, firstResponseAt);

      expect(result.status).toBe('breached');
      expect(result.daysElapsed).toBe(6);
    });

    it('should mark as at_risk when approaching deadline', () => {
      const acknowledgedAt = baseDate;
      const currentDate = addBusinessDays(acknowledgedAt, 4); // 80% of 5 days

      const result = calculateFirstResponseSla(acknowledgedAt, null, currentDate);

      expect(result.status).toBe('at_risk');
      expect(result.daysRemaining).toBeLessThanOrEqual(1);
    });

    it('should calculate correctly for pending first response', () => {
      const acknowledgedAt = baseDate;
      const currentDate = addBusinessDays(acknowledgedAt, 2);

      const result = calculateFirstResponseSla(acknowledgedAt, null, currentDate);

      expect(result.status).toBe('within_sla');
      expect(result.daysRemaining).toBe(3);
    });
  });

  describe('calculateInvestigationSla', () => {
    it('should mark as within_sla when completed within 15 business days', () => {
      const acknowledgedAt = baseDate;
      const investigationCompleteAt = addBusinessDays(acknowledgedAt, 10);

      const result = calculateInvestigationSla(acknowledgedAt, investigationCompleteAt);

      expect(result.status).toBe('within_sla');
      expect(result.daysElapsed).toBe(10);
      expect(result.daysAllowed).toBe(15);
    });

    it('should mark as breached when completed after 15 business days', () => {
      const acknowledgedAt = baseDate;
      const investigationCompleteAt = addBusinessDays(acknowledgedAt, 20);

      const result = calculateInvestigationSla(acknowledgedAt, investigationCompleteAt);

      expect(result.status).toBe('breached');
      expect(result.daysElapsed).toBe(20);
    });

    it('should mark as at_risk when 80% of investigation time elapsed', () => {
      const acknowledgedAt = baseDate;
      const currentDate = addBusinessDays(acknowledgedAt, 12); // 80% of 15

      const result = calculateInvestigationSla(acknowledgedAt, null, currentDate);

      expect(result.status).toBe('at_risk');
    });
  });

  describe('calculateCaseSlaStatus', () => {
    it('should calculate overall SLA for case with all events', () => {
      const timeline: TimelineEvent[] = [
        { timestamp: baseDate, type: 'submitted' },
        { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
        { timestamp: addBusinessDays(baseDate, 4), type: 'first_response' },
        { timestamp: addBusinessDays(baseDate, 12), type: 'investigation_complete' },
      ];

      const assessment = calculateCaseSlaStatus('case-123', timeline);

      expect(assessment.caseId).toBe('case-123');
      expect(assessment.acknowledgment.status).toBe('within_sla');
      expect(assessment.firstResponse?.status).toBe('within_sla');
      expect(assessment.investigation?.status).toBe('within_sla');
      expect(assessment.overallStatus).toBe('within_sla');
      expect(assessment.criticalSlas).toHaveLength(0);
    });

    it('should mark overall as breached if any SLA is breached', () => {
      const timeline: TimelineEvent[] = [
        { timestamp: baseDate, type: 'submitted' },
        { timestamp: addBusinessDays(baseDate, 3), type: 'acknowledged' }, // Breach!
        { timestamp: addBusinessDays(baseDate, 7), type: 'first_response' },
      ];

      const assessment = calculateCaseSlaStatus('case-123', timeline);

      expect(assessment.acknowledgment.status).toBe('breached');
      expect(assessment.overallStatus).toBe('breached');
      expect(assessment.criticalSlas).toContain('acknowledgment');
    });

    it('should mark overall as at_risk if any SLA is at risk', () => {
      const currentDate = addBusinessDays(baseDate, 1.7); // 85% of acknowledgment SLA

      const timeline: TimelineEvent[] = [{ timestamp: baseDate, type: 'submitted' }];

      const assessment = calculateCaseSlaStatus('case-123', timeline, currentDate);

      expect(assessment.acknowledgment.status).toBe('at_risk');
      expect(assessment.overallStatus).toBe('at_risk');
      expect(assessment.criticalSlas).toContain('acknowledgment');
    });

    it('should handle case without acknowledgment yet', () => {
      const currentDate = addBusinessDays(baseDate, 1);
      const timeline: TimelineEvent[] = [{ timestamp: baseDate, type: 'submitted' }];

      const assessment = calculateCaseSlaStatus('case-123', timeline, currentDate);

      expect(assessment.acknowledgment.status).toBe('within_sla');
      expect(assessment.firstResponse).toBeUndefined();
      expect(assessment.investigation).toBeUndefined();
    });

    it('should track multiple critical SLAs', () => {
      const currentDate = addBusinessDays(baseDate, 14); // 14 business days = 93% of 15

      const timeline: TimelineEvent[] = [
        { timestamp: baseDate, type: 'submitted' },
        { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
        // No first response or investigation complete
      ];

      const assessment = calculateCaseSlaStatus('case-123', timeline, currentDate);

      expect(assessment.firstResponse?.status).toBe('breached'); // 14 days > 5 days
      expect(assessment.investigation?.status).toBe('at_risk'); // 93% elapsed (14/15), triggers 80% threshold
      expect(assessment.criticalSlas).toContain('first_response');
      expect(assessment.criticalSlas).toContain('investigation');
    });

    it('should throw error if timeline has no submission event', () => {
      const timeline: TimelineEvent[] = [
        { timestamp: baseDate, type: 'acknowledged' }, // Missing submission
      ];

      expect(() => calculateCaseSlaStatus('case-123', timeline)).toThrow('submission event');
    });
  });

  describe('getAtRiskCases', () => {
    it('should filter cases that are at risk or breached', () => {
      const assessments = [
        {
          caseId: 'case-1',
          acknowledgment: { status: 'within_sla' as const, daysElapsed: 1, daysAllowed: 2, daysRemaining: 1, breachDate: null, description: '' },
          overallStatus: 'within_sla' as const,
          criticalSlas: [],
        },
        {
          caseId: 'case-2',
          acknowledgment: { status: 'at_risk' as const, daysElapsed: 1.7, daysAllowed: 2, daysRemaining: 0.3, breachDate: null, description: '' },
          overallStatus: 'at_risk' as const,
          criticalSlas: ['acknowledgment'],
        },
        {
          caseId: 'case-3',
          acknowledgment: { status: 'breached' as const, daysElapsed: 3, daysAllowed: 2, daysRemaining: -1, breachDate: null, description: '' },
          overallStatus: 'breached' as const,
          criticalSlas: ['acknowledgment'],
        },
      ];

      const atRisk = getAtRiskCases(assessments);

      expect(atRisk).toHaveLength(2);
      expect(atRisk.map((a) => a.caseId)).toEqual(['case-2', 'case-3']);
    });
  });

  describe('getBreachedCases', () => {
    it('should filter only breached cases', () => {
      const assessments = [
        {
          caseId: 'case-1',
          acknowledgment: { status: 'at_risk' as const, daysElapsed: 1.7, daysAllowed: 2, daysRemaining: 0.3, breachDate: null, description: '' },
          overallStatus: 'at_risk' as const,
          criticalSlas: [],
        },
        {
          caseId: 'case-2',
          acknowledgment: { status: 'breached' as const, daysElapsed: 3, daysAllowed: 2, daysRemaining: -1, breachDate: null, description: '' },
          overallStatus: 'breached' as const,
          criticalSlas: ['acknowledgment'],
        },
        {
          caseId: 'case-3',
          acknowledgment: { status: 'breached' as const, daysElapsed: 4, daysAllowed: 2, daysRemaining: -2, breachDate: null, description: '' },
          overallStatus: 'breached' as const,
          criticalSlas: ['acknowledgment'],
        },
      ];

      const breached = getBreachedCases(assessments);

      expect(breached).toHaveLength(2);
      expect(breached.map((a) => a.caseId)).toEqual(['case-2', 'case-3']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly at SLA deadline', () => {
      const submittedAt = baseDate;
      const acknowledgedAt = addBusinessDays(submittedAt, 2); // Exactly 2 days

      const result = calculateAcknowledgmentSla(submittedAt, acknowledgedAt);

      expect(result.status).toBe('within_sla');
      expect(result.daysRemaining).toBe(0);
    });

    it('should handle weekend spanning (business days only)', () => {
      // If submitted Friday, Monday is 1 business day later
      const friday = new Date('2026-01-09T09:00:00Z'); // Friday
      const monday = new Date('2026-01-12T09:00:00Z'); // Monday

      const result = calculateAcknowledgmentSla(friday, monday);

      expect(result.daysElapsed).toBe(1); // 1 business day
      expect(result.status).toBe('within_sla');
    });
  });
});
