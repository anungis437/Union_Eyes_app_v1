/**
 * Geofence Privacy Validator
 * 
 * Validates location tracking compliance:
 * - Opt-in only (not opt-out)
 * - 24-hour retention maximum
 * - No background tracking
 * - Clear disclosure of tracking purposes
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class GeofencePrivacyValidator extends BlindSpotValidator {
  name = '5. Geofence Privacy';
  description = 'Validates location tracking opt-in and data retention';
  category = 'privacy';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasOptInLogic = await this.checkOptInLogic();
    const hasRetentionPolicy = await this.checkRetentionPolicy();
    const hasBackgroundTrackingCheck = await this.checkBackgroundTracking();

    if (!hasOptInLogic) {
      findings.push({
        file: 'lib/services/location',
        issue: 'No explicit opt-in mechanism for location tracking',
        severity: 'critical',
      });
    }

    if (!hasRetentionPolicy) {
      findings.push({
        file: 'lib/services/location',
        issue: 'No 24-hour location data retention policy found',
        severity: 'high',
      });
    }

    if (!hasBackgroundTrackingCheck) {
      findings.push({
        file: 'lib/services/location',
        issue: 'No safeguards against background location tracking',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} geofence privacy compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Geofence privacy compliance checks passed');
  }

  private async checkOptInLogic(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*location*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/opt.?in|explicit.*consent|location.*permission/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkRetentionPolicy(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/24.*hour|retention.*location|purge.*location/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkBackgroundTracking(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*location*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/background.*tracking|foreground.*only/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// lib/services/location-service.ts
export class LocationService {
  async requestLocationPermission(memberId: string): Promise<boolean> {
    // MUST be explicit opt-in
    const consent = await db.query.memberLocationConsent.findFirst({
      where: eq(memberLocationConsent.memberId, memberId)
    });

    if (!consent || consent.status !== 'opted_in') {
      throw new Error('Location tracking requires explicit opt-in');
    }

    return true;
  }

  async trackLocation(memberId: string, location: Location): Promise<void> {
    await this.requestLocationPermission(memberId);

    // Store with 24-hour TTL
    await db.insert(locationTracking).values({
      memberId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      trackingType: 'foreground_only', // Never background
    });
  }

  async purgeExpiredLocations(): Promise<void> {
    // Run this job hourly
    await db.delete(locationTracking)
      .where(lte(locationTracking.expiresAt, new Date()));
  }
}

// db/schema/location-schema.ts
export const memberLocationConsent = pgTable('member_location_consent', {
  memberId: uuid('member_id').references(() => members.id).primaryKey(),
  status: text('status').notNull(), // opted_in, opted_out, never_asked
  optedInAt: timestamp('opted_in_at'),
  purpose: text('purpose'), // "Strike line tracking", "Safety check-ins"
  canRevokeAnytime: boolean('can_revoke_anytime').default(true),
});

export const locationTracking = pgTable('location_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  timestamp: timestamp('timestamp').notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Max 24 hours
  trackingType: text('tracking_type').default('foreground_only'),
  purpose: text('purpose'),
});
`;
  }
}
