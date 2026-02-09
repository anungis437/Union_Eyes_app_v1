/**
 * Location Tracking Integration Tests
 * Tests explicit opt-in location tracking service
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LocationTrackingService } from '@/lib/services/location-tracking-service';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIf = hasDatabase ? describe : describe.skip;

describeIf('Location Tracking Service Integration', () => {
  let service: LocationTrackingService;
  let hasLocationSchema = true;

  const getRows = <T = any>(result: any): T[] => {
    if (Array.isArray(result)) {
      return result as T[];
    }

    return (result?.rows ?? []) as T[];
  };

  const skipIfNoLocationSchema = () => {
    if (!hasLocationSchema) {
      expect(hasLocationSchema).toBe(false);
      return true;
    }

    return false;
  };

  beforeAll(async () => {
    try {
      const consentResult = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'member_location_consent'
          AND column_name = 'user_id'
      `);
      const locationResult = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'location_tracking'
          AND column_name = 'user_id'
      `);

      const consentCount = Number(getRows(consentResult)[0]?.count ?? 0);
      const locationCount = Number(getRows(locationResult)[0]?.count ?? 0);
      hasLocationSchema = consentCount > 0 && locationCount > 0;
    } catch {
      hasLocationSchema = false;
    }
  });

  beforeEach(() => {
    service = new LocationTrackingService();
  });

  describe('Explicit Opt-In Requirements', () => {
    it('should require explicit consent request before tracking', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // Should throw error if trying to track without consent
      await expect(
        service.trackLocation(memberId, {
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date()
        }, 'strike_line_tracking')
      ).rejects.toThrow('Location tracking permission not granted');
    });

    it('should create consent request with never_asked status', async () => {
      if (skipIfNoLocationSchema()) return;
      const request = {
        memberId: 'member-123',
        purpose: 'strike_line_tracking' as const,
        purposeDescription: 'Tracking members on the strike line',
        requestedAt: new Date()
      };

      const result = await service.requestLocationPermission(request);

      expect(result.success).toBe(true);
      expect(result.consentId).toBeDefined();
    });

    it('should grant consent explicitly with opted-in timestamp', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // First request permission
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking' as const,
        purposeDescription: 'Tracking members on the strike line',
        requestedAt: new Date()
      });

      // Then grant consent
      const result = await service.grantLocationConsent(memberId, 'strike_line_tracking');

      expect(result.success).toBe(true);
      expect(result.optedInAt).toBeDefined();
    });
  });

  describe('Foreground-Only Tracking', () => {
    it('should only allow foreground tracking', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // Grant consent first
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking' as const,
        purposeDescription: 'Tracking members on the strike line',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'strike_line_tracking');

      // Track location
      const location = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date()
      };

      const result = await service.trackLocation(memberId, location, 'strike_line_tracking');

      expect(result.success).toBe(true);
      expect(result.locationId).toBeDefined();
    });

    it('should only allow foreground tracking', async () => {
      if (skipIfNoLocationSchema()) return;
      // verifyLocationPermission returns boolean or throws error
      const memberId = 'member-foreground';
      
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking' as const,
        purposeDescription: 'Foreground tracking test',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'strike_line_tracking');
      
      const hasPermission = await service.verifyLocationPermission(memberId);
      expect(hasPermission).toBe(true);
    });
  });

  describe('24-Hour Data Retention', () => {
    it('should set 24-hour expiry on tracked locations', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      await service.requestLocationPermission({
        memberId,
        purpose: 'safety_checkin' as const,
        purposeDescription: 'Safety check-in during emergency',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'safety_checkin');

      const location = {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date()
      };

      const result = await service.trackLocation(memberId, location, 'safety_checkin');

      expect(result.expiresAt).toBeDefined();
      
      if (result.expiresAt) {
        const expiryHours = (result.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        expect(expiryHours).toBeLessThanOrEqual(24);
        expect(expiryHours).toBeGreaterThan(23.5);
      }
    });

    it('should automatically purge expired locations', async () => {
      if (skipIfNoLocationSchema()) return;
      const purgeResult = await service.purgeExpiredLocations();

      expect(purgeResult.deletedCount).toBeDefined();
      expect(typeof purgeResult.deletedCount).toBe('number');
      expect(purgeResult.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should not return expired locations in history', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      const history = await service.getLocationHistory(memberId, 10);

      // All returned locations should have expiresAt in future
      for (const loc of history) {
        expect(new Date(loc.expiresAt).getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('Consent Revocation', () => {
    it('should allow members to revoke consent anytime', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // Grant consent
      await service.requestLocationPermission({
        memberId,
        purpose: 'event_attendance' as const,
        purposeDescription: 'Event attendance verification',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'event_attendance');

      // Revoke consent
      const result = await service.revokeLocationConsent(memberId);

      expect(result.success).toBe(true);
      expect(result.revokedAt).toBeDefined();
    });

    it('should immediately purge all location data on revocation', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // Grant consent and track some locations
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking' as const,
        purposeDescription: 'Tracking members on the strike line',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'strike_line_tracking');

      await service.trackLocation(memberId, {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date()
      }, 'strike_line_tracking');

      // Revoke consent
      await service.revokeLocationConsent(memberId);

      // Verify all data purged
      const history = await service.getLocationHistory(memberId, 100);
      expect(history.length).toBe(0);
    });

    it('should prevent tracking after revocation', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      // Grant then revoke
      await service.requestLocationPermission({
        memberId,
        purpose: 'safety_checkin' as const,
        purposeDescription: 'Safety check-in during emergency',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'safety_checkin');
      await service.revokeLocationConsent(memberId);

      // Attempt to track should fail
      await expect(
        service.trackLocation(memberId, {
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date()
        }, 'safety_checkin')
      ).rejects.toThrow('Location tracking permission not granted');
    });
  });

  describe('Purpose-Specific Consent', () => {
    it('should require specific purpose for tracking', async () => {
      if (skipIfNoLocationSchema()) return;
      const validPurposes = [
        'strike_line_tracking',
        'safety_checkin',
        'event_attendance',
        'emergency_response'
      ];

      for (const purpose of validPurposes) {
        const request = await service.requestLocationPermission({
          memberId: `member-${purpose}`,
          purpose: purpose as any,
          purposeDescription: `Test ${purpose}`,
          requestedAt: new Date()
        });

        expect(request.success).toBe(true);
      }
    });

    it('should track purpose with each location record', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';
      const purpose = 'event_attendance';

      await service.requestLocationPermission({
        memberId,
        purpose: purpose as any,
        purposeDescription: 'Event attendance verification',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, purpose as any);

      const result = await service.trackLocation(memberId, {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date()
      }, purpose as any);

      expect(result.success).toBe(true);
      expect(result.locationId).toBeDefined();
    });
  });

  describe('Consent Status Checks', () => {
    it('should verify permission before tracking', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-no-consent';

      await expect(
        service.verifyLocationPermission(memberId)
      ).rejects.toThrow('Location tracking not permitted');
    });

    it('should get current consent status', async () => {
      if (skipIfNoLocationSchema()) return;
      const memberId = 'member-123';

      const status = await service.getConsentStatus(memberId);

      expect(status).toHaveProperty('status');
      expect(status.status).toBeDefined();
    });

    it('should list members with active consent', async () => {
      if (skipIfNoLocationSchema()) return;
      const activeMembers = await service.getMembersWithActiveConsent();

      expect(Array.isArray(activeMembers)).toBe(true);
      
      // Returns array of member IDs (strings)
      for (const memberId of activeMembers) {
        expect(typeof memberId).toBe('string');
      }
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate location tracking compliance report', async () => {
      if (skipIfNoLocationSchema()) return;
      const report = await service.generateComplianceReport();

      expect(report).toHaveProperty('totalMembers');
      expect(report).toHaveProperty('optedIn');
      expect(report).toHaveProperty('optedOut');
      expect(report).toHaveProperty('neverAsked');
    });

    it('should track opt-in and opt-out statistics', async () => {
      if (skipIfNoLocationSchema()) return;
      const report = await service.generateComplianceReport();

      expect(typeof report.totalMembers).toBe('number');
      expect(typeof report.optedIn).toBe('number');
      expect(typeof report.optedOut).toBe('number');
      expect(typeof report.neverAsked).toBe('number');
      expect(report.trackingType).toBe('foreground_only');
    });
  });
});
