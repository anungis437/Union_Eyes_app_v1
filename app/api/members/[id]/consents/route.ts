/**
 * Member Consents API
 * 
 * Tracks member consent for various purposes (GDPR, PIPEDA compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { memberConsents } from '@/db/schema/member-profile-v2-schema';

// Validation schema
const recordConsentSchema = z.object({
  consentType: z.enum(['privacy_policy', 'data_collection', 'communications', 'photo_video', 'third_party_sharing']),
  consentCategory: z.enum(['legal', 'marketing', 'research', 'operational']),
  granted: z.boolean(),
  consentVersion: z.string().optional(),
  consentText: z.string().optional(),
  consentMethod: z.enum(['online', 'paper', 'verbal', 'implied']),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/members/[id]/consents
 * Get member consent history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const consentType = searchParams.get('type');
    const currentOnly = searchParams.get('currentOnly') === 'true';

    const conditions = [eq(memberConsents.userId, userId)];
    
    if (consentType) {
      conditions.push(eq(memberConsents.consentType, consentType));
    }

    let consents = await db
      .select()
      .from(memberConsents)
      .where(and(...conditions))
      .orderBy(desc(memberConsents.createdAt));

    // If currentOnly, filter to latest for each type
    if (currentOnly) {
      const latestByType = consents.reduce((acc, consent) => {
        if (!acc[consent.consentType] || 
            new Date(consent.createdAt) > new Date(acc[consent.consentType].createdAt)) {
          acc[consent.consentType] = consent;
        }
        return acc;
      }, {} as Record<string, typeof consents[0]>);
      
      consents = Object.values(latestByType);
    }

    return NextResponse.json({
      consents,
      summary: {
        total: consents.length,
        granted: consents.filter(c => c.granted && !c.revokedAt).length,
        revoked: consents.filter(c => c.revokedAt).length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching consents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consents', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/[id]/consents
 * Record new consent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const validatedData = recordConsentSchema.parse(body);

    // Record consent
    const [consent] = await db
      .insert(memberConsents)
      .values({
        userId,
        organizationId: 'org-id', // TODO: Get from context
        ...validatedData,
        grantedAt: validatedData.granted ? new Date() : null,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        createdBy: 'system', // TODO: Get from auth
      })
      .returning();

    console.log(`✅ Consent recorded: ${validatedData.consentType} - ${validatedData.granted ? 'granted' : 'denied'}`);

    return NextResponse.json(
      {
        message: 'Consent recorded successfully',
        consent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error recording consent:', error);
    return NextResponse.json(
      { error: 'Failed to record consent', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members/[id]/consents/[consentId]
 * Revoke consent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; consentId: string } }
) {
  try {
    const userId = params.id;
    const consentId = params.consentId;

    const [revoked] = await db
      .update(memberConsents)
      .set({
        revokedAt: new Date(),
      })
      .where(and(
        eq(memberConsents.id, consentId),
        eq(memberConsents.userId, userId)
      ))
      .returning();

    if (!revoked) {
      return NextResponse.json(
        { error: 'Consent not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Consent revoked: ${revoked.consentType}`);

    return NextResponse.json({
      message: 'Consent revoked successfully',
      consent: revoked,
    });
  } catch (error: any) {
    console.error('Error revoking consent:', error);
    return NextResponse.json(
      { error: 'Failed to revoke consent', details: error.message },
      { status: 500 }
    );
  }
}
