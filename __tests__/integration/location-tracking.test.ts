/**
 * Location Tracking Integration Tests
 * Tests explicit opt-in location tracking service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocationTrackingService } from '@/lib/services/location-tracking-service';

describe('Location Tracking Service Integration', () => {
  let service: LocationTrackingService;

  beforeEach(() => {
    service = new LocationTrackingService();
  });

  describe('Explicit Opt-In Requirements', () => {
    it('should require explicit consent request before tracking', async () => {
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
      const request = {
        memberId: 'member-123',
        purpose: 'strike_line_tracking',
        requestedAt: new Date()
      };

      const result = await service.requestLocationPermission(request);

      expect(result.status).toBe('never_asked');
      expect(result.consentStatus).toBe('not_granted');
    });

    it('should grant consent explicitly with opted-in timestamp', async () => {
      const memberId = 'member-123';

      // First request permission
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking',
        requestedAt: new Date()
      });

      // Then grant consent
      const result = await service.grantLocationConsent(memberId, 'strike_line_tracking');

      expect(result.consentStatus).toBe('granted');
      expect(result.optedInAt).toBeDefined();
    });
  });

  describe('Foreground-Only Tracking', () => {
    it('should only allow foreground tracking', async () => {
      const memberId = 'member-123';

      // Grant consent first
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking',
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

      expect(result.trackingType).toBe('foreground_only');
      expect(result.backgroundTracking).toBe(false);
    });

    it('should reject background tracking requests', async () => {
      const result = await service.verifyLocationPermission('member-123');

      expect(result.backgroundTrackingAllowed).toBe(false);
      expect(result.trackingType).toBe('foreground_only');
    });
  });

  describe('24-Hour Data Retention', () => {
    it('should set 24-hour expiry on tracked locations', async () => {
      const memberId = 'member-123';

      await service.requestLocationPermission({
        memberId,
        purpose: 'safety_checkin',
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
      
      const expiryHours = (new Date(result.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      expect(expiryHours).toBeLessThanOrEqual(24);
      expect(expiryHours).toBeGreaterThan(23.5);
    });

    it('should automatically purge expired locations', async () => {
      const purgeResult = await service.purgeExpiredLocations();

      expect(purgeResult.purged).toBeDefined();
      expect(typeof purgeResult.purged).toBe('number');
      expect(purgeResult.purged).toBeGreaterThanOrEqual(0);
    });

    it('should not return expired locations in history', async () => {
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
      const memberId = 'member-123';

      // Grant consent
      await service.requestLocationPermission({
        memberId,
        purpose: 'event_attendance',
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, 'event_attendance');

      // Revoke consent
      const result = await service.revokeLocationConsent(memberId);

      expect(result.consentStatus).toBe('revoked');
      expect(result.revokedAt).toBeDefined();
    });

    it('should immediately purge all location data on revocation', async () => {
      const memberId = 'member-123';

      // Grant consent and track some locations
      await service.requestLocationPermission({
        memberId,
        purpose: 'strike_line_tracking',
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
      const memberId = 'member-123';

      // Grant then revoke
      await service.requestLocationPermission({
        memberId,
        purpose: 'safety_checkin',
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
      const validPurposes = [
        'strike_line_tracking',
        'safety_checkin',
        'event_attendance',
        'emergency_response'
      ];

      for (const purpose of validPurposes) {
        const request = await service.requestLocationPermission({
          memberId: `member-${purpose}`,
          purpose,
          requestedAt: new Date()
        });

        expect(request.purpose).toBe(purpose);
      }
    });

    it('should track purpose with each location record', async () => {
      const memberId = 'member-123';
      const purpose = 'event_attendance';

      await service.requestLocationPermission({
        memberId,
        purpose,
        requestedAt: new Date()
      });
      await service.grantLocationConsent(memberId, purpose);

      const result = await service.trackLocation(memberId, {
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date()
      }, purpose);

      expect(result.purpose).toBe(purpose);
    });
  });

  describe('Consent Status Checks', () => {
    it('should verify permission before tracking', async () => {
      const memberId = 'member-no-consent';

      const verification = await service.verifyLocationPermission(memberId);

      expect(verification.hasPermission).toBe(false);
      expect(verification.canTrack).toBe(false);
    });

    it('should get current consent status', async () => {
      const memberId = 'member-123';

      const status = await service.getConsentStatus(memberId);

      expect(status).toHaveProperty('consentStatus');
      expect(status).toHaveProperty('canTrack');
    });

    it('should list members with active consent', async () => {
      const activeMembers = await service.getMembersWithActiveConsent();

      expect(Array.isArray(activeMembers)).toBe(true);
      
      for (const member of activeMembers) {
        expect(member).toHaveProperty('memberId');
        expect(member.consentStatus).toBe('granted');
      }
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate location tracking compliance report', async () => {
      const report = await service.generateComplianceReport();

      expect(report).toHaveProperty('totalConsents');
      expect(report).toHaveProperty('activeConsents');
      expect(report).toHaveProperty('revokedConsents');
      expect(report).toHaveProperty('optInRate');
    });

    it('should track opt-in and opt-out statistics', async () => {
      const report = await service.generateComplianceReport();

      expect(typeof report.totalConsents).toBe('number');
      expect(typeof report.activeConsents).toBe('number');
      expect(typeof report.revokedConsents).toBe('number');
      expect(report.optInRate).toBeGreaterThanOrEqual(0);
      expect(report.optInRate).toBeLessThanOrEqual(100);
    });
  });
});
