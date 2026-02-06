/**
 * Break-Glass Emergency Access Integration Tests
 * Tests multi-key emergency access system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BreakGlassService } from '@/lib/services/break-glass-service';

describe('Break-Glass Emergency Access Integration', () => {
  let service: BreakGlassService;

  beforeEach(() => {
    service = new BreakGlassService();
  });

  describe('Emergency Declaration', () => {
    it('should declare emergency with Union Board resolution', async () => {
      const emergency = {
        type: 'cyberattack' as const,
        declaredBy: 'union_president',
        description: 'Ransomware attack on database servers',
        severity: 'critical' as const,
        affectedMembers: 5000
      };

      const result = await service.declareEmergency(
        emergency.type,
        emergency.declaredBy,
        emergency.description,
        emergency.severity,
        [],
        emergency.affectedMembers
      );

      expect(result.emergencyId).toBeDefined();
      expect(result.status).toBe('declared');
      expect(result.requiresBreakGlass).toBe(true);
    });

    it('should support all emergency types', async () => {
      const types = [
        'strike',
        'lockout',
        'cyberattack',
        'natural_disaster',
        'government_seizure',
        'infrastructure_failure'
      ] as const;

      for (const type of types) {
        const result = await service.declareEmergency(
          type,
          'union_president',
          `Test ${type} emergency`,
          'high',
          [],
          100
        );

        expect(result.type).toBe(type);
        expect(result.status).toBe('declared');
      }
    });

    it('should notify all 5 key holders', async () => {
      const emergencyId = 'emergency-123';

      const notification = await service.notifyKeyHolders(emergencyId, 'cyberattack');

      expect(notification.notified).toHaveLength(5);
      expect(notification.notified).toContain('union_president');
      expect(notification.notified).toContain('union_treasurer');
      expect(notification.notified).toContain('legal_counsel');
      expect(notification.notified).toContain('platform_cto');
      expect(notification.notified).toContain('independent_trustee');
    });
  });

  describe('Key Holder Verification', () => {
    it('should verify key holder identity (3-factor)', async () => {
      const keyHolder = {
        role: 'union_president' as const,
        governmentId: 'ON-123456789',
        biometric: 'fingerprint_hash_xyz',
        passphrase: 'correct-horse-battery-staple'
      };

      const verification = await service.verifyKeyHolder(keyHolder);

      expect(verification.verified).toBe(true);
      expect(verification.role).toBe('union_president');
    });

    it('should require all 3 authentication factors', async () => {
      // Missing biometric
      const incomplete = {
        role: 'union_treasurer' as const,
        governmentId: 'ON-987654321',
        biometric: '',
        passphrase: 'test-passphrase'
      };

      await expect(
        service.verifyKeyHolder(incomplete)
      ).rejects.toThrow('All authentication factors required');
    });

    it('should track key holder verification attempts', async () => {
      const keyHolder = {
        role: 'legal_counsel' as const,
        governmentId: 'ON-111222333',
        biometric: 'iris_scan_abc',
        passphrase: 'legal-counsel-phrase'
      };

      const result = await service.verifyKeyHolder(keyHolder);

      expect(result.verifiedAt).toBeDefined();
      expect(result.verificationType).toBe('physical_presence');
    });
  });

  describe('Multi-Signature Activation', () => {
    it('should require exactly 3 of 5 key holders', async () => {
      const emergencyId = 'emergency-456';
      const keyHolders = [
        { role: 'union_president' as const, governmentId: 'ID1', biometric: 'bio1', passphrase: 'pass1' },
        { role: 'union_treasurer' as const, governmentId: 'ID2', biometric: 'bio2', passphrase: 'pass2' },
        { role: 'legal_counsel' as const, governmentId: 'ID3', biometric: 'bio3', passphrase: 'pass3' }
      ];

      const activation = await service.activateBreakGlass(emergencyId, keyHolders);

      expect(activation.activated).toBe(true);
      expect(activation.keyHoldersPresent).toBe(3);
      expect(activation.masterKeyReconstructed).toBe(true);
    });

    it('should fail with fewer than 3 key holders', async () => {
      const emergencyId = 'emergency-789';
      const insufficientKeys = [
        { role: 'union_president' as const, governmentId: 'ID1', biometric: 'bio1', passphrase: 'pass1' },
        { role: 'union_treasurer' as const, governmentId: 'ID2', biometric: 'bio2', passphrase: 'pass2' }
      ];

      await expect(
        service.activateBreakGlass(emergencyId, insufficientKeys)
      ).rejects.toThrow('Requires 3 of 5 key holders');
    });

    it('should combine key fragments using Shamir Secret Sharing', async () => {
      const fragments = [
        'fragment_a123',
        'fragment_b456',
        'fragment_c789'
      ];

      const masterKey = await service.combineKeyFragments(fragments);

      expect(masterKey).toBeDefined();
      expect(masterKey.length).toBeGreaterThan(0);
      expect(masterKey.startsWith('master_key_')).toBe(true);
    });
  });

  describe('48-Hour Disaster Recovery', () => {
    it('should execute 48-hour recovery drill', async () => {
      const coldStorageAccess = {
        swissVault: 'swiss_credentials_encrypted',
        canadianVault: 'canadian_credentials_encrypted',
        decryptionKey: 'master_key_reconstructed'
      };

      const recovery = await service.recover48Hour('swiss', coldStorageAccess);

      expect(recovery.completed).toBe(true);
      expect(recovery.steps).toHaveLength(5);
      expect(recovery.steps[0]).toContain('Download encrypted backup');
      expect(recovery.steps[4]).toContain('Notify all members');
    });

    it('should decrypt cold storage credentials', async () => {
      const masterKey = 'master_key_xyz789';

      const credentials = await service.decryptColdStorageAccess(masterKey);

      expect(credentials).toHaveProperty('swissVault');
      expect(credentials).toHaveProperty('canadianVault');
    });

    it('should verify backup integrity during recovery', async () => {
      const coldStorageAccess = {
        swissVault: 'vault_access',
        canadianVault: 'vault_backup',
        decryptionKey: 'key_xyz'
      };

      const recovery = await service.recover48Hour('canadian', coldStorageAccess);

      const integrityStep = recovery.steps.find(s => s.includes('Verify data integrity'));
      expect(integrityStep).toBeDefined();
    });
  });

  describe('Independent Audit Requirements', () => {
    it('should schedule audit within 7 days', async () => {
      const emergencyId = 'emergency-audit-test';

      const audit = await service.scheduleAudit(emergencyId);

      expect(audit.scheduled).toBe(true);
      expect(audit.deadline).toBeDefined();

      const deadlineDays = (new Date(audit.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(deadlineDays).toBeLessThanOrEqual(7);
    });

    it('should require independent auditor', async () => {
      const emergencyId = 'emergency-independent';

      const audit = await service.scheduleAudit(emergencyId);

      expect(audit.auditorType).toBe('independent');
      expect(audit.auditorCannotBe).toContain('union_staff');
    });

    it('should track audit completion status', async () => {
      const emergencyId = 'emergency-status';

      const audit = await service.scheduleAudit(emergencyId);

      expect(audit.status).toBe('scheduled');
      expect(audit).toHaveProperty('completionDeadline');
    });
  });

  describe('Emergency Resolution', () => {
    it('should resolve emergency and deactivate break-glass', async () => {
      const emergencyId = 'emergency-resolve';

      const resolution = await service.resolveEmergency(emergencyId);

      expect(resolution.resolved).toBe(true);
      expect(resolution.breakGlassDeactivated).toBe(true);
      expect(resolution.auditRequired).toBe(true);
    });

    it('should generate post-emergency report', async () => {
      const emergencyId = 'emergency-report';

      const resolution = await service.resolveEmergency(emergencyId);

      expect(resolution.report).toBeDefined();
      expect(resolution.report).toHaveProperty('duration');
      expect(resolution.report).toHaveProperty('actionsPlanned');
    });
  });

  describe('Emergency Status Tracking', () => {
    it('should get emergency status at any time', async () => {
      const emergencyId = 'emergency-status-check';

      const status = await service.getEmergencyStatus(emergencyId);

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('declaredAt');
      expect(status).toHaveProperty('breakGlassActivated');
    });

    it('should list all active emergencies', async () => {
      const activeEmergencies = await service.getActiveEmergencies();

      expect(Array.isArray(activeEmergencies)).toBe(true);
      
      for (const emergency of activeEmergencies) {
        expect(emergency.status).not.toBe('resolved');
      }
    });
  });

  describe('Security Controls', () => {
    it('should require physical presence for key holder verification', async () => {
      const keyHolder = {
        role: 'platform_cto' as const,
        governmentId: 'ON-555666777',
        biometric: 'retina_scan',
        passphrase: 'cto-secure-phrase'
      };

      const verification = await service.verifyKeyHolder(keyHolder);

      expect(verification.physicalPresence).toBe(true);
      expect(verification.remoteActivation).toBe(false);
    });

    it('should log all break-glass access attempts', async () => {
      const emergencyId = 'emergency-audit-log';

      const status = await service.getEmergencyStatus(emergencyId);

      expect(status).toHaveProperty('auditLog');
      expect(Array.isArray(status.auditLog)).toBe(true);
    });
  });
});
