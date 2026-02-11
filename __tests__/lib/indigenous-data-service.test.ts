/**
 * Indigenous Data Sovereignty Service Tests (OCAP® Compliance)
 *
 * Validates:
 * - OCAP® principles (Ownership, Control, Access, Possession)
 * - Band Council approval requirements
 * - Cultural sensitivity classification
 * - Elder approval for sacred data
 * - On-premise vs cloud storage routing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndigenousDataService, indigenousDataService, setupOnPremiseStorage } from '@/lib/services/indigenous-data-service';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            { bandCouncilId: 'bc-001' }
          ])
        }))
      }))
    })),
    query: {
      members: {
        findFirst: vi.fn().mockResolvedValue(null)
      },
      indigenousMemberData: {
        findFirst: vi.fn().mockResolvedValue({
          userId: 'member-001',
          bandCouncilId: 'bc-001',
          bandCouncil: {
            id: 'bc-001',
            bandName: 'Example First Nation'
          }
        })
      },
      bandCouncilConsent: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'BCA-001',
          bandCouncilId: 'bc-001',
          consentGiven: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'BCA-001',
          bandCouncilId: 'bc-001',
          consentGiven: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        })
      },
      bandCouncils: {
        findMany: vi.fn().mockImplementation((options) => {
          // Mock findMany to respect where clauses
          const allBandCouncils = [{
            id: 'bc-001',
            bandName: 'Example First Nation',
            bandNumber: 'BN-001',
            onReserveStorageEnabled: false,
            dataResidencyRequired: true
          }];
          
          // If querying for onReserveStorageEnabled: true, return empty
          if (options?.where) {
            return Promise.resolve([]);
          }
          
          return Promise.resolve(allBandCouncils);
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'bc-001',
          bandName: 'Example First Nation',
          bandNumber: 'BN-001',
          onReserveStorageEnabled: false,
          dataResidencyRequired: true
        })
      },
      indigenousDataAccessLog: {
        findMany: vi.fn().mockResolvedValue([])
      }
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve())
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    }))
  }
}));

describe('IndigenousDataService', () => {
  let service: IndigenousDataService;

  beforeEach(() => {
    service = new IndigenousDataService();
    vi.clearAllMocks();
  });

  describe('verifyBandCouncilOwnership', () => {
    it('should verify Band Council has ownership agreement', async () => {
      const result = await service.verifyBandCouncilOwnership('member-001');

      expect(result.hasAgreement).toBe(true);
      expect(result.bandName).toBe('Example First Nation');
      expect(result.agreementId).toBe('BCA-001');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should return agreement expiry date', async () => {
      const result = await service.verifyBandCouncilOwnership('member-001');

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt instanceof Date).toBe(true);
    });
  });

  describe('requestDataAccess', () => {
    it('should create data access request for public data', async () => {
      const request = await service.requestDataAccess(
        'user-001',
        'employment',
        'Generate report',
        'standard'
      );

      expect(request.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(request.requesterId).toBe('user-001');
      expect(request.dataType).toBe('employment');
      expect(request.purpose).toBe('Generate report');
      expect(request.sensitivity).toBe('standard');
      expect(request.requiresBandCouncilApproval).toBe(false);
      expect(request.requiresElderApproval).toBe(false);
      expect(request.status).toBe('pending');
    });

    it('should require Band Council approval for sacred data', async () => {
      const request = await service.requestDataAccess(
        'user-001',
        'ceremonies',
        'Research project',
        'sacred'
      );

      expect(request.sensitivity).toBe('sacred');
      expect(request.requiresBandCouncilApproval).toBe(true);
      expect(request.requiresElderApproval).toBe(true);
    });

    it('should require Band Council approval for restricted data', async () => {
      const request = await service.requestDataAccess(
        'user-001',
        'health_records',
        'Audit compliance',
        'sensitive'
      );

      expect(request.sensitivity).toBe('sensitive');
      expect(request.requiresBandCouncilApproval).toBe(true);
      expect(request.requiresElderApproval).toBe(false);
    });

    it('should create request with timestamp', async () => {
      const request = await service.requestDataAccess(
        'user-001',
        'employment',
        'Generate report',
        'standard'
      );

      expect(request.requestedAt).toBeInstanceOf(Date);
    });
  });

  describe('checkAccessPermission', () => {
    it('should allow access to public data', async () => {
      const result = await service.checkAccessPermission(
        'user-001',
        'employment',
        'standard'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toContain('Standard data');
    });

    it('should deny access to sacred data without approval', async () => {
      const result = await service.checkAccessPermission(
        'user-001',
        'ceremonies',
        'sacred'
      );

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('explicit approval');
    });

    it('should deny access to restricted data without approval', async () => {
      const result = await service.checkAccessPermission(
        'user-001',
        'health_records',
        'sensitive'
      );

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('explicit approval');
    });

    it('should deny external access to internal data', async () => {
      const result = await service.checkAccessPermission(
        'external-user-001',
        'employment',
        'sensitive'
      );

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('explicit approval');
    });

    it('should allow community member access to internal data', async () => {
      const result = await service.checkAccessPermission(
        'member-001',
        'employment',
        'standard'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toContain('basic authentication');
    });
  });

  describe('routeToStorage', () => {
    it('should route to on-premise storage when available', async () => {
      // Mock on-premise storage available
      vi.spyOn(service, 'getStorageConfig').mockResolvedValueOnce({
        reserveId: 'reserve-001',
        hasOnPremiseServer: true,
        endpoint: 'https://reserve-server.local',
        encryptionKeyManagement: 'band_council',
        storageLocation: 'on_reserve'
      });

      const result = await service.routeToStorage(
        { data: 'some data' },
        'reserve-001',
        'employment'
      );

      expect(result.storageLocation).toBe('on_premise');
      expect(result.endpoint).toBe('https://reserve-server.local');
      expect(result.encryptionKey).toBe('band-council-managed');
    });

    it('should fallback to cloud storage when on-premise unavailable', async () => {
      // Mock no on-premise storage
      vi.spyOn(service, 'getStorageConfig').mockResolvedValueOnce({
        reserveId: 'reserve-001',
        hasOnPremiseServer: false,
        encryptionKeyManagement: 'band_council',
        storageLocation: 'canada_only'
      });

      const result = await service.routeToStorage(
        { data: 'some data' },
        'reserve-001',
        'employment'
      );

      expect(result.storageLocation).toBe('cloud_encrypted');
      expect(result.endpoint).toBe('azure-canada-central');
      expect(result.encryptionKey).toContain('BAND_COUNCIL_KEY_');
    });
  });

  describe('getStorageConfig', () => {
    it('should return storage configuration for reserve', async () => {
      const config = await service.getStorageConfig('reserve-001');

      expect(config).toBeDefined();
      expect(config.reserveId).toBe('reserve-001');
      expect(config.encryptionKeyManagement).toBe('band_council');
      expect(config.storageLocation).toBe('canada_only');
    });

    it('should indicate no on-premise server by default', async () => {
      const config = await service.getStorageConfig('reserve-001');

      expect(config.hasOnPremiseServer).toBe(false);
    });
  });

  describe('classifyData', () => {
    it('should classify as sacred when ceremonial keywords present', async () => {
      const result = await service.classifyData(
        'traditions',
        'Elder teaching about sacred ceremony protocols'
      );

      expect(result.sensitivity).toBe('sacred');
      expect(result.requiresElderApproval).toBe(true);
      expect(result.culturalProtocols).toContain('Requires Elder review before access');
    });

    it('should classify as sacred for traditional knowledge', async () => {
      const result = await service.classifyData(
        'knowledge',
        'Traditional knowledge passed down through generations'
      );

      expect(result.sensitivity).toBe('sacred');
      expect(result.requiresElderApproval).toBe(true);
    });

    it('should classify as restricted for health records', async () => {
      const result = await service.classifyData(
        'health',
        'Community health records and medical information'
      );

      expect(result.sensitivity).toBe('sensitive');
      expect(result.requiresElderApproval).toBe(false);
      expect(result.culturalProtocols).toContain('Band Council approval required');
    });

    it('should classify as restricted for social services', async () => {
      const result = await service.classifyData(
        'social',
        'Child welfare case files and social services documentation'
      );

      expect(result.sensitivity).toBe('sensitive');
      expect(result.requiresElderApproval).toBe(false);
    });

    it('should classify as restricted for personal identifiers', async () => {
      const result = await service.classifyData(
        'identity',
        'Member SIN and status number records'
      );

      expect(result.sensitivity).toBe('sensitive');
      expect(result.requiresElderApproval).toBe(false);
    });

    it('should classify as internal for general data', async () => {
      const result = await service.classifyData(
        'employment',
        'General employment records and payroll information'
      );

      expect(result.sensitivity).toBe('standard');
      expect(result.requiresElderApproval).toBe(false);
      expect(result.culturalProtocols[0]).toContain('Standard data handling protocols');
    });
  });

  describe('requestElderApproval', () => {
    it('should create Elder approval request', async () => {
      const result = await service.requestElderApproval(
        'data-001',
        'researcher-001',
        'Document traditional practices for preservation'
      );

      expect(result.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.status).toBe('pending');
      expect(result.message).toContain('Elder approval request submitted');
      expect(result.message).toContain('7 days');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate full OCAP® compliance report', async () => {
      const report = await service.generateComplianceReport();

      expect(report.ocapPrinciples).toBeDefined();
      expect(report.ocapPrinciples.ownership).toBeDefined();
      expect(report.ocapPrinciples.control).toBeDefined();
      expect(report.ocapPrinciples.access).toBeDefined();
      expect(report.ocapPrinciples.possession).toBeDefined();
    });

    it('should indicate ownership compliance', async () => {
      const report = await service.generateComplianceReport();

      expect(report.ocapPrinciples.ownership.compliant).toBe(true);
      expect(report.ocapPrinciples.ownership.notes.some(n => n.includes('active Band Council agreement'))).toBe(true);
    });

    it('should indicate control compliance', async () => {
      const report = await service.generateComplianceReport();

      expect(report.ocapPrinciples.control.compliant).toBe(true);
      expect(report.ocapPrinciples.control.notes.some(n => n.includes('All data access requires appropriate approval'))).toBe(true);
    });

    it('should indicate access compliance', async () => {
      const report = await service.generateComplianceReport();

      expect(report.ocapPrinciples.access.compliant).toBe(true);
      expect(report.ocapPrinciples.access.notes).toContain('Access control based on sensitivity classification');
    });

    it('should flag possession non-compliance without on-premise storage', async () => {
      const report = await service.generateComplianceReport();

      expect(report.ocapPrinciples.possession.compliant).toBe(false);
      expect(report.ocapPrinciples.possession.notes.some(n => n.includes('0.0% of reserves have on-premise storage'))).toBe(true);
    });

    it('should include data access request statistics', async () => {
      const report = await service.generateComplianceReport();

      expect(report.dataAccessRequests).toBeDefined();
      expect(report.dataAccessRequests.pending).toBeGreaterThanOrEqual(0);
      expect(report.dataAccessRequests.approved).toBeGreaterThanOrEqual(0);
      expect(report.dataAccessRequests.denied).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendations', async () => {
      const report = await service.generateComplianceReport();

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('on-premise'))).toBe(true);
    });
  });

  describe('exportDataForBandCouncil', () => {
    it('should export data for Band Council review', async () => {
      const result = await service.exportDataForBandCouncil(
        'Example First Nation',
        ['employment', 'health'],
        new Date('2026-01-01'),
        new Date('2026-02-07')
      );

      expect(result.exportId).toMatch(/^EXPORT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.recordCount).toBeGreaterThanOrEqual(0);
      expect(result.exportPath).toContain('/exports/');
      expect(result.encrypted).toBe(true);
    });

    it('should handle multiple data categories', async () => {
      const result = await service.exportDataForBandCouncil(
        'Example First Nation',
        ['employment', 'health', 'cultural'],
        new Date('2026-01-01'),
        new Date('2026-02-07')
      );

      expect(result.exportId).toBeDefined();
      expect(result.encrypted).toBe(true);
    });
  });
});

describe('setupOnPremiseStorage', () => {
  it('should setup on-premise storage for reserve', async () => {
    const result = await setupOnPremiseStorage(
      'reserve-001',
      'https://reserve-server.local:8443',
      'bandcouncil@examplefirstnation.ca'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('configured successfully');
    expect(result.config).toBeDefined();
  });

  it('should configure on-premise storage settings', async () => {
    const result = await setupOnPremiseStorage(
      'reserve-001',
      'https://reserve-server.local:8443',
      'bandcouncil@examplefirstnation.ca'
    );

    expect(result.config?.hasOnPremiseServer).toBe(true);
    expect(result.config?.endpoint).toBe('https://reserve-server.local:8443');
    expect(result.config?.encryptionKeyManagement).toBe('band_council');
    expect(result.config?.storageLocation).toBe('on_reserve');
  });
});

describe('indigenousDataService singleton', () => {
  it('should export singleton instance', () => {
    expect(indigenousDataService).toBeInstanceOf(IndigenousDataService);
  });
});
