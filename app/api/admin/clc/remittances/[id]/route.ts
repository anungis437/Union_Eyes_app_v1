/**
 * CLC Per-Capita Single Remittance API Routes
 * Purpose: Get, update, and manage individual remittances
 * 
 * Endpoints:
 * - GET /api/admin/clc/remittances/[id] - Get remittance details
 * - PUT /api/admin/clc/remittances/[id] - Update remittance
 * - DELETE /api/admin/clc/remittances/[id] - Delete remittance
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { db } from '@/db';
import { perCapitaRemittances } from '@/db/schema';
import { eq } from 'drizzle-orm';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// =====================================================================================
// GET - Get remittance details
// =====================================================================================

export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

    // Rate limiting: 50 CLC operations per hour per user
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.CLC_OPERATIONS);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many CLC requests.',
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: '/api/admin/clc/remittances/[id]',
      method: 'GET',
      eventType: 'clc_remittance_view',
      severity: 'low',
      details: { remittanceId: params.id },
    });

    try {
      // Fetch remittance details
      const remittance = await db
        .select()
        .from(perCapitaRemittances)
        .where(eq(perCapitaRemittances.id, params.id))
        .limit(1);

      if (remittance.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Remittance not found'
    );
      }

      return NextResponse.json(
        { remittance: remittance[0] },
        { status: 200, headers: createRateLimitHeaders(rateLimitResult) }
      );
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch remittance details',
      error
    );
    }
  })(request, { params });
};

// =====================================================================================
// PUT - Update remittance
// =====================================================================================

export const PUT = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

    try {
      const body = await request.json();
      
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/admin/clc/remittances/[id]',
        method: 'PUT',
        eventType: 'clc_remittance_update',
        severity: 'medium',
        details: { remittanceId: params.id, updates: Object.keys(body) },
      });

      // Check if remittance exists
      const existing = await db
        .select()
        .from(perCapitaRemittances)
        .where(eq(perCapitaRemittances.id, params.id))
        .limit(1);

      if (existing.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Remittance not found'
    );
      }

      // Update remittance
      const updated = await db
        .update(perCapitaRemittances)
        .set({
          ...body,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(perCapitaRemittances.id, params.id))
        .returning();

      return standardSuccessResponse(
      { remittance: updated[0],
          message: 'Remittance updated successfully' },
      undefined,
      200
    );
    } catch (error) {
logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/admin/clc/remittances/[id]',
        method: 'PUT',
        eventType: 'clc_remittance_update_failed',
        severity: 'high',
        details: { remittanceId: params.id, error: String(error) },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update remittance',
      error
    );
    }
  })(request, { params });
};

// =====================================================================================
// DELETE - Delete remittance
// =====================================================================================

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: '/api/admin/clc/remittances/[id]',
      method: 'DELETE',
      eventType: 'clc_remittance_delete',
      severity: 'high',
      details: { remittanceId: params.id },
    });

    try {
      // Check if remittance exists
      const existing = await db
        .select()
        .from(perCapitaRemittances)
        .where(eq(perCapitaRemittances.id, params.id))
        .limit(1);

      if (existing.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Remittance not found'
    );
      }

      // Only allow deletion if status is 'draft' or 'pending'
      const status = existing[0].status;
      if (status !== 'draft' && status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot delete remittance with status: ${status}` },
          { status: 403 }
        );
      }

      // Delete remittance
      await db
        .delete(perCapitaRemittances)
        .where(eq(perCapitaRemittances.id, params.id));

      return standardSuccessResponse(
      { message: 'Remittance deleted successfully' },
      undefined,
      200
    );
    } catch (error) {
logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/admin/clc/remittances/[id]',
        method: 'DELETE',
        eventType: 'clc_remittance_delete_failed',
        severity: 'high',
        details: { remittanceId: params.id, error: String(error) },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete remittance',
      error
    );
    }
  })(request, { params });
};
