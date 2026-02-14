/**
 * Consent Management API
 * 
 * SPRINT 7: Integrated with notification system
 * 
 * Handles consent CRUD operations for data aggregation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dataAggregationConsent } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';
import { 
  createConsentRecord, 
  revokeConsent, 
  updateConsentPreferences, 
  validateConsent 
} from '@/lib/movement-insights/consent-manager';
import { 
  sendConsentGrantedNotification, 
  sendConsentRevokedNotification 
} from '@/lib/integrations/marketing-notifications';
import { requireUser, requireUserForOrganization } from '@/lib/api-auth-guard';

/**
 * GET /api/consent
 * 
 * Get current consent status for organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    await requireUserForOrganization(organizationId);

    const [consent] = await db
      .select()
      .from(dataAggregationConsent)
      .where(
        eq(dataAggregationConsent.organizationId, organizationId)
      )
      .limit(1);

    return NextResponse.json({ consent });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Error fetching consent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consent
 * 
 * Grant consent for data aggregation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, preferences, purpose } = body;

    if (!organizationId || !preferences || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const authContext = await requireUserForOrganization(organizationId);

    // Validate at least one preference is true
    const hasAnyPreference = Object.values(preferences).some((v) => v === true);
    if (!hasAnyPreference) {
      return NextResponse.json(
        { error: 'At least one data type must be selected' },
        { status: 400 }
      );
    }

    // Check for existing active consent
    const [existing] = await db
      .select()
      .from(dataAggregationConsent)
      .where(
        eq(dataAggregationConsent.organizationId, organizationId)
      )
      .limit(1);

    if (existing && existing.consentGiven) {
      return NextResponse.json(
        { error: 'Active consent already exists' },
        { status: 409 }
      );
    }

    const consentGivenBy = authContext.userId;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create consent record
    const consent = await createConsentRecord(
      organizationId,
      preferences,
      purpose,
      consentGivenBy,
      ipAddress,
      userAgent
    );

    // SPRINT 7: Send consent granted notification
    if (body.userEmail && body.userName) {
      const dataTypes = Object.keys(preferences).filter((key) => preferences[key]);
      sendConsentGrantedNotification(
        organizationId,
        consentGivenBy,
        body.userEmail,
        body.userName,
        dataTypes
      ).catch((error) => {
        console.error('Failed to send consent granted notification:', error);
        // Don&apos;t fail the request if notification fails
      });
    }

    return NextResponse.json({ consent }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Error creating consent:', error);
    return NextResponse.json(
      { error: 'Failed to grant consent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/consent
 * 
 * Update consent preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { consentId, preferences } = body;

    if (!consentId || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const authContext = await requireUser();
    const updatedBy = authContext.userId;

    // Update preferences
    const consent = await updateConsentPreferences(consentId, preferences, updatedBy);

    return NextResponse.json({ consent });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Error updating consent:', error);
    return NextResponse.json(
      { error: 'Failed to update consent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/consent
 * 
 * Revoke consent
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { consentId, reason } = body;

    if (!consentId) {
      return NextResponse.json(
        { error: 'Consent ID required' },
        { status: 400 }
      );
    }

    const authContext = await requireUser();
    const revokedBy = authContext.userId;

    // Revoke consent
    const consent = await revokeConsent(consentId, revokedBy, reason);

    // SPRINT 7: Send consent revoked notification
    // TODO: Get user details from authenticated session
    if (body.userEmail && body.userName && consent) {
      const revokedDataTypes = consent.categories || [];
      sendConsentRevokedNotification(
        consent.organizationId,
        revokedBy,
        body.userEmail,
        body.userName,
        revokedDataTypes,
        reason
      ).catch((error) => {
        console.error('Failed to send consent revoked notification:', error);
        // Don&apos;t fail the request if notification fails
      });
    }

    return NextResponse.json({ consent });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Error revoking consent:', error);
    return NextResponse.json(
      { error: 'Failed to revoke consent' },
      { status: 500 }
    );
  }
}
