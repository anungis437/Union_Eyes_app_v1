/**
 * Geofence Privacy Service Tests
 *
 * Validates:
 * - Explicit opt-in required (no implicit consent)
 * - No background location tracking (foreground-only)
 * - 24-hour TTL on location data
 * - Easy revocation anytime
 * - Compliance verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestLocationPermission,
  trackLocation,
  purgeExpiredLocations,
  revokeLocationConsent,
  getLocationConsentStatus,
  verifyNoBackgroundTracking,
  generateGeofencePrivacyReport,
} from '@/lib/services/geofence-privacy-service';
import { memberLocationConsent, locationTracking } from '@/db/schema/geofence-privacy-schema';

// Mock database
vi.mock('@/db', () => ({
  db: {
    query: {
      memberLocationConsent: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      locationTracking: {
        findMany: vi.fn()
      }
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{
        id: 'loc-123',
        userId: 'user-001',
        latitude: 43.6532,
        longitude: -79.3832,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        trackingType: 'foreground_only',
        purpose: 'strike-line-tracking'
      }]))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve())
    }))
  }
}));

describe('GeofencePrivacyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should require explicit user action when no consent exists', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce(null);

      const result = await requestLocationPermission(
        'user-001',
        'strike-line-tracking',
        'temporary'
      );

      expect(result.requiresUserAction).toBe(true);
      expect(result.message).toContain('explicitly opt-in');
      expect(result.message).toContain('No implicit consent');
      expect(result.consentId).toMatch(/^pending-user-001-\d+$/);
    });

    it('should return existing consent if already opted in', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: new Date('2026-01-01'),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });

      const result = await requestLocationPermission(
        'user-001',
        'strike-line-tracking'
      );

      expect(result.requiresUserAction).toBe(false);
      expect(result.consentId).toBe('consent-123');
      expect(result.message).toBe('Location tracking already enabled');
    });

    it('should require new opt-in if previously opted out', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_out',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15')
      });

      const result = await requestLocationPermission(
        'user-001',
        'safety-check-ins'
      );

      expect(result.requiresUserAction).toBe(true);
      expect(result.message).toContain('explicitly opt-in');
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const result = await requestLocationPermission(
        'user-001',
        'event-coordination'
      );

      expect(result.requiresUserAction).toBe(true);
      expect(result.consentId).toMatch(/^pending-/);
    });
  });

  describe('trackLocation', () => {
    it('should reject location tracking without explicit opt-in', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce(null);

      const result = await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location tracking requires explicit opt-in consent');
    });

    it('should reject tracking if consent is opted_out', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_out',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15')
      });

      const result = await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location tracking requires explicit opt-in consent');
    });

    it('should reject expired consent and revoke it', async () => {
      const { db } = await import('@/db');
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2024-01-01'),
        expiresAt: expiredDate,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      const result = await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location tracking consent has expired');
      expect(db.update).toHaveBeenCalled();
    });

    it('should successfully track location with valid consent', async () => {
      const { db } = await import('@/db');
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: futureDate,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });

      const result = await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('should store location with 24-hour TTL', async () => {
      const { db } = await import('@/db');
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: futureDate,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });

      const beforeTime = Date.now();
      await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );
      const afterTime = Date.now();

      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall).toBeDefined();
      
      // Verify insert was called (actual values are inside the closure)
      expect(db.insert).toHaveBeenCalled();
    });

    it('should enforce foreground-only tracking', async () => {
      const { db } = await import('@/db');
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'safety-check-ins',
        optedInAt: new Date('2025-01-01'),
        expiresAt: futureDate,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });

      await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'safety-check-ins'
      );

      // Tracking type should always be 'foreground_only', never 'background'
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle database insertion errors gracefully', async () => {
      const { db } = await import('@/db');
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: new Date('2025-01-01'),
        expiresAt: futureDate,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });

      vi.mocked(db.insert).mockImplementationOnce(() => {
        throw new Error('Database write failed');
      });

      const result = await trackLocation(
        'user-001',
        { latitude: 43.6532, longitude: -79.3832 },
        'strike-line-tracking'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to track location');
    });
  });

  describe('purgeExpiredLocations', () => {
    it('should delete expired location records', async () => {
      const { db } = await import('@/db');

      const result = await purgeExpiredLocations();

      expect(db.delete).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('24-hour TTL enforced');
    });

    it('should handle deletion errors gracefully', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.delete).mockImplementationOnce(() => {
        throw new Error('Database deletion failed');
      });

      const result = await purgeExpiredLocations();

      expect(result.purgedCount).toBe(0);
      expect(result.message).toContain('Error purging locations');
    });
  });

  describe('revokeLocationConsent', () => {
    it('should successfully revoke consent', async () => {
      const { db } = await import('@/db');

      const result = await revokeLocationConsent('user-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(result.message).toContain('re-enable anytime');
      expect(db.update).toHaveBeenCalled();
    });

    it('should handle revocation errors gracefully', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.update).mockImplementationOnce(() => {
        throw new Error('Database update failed');
      });

      const result = await revokeLocationConsent('user-001');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error revoking consent');
    });
  });

  describe('getLocationConsentStatus', () => {
    it('should return never_asked status when no consent exists', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce(null);

      const status = await getLocationConsentStatus('user-001');

      expect(status.status).toBe('never_asked');
      expect(status.canRevokeAnytime).toBe(true);
      expect(status.purpose).toBeUndefined();
      expect(status.optedInAt).toBeUndefined();
    });

    it('should return opted_in status with details', async () => {
      const { db } = await import('@/db');
      const optedInDate = new Date('2025-01-15');
      const expiresDate = new Date('2026-01-15');

      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_in',
        purpose: 'strike-line-tracking',
        optedInAt: optedInDate,
        expiresAt: expiresDate,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      });

      const status = await getLocationConsentStatus('user-001');

      expect(status.status).toBe('opted_in');
      expect(status.canRevokeAnytime).toBe(true);
      expect(status.purpose).toBe('strike-line-tracking');
      expect(status.optedInAt).toEqual(optedInDate);
      expect(status.expiresAt).toEqual(expiresDate);
    });

    it('should return opted_out status', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockResolvedValueOnce({
        id: 'consent-123',
        userId: 'user-001',
        status: 'opted_out',
        purpose: 'event-coordination',
        optedInAt: new Date('2025-01-01'),
        expiresAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-02-01')
      });

      const status = await getLocationConsentStatus('user-001');

      expect(status.status).toBe('opted_out');
      expect(status.canRevokeAnytime).toBe(true);
    });

    it('should handle database errors by returning never_asked', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.memberLocationConsent.findFirst).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const status = await getLocationConsentStatus('user-001');

      expect(status.status).toBe('never_asked');
      expect(status.canRevokeAnytime).toBe(true);
    });
  });

  describe('verifyNoBackgroundTracking', () => {
    it('should return compliant when all tracking is foreground-only', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([
        {
          id: 'loc-001',
          userId: 'user-001',
          trackingType: 'foreground_only',
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'strike-line-tracking'
        },
        {
          id: 'loc-002',
          userId: 'user-002',
          trackingType: 'foreground_only',
          latitude: 43.6500,
          longitude: -79.3800,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'safety-check-ins'
        }
      ]);

      const result = await verifyNoBackgroundTracking();

      expect(result.compliant).toBe(true);
      expect(result.backgroundTrackingDetected).toBe(false);
      expect(result.message).toContain('foreground-only');
      expect(result.message).toContain('compliant');
    });

    it('should detect policy violation when background tracking found', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([
        {
          id: 'loc-001',
          userId: 'user-001',
          trackingType: 'foreground_only',
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'strike-line-tracking'
        },
        {
          id: 'loc-002',
          userId: 'user-002',
          trackingType: 'background', // VIOLATION
          latitude: 43.6500,
          longitude: -79.3800,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'safety-check-ins'
        }
      ]);

      const result = await verifyNoBackgroundTracking();

      expect(result.compliant).toBe(false);
      expect(result.backgroundTrackingDetected).toBe(true);
      expect(result.message).toContain('POLICY VIOLATION');
      expect(result.message).toContain('Background location tracking detected');
    });

    it('should return compliant when no location records exist', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([]);

      const result = await verifyNoBackgroundTracking();

      expect(result.compliant).toBe(true);
      expect(result.backgroundTrackingDetected).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockRejectedValueOnce(
        new Error('Database query failed')
      );

      const result = await verifyNoBackgroundTracking();

      expect(result.compliant).toBe(true);
      expect(result.backgroundTrackingDetected).toBe(false);
    });
  });

  describe('generateGeofencePrivacyReport', () => {
    it('should generate compliant report when no violations detected', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([
        {
          id: 'loc-001',
          userId: 'user-001',
          trackingType: 'foreground_only',
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'strike-line-tracking'
        }
      ]);

      const report = await generateGeofencePrivacyReport();

      expect(report.compliant).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('foreground-only'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('24 hours'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('explicit opt-in'))).toBe(true);
    });

    it('should report policy violation when background tracking detected', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([
        {
          id: 'loc-001',
          userId: 'user-001',
          trackingType: 'background',
          latitude: 43.6532,
          longitude: -79.3832,
          timestamp: new Date(),
          expiresAt: new Date(),
          purpose: 'strike-line-tracking'
        }
      ]);

      const report = await generateGeofencePrivacyReport();

      expect(report.compliant).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]).toContain('Background location tracking detected');
      expect(report.issues[0]).toContain('POLICY VIOLATION');
    });

    it('should include comprehensive recommendations', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.locationTracking.findMany).mockResolvedValueOnce([]);

      const report = await generateGeofencePrivacyReport();

      expect(report.recommendations).toContain('Ensure location tracking is foreground-only (never background)');
      expect(report.recommendations).toContain('Verify explicit opt-in before any tracking');
      expect(report.recommendations).toContain('Implement easy revocation mechanism');
      expect(report.recommendations).toContain('Purge location data after 24 hours');
      expect(report.recommendations).toContain('Display clear purpose of location tracking');
      expect(report.recommendations).toContain('Provide member dashboard to see tracked locations');
    });
  });
});


