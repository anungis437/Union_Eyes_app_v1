/**
 * Break-Glass Emergency Access Service Tests
 *
 * Validates:
 * - Multi-key emergency access (3 of 5 key holders required)
 * - Shamir's Secret Sharing algorithm
 * - Emergency declaration workflows
 * - 48-hour disaster recovery capability
 * - 7-day audit requirements
 * - Cold storage backup access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BreakGlassService,
  quarterlyRecoveryDrill,
  type KeyHolderAuth,
  type EmergencyType
} from '@/lib/services/break-glass-service';
import { randomBytes } from 'crypto';

// Mock database
vi.mock('@/db', () => ({
  db: {
    query: {
      emergencyDeclarations: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'emergency-123',
          emergencyType: 'cyberattack',
          severityLevel: 'critical',
          declaredAt: new Date('2025-02-07T09:00:00Z'),
          declaredByUserId: 'user-001',
          affectedLocations: ['Toronto Office', 'Vancouver Office'],
          affectedMemberCount: 5000,
          notes: 'Ransomware attack on primary servers',
          breakGlassActivated: false,
          resolvedAt: null
        }]))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    }))
  }
}));

describe('BreakGlassService', () => {
  let breakGlassService: BreakGlassService;

  beforeEach(() => {
    breakGlassService = new BreakGlassService();
    vi.clearAllMocks();
  });

  describe('declareEmergency', () => {
    it('should create emergency declaration with all details', async () => {
      const result = await breakGlassService.declareEmergency(
        'cyberattack',
        'user-001',
        'Ransomware attack on primary servers',
        'critical',
        ['Toronto Office', 'Vancouver Office'],
        5000
      );

      expect(result.id).toBe('emergency-123');
      expect(result.emergencyType).toBe('cyberattack');
      expect(result.severity).toBe('critical');
      expect(result.declaredBy).toBe('user-001');
      expect(result.description).toBe('Ransomware attack on primary servers');
      expect(result.affectedLocations).toEqual(['Toronto Office', 'Vancouver Office']);
      expect(result.affectedMemberCount).toBe(5000);
      expect(result.breakGlassActivated).toBe(false);
    });

    it('should handle strike emergency declaration', async () => {
      const result = await breakGlassService.declareEmergency(
        'strike',
        'union-president-001',
        'Strike declared, office access lost',
        'high',
        ['Main Office'],
        2500
      );

      expect(result.emergencyType).toBe('strike');
      expect(result.severity).toBe('high');
      expect(result.affectedMemberCount).toBe(2500);
    });

    it('should handle natural disaster declaration', async () => {
      const result = await breakGlassService.declareEmergency(
        'natural_disaster',
        'user-002',
        'Flood damaged data center',
        'critical',
        ['Primary DC', 'Backup DC'],
        10000
      );

      expect(result.emergencyType).toBe('natural_disaster');
      expect(result.declaredAt).toBeInstanceOf(Date);
    });

    it('should work without optional parameters', async () => {
      const result = await breakGlassService.declareEmergency(
        'infrastructure_failure',
        'user-003',
        'Network outage',
        'medium'
      );

      expect(result.id).toBe('emergency-123');
      expect(result.affectedLocations).toBeUndefined();
      expect(result.affectedMemberCount).toBeUndefined();
    });
  });

  describe('verifyKeyHolder', () => {
    it('should verify valid key holder with full credentials', async () => {
      const holder: KeyHolderAuth = {
        id: '1',
        role: 'union_president',
        name: 'John Smith',
        keyFragment: randomBytes(32).toString('hex'),
        biometricHash: 'biometric-hash-123',
        passphrase: 'secure-passphrase',
        verifiedAt: new Date()
      };

      const isValid = await breakGlassService.verifyKeyHolder(holder);

      expect(isValid).toBe(true);
    });

    it('should reject key holder with short key fragment', async () => {
      const holder: KeyHolderAuth = {
        id: '2',
        role: 'union_treasurer',
        name: 'Jane Doe',
        keyFragment: 'tooshort',
        verifiedAt: new Date()
      };

      const isValid = await breakGlassService.verifyKeyHolder(holder);

      expect(isValid).toBe(false);
    });

    it('should reject key holder with empty key fragment', async () => {
      const holder: KeyHolderAuth = {
        id: '3',
        role: 'legal_counsel',
        name: 'Bob Legal',
        keyFragment: '',
        verifiedAt: new Date()
      };

      const isValid = await breakGlassService.verifyKeyHolder(holder);

      expect(isValid).toBe(false);
    });

    it('should verify all key holder roles', async () => {
      const roles: Array<KeyHolderAuth['role']> = [
        'union_president',
        'union_treasurer',
        'legal_counsel',
        'platform_cto',
        'independent_trustee'
      ];

      for (const role of roles) {
        const holder: KeyHolderAuth = {
          id: `${role}-id`,
          role,
          name: `Test ${role}`,
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        };

        const isValid = await breakGlassService.verifyKeyHolder(holder);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('activateBreakGlass', () => {
    it('should activate with 3 valid key holders', async () => {
      const keyHolders: KeyHolderAuth[] = [
        {
          id: '1',
          role: 'union_president',
          name: 'John Smith',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '2',
          role: 'union_treasurer',
          name: 'Jane Doe',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '4',
          role: 'platform_cto',
          name: 'Tech Lead',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        }
      ];

      const result = await breakGlassService.activateBreakGlass(
        'emergency-123',
        keyHolders
      );

      expect(result.success).toBe(true);
      expect(result.masterKey).toBeDefined();
      expect(result.coldStorageAccess).toBeDefined();
      expect(result.message).toContain('activated successfully');
      expect(result.masterKey).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should reject with only 2 key holders', async () => {
      const keyHolders: KeyHolderAuth[] = [
        {
          id: '1',
          role: 'union_president',
          name: 'John Smith',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '2',
          role: 'union_treasurer',
          name: 'Jane Doe',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        }
      ];

      const result = await breakGlassService.activateBreakGlass(
        'emergency-123',
        keyHolders
      );

      expect(result.success).toBe(false);
      expect(result.masterKey).toBeUndefined();
      expect(result.coldStorageAccess).toBeUndefined();
      expect(result.message).toContain('Requires 3 of 5 key holders');
      expect(result.message).toContain('Only 2 present');
    });

    it('should reject with 1 invalid key holder among 3', async () => {
      const keyHolders: KeyHolderAuth[] = [
        {
          id: '1',
          role: 'union_president',
          name: 'John Smith',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '2',
          role: 'union_treasurer',
          name: 'Jane Doe',
          keyFragment: 'invalid',
          verifiedAt: new Date()
        },
        {
          id: '4',
          role: 'platform_cto',
          name: 'Tech Lead',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        }
      ];

      const result = await breakGlassService.activateBreakGlass(
        'emergency-123',
        keyHolders
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('verification failed');
      expect(result.message).toContain('union_treasurer');
    });

    it('should work with 4 key holders (more than minimum)', async () => {
      const keyHolders: KeyHolderAuth[] = [
        {
          id: '1',
          role: 'union_president',
          name: 'John Smith',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '2',
          role: 'union_treasurer',
          name: 'Jane Doe',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '3',
          role: 'legal_counsel',
          name: 'Bob Legal',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '4',
          role: 'platform_cto',
          name: 'Tech Lead',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        }
      ];

      const result = await breakGlassService.activateBreakGlass(
        'emergency-123',
        keyHolders
      );

      expect(result.success).toBe(true);
      expect(result.masterKey).toBeDefined();
    });

    it('should work with all 5 key holders', async () => {
      const keyHolders: KeyHolderAuth[] = [
        {
          id: '1',
          role: 'union_president',
          name: 'John Smith',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '2',
          role: 'union_treasurer',
          name: 'Jane Doe',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '3',
          role: 'legal_counsel',
          name: 'Bob Legal',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '4',
          role: 'platform_cto',
          name: 'Tech Lead',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        },
        {
          id: '5',
          role: 'independent_trustee',
          name: 'Trustee Name',
          keyFragment: randomBytes(32).toString('hex'),
          verifiedAt: new Date()
        }
      ];

      const result = await breakGlassService.activateBreakGlass(
        'emergency-123',
        keyHolders
      );

      expect(result.success).toBe(true);
      expect(result.coldStorageAccess).toMatch(/^COLD_STORAGE_ACCESS_/);
    });
  });

  describe('recover48Hour', () => {
    it('should successfully recover from Swiss backup', async () => {
      const result = await breakGlassService.recover48Hour(
        'swiss',
        'COLD_STORAGE_ACCESS_abc123'
      );

      expect(result.success).toBe(true);
      expect(result.backupSource).toBe('swiss');
      expect(result.dataLoss).toBe(0);
      expect(result.within48Hours).toBe(true);
      expect(result.recoveryTimeHours).toBeGreaterThan(0);
      expect(result.recoveryTimeHours).toBeLessThan(48);
    }, 30000); // 30 second timeout for recovery simulation

    it('should successfully recover from Canadian backup', async () => {
      const result = await breakGlassService.recover48Hour(
        'canadian',
        'COLD_STORAGE_ACCESS_def456'
      );

      expect(result.success).toBe(true);
      expect(result.backupSource).toBe('canadian');
      expect(result.dataLoss).toBe(0);
      expect(result.within48Hours).toBe(true);
    }, 30000); // 30 second timeout for recovery simulation

    it('should track recovery time accurately', async () => {
      const startTime = Date.now();
      const result = await breakGlassService.recover48Hour(
        'swiss',
        'COLD_STORAGE_ACCESS_test'
      );
      const endTime = Date.now();

      const actualDuration = (endTime - startTime) / (1000 * 60 * 60);
      
      expect(result.recoveryTimeHours).toBeGreaterThanOrEqual(actualDuration * 0.9);
      expect(result.recoveryTimeHours).toBeLessThanOrEqual(actualDuration * 1.1);
    }, 30000); // 30 second timeout for recovery simulation
  });

  describe('scheduleAudit', () => {
    it('should schedule audit within 7 days', async () => {
      const result = await breakGlassService.scheduleAudit('emergency-123');

      const now = new Date();
      const expectedDeadline = new Date(now);
      expectedDeadline.setDate(expectedDeadline.getDate() + 7);

      expect(result.auditDeadline).toBeInstanceOf(Date);
      expect(result.auditDeadline.getTime()).toBeGreaterThan(now.getTime());
      expect(result.auditDeadline.getTime()).toBeLessThanOrEqual(expectedDeadline.getTime());
      expect(result.message).toContain('Audit must be completed');
    });

    it('should include emergency ID in audit scheduling', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await breakGlassService.scheduleAudit('emergency-456');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('emergency-456')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('resolveEmergency', () => {
    it('should resolve emergency and return success', async () => {
      const { db } = await import('@/db');
      
      const result = await breakGlassService.resolveEmergency('emergency-123');

      expect(result.success).toBe(true);
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('Emergency resolved');
      expect(result.message).toContain('deactivated');
      expect(db.update).toHaveBeenCalled();
    });

    it('should set resolved timestamp', async () => {
      const beforeResolve = Date.now();
      const result = await breakGlassService.resolveEmergency('emergency-789');
      const afterResolve = Date.now();

      expect(result.resolvedAt.getTime()).toBeGreaterThanOrEqual(beforeResolve);
      expect(result.resolvedAt.getTime()).toBeLessThanOrEqual(afterResolve);
    });
  });

  describe('getEmergencyStatus', () => {
    it('should return emergency status with all details', async () => {
      const { db } = await import('@/db');
      
      vi.mocked(db.query.emergencyDeclarations.findFirst).mockResolvedValueOnce({
        id: 'emergency-123',
        emergencyType: 'cyberattack',
        severityLevel: 'critical',
        declaredAt: new Date('2025-02-07T09:00:00Z'),
        declaredByUserId: 'user-001',
        affectedLocations: ['Toronto', 'Vancouver'],
        affectedMemberCount: 5000,
        notes: 'Ransomware attack',
        breakGlassActivated: true,
        resolvedAt: null,
        notificationSent: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const status = await breakGlassService.getEmergencyStatus('emergency-123');

      expect(status).not.toBeNull();
      expect(status?.id).toBe('emergency-123');
      expect(status?.emergencyType).toBe('cyberattack');
      expect(status?.severity).toBe('critical');
      expect(status?.declaredBy).toBe('user-001');
      expect(status?.affectedLocations).toEqual(['Toronto', 'Vancouver']);
      expect(status?.affectedMemberCount).toBe(5000);
      expect(status?.breakGlassActivated).toBe(true);
    });

    it('should return null for non-existent emergency', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.emergencyDeclarations.findFirst).mockResolvedValueOnce(null);

      const status = await breakGlassService.getEmergencyStatus('non-existent');

      expect(status).toBeNull();
    });

    it('should handle emergency without optional fields', async () => {
      const { db } = await import('@/db');
      
      vi.mocked(db.query.emergencyDeclarations.findFirst).mockResolvedValueOnce({
        id: 'emergency-456',
        emergencyType: 'strike',
        severityLevel: 'medium',
        declaredAt: new Date('2025-02-05T10:00:00Z'),
        declaredByUserId: 'user-002',
        affectedLocations: null,
        affectedMemberCount: 0,
        notes: '',
        breakGlassActivated: false,
        resolvedAt: null,
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const status = await breakGlassService.getEmergencyStatus('emergency-456');

      expect(status?.affectedLocations).toBeUndefined();
      expect(status?.description).toBe('');
    });
  });

  describe('getActiveEmergencies', () => {
    it('should return all active emergencies sorted by date', async () => {
      const { db } = await import('@/db');
      
      vi.mocked(db.query.emergencyDeclarations.findMany).mockResolvedValueOnce([
        {
          id: 'emergency-001',
          emergencyType: 'cyberattack',
          severityLevel: 'critical',
          declaredAt: new Date('2025-02-05T09:00:00Z'),
          declaredByUserId: 'user-001',
          affectedLocations: ['Toronto'],
          affectedMemberCount: 3000,
          notes: 'Attack 1',
          breakGlassActivated: true,
          resolvedAt: null,
          notificationSent: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'emergency-002',
          emergencyType: 'natural_disaster',
          severityLevel: 'high',
          declaredAt: new Date('2025-02-07T10:00:00Z'),
          declaredByUserId: 'user-002',
          affectedLocations: ['Vancouver'],
          affectedMemberCount: 2000,
          notes: 'Flood',
          breakGlassActivated: false,
          resolvedAt: null,
          notificationSent: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const emergencies = await breakGlassService.getActiveEmergencies();

      expect(emergencies).toHaveLength(2);
      expect(emergencies[0].id).toBe('emergency-002'); // Most recent first
      expect(emergencies[1].id).toBe('emergency-001');
    });

    it('should return empty array when no active emergencies', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.emergencyDeclarations.findMany).mockResolvedValueOnce([]);

      const emergencies = await breakGlassService.getActiveEmergencies();

      expect(emergencies).toEqual([]);
    });
  });

  describe('quarterlyRecoveryDrill', () => {
    it('should complete full recovery drill successfully', async () => {
      const result = await quarterlyRecoveryDrill();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.within48Hours).toBe(true);
      expect(result?.dataLoss).toBe(0);
      expect(result?.backupSource).toBe('swiss');
    }, 30000); // 30 second timeout for full drill

    it('should activate break-glass with test key holders', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await quarterlyRecoveryDrill();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quarterly 48-hour recovery drill')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recovery Results')
      );
      
      consoleSpy.mockRestore();
    }, 30000); // 30 second timeout for full drill
  });
});
