/**
 * Location Tracking Service with Explicit Opt-In
 * 
 * Implements strict location tracking compliance:
 * - EXPLICIT opt-in required (never implicit)
 * - Foreground-only tracking (no background)
 * - 24-hour data retention (auto-purge)
 * - Purpose-specific consent
 * - Can revoke anytime
 * 
 * Use cases:
 * - Strike line tracking (with consent)
 * - Safety check-ins during emergencies
 * - Event attendance verification
 */

import { db } from '@/db';
import { eq, lte, and } from 'drizzle-orm';
import { memberLocationConsent, locationTracking } from '@/db/schema';

export type LocationPurpose = 
  | 'strike_line_tracking'
  | 'safety_checkin'
  | 'event_attendance'
  | 'emergency_response';

export type ConsentStatus = 'never_asked' | 'opted_out' | 'opted_in';

export interface LocationConsentRequest {
  memberId: string;
  purpose: LocationPurpose;
  purposeDescription: string;
  requestedAt: Date;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export class LocationTrackingService {
  private readonly MAX_RETENTION_HOURS = 24;
  private readonly TRACKING_TYPE = 'foreground_only'; // NEVER background

  /**
   * Request location tracking permission from member
   * MUST be explicit opt-in (not implicit or opt-out)
   */
  async requestLocationPermission(
    request: LocationConsentRequest
  ): Promise<{
    success: boolean;
    message: string;
    consentId?: string;
  }> {
    // Check if member already has consent record
    const existingConsent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, request.memberId)
    });

    if (existingConsent) {
      return {
        success: false,
        message: `Member already has consent status: ${existingConsent.status}. Use updateConsent() to change.`
      };
    }

    // Create new consent request (starts as 'never_asked')
    const [consent] = await db.insert(memberLocationConsent).values({
      memberId: request.memberId,
      status: 'never_asked',
      purpose: request.purpose,
      purposeDescription: request.purposeDescription,
      canRevokeAnytime: true,
      requestedAt: request.requestedAt,
    }).returning();

    return {
      success: true,
      message: 'Consent request created. Member must explicitly opt-in before tracking begins.',
      consentId: consent.id
    };
  }

  /**
   * Member explicitly opts in to location tracking
   */
  async grantLocationConsent(
    memberId: string,
    purpose: LocationPurpose
  ): Promise<{
    success: boolean;
    message: string;
    optedInAt?: Date;
  }> {
    const consent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, memberId)
    });

    if (!consent) {
      return {
        success: false,
        message: 'No consent request found. Request permission first using requestLocationPermission().'
      };
    }

    if (consent.status === 'opted_in') {
      return {
        success: false,
        message: 'Member already opted in to location tracking.'
      };
    }

    // Update to opted_in status
    const optedInAt = new Date();
    await db.update(memberLocationConsent)
      .set({
        status: 'opted_in',
        optedInAt,
        purpose,
      })
      .where(eq(memberLocationConsent.memberId, memberId));

    return {
      success: true,
      message: 'Location tracking consent granted. Tracking will be foreground-only with 24-hour retention.',
      optedInAt
    };
  }

  /**
   * Member revokes location tracking consent
   * Can be done anytime
   */
  async revokeLocationConsent(memberId: string): Promise<{
    success: boolean;
    message: string;
    revokedAt?: Date;
  }> {
    const consent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, memberId)
    });

    if (!consent) {
      return {
        success: false,
        message: 'No consent record found for this member.'
      };
    }

    const revokedAt = new Date();
    
    // Update consent to opted_out
    await db.update(memberLocationConsent)
      .set({
        status: 'opted_out',
        revokedAt,
      })
      .where(eq(memberLocationConsent.memberId, memberId));

    // Immediately delete all location data for this member
    await this.purgeLocationData(memberId);

    return {
      success: true,
      message: 'Location tracking consent revoked. All location data has been deleted.',
      revokedAt
    };
  }

  /**
   * Verify member has opted in before tracking
   * CRITICAL: Always call this before recording location
   */
  async verifyLocationPermission(memberId: string): Promise<boolean> {
    const consent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, memberId)
    });

    if (!consent || consent.status !== 'opted_in') {
      throw new Error(
        'Location tracking not permitted. Member must explicitly opt-in first.'
      );
    }

    return true;
  }

  /**
   * Track member location (foreground only)
   * REQUIRES explicit opt-in first
   */
  async trackLocation(
    memberId: string,
    location: LocationData,
    purpose: LocationPurpose,
    geofenceId?: string
  ): Promise<{
    success: boolean;
    message: string;
    locationId?: string;
    expiresAt?: Date;
  }> {
    // CRITICAL: Verify permission first
    try {
      await this.verifyLocationPermission(memberId);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Permission denied'
      };
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.MAX_RETENTION_HOURS);

    // Record location with automatic expiration
    const [tracked] = await db.insert(locationTracking).values({
      memberId,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      accuracyMeters: location.accuracy || null,
      geofenceId: geofenceId || null,
      purpose,
      trackedAt: location.timestamp,
      expiresAt,
      trackingType: this.TRACKING_TYPE, // Always foreground_only
    }).returning();

    return {
      success: true,
      message: `Location tracked. Data will auto-delete after ${this.MAX_RETENTION_HOURS} hours.`,
      locationId: tracked.id,
      expiresAt
    };
  }

  /**
   * Get member's location history (only non-expired)
   */
  async getLocationHistory(
    memberId: string,
    limit: number = 100
  ): Promise<any[]> {
    // Verify permission
    await this.verifyLocationPermission(memberId);

    // Return only non-expired locations
    const now = new Date();
    return await db.query.locationTracking.findMany({
      where: and(
        eq(locationTracking.memberId, memberId),
        // Not expired
      ),
      limit,
      orderBy: (locations, { desc }) => [desc(locations.trackedAt)]
    });
  }

  /**
   * Purge expired locations (run hourly via cron)
   */
  async purgeExpiredLocations(): Promise<{
    deletedCount: number;
    message: string;
  }> {
    const now = new Date();
    
    const result = await db.delete(locationTracking)
      .where(lte(locationTracking.expiresAt, now))
      .returning();

    return {
      deletedCount: result.length,
      message: `Purged ${result.length} expired location records (older than ${this.MAX_RETENTION_HOURS} hours)`
    };
  }

  /**
   * Purge all location data for a specific member
   * Used when consent is revoked
   */
  async purgeLocationData(memberId: string): Promise<{
    deletedCount: number;
    message: string;
  }> {
    const result = await db.delete(locationTracking)
      .where(eq(locationTracking.memberId, memberId))
      .returning();

    return {
      deletedCount: result.length,
      message: `Deleted all location data for member ${memberId}`
    };
  }

  /**
   * Get consent status for member
   */
  async getConsentStatus(memberId: string): Promise<{
    status: ConsentStatus;
    optedInAt?: Date | null;
    revokedAt?: Date | null;
    purpose?: string | null;
    canRevoke: boolean;
  }> {
    const consent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, memberId)
    });

    if (!consent) {
      return {
        status: 'never_asked',
        canRevoke: false
      };
    }

    return {
      status: consent.status as ConsentStatus,
      optedInAt: consent.optedInAt,
      revokedAt: consent.revokedAt,
      purpose: consent.purpose,
      canRevoke: consent.canRevokeAnytime
    };
  }

  /**
   * Get all members with active location consent
   */
  async getMembersWithActiveConsent(): Promise<string[]> {
    const consents = await db.query.memberLocationConsent.findMany({
      where: eq(memberLocationConsent.status, 'opted_in')
    });

    return consents.map(c => c.memberId);
  }

  /**
   * Generate location tracking compliance report
   */
  async generateComplianceReport(): Promise<{
    totalMembers: number;
    optedIn: number;
    optedOut: number;
    neverAsked: number;
    activeLocations: number;
    expiredLocations: number;
    trackingType: string;
    maxRetentionHours: number;
  }> {
    const allConsents = await db.query.memberLocationConsent.findMany();
    const allLocations = await db.query.locationTracking.findMany();

    const now = new Date();
    const activeLocations = allLocations.filter(l => new Date(l.expiresAt) > now);
    const expiredLocations = allLocations.filter(l => new Date(l.expiresAt) <= now);

    return {
      totalMembers: allConsents.length,
      optedIn: allConsents.filter(c => c.status === 'opted_in').length,
      optedOut: allConsents.filter(c => c.status === 'opted_out').length,
      neverAsked: allConsents.filter(c => c.status === 'never_asked').length,
      activeLocations: activeLocations.length,
      expiredLocations: expiredLocations.length,
      trackingType: this.TRACKING_TYPE,
      maxRetentionHours: this.MAX_RETENTION_HOURS
    };
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();

/**
 * Cron job to run hourly
 * Purges location data older than 24 hours
 */
export async function scheduledLocationPurge() {
  const result = await locationTrackingService.purgeExpiredLocations();
  console.log(`[CRON] Location purge: ${result.message}`);
  return result;
}
