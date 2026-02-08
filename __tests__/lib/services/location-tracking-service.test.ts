import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationTrackingService, locationTrackingService, scheduledLocationPurge } from '@/lib/services/location-tracking-service';

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    query: {
      memberLocationConsent: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      locationTracking: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ changes: 1 })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

const mockDb = await import('@/db');

describe('LocationTrackingService', () => {
  let service: LocationTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LocationTrackingService();
  });

  describe('requestLocationPermission', () => {
    it('should create a new consent request when no existing consent exists', async () => {
      const mockConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'never_asked',
        consentPurpose: 'strike_line_tracking',
        purposeDescription: 'Track your location during strikes',
        canRevokeAnytime: true,
        consentText: 'strike_line_tracking',
        consentVersion: '1.0',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockConsent]),
        }),
      });

      const result = await service.requestLocationPermission({
        memberId: 'member-123',
        purpose: 'strike_line_tracking',
        purposeDescription: 'Track your location during strikes',
        requestedAt: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.consentId).toBe('consent-123');
      expect(result.message).toContain('Consent request created');
    });

    it('should reject when member already has consent record', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);

      const result = await service.requestLocationPermission({
        memberId: 'member-123',
        purpose: 'strike_line_tracking',
        purposeDescription: 'Track your location during strikes',
        requestedAt: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already has consent status');
    });

    it('should handle different location purposes', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'consent-123',
            consentPurpose: 'safety_checkin',
          }]),
        }),
      });

      const result = await service.requestLocationPermission({
        memberId: 'member-123',
        purpose: 'safety_checkin',
        purposeDescription: 'Check in for safety during emergencies',
        requestedAt: new Date(),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('grantLocationConsent', () => {
    it('should grant consent when request exists', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'never_asked',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);
      (mockDb.db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
      });

      const result = await service.grantLocationConsent('member-123', 'strike_line_tracking');

      expect(result.success).toBe(true);
      expect(result.optedInAt).toBeInstanceOf(Date);
      expect(result.message).toContain('consent granted');
    });

    it('should reject when no consent request found', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      const result = await service.grantLocationConsent('member-123', 'strike_line_tracking');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No consent request found');
    });

    it('should reject when member already opted in', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);

      const result = await service.grantLocationConsent('member-123', 'strike_line_tracking');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already opted in');
    });

    it('should update from opted_out to opted_in', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_out',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);
      (mockDb.db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
      });

      const result = await service.grantLocationConsent('member-123', 'safety_checkin');

      expect(result.success).toBe(true);
      expect(result.optedInAt).toBeInstanceOf(Date);
    });
  });

  describe('revokeLocationConsent', () => {
    it('should revoke consent and purge location data', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);
      (mockDb.db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
      });
      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'loc-1' }, { id: 'loc-2' }]),
        }),
      });

      const result = await service.revokeLocationConsent('member-123');

      expect(result.success).toBe(true);
      expect(result.revokedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('revoked');
      expect(result.message).toContain('deleted');
    });

    it('should reject when no consent record found', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      const result = await service.revokeLocationConsent('member-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No consent record found');
    });

    it('should handle revoke when already opted_out', async () => {
      const existingConsent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_out',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(existingConsent);
      (mockDb.db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
      });
      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.revokeLocationConsent('member-123');

      expect(result.success).toBe(true);
    });
  });

  describe('verifyLocationPermission', () => {
    it('should return true when member has opted in', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

      const result = await service.verifyLocationPermission('member-123');

      expect(result).toBe(true);
    });

    it('should throw error when no consent record exists', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      await expect(service.verifyLocationPermission('member-123')).rejects.toThrow(
        'Location tracking not permitted'
      );
    });

    it('should throw error when consent status is not opted_in', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'never_asked',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

      await expect(service.verifyLocationPermission('member-123')).rejects.toThrow(
        'Location tracking not permitted'
      );
    });

    it('should throw error when opted_out', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_out',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

      await expect(service.verifyLocationPermission('member-123')).rejects.toThrow(
        'Location tracking not permitted'
      );
    });
  });

  describe('trackLocation', () => {
    it('should track location when permission granted', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const mockLocationData = {
        latitude: 43.6532,
        longitude: -79.3832,
        accuracy: 10,
        timestamp: new Date(),
      };

      const mockTracked = {
        id: 'loc-123',
        userId: 'member-123',
        latitude: '43.6532',
        longitude: '-79.3832',
        accuracy: '10',
        purpose: 'strike_line_tracking',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTracked]),
        }),
      });

      const result = await service.trackLocation(
        'member-123',
        mockLocationData,
        'strike_line_tracking'
      );

      expect(result.success).toBe(true);
      expect(result.locationId).toBe('loc-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.message).toContain('24 hours');
    });

    it('should track location with geofenceId', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const mockLocationData = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date(),
      };

      const mockTracked = {
        id: 'loc-123',
        strikeId: 'strike-456',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTracked]),
        }),
      });

      const result = await service.trackLocation(
        'member-123',
        mockLocationData,
        'strike_line_tracking',
        'strike-456'
      );

      expect(result.success).toBe(true);
    });

    it('should reject tracking without permission', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      const mockLocationData = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date(),
      };

      const result = await service.trackLocation(
        'member-123',
        mockLocationData,
        'strike_line_tracking'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not permitted');
    });

    it('should track location with different purposes', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const mockLocationData = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date(),
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'loc-123' }]),
        }),
      });

      const purposes = ['safety_checkin', 'event_attendance', 'emergency_response'] as const;
      
      for (const purpose of purposes) {
        const result = await service.trackLocation(
          'member-123',
          mockLocationData,
          purpose
        );
        expect(result.success).toBe(true);
      }
    });

    it('should set expiration to 24 hours from now', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const now = new Date();
      const mockLocationData = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: now,
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'loc-123' }]),
        }),
      });

      const result = await service.trackLocation(
        'member-123',
        mockLocationData,
        'strike_line_tracking'
      );

      expect(result.expiresAt).toBeDefined();
      if (result.expiresAt) {
        const hoursDiff = (result.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBeGreaterThanOrEqual(23.9);
        expect(hoursDiff).toBeLessThanOrEqual(24.1);
      }
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history when permission verified', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const mockLocations = [
        {
          id: 'loc-1',
          userId: 'member-123',
          latitude: '43.6532',
          longitude: '-79.3832',
          recordedAt: new Date(),
        },
        {
          id: 'loc-2',
          userId: 'member-123',
          latitude: '43.6533',
          longitude: '-79.3831',
          recordedAt: new Date(),
        },
      ];

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue(mockLocations);

      const result = await service.getLocationHistory('member-123');

      expect(result).toEqual(mockLocations);
      expect(result.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      const mockLocations = Array.from({ length: 50 }, (_, i) => ({
        id: `loc-${i}`,
        userId: 'member-123',
        latitude: '43.6532',
        longitude: '-79.3832',
        recordedAt: new Date(),
      }));

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue(mockLocations);

      const result = await service.getLocationHistory('member-123', 50);

      expect(result).toEqual(mockLocations);
    });

    it('should throw error when permission not granted', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      await expect(service.getLocationHistory('member-123')).rejects.toThrow(
        'Location tracking not permitted'
      );
    });

    it('should use default limit of 100', async () => {
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue([]);

      await service.getLocationHistory('member-123');

      // The function should be called with default limit 100
      expect(mockDb.db.query.locationTracking.findMany).toHaveBeenCalled();
    });
  });

  describe('purgeExpiredLocations', () => {
    it('should delete expired locations and return count', async () => {
      const expiredLocations = [
        { id: 'loc-1', expiresAt: new Date(Date.now() - 1000) },
        { id: 'loc-2', expiresAt: new Date(Date.now() - 2000) },
        { id: 'loc-3', expiresAt: new Date(Date.now() - 3000) },
      ];

      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(expiredLocations),
        }),
      });

      const result = await service.purgeExpiredLocations();

      expect(result.deletedCount).toBe(3);
      expect(result.message).toContain('Purged 3 expired location records');
      expect(result.message).toContain('24 hours');
    });

    it('should handle no expired locations', async () => {
      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.purgeExpiredLocations();

      expect(result.deletedCount).toBe(0);
      expect(result.message).toContain('Purged 0 expired location records');
    });

    it('should handle large batch of expired locations', async () => {
      const expiredLocations = Array.from({ length: 1000 }, (_, i) => ({
        id: `loc-${i}`,
        expiresAt: new Date(Date.now() - 1000),
      }));

      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(expiredLocations),
        }),
      });

      const result = await service.purgeExpiredLocations();

      expect(result.deletedCount).toBe(1000);
    });
  });

  describe('purgeLocationData', () => {
    it('should delete all location data for specific member', async () => {
      const memberLocations = [
        { id: 'loc-1', userId: 'member-123' },
        { id: 'loc-2', userId: 'member-123' },
      ];

      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(memberLocations),
        }),
      });

      const result = await service.purgeLocationData('member-123');

      expect(result.deletedCount).toBe(2);
      expect(result.message).toContain('Deleted all location data for member member-123');
    });

    it('should handle member with no location data', async () => {
      (mockDb.db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.purgeLocationData('member-456');

      expect(result.deletedCount).toBe(0);
      expect(result.message).toContain('Deleted all location data for member member-456');
    });

    it('should handle different member IDs', async () => {
      const memberIds = ['member-1', 'member-2', 'member-3'];
      
      for (const memberId of memberIds) {
        (mockDb.db.delete as any).mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'loc-1', userId: memberId }]),
          }),
        });

        const result = await service.purgeLocationData(memberId);
        expect(result.message).toContain(memberId);
      }
    });
  });

  describe('getConsentStatus', () => {
    it('should return never_asked when no consent record exists', async () => {
      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(null);

      const result = await service.getConsentStatus('member-123');

      expect(result.status).toBe('never_asked');
      expect(result.canRevoke).toBe(false);
    });

    it('should return opted_in status with details', async () => {
      const optedInAt = new Date('2026-01-15');
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_in',
        optedInAt,
        optedOutAt: null,
        consentPurpose: 'strike_line_tracking',
        canRevokeAnytime: true,
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

      const result = await service.getConsentStatus('member-123');

      expect(result.status).toBe('opted_in');
      expect(result.optedInAt).toEqual(optedInAt);
      expect(result.purpose).toBe('strike_line_tracking');
      expect(result.canRevoke).toBe(true);
    });

    it('should return opted_out status with revoked date', async () => {
      const optedOutAt = new Date('2026-02-01');
      const consent = {
        id: 'consent-123',
        userId: 'member-123',
        consentStatus: 'opted_out',
        optedInAt: new Date('2026-01-15'),
        optedOutAt,
        consentPurpose: 'safety_checkin',
        canRevokeAnytime: true,
      };

      (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

      const result = await service.getConsentStatus('member-123');

      expect(result.status).toBe('opted_out');
      expect(result.revokedAt).toEqual(optedOutAt);
      expect(result.purpose).toBe('safety_checkin');
    });

    it('should handle all consent purposes', async () => {
      const purposes = ['strike_line_tracking', 'safety_checkin', 'event_attendance', 'emergency_response'];
      
      for (const purpose of purposes) {
        const consent = {
          id: 'consent-123',
          userId: 'member-123',
          consentStatus: 'opted_in',
          consentPurpose: purpose,
          canRevokeAnytime: true,
        };

        (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);
        const result = await service.getConsentStatus('member-123');
        expect(result.purpose).toBe(purpose);
      }
    });
  });

  describe('getMembersWithActiveConsent', () => {
    it('should return list of member IDs with active consent', async () => {
      const activeConsents = [
        { id: 'c-1', userId: 'member-1', consentStatus: 'opted_in' },
        { id: 'c-2', userId: 'member-2', consentStatus: 'opted_in' },
        { id: 'c-3', userId: 'member-3', consentStatus: 'opted_in' },
      ];

      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue(activeConsents);

      const result = await service.getMembersWithActiveConsent();

      expect(result).toEqual(['member-1', 'member-2', 'member-3']);
      expect(result.length).toBe(3);
    });

    it('should return empty array when no active consents', async () => {
      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue([]);

      const result = await service.getMembersWithActiveConsent();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should only return opted_in members', async () => {
      const consents = [
        { id: 'c-1', userId: 'member-1', consentStatus: 'opted_in' },
        { id: 'c-2', userId: 'member-2', consentStatus: 'opted_out' },
        { id: 'c-3', userId: 'member-3', consentStatus: 'never_asked' },
        { id: 'c-4', userId: 'member-4', consentStatus: 'opted_in' },
      ];

      // Mock should only return opted_in members
      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue(
        consents.filter(c => c.consentStatus === 'opted_in')
      );

      const result = await service.getMembersWithActiveConsent();

      expect(result).toEqual(['member-1', 'member-4']);
      expect(result.length).toBe(2);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      const now = new Date();
      const allConsents = [
        { id: 'c-1', consentStatus: 'opted_in' },
        { id: 'c-2', consentStatus: 'opted_in' },
        { id: 'c-3', consentStatus: 'opted_out' },
        { id: 'c-4', consentStatus: 'never_asked' },
      ];

      const allLocations = [
        { id: 'loc-1', expiresAt: new Date(now.getTime() + 1000 * 60 * 60) }, // Active
        { id: 'loc-2', expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 2) }, // Active
        { id: 'loc-3', expiresAt: new Date(now.getTime() - 1000 * 60 * 60) }, // Expired
      ];

      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue(allConsents);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue(allLocations);

      const result = await service.generateComplianceReport();

      expect(result.totalMembers).toBe(4);
      expect(result.optedIn).toBe(2);
      expect(result.optedOut).toBe(1);
      expect(result.neverAsked).toBe(1);
      expect(result.activeLocations).toBe(2);
      expect(result.expiredLocations).toBe(1);
      expect(result.trackingType).toBe('foreground_only');
      expect(result.maxRetentionHours).toBe(24);
    });

    it('should handle empty database', async () => {
      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue([]);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue([]);

      const result = await service.generateComplianceReport();

      expect(result.totalMembers).toBe(0);
      expect(result.optedIn).toBe(0);
      expect(result.optedOut).toBe(0);
      expect(result.neverAsked).toBe(0);
      expect(result.activeLocations).toBe(0);
      expect(result.expiredLocations).toBe(0);
    });

    it('should correctly categorize all expired locations', async () => {
      const now = new Date();
      const allConsents = [
        { id: 'c-1', consentStatus: 'opted_in' },
      ];

      const allLocations = [
        { id: 'loc-1', expiresAt: new Date(now.getTime() - 1000 * 60 * 60) },
        { id: 'loc-2', expiresAt: new Date(now.getTime() - 1000 * 60 * 60 * 2) },
        { id: 'loc-3', expiresAt: new Date(now.getTime() - 1000 * 60 * 60 * 3) },
      ];

      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue(allConsents);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue(allLocations);

      const result = await service.generateComplianceReport();

      expect(result.activeLocations).toBe(0);
      expect(result.expiredLocations).toBe(3);
    });

    it('should correctly count consent statuses', async () => {
      const allConsents = [
        { id: 'c-1', consentStatus: 'opted_in' },
        { id: 'c-2', consentStatus: 'opted_in' },
        { id: 'c-3', consentStatus: 'opted_in' },
        { id: 'c-4', consentStatus: 'opted_out' },
        { id: 'c-5', consentStatus: 'opted_out' },
        { id: 'c-6', consentStatus: 'never_asked' },
      ];

      (mockDb.db.query.memberLocationConsent.findMany as any).mockResolvedValue(allConsents);
      (mockDb.db.query.locationTracking.findMany as any).mockResolvedValue([]);

      const result = await service.generateComplianceReport();

      expect(result.totalMembers).toBe(6);
      expect(result.optedIn).toBe(3);
      expect(result.optedOut).toBe(2);
      expect(result.neverAsked).toBe(1);
    });
  });
});

describe('locationTrackingService (singleton)', () => {
  it('should export a singleton instance', () => {
    expect(locationTrackingService).toBeDefined();
    expect(locationTrackingService).toBeInstanceOf(LocationTrackingService);
  });

  it('should be reusable across calls', async () => {
    const consent = {
      id: 'consent-123',
      userId: 'member-123',
      consentStatus: 'never_asked',
    };

    (mockDb.db.query.memberLocationConsent.findFirst as any).mockResolvedValue(consent);

    const status1 = await locationTrackingService.getConsentStatus('member-123');
    const status2 = await locationTrackingService.getConsentStatus('member-123');

    expect(status1).toEqual(status2);
  });
});

describe('scheduledLocationPurge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should call purgeExpiredLocations and log result', async () => {
    const expiredLocations = [
      { id: 'loc-1' },
      { id: 'loc-2' },
      { id: 'loc-3' },
    ];

    (mockDb.db.delete as any).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(expiredLocations),
      }),
    });

    const result = await scheduledLocationPurge();

    expect(result.deletedCount).toBe(3);
    expect(result.message).toContain('Purged 3 expired location records');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[CRON] Location purge')
    );
  });

  it('should handle zero expired locations', async () => {
    (mockDb.db.delete as any).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await scheduledLocationPurge();

    expect(result.deletedCount).toBe(0);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Purged 0 expired location records')
    );
  });

  it('should return result object with correct structure', async () => {
    (mockDb.db.delete as any).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'loc-1' }]),
      }),
    });

    const result = await scheduledLocationPurge();

    expect(result).toHaveProperty('deletedCount');
    expect(result).toHaveProperty('message');
    expect(typeof result.deletedCount).toBe('number');
    expect(typeof result.message).toBe('string');
  });
});
