import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { users } from '@/db/schema/user-management-schema';
import { claims } from '@/db/schema/claims-schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withSecureAPI, logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

/**
 * Validation schema
 */
const updateProfileSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  phone: z.string().optional(),
  displayName: z.string().optional(),
}).strict();

/**
 * GET /api/members/me
 * Get current user's profile and statistics
 */
export const GET = withSecureAPI(async (request, user) => {
  try {
    // Get claims statistics
    const [claimsStats] = await db
      .select({
        totalClaims: count(),
        activeClaims: sql<number>`COUNT(CASE WHEN status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)`,
        resolvedClaims: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        rejectedClaims: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
      })
      .from(claims)
      .where(eq(claims.memberId, user.userId));

    // Get recent claims
    const recentClaims = await db
      .select({
        claimId: claims.claimId,
        claimNumber: claims.claimNumber,
        claimType: claims.claimType,
        status: claims.status,
        priority: claims.priority,
        createdAt: claims.createdAt,
      })
      .from(claims)
      .where(eq(claims.memberId, user.userId))
      .orderBy(desc(claims.createdAt))
      .limit(5);

    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId: user.userId,
      endpoint: '/api/members/me',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: { totalClaims: claimsStats.totalClaims },
    });

    return NextResponse.json({
      profile: {
        userId: user.userId,
        email: user.email,
        claimsStats: {
          total: claimsStats.totalClaims || 0,
          active: claimsStats.activeClaims || 0,
          resolved: claimsStats.resolvedClaims || 0,
          rejected: claimsStats.rejectedClaims || 0,
        },
        recentClaims,
      },
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId: user.userId,
      endpoint: '/api/members/me',
      method: 'GET',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    console.error('Error fetching member profile:', error);
    throw error;
  }
});

/**
 * PATCH /api/members/me
 * Update current user's profile preferences
 */
export const PATCH = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      const { timezone, locale, phone, displayName } = body;

      const updates: any = {};
      
      if (timezone) updates.timezone = timezone;
      if (locale) updates.locale = locale;
      if (phone !== undefined) updates.phone = phone;
      if (displayName !== undefined) updates.displayName = displayName;

      if (Object.keys(updates).length === 0) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/me',
          method: 'PATCH',
          eventType: 'validation_failed',
          severity: 'low',
          details: { reason: 'No valid fields to update' },
        });
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      updates.updatedAt = new Date();

      // Update user in database
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.userId, userId))
        .returning();

      if (!updatedUser) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/me',
          method: 'PATCH',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'User not found in database' },
        });
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/me',
        method: 'PATCH',
        eventType: 'success',
        severity: 'medium',
        details: { updatedFields: Object.keys(updates).filter(k => k !== 'updatedAt') },
      });

      return NextResponse.json({
        message: 'Profile updated successfully',
        user: {
          userId: updatedUser.userId,
          displayName: updatedUser.displayName,
          timezone: updatedUser.timezone,
          locale: updatedUser.locale,
          phone: updatedUser.phone,
        },
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/me',
        method: 'PATCH',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      console.error('Error updating member profile:', error);
      throw error;
    }
});

