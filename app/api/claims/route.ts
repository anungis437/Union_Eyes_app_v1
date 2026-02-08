/**
 * Claims API Routes
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 * - Removed manual tenant lookup (getUserTenant) - RLS handles this
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { claims } from "@/db/schema/claims-schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { withRLSContext } from '@/lib/db/with-rls-context';

/**
 * Validation schema for creating claims
 */
const createClaimSchema = z.object({
  claimType: z.string().min(1, 'Claim type is required'),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  desiredOutcome: z.string().min(1, 'Desired outcome is required'),
  isAnonymous: z.boolean().optional().default(true),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  witnessesPresent: z.boolean().optional().default(false),
  witnessDetails: z.string().optional().nullable(),
  previouslyReported: z.boolean().optional().default(false),
  previousReportDetails: z.string().optional().nullable(),
  attachments: z.array(z.any()).optional().default([]),
  voiceTranscriptions: z.array(z.any()).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
});

/**
 * GET /api/claims
 * Fetch all claims with optional filtering
 * Protected by tenant middleware - only returns claims for the user's current tenant
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const priority = searchParams.get("priority");
      const search = searchParams.get("search");
      const memberId = searchParams.get("memberId");
      const limit = parseInt(searchParams.get("limit") || "100");
      const offset = parseInt(searchParams.get("offset") || "0");

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Build query conditions - RLS policies automatically filter by tenant
        const conditions = [];
        
        if (status && status !== "all") {
          conditions.push(eq(claims.status, status as any));
        }
        
        if (priority && priority !== "all") {
          conditions.push(eq(claims.priority, priority as any));
        }
        
        if (search) {
          conditions.push(
            or(
              like(claims.claimNumber, `%${search}%`),
              like(claims.description, `%${search}%`)
            ) as any
          );
        }
        
        if (memberId) {
          conditions.push(eq(claims.memberId, memberId));
        }

        // Execute query - RLS policies automatically enforce tenant filtering
        const result = await tx
          .select()
          .from(claims)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(claims.createdAt))
          .limit(limit)
          .offset(offset);

        // Count total for pagination - RLS policies automatically enforce tenant filtering
        const totalResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(claims)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = totalResult[0]?.count || 0;

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/claims',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { 
            organizationId, 
            filters: { status, priority, search, memberId }, 
            resultCount: result.length 
          },
        });

        return NextResponse.json({
          claims: result,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/claims',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error fetching claims:", error);
        // Return empty results instead of error
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "100");
        const offset = parseInt(searchParams.get("offset") || "0");
        
        return NextResponse.json({
          claims: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
          error: error instanceof Error ? error.message : "Failed to fetch claims"
        });
      }
      })(request);
};

/**
 * POST /api/claims
 * Create a new claim
 * Protected by tenant middleware - claim will be created in the user's current tenant
 */
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = createClaimSchema.safeParse(rawBody);
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
    // Generate claim number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const claimNumber = `CLM-${year}-${randomNum}`;

    // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
    return withRLSContext(async (tx) => {
      // Create claim - RLS policies automatically set organizationId
      const [newClaim] = await tx
        .insert(claims)
        .values({
          claimNumber,
          organizationId,
          memberId: userId,
          isAnonymous: body.isAnonymous,
          claimType: body.claimType,
          status: "submitted",
          priority: body.priority,
          incidentDate: new Date(body.incidentDate),
          location: body.location,
          description: body.description,
          desiredOutcome: body.desiredOutcome,
          witnessesPresent: body.witnessesPresent,
          witnessDetails: body.witnessDetails || null,
          previouslyReported: body.previouslyReported,
          previousReportDetails: body.previousReportDetails || null,
          attachments: body.attachments,
          voiceTranscriptions: body.voiceTranscriptions,
          metadata: body.metadata,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/claims',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: { organizationId, claimNumber, claimType: body.claimType },
      });

      return NextResponse.json(
        { 
          claim: newClaim,
          message: "Claim submitted successfully" 
        },
        { status: 201 }
      );
    });
  } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/claims',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error("Error creating claim:", error);
      return NextResponse.json(
        { error: "Failed to create claim" },
        { status: 500 }
      );
    }
});

