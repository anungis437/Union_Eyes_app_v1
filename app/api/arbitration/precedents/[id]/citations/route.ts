import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Arbitration Precedent Citations API
 * Route: /api/arbitration/precedents/[id]/citations
 * Methods: GET (list citations), POST (add citation)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { organizations } from "@/db";
import { 
  arbitrationPrecedents,
  precedentCitations,
  NewPrecedentCitation,
} from "@/db/schema";
import { and, or } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from "@/lib/db/with-rls-context";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/arbitration/precedents/[id]/citations - List citations for precedent
export const GET = async (request: NextRequest, context: RouteContext) => {
  return withRoleAuth(10, async (request, context) => {
    const { organizationId } = context;
  const { id } = await context.params;
    
    try {
      // Validate organization context
      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'No active organization'
    );
      }

      // Check if precedent exists
      const precedent = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      // Get citations where this precedent is cited BY others
      const citedBy = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.precedentCitations.findMany({
          where: eq(precedentCitations.precedentId, id),
          with: {
            precedent: {
              columns: {
                id: true,
                caseTitle: true,
                caseNumber: true,
                decisionDate: true,
                outcome: true,
              },
              with: {
                sourceOrganization: {
                  columns: {
                    id: true,
                    name: true,
                    slug: true,
                  }
                }
              }
            },
            citingOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            }
          },
          orderBy: (c, { desc }) => [desc(c.citedAt)],
        });
      });

      // Get citations where this precedent CITES others
      const citations = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.precedentCitations.findMany({
          where: eq(precedentCitations.citingPrecedentId, id),
          with: {
            precedent: {
              columns: {
                id: true,
                caseTitle: true,
                caseNumber: true,
                decisionDate: true,
                outcome: true,
              },
              with: {
                sourceOrganization: {
                  columns: {
                    id: true,
                    name: true,
                    slug: true,
                  }
                }
              }
            },
            citingOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            }
          },
          orderBy: (c, { desc }) => [desc(c.citedAt)],
        });
      });

      return NextResponse.json({
        precedentId: id,
        citedBy: citedBy.length,
        citedByList: citedBy,
        cites: citations.length,
        citesList: citations,
      });
    } catch (error) {
      logger.error('Failed to fetch citations', error as Error, {
        precedentId: id,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch citations',
      error
    );
    }
    })(request, { params });
};

// POST /api/arbitration/precedents/[id]/citations - Add citation

const arbitrationPrecedentsCitationsSchema = z.object({
  citedPrecedentId: z.string().uuid('Invalid citedPrecedentId'),
  citingClaimId: z.string().uuid('Invalid citingClaimId'),
  citationContext: z.unknown().optional(),
});

export const POST = async (request: NextRequest, context: RouteContext) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  const { id } = await context.params;
    
    try {
      // Validate organization context
      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'No active organization'
    );
      }

      const userUuid = await getOrCreateUserUuid(userId);
      const userOrgId = organizationId;

      // Check if precedent exists
      const precedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = arbitrationPrecedentsCitationsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { citedPrecedentId, citingClaimId, citationContext } = validation.data;

      // Validate required fields
      if (!body.citedPrecedentId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'citedPrecedentId is required'
    );
      }

      // Check if cited precedent exists
      const citedPrecedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, body.citedPrecedentId),
        });
      });

      if (!citedPrecedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Cited precedent not found'
    );
      }

      // Check if citation already exists
      const existingCitation = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.precedentCitations.findFirst({
          where: and(
            eq(precedentCitations.citingPrecedentId, id),
            eq(precedentCitations.precedentId, body.citedPrecedentId)
          ),
        });
      });

      if (existingCitation) {
        return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Citation already exists'
    );
      }

      // Create citation
      const newCitation: NewPrecedentCitation = {
        precedentId: body.citedPrecedentId, // The precedent being cited
        citingPrecedentId: id, // The precedent doing the citing
        citingOrganizationId: userOrgId,
        citingClaimId: body.citingClaimId || null,
        citationContext: body.citationContext || null,
        citedBy: userUuid,
      };

      const [createdCitation] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .insert(precedentCitations)
          .values(newCitation)
          .returning();
      });

      // Increment citation count on cited precedent
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(arbitrationPrecedents)
          .set({ citationCount: (citedPrecedent.citationCount || 0) + 1 })
          .where(eq(arbitrationPrecedents.id, body.citedPrecedentId));
      });

      // Fetch complete citation with relations
      const completeCitation = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.precedentCitations.findFirst({
          where: eq(precedentCitations.id, createdCitation.id),
          with: {
            precedent: {
              columns: {
                id: true,
                caseTitle: true,
                caseNumber: true,
                decisionDate: true,
              }
            },
            citingOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        });
      });

      return NextResponse.json(completeCitation, { status: 201 });
    } catch (error) {
      logger.error('Failed to create citation', error as Error, {
        precedentId: id,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create citation',
      error
    );
    }
    })(request, { params });
};
