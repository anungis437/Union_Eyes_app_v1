/**
 * Negotiations API - Main Route
 * GET /api/bargaining/negotiations - List negotiations
 * POST /api/bargaining/negotiations - Create new negotiation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { negotiations } from "@/db/schema";
import { and, desc } from "drizzle-orm";
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

// Validation schema for creating negotiations
const createNegotiationSchema = z.object({
  expiringCbaId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  unionName: z.string().min(1).max(300),
  unionLocal: z.string().max(100).optional(),
  employerName: z.string().min(1).max(300),
  bargainingUnitSize: z.number().int().positive().optional(),
  noticeGivenDate: z.string().datetime().optional(),
  firstSessionDate: z.string().datetime().optional(),
  targetCompletionDate: z.string().datetime().optional(),
  keyIssues: z.array(z.object({
    issue: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    status: z.enum(["unresolved", "progress", "resolved"]),
    notes: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  confidentialityLevel: z.string().optional(),
});

/**
 * GET /api/bargaining/negotiations
 * List negotiations with filtering and pagination
 * Requires: Bargaining Committee role (level 40)
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { organizationId } = context;
    
    try {
      const { searchParams } = new URL(request.url);
      
      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;
      
      // Filters
      const status = searchParams.get("status");
      const expiringCbaId = searchParams.get("expiringCbaId");
      
      return withRLSContext(async (tx) => {
        // Build query conditions
        const conditions = [eq(negotiations.organizationId, organizationId)];
        
        if (status) {
          conditions.push(eq(negotiations.status, status));
        }
        
        if (expiringCbaId) {
          conditions.push(eq(negotiations.expiringCbaId, expiringCbaId));
        }
        
        // Fetch negotiations with count
        const [negotiationsList, countResult] = await Promise.all([
          tx
            .select()
            .from(negotiations)
            .where(and(...conditions))
            .orderBy(desc(negotiations.createdAt))
            .limit(limit)
            .offset(offset),
          tx
            .select({ count: sql<number>`count(*)::int` })
            .from(negotiations)
            .where(and(...conditions))
        ]);
        
        const total = countResult[0]?.count || 0;
        
        return NextResponse.json({
          negotiations: negotiationsList,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch negotiations',
        error
      );
    }
  })(request);
};

/**
 * POST /api/bargaining/negotiations
 * Create a new negotiation
 * Requires: Bargaining Committee role (level 40)
 */
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;
    
    try {
      const body = await request.json();
      
      // Validate input
      const validatedData = createNegotiationSchema.parse(body);
      
      return withRLSContext(async (tx) => {
        // Create negotiation
        const [newNegotiation] = await tx
          .insert(negotiations)
          .values({
            ...validatedData,
            organizationId,
            noticeGivenDate: validatedData.noticeGivenDate ? new Date(validatedData.noticeGivenDate) : undefined,
            firstSessionDate: validatedData.firstSessionDate ? new Date(validatedData.firstSessionDate) : undefined,
            targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : undefined,
            createdBy: userId,
            lastModifiedBy: userId,
          })
          .returning();
        
        return standardSuccessResponse(
          newNegotiation,
          'Negotiation created successfully',
          201
        );
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid negotiation data',
          error.errors
        );
      }
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create negotiation',
        error
      );
    }
  })(request);
};
