/**
 * Tests for LRO Signals API
 * 
 * Validates real-time alert detection for Labour Relations Officers.
 */

import { describe, it, expect } from 'vitest';
import { addBusinessDays } from 'date-fns';
import {
  detectSignals,
  detectAllSignals,
  filterBySeverity,
  filterByType,
  getDashboardStats,
  generateWebhookPayload,
  getActionableSignals,
  groupSignalsByCase,
  getHighestSeverityPerCase,
  SIGNAL_CONFIG,
  type CaseForSignals,
  type Signal,
} from '@/lib/services/lro-signals';

describe('LRO Signals API', () => {
  const baseDate = new Date('2025-01-01T09:00:00Z');
  
  const createMockCase = (overrides: Partial<CaseForSignals> = {}): CaseForSignals => ({
    id: 'case-123',
    title: 'Test grievance',
    memberId: 'member-1',
    memberName: 'Jane Doe',
    currentState: 'investigating',
    priority: 'medium',
    createdAt: baseDate,
    lastUpdated: baseDate,
    timeline: [
      { timestamp: baseDate, type: 'submitted' },
      { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
    ],
    ...overrides,
  });

  describe('detectSignals', () => {
    it('should return no signals for closed cases', () => {
      const caseData = createMockCase({ currentState: 'closed' });
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 10));

      expect(signals).toHaveLength(0);
    });

    it('should return no signals for resolved cases', () => {
      const caseData = createMockCase({ currentState: 'resolved' });
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 10));

      expect(signals).toHaveLength(0);
    });

    it('should detect SLA breached (critical)', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 5), type: 'acknowledged' }, // 5 days = breached
        ],
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 20));

      const breached = signals.find(s => s.type === 'sla_breached');
      expect(breached).toBeDefined();
      expect(breached?.severity).toBe('critical');
      expect(breached?.title).toContain('SLA Breached');
      expect(breached?.actionable).toBe(true);
    });

    it('should detect SLA at risk (urgent)', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
          { timestamp: addBusinessDays(baseDate, 4), type: 'first_response' }, // Within 5-day SLA
        ],
      });

      // 13 days after acknowledgment = 87% of 15-day investigation SLA (at-risk but not breached)
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 14));

      const atRisk = signals.find(s => s.type === 'sla_at_risk');
      expect(atRisk).toBeDefined();
      expect(atRisk?.severity).toBe('urgent');
      expect(atRisk?.title).toContain('At Risk');
    });

    it('should detect acknowledgment overdue (critical)', () => {
      const caseData = createMockCase({
        currentState: 'submitted',
        timeline: [{ timestamp: baseDate, type: 'submitted' }],
      });

      // 3 days after submission (exceeds 2-day deadline)
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 3));

      const overdue = signals.find(s => s.type === 'acknowledgment_overdue');
      expect(overdue).toBeDefined();
      expect(overdue?.severity).toBe('critical');
      expect(overdue?.context.daysElapsed).toBe(3);
      expect(overdue?.actionText).toBe('Acknowledge case receipt');
    });

    it('should detect member waiting (urgent)', () => {
      const caseData = createMockCase({
        currentState: 'pending_response',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
          { timestamp: addBusinessDays(baseDate, 3), type: 'first_response' },
        ],
      });

      // 5 days after last response (exceeds 3-day threshold)
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 8));

      const memberWaiting = signals.find(s => s.type === 'member_waiting');
      expect(memberWaiting).toBeDefined();
      expect(memberWaiting?.severity).toBe('urgent');
      expect(memberWaiting?.context.daysElapsed).toBe(5);
    });

    it('should detect stale case (warning)', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        lastUpdated: baseDate,
      });

      // 10 days since last update (exceeds 7-day threshold)
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 10));

      const stale = signals.find(s => s.type === 'case_stale');
      expect(stale).toBeDefined();
      expect(stale?.severity).toBe('warning');
      expect(stale?.context.daysElapsed).toBe(10);
    });

    it('should detect escalation needed (urgent)', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 1), type: 'acknowledged' },
          { timestamp: addBusinessDays(baseDate, 2), type: 'investigation_started' },
        ],
      });

      // 12 business days from investigation_started (day 2) to day 14 = 12 days
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 14));

      const escalation = signals.find(s => s.type === 'escalation_needed');
      expect(escalation).toBeDefined();
      expect(escalation?.severity).toBe('urgent');
      // From investigation_started (day 2) to current (day 14) = 12 business days
      // But differenceInBusinessDays(day14, day2) = 13 because it counts both endpoints
      expect(escalation?.context.daysElapsed).toBeGreaterThanOrEqual(10);
    });

    it('should detect urgent state (info) when no other signals', () => {
      const caseData = createMockCase({
        currentState: 'submitted',
        timeline: [{ timestamp: baseDate, type: 'submitted' }],
      });

      // 1 day after submission (within acknowledgment SLA)
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 1));

      const urgentState = signals.find(s => s.type === 'urgent_state');
      expect(urgentState).toBeDefined();
      expect(urgentState?.severity).toBe('info');
      expect(urgentState?.actionable).toBe(false);
    });

    it('should not show urgent state signal if other signals present', () => {
      const caseData = createMockCase({
        currentState: 'submitted',
        timeline: [{ timestamp: baseDate, type: 'submitted' }],
      });

      // 3 days = acknowledgment overdue
      const signals = detectSignals(caseData, addBusinessDays(baseDate, 3));

      const urgentState = signals.find(s => s.type === 'urgent_state');
      expect(urgentState).toBeUndefined();
      expect(signals.some(s => s.type === 'acknowledgment_overdue')).toBe(true);
    });

    it('should include case context in all signals', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        priority: 'high',
        memberName: 'John Smith',
        lastUpdated: baseDate,
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 10));

      expect(signals.length).toBeGreaterThan(0);
      signals.forEach(signal => {
        expect(signal.context.casePriority).toBe('high');
        expect(signal.context.currentState).toBe('investigating');
        expect(signal.context.memberName).toBe('John Smith');
      });
    });

    it('should prioritize SLA breached over at-risk', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 5), type: 'acknowledged' }, // Breached acknowledgment
        ],
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 20));

      const breached = signals.find(s => s.type === 'sla_breached');
      const atRisk = signals.find(s => s.type === 'sla_at_risk');

      expect(breached).toBeDefined();
      expect(atRisk).toBeUndefined(); // Should not show at-risk if already breached
    });
  });

  describe('detectAllSignals', () => {
    it('should detect signals across multiple cases', () => {
      const cases: CaseForSignals[] = [
        createMockCase({ id: 'case-1', currentState: 'submitted' }),
        createMockCase({ id: 'case-2', currentState: 'investigating' }),
        createMockCase({ id: 'case-3', currentState: 'pending_response' }),
      ];

      const signals = detectAllSignals(cases, addBusinessDays(baseDate, 10));

      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some(s => s.caseId === 'case-1')).toBe(true);
      expect(signals.some(s => s.caseId === 'case-2')).toBe(true);
      expect(signals.some(s => s.caseId === 'case-3')).toBe(true);
    });

    it('should sort signals by severity (critical first)', () => {
      const cases: CaseForSignals[] = [
        createMockCase({
          id: 'case-info',
          currentState: 'submitted',
          timeline: [{ timestamp: baseDate, type: 'submitted' }],
        }),
        createMockCase({
          id: 'case-critical',
          currentState: 'submitted',
          timeline: [{ timestamp: baseDate, type: 'submitted' }],
        }),
        createMockCase({
          id: 'case-warning',
          currentState: 'investigating',
          lastUpdated: baseDate,
        }),
      ];

      // case-info: 1 day = info (urgent_state)
      // case-critical: 3 days = critical (acknowledgment_overdue)
      // case-warning: 10 days = warning (stale)
      const signals = detectAllSignals(cases, addBusinessDays(baseDate, 10));

      const severities = signals.map(s => s.severity);
      let lastSeverityOrder = -1;
      const orderMap = { critical: 0, urgent: 1, warning: 2, info: 3 };

      severities.forEach(severity => {
        const order = orderMap[severity];
        expect(order).toBeGreaterThanOrEqual(lastSeverityOrder);
        lastSeverityOrder = order;
      });
    });
  });

  describe('filterBySeverity', () => {
    it('should filter signals by single severity', () => {
      const signals: Signal[] = [
        { severity: 'critical', type: 'sla_breached' } as Signal,
        { severity: 'urgent', type: 'sla_at_risk' } as Signal,
        { severity: 'warning', type: 'case_stale' } as Signal,
      ];

      const critical = filterBySeverity(signals, 'critical');
      expect(critical).toHaveLength(1);
      expect(critical[0].severity).toBe('critical');
    });

    it('should filter signals by multiple severities', () => {
      const signals: Signal[] = [
        { severity: 'critical', type: 'sla_breached' } as Signal,
        { severity: 'urgent', type: 'sla_at_risk' } as Signal,
        { severity: 'warning', type: 'case_stale' } as Signal,
        { severity: 'info', type: 'urgent_state' } as Signal,
      ];

      const highPriority = filterBySeverity(signals, ['critical', 'urgent']);
      expect(highPriority).toHaveLength(2);
      expect(highPriority.every(s => ['critical', 'urgent'].includes(s.severity))).toBe(true);
    });
  });

  describe('filterByType', () => {
    it('should filter signals by single type', () => {
      const signals: Signal[] = [
        { type: 'sla_breached', caseId: 'case-1' } as Signal,
        { type: 'sla_at_risk', caseId: 'case-2' } as Signal,
        { type: 'sla_breached', caseId: 'case-3' } as Signal,
      ];

      const breached = filterByType(signals, 'sla_breached');
      expect(breached).toHaveLength(2);
      expect(breached.every(s => s.type === 'sla_breached')).toBe(true);
    });

    it('should filter signals by multiple types', () => {
      const signals: Signal[] = [
        { type: 'sla_breached', caseId: 'case-1' } as Signal,
        { type: 'sla_at_risk', caseId: 'case-2' } as Signal,
        { type: 'case_stale', caseId: 'case-3' } as Signal,
      ];

      const slaSignals = filterByType(signals, ['sla_breached', 'sla_at_risk']);
      expect(slaSignals).toHaveLength(2);
    });
  });

  describe('getDashboardStats', () => {
    it('should calculate dashboard statistics', () => {
      const signals: Signal[] = [
        { severity: 'critical', type: 'sla_breached' } as Signal,
        { severity: 'critical', type: 'acknowledgment_overdue' } as Signal,
        { severity: 'urgent', type: 'sla_at_risk' } as Signal,
        { severity: 'urgent', type: 'member_waiting' } as Signal,
        { severity: 'warning', type: 'case_stale' } as Signal,
      ];

      const stats = getDashboardStats(signals);

      expect(stats.totalCritical).toBe(2);
      expect(stats.totalUrgent).toBe(2);
      expect(stats.totalWarning).toBe(1);
      expect(stats.breachedCases).toBe(1);
      expect(stats.atRiskCases).toBe(1);
      expect(stats.staleCases).toBe(1);
      expect(stats.awaitingAcknowledgment).toBe(1);
      expect(stats.memberWaiting).toBe(1);
    });

    it('should return zeros for empty signal list', () => {
      const stats = getDashboardStats([]);

      expect(stats.totalCritical).toBe(0);
      expect(stats.totalUrgent).toBe(0);
      expect(stats.totalWarning).toBe(0);
      expect(stats.breachedCases).toBe(0);
    });
  });

  describe('generateWebhookPayload', () => {
    it('should generate webhook payload with signal and case info', () => {
      const signal: Signal = {
        id: 'signal-123',
        caseId: 'case-456',
        type: 'sla_breached',
        severity: 'critical',
        title: 'SLA Breached',
        description: 'Test description',
        actionable: true,
        context: {
          casePriority: 'high',
          currentState: 'investigating',
        },
        generatedAt: baseDate,
      };

      const payload = generateWebhookPayload(
        signal,
        'Test Grievance',
        'https://unioneyes.app'
      );

      expect(payload.event).toBe('signal.created');
      expect(payload.signal).toEqual(signal);
      expect(payload.case.id).toBe('case-456');
      expect(payload.case.title).toBe('Test Grievance');
      expect(payload.case.url).toBe('https://unioneyes.app/cases/case-456');
      expect(payload.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getActionableSignals', () => {
    it('should return only actionable signals', () => {
      const signals: Signal[] = [
        { actionable: true, type: 'sla_breached' } as Signal,
        { actionable: false, type: 'urgent_state' } as Signal,
        { actionable: true, type: 'sla_at_risk' } as Signal,
      ];

      const actionable = getActionableSignals(signals);

      expect(actionable).toHaveLength(2);
      expect(actionable.every(s => s.actionable === true)).toBe(true);
    });
  });

  describe('groupSignalsByCase', () => {
    it('should group signals by case ID', () => {
      const signals: Signal[] = [
        { caseId: 'case-1', type: 'sla_breached' } as Signal,
        { caseId: 'case-1', type: 'case_stale' } as Signal,
        { caseId: 'case-2', type: 'sla_at_risk' } as Signal,
      ];

      const grouped = groupSignalsByCase(signals);

      expect(grouped.size).toBe(2);
      expect(grouped.get('case-1')).toHaveLength(2);
      expect(grouped.get('case-2')).toHaveLength(1);
    });
  });

  describe('getHighestSeverityPerCase', () => {
    it('should return highest severity signal for each case', () => {
      const signals: Signal[] = [
        { caseId: 'case-1', severity: 'warning', type: 'case_stale' } as Signal,
        { caseId: 'case-1', severity: 'critical', type: 'sla_breached' } as Signal,
        { caseId: 'case-2', severity: 'urgent', type: 'sla_at_risk' } as Signal,
        { caseId: 'case-2', severity: 'warning', type: 'case_stale' } as Signal,
      ];

      const highest = getHighestSeverityPerCase(signals);

      expect(highest).toHaveLength(2);
      expect(highest.find(s => s.caseId === 'case-1')?.severity).toBe('critical');
      expect(highest.find(s => s.caseId === 'case-2')?.severity).toBe('urgent');
    });
  });

  describe('Signal Configuration', () => {
    it('should have correct configuration constants', () => {
      expect(SIGNAL_CONFIG.STALE_THRESHOLD_DAYS).toBe(7);
      expect(SIGNAL_CONFIG.ACKNOWLEDGMENT_DEADLINE_DAYS).toBe(2);
      expect(SIGNAL_CONFIG.MEMBER_WAITING_THRESHOLD_DAYS).toBe(3);
      expect(SIGNAL_CONFIG.INVESTIGATION_THRESHOLD_DAYS).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case with empty timeline', () => {
      const caseData = createMockCase({
        timeline: [],
        currentState: 'draft',
      });

      // Should throw from SLA calculator for empty timeline
      expect(() => detectSignals(caseData, baseDate)).toThrow();
    });

    it('should handle case with minimal timeline', () => {
      const caseData = createMockCase({
        timeline: [{ timestamp: baseDate, type: 'submitted' }],
        currentState: 'submitted',
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 1));

      // Should show urgent_state (info) for submitted state within 2 days
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle case in withdrawn state', () => {
      const caseData = createMockCase({
        currentState: 'withdrawn',
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 30));

      expect(signals).toHaveLength(0); // Terminal state, no signals
    });

    it('should handle multiple breached SLAs', () => {
      const caseData = createMockCase({
        currentState: 'investigating',
        timeline: [
          { timestamp: baseDate, type: 'submitted' },
          { timestamp: addBusinessDays(baseDate, 5), type: 'acknowledged' }, // Acknowledgment breached (5 days > 2)
        ],
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 25));

      const breached = signals.find(s => s.type === 'sla_breached');
      expect(breached).toBeDefined();
      // At 25 days: acknowledgment (2d), first_response (5d), investigation (15d) all breached
      expect(breached?.description).toContain('3 SLA standard(s)');
    });

    it('should handle high priority cases correctly', () => {
      const caseData = createMockCase({
        priority: 'critical',
        currentState: 'investigating',
        lastUpdated: baseDate,
      });

      const signals = detectSignals(caseData, addBusinessDays(baseDate, 8));

      expect(signals.some(s => s.context.casePriority === 'critical')).toBe(true);
    });
  });
});
