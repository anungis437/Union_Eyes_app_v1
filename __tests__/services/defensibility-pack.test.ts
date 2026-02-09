/**
 * Tests for Defensibility Pack Service
 * 
 * Validates system-of-record export generation for arbitration proceedings.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDefensibilityPack,
  verifyPackIntegrity,
  generateArbitrationSummary,
  exportToJson,
  filterTimelineForAudience,
  type TimelineEvent,
  type AuditEntry,
  type StateTransition,
  type DefensibilityPack,
} from '@/lib/services/defensibility-pack';
import { addBusinessDays } from 'date-fns';

describe('Defensibility Pack Service', () => {
  const baseDate = new Date('2025-01-01T09:00:00Z');
  
  const mockTimeline: TimelineEvent[] = [
    {
      id: 'evt-1',
      caseId: 'case-123',
      timestamp: baseDate,
      type: 'submitted',
      description: 'Case submitted by member',
      actorId: 'member-1',
      actorRole: 'member',
      visibilityScope: 'member',
    },
    {
      id: 'evt-2',
      caseId: 'case-123',
      timestamp: addBusinessDays(baseDate, 1),
      type: 'acknowledged',
      description: 'Receipt acknowledged by officer',
      actorId: 'officer-1',
      actorRole: 'officer',
      visibilityScope: 'member',
    },
    {
      id: 'evt-3',
      caseId: 'case-123',
      timestamp: addBusinessDays(baseDate, 2),
      type: 'other',
      description: 'Investigation initiated',
      actorId: 'officer-1',
      actorRole: 'officer',
      visibilityScope: 'staff',
      metadata: { investigator: 'officer-1' },
    },
    {
      id: 'evt-4',
      caseId: 'case-123',
      timestamp: addBusinessDays(baseDate, 3),
      type: 'first_response',
      description: 'Initial response sent to member',
      actorId: 'officer-1',
      actorRole: 'officer',
      visibilityScope: 'member',
    },
    {
      id: 'evt-5',
      caseId: 'case-123',
      timestamp: addBusinessDays(baseDate, 5),
      type: 'other',
      description: 'Officer strategy discussion',
      actorId: 'officer-1',
      actorRole: 'officer',
      visibilityScope: 'admin',
    },
  ];
  
  const mockAuditTrail: AuditEntry[] = [
    {
      id: 'audit-1',
      timestamp: baseDate,
      userId: 'member-1',
      action: 'case.created',
      resourceType: 'case',
      resourceId: 'case-123',
      sanitizedMetadata: { title: 'Disciplinary action grievance' },
    },
    {
      id: 'audit-2',
      timestamp: addBusinessDays(baseDate, 1),
      userId: 'officer-1',
      action: 'case.acknowledged',
      resourceType: 'case',
      resourceId: 'case-123',
      sanitizedMetadata: { sla_compliant: true },
      ipAddress: '192.168.1.100',
    },
  ];
  
  const mockStateTransitions: StateTransition[] = [
    {
      timestamp: baseDate,
      fromState: 'draft',
      toState: 'submitted',
      actorRole: 'member',
      validationPassed: true,
    },
    {
      timestamp: addBusinessDays(baseDate, 1),
      fromState: 'submitted',
      toState: 'acknowledged',
      actorRole: 'officer',
      reason: 'SLA compliant acknowledgment',
      validationPassed: true,
    },
    {
      timestamp: addBusinessDays(baseDate, 2),
      fromState: 'acknowledged',
      toState: 'investigating',
      actorRole: 'officer',
      validationPassed: true,
    },
  ];
  
  const mockCaseSummary: DefensibilityPack['caseSummary'] = {
    title: 'Disciplinary action grievance',
    memberId: 'member-1',
    memberName: 'Jane Doe',
    currentState: 'investigating',
    createdAt: baseDate,
    lastUpdated: addBusinessDays(baseDate, 5),
    grievanceType: 'disciplinary',
    priority: 'high',
  };

  describe('generateDefensibilityPack', () => {
    it('should generate complete defensibility pack', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          includeSensitiveData: false,
          caseSummary: mockCaseSummary,
          generatedBy: 'system',
        }
      );

      expect(pack.caseId).toBe('case-123');
      expect(pack.exportVersion).toBe('1.0.0');
      expect(pack.generatedBy).toBe('system');
      expect(pack.caseSummary).toEqual(mockCaseSummary);
      expect(pack.exportMetadata.purpose).toBe('arbitration');
    });

    it('should include member-visible timeline (member + staff scopes)', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'member_request',
          requestedBy: 'member-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'member-1',
        }
      );

      // Member should see: member + staff scopes (not admin/system)
      expect(pack.memberVisibleTimeline).toHaveLength(4);
      expect(pack.memberVisibleTimeline.some((e) => e.visibilityScope === 'member')).toBe(true);
      expect(pack.memberVisibleTimeline.some((e) => e.visibilityScope === 'staff')).toBe(true);
      expect(pack.memberVisibleTimeline.some((e) => e.visibilityScope === 'admin')).toBe(false);
    });

    it('should include staff-visible timeline (all except system)', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'audit',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      // Staff should see: member + staff + admin (not system)
      expect(pack.staffVisibleTimeline).toHaveLength(5);
      expect(pack.staffVisibleTimeline.some((e) => e.visibilityScope === 'admin')).toBe(true);
    });

    it('should include complete audit trail', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'audit',
          requestedBy: 'admin-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'admin-1',
        }
      );

      expect(pack.auditTrail).toHaveLength(2);
      expect(pack.auditTrail[0].action).toBe('case.created');
      expect(pack.auditTrail[1].action).toBe('case.acknowledged');
    });

    it('should include state transition history', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      expect(pack.stateTransitions).toHaveLength(3);
      expect(pack.stateTransitions[0].fromState).toBe('draft');
      expect(pack.stateTransitions[0].toState).toBe('submitted');
      expect(pack.stateTransitions[1].reason).toBe('SLA compliant acknowledgment');
    });

    it('should calculate SLA compliance', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      expect(pack.slaCompliance.length).toBeGreaterThan(0);
      
      const acknowledgmentSla = pack.slaCompliance.find(
        (s) => s.standard === 'Acknowledgment of Receipt'
      );
      expect(acknowledgmentSla).toBeDefined();
      expect(acknowledgmentSla?.required).toBe('2 business days');
      expect(acknowledgmentSla?.status).toBe('within_sla'); // 1 day < 2 days
    });

    it('should generate integrity hashes', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      expect(pack.integrity.timelineHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(pack.integrity.auditHash).toMatch(/^[a-f0-9]{64}$/);
      expect(pack.integrity.stateTransitionHash).toMatch(/^[a-f0-9]{64}$/);
      expect(pack.integrity.combinedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should respect includeSensitiveData flag', async () => {
      const packWithSensitive = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'compliance',
          requestedBy: 'admin-1',
          exportFormat: 'json',
          includeSensitiveData: true,
          caseSummary: mockCaseSummary,
          generatedBy: 'admin-1',
        }
      );

      expect(packWithSensitive.exportMetadata.includeSensitiveData).toBe(true);

      const packWithoutSensitive = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          includeSensitiveData: false,
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      expect(packWithoutSensitive.exportMetadata.includeSensitiveData).toBe(false);
    });
  });

  describe('verifyPackIntegrity', () => {
    it('should pass verification for unmodified pack', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const verification = verifyPackIntegrity(pack);

      expect(verification.valid).toBe(true);
      expect(verification.failures).toHaveLength(0);
    });

    it('should detect timeline tampering', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      // Tamper with timeline
      pack.staffVisibleTimeline.push({
        id: 'fake-event',
        caseId: 'case-123',
        timestamp: new Date(),
        type: 'other',
        description: 'Injected event',
        actorId: 'attacker',
        actorRole: 'admin',
        visibilityScope: 'staff',
      });

      const verification = verifyPackIntegrity(pack);

      expect(verification.valid).toBe(false);
      expect(verification.failures).toContain('Timeline integrity check failed');
      expect(verification.failures).toContain('Combined integrity check failed');
    });

    it('should detect audit trail tampering', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      // Tamper with audit trail
      pack.auditTrail[0].sanitizedMetadata.title = 'Modified title';

      const verification = verifyPackIntegrity(pack);

      expect(verification.valid).toBe(false);
      expect(verification.failures).toContain('Audit trail integrity check failed');
    });

    it('should detect state transition tampering', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      // Tamper with state transitions
      pack.stateTransitions[0].validationPassed = false;

      const verification = verifyPackIntegrity(pack);

      expect(verification.valid).toBe(false);
      expect(verification.failures).toContain('State transition integrity check failed');
    });
  });

  describe('generateArbitrationSummary', () => {
    it('should generate human-readable summary', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const summary = generateArbitrationSummary(pack);

      expect(summary).toContain('GRIEVANCE CASE SUMMARY');
      expect(summary).toContain('Case ID: case-123');
      expect(summary).toContain('Member: Jane Doe');
      expect(summary).toContain('SLA COMPLIANCE');
      expect(summary).toContain('WORKFLOW PROGRESSION');
      expect(summary).toContain('MEMBER-VISIBLE TIMELINE');
      expect(summary).toContain('INTEGRITY VERIFICATION');
    });

    it('should include all SLA statuses', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const summary = generateArbitrationSummary(pack);

      expect(summary).toContain('Acknowledgment of Receipt');
      expect(summary).toContain('First Response to Member');
      expect(summary).toContain('Investigation Complete');
    });

    it('should include state transitions with reasons', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const summary = generateArbitrationSummary(pack);

      expect(summary).toContain('draft → submitted');
      expect(summary).toContain('submitted → acknowledged');
      expect(summary).toContain('SLA compliant acknowledgment');
    });

    it('should include integrity hashes in summary', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const summary = generateArbitrationSummary(pack);

      expect(summary).toContain(`Timeline Hash: ${pack.integrity.timelineHash}`);
      expect(summary).toContain(`Combined Hash: ${pack.integrity.combinedHash}`);
    });
  });

  describe('exportToJson', () => {
    it('should export pack as formatted JSON', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const json = exportToJson(pack);
      const parsed = JSON.parse(json);

      expect(parsed.caseId).toBe('case-123');
      expect(parsed.exportVersion).toBe('1.0.0');
      expect(parsed.integrity).toBeDefined();
    });

    it('should produce valid JSON', async () => {
      const pack = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const json = exportToJson(pack);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('filterTimelineForAudience', () => {
    it('should filter timeline for member audience', () => {
      const filtered = filterTimelineForAudience(mockTimeline, 'member');

      expect(filtered.every((e) => e.visibilityScope === 'member')).toBe(true);
      expect(filtered).toHaveLength(3); // Only 'member' scope events
    });

    it('should filter timeline for staff audience', () => {
      const filtered = filterTimelineForAudience(mockTimeline, 'staff');

      expect(filtered.some((e) => e.visibilityScope === 'member')).toBe(true);
      expect(filtered.some((e) => e.visibilityScope === 'staff')).toBe(true);
      expect(filtered.some((e) => e.visibilityScope === 'admin')).toBe(false);
      expect(filtered).toHaveLength(4); // member + staff events
    });

    it('should filter timeline for admin audience', () => {
      const filtered = filterTimelineForAudience(mockTimeline, 'admin');

      expect(filtered.some((e) => e.visibilityScope === 'member')).toBe(true);
      expect(filtered.some((e) => e.visibilityScope === 'staff')).toBe(true);
      expect(filtered.some((e) => e.visibilityScope === 'admin')).toBe(true);
      expect(filtered).toHaveLength(5); // All events (no 'system' in mock)
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle empty timeline', async () => {
      const pack = await generateDefensibilityPack(
        'case-empty',
        [],
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'audit',
          requestedBy: 'admin-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'admin-1',
        }
      );

      expect(pack.memberVisibleTimeline).toHaveLength(0);
      expect(pack.staffVisibleTimeline).toHaveLength(0);
      expect(pack.integrity.timelineHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty audit trail', async () => {
      const pack = await generateDefensibilityPack(
        'case-no-audit',
        mockTimeline,
        [],
        mockStateTransitions,
        {
          purpose: 'audit',
          requestedBy: 'admin-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'admin-1',
        }
      );

      expect(pack.auditTrail).toHaveLength(0);
      expect(pack.integrity.auditHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle case with no state transitions yet', async () => {
      const pack = await generateDefensibilityPack(
        'case-draft',
        mockTimeline,
        mockAuditTrail,
        [],
        {
          purpose: 'audit',
          requestedBy: 'admin-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'admin-1',
        }
      );

      expect(pack.stateTransitions).toHaveLength(0);
      const summary = generateArbitrationSummary(pack);
      expect(summary).toContain('WORKFLOW PROGRESSION');
    });

    it('should maintain hash consistency across multiple export attempts', async () => {
      const pack1 = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      const pack2 = await generateDefensibilityPack(
        'case-123',
        mockTimeline,
        mockAuditTrail,
        mockStateTransitions,
        {
          purpose: 'arbitration',
          requestedBy: 'officer-1',
          exportFormat: 'json',
          caseSummary: mockCaseSummary,
          generatedBy: 'officer-1',
        }
      );

      expect(pack1.integrity.timelineHash).toBe(pack2.integrity.timelineHash);
      expect(pack1.integrity.auditHash).toBe(pack2.integrity.auditHash);
      expect(pack1.integrity.combinedHash).toBe(pack2.integrity.combinedHash);
    });
  });
});
