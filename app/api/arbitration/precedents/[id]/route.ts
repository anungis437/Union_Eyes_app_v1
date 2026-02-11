import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Single Arbitration Precedent API
 * Route: /api/arbitration/precedents/[id]
 * Methods: GET (retrieve), PATCH (update), DELETE (remove)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db, organizations } from "@/db";
import { 
  arbitrationPrecedents,
  precedentTags,
  precedentCitations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { withRLSContext } from "@/lib/db/with-rls-context";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Helper to check if user can access precedent
async function canAccessPrecedent(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string[],
  precedent: any
): Promise<boolean> {
  if (precedent.sourceOrganizationId === userOrgId) {
    return true;
  }

  const sharingLevel = precedent.sharingLevel;

  switch (sharingLevel) {
    case "private":
      return precedent.sharedWithOrgIds?.includes(userOrgId) || false;
    case "federation":
      // Check if organizations share a common parent in hierarchy
      if (!userOrgHierarchyPath || userOrgHierarchyPath.length === 0) {
        return false;
      }
      try {
        const sourceOrg = await db.selectDistinct().from(organizations).where(eq(organizations.id, precedent.sourceOrganizationId)).limit(1);
        const sourceOrgData = sourceOrg[0];
        if (!sourceOrgData?.hierarchyPath || sourceOrgData.hierarchyPath.length === 0) {
          return false;
        }
        // Check if organizations share any common parent in their hierarchy paths
        const hasCommonParent = userOrgHierarchyPath.some(parentId => 
          sourceOrgData.hierarchyPath.includes(parentId)
        );
        return hasCommonParent;
      } catch (error) {
        logger.error('Error checking federation hierarchy:', error);
        return false;
      }
    case "congress":
      // Check CLC membership: both user's org and source org must be CLC-affiliated
      try {
        const [userOrg, sourceOrg] = await Promise.all([
          db.selectDistinct().from(organizations).where(eq(organizations.id, userOrgId)).limit(1),
          db.selectDistinct().from(organizations).where(eq(organizations.id, precedent.sourceOrganizationId)).limit(1)
        ]);
        
        const userOrgData = userOrg[0];
        const sourceOrgData = sourceOrg[0];
        
        // Both orgs must be CLC-affiliated with active status
        return (
          userOrgData?.clcAffiliated === true &&
          userOrgData?.status === 'active' &&
          sourceOrgData?.clcAffiliated === true &&
          sourceOrgData?.status === 'active'
        );
      } catch (error) {
        logger.error('Error checking CLC membership:', error);
        return false;
      }
    case "public":
      return true;
    default:
      return false;
  }
}

// GET /api/arbitration/precedents/[id] - Retrieve single precedent
export const GET = async (request: NextRequest, context: RouteContext) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
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

      const userOrgId = organizationId;
      
      // Fetch user's organization hierarchy path for federation sharing checks
      let userOrgHierarchyPath: string[] = [];
      try {
        const userOrg = await db.selectDistinct().from(organizations).where(eq(organizations.id, userOrgId)).limit(1);
        userOrgHierarchyPath = userOrg[0]?.hierarchyPath || [];
      } catch (error) {
        logger.error('Error fetching user organization hierarchy:', error);
      }

      // Fetch precedent with relations
      const precedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
          with: {
            sourceOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            },
            sourceDecision: {
              columns: {
                id: true,
                decisionDate: true,
                outcome: true,
              }
            },
            tags: true,
            citations: {
              with: {
                precedent: {
                  columns: {
                    id: true,
                    caseTitle: true,
                    caseNumber: true,
                    decisionDate: true,
                  }
                }
              }
            }
          }
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found',
      error
    );
      }

      // Check access permission
      const hasAccess = await canAccessPrecedent( userId,
        userOrgId,
        userOrgHierarchyPath,
        precedent
      );

      if (!hasAccess) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied',
      error
    );
      }

      // Increment view count (don't await to avoid slowing response)
      if (precedent.sourceOrganizationId !== userOrgId) {
        withRLSContext({ organizationId: userOrgId }, async (db) => {
          return await db.update(arbitrationPrecedents)
            .set({ viewCount: (precedent.viewCount || 0) + 1 })
            .where(eq(arbitrationPrecedents.id, id))
            .execute();
        })
          .catch(err => logger.error('Failed to increment view count', err as Error, {
            precedentId: id,
            organizationId: userOrgId,
          }));
      }

      return NextResponse.json(precedent);
    } catch (error) {
      logger.error('Failed to fetch precedent', error as Error, {
        precedentId: id,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch precedent',
      error
    );
    }
    })(request, { params });
};

// PATCH /api/arbitration/precedents/[id] - Update precedent (owner only)

const arbitrationPrecedentsSchema = z.object({
  caseNumber: z.unknown().optional(),
  caseTitle: z.string().min(1, 'caseTitle is required'),
  decisionDate: z.boolean().optional(),
  isPartiesAnonymized: z.boolean().optional(),
  unionName: z.string().min(1, 'unionName is required'),
  employerName: z.string().min(1, 'employerName is required'),
  arbitratorName: z.string().min(1, 'arbitratorName is required'),
  jurisdiction: z.boolean().optional(),
  grievanceType: z.unknown().optional(),
  issueSummary: z.boolean().optional(),
  unionPosition: z.unknown().optional(),
  employerPosition: z.unknown().optional(),
  outcome: z.unknown().optional(),
  decisionSummary: z.boolean().optional(),
  reasoning: z.unknown().optional(),
  keyFindings: z.unknown().optional(),
  relatedLegislation: z.boolean().optional(),
  precedentLevel: z.unknown().optional(),
  citedCases: z.unknown().optional(),
  decisionDocumentUrl: z.string().url('Invalid URL'),
  documentPath: z.unknown().optional(),
  redactedDocumentUrl: z.string().url('Invalid URL'),
  redactedDocumentPath: z.unknown().optional(),
  sharingLevel: z.unknown().optional(),
  sharedWithOrgIds: z.string().uuid('Invalid sharedWithOrgIds'),
  sector: z.unknown().optional(),
  province: z.unknown().optional(),
  tags: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest, context: RouteContext) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
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

      const userOrgId = organizationId;

      // Fetch existing precedent
      const existing = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
        });
      });

      if (!existing) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      // Verify ownership
      if (existing.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the owner can update this precedent'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = arbitrationPrecedentsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { caseNumber, caseTitle, decisionDate, isPartiesAnonymized, unionName, employerName, arbitratorName, jurisdiction, grievanceType, issueSummary, unionPosition, employerPosition, outcome, decisionSummary, reasoning, keyFindings, relatedLegislation, precedentLevel, citedCases, decisionDocumentUrl, documentPath, redactedDocumentUrl, redactedDocumentPath, sharingLevel, sharedWithOrgIds, sector, province, tags } = validation.data;

      // Build update object (only include provided fields)
      const updates: any = {};

      if (body.caseNumber !== undefined) updates.caseNumber = body.caseNumber;
      if (body.caseTitle !== undefined) updates.caseTitle = body.caseTitle;
      if (body.decisionDate !== undefined) updates.decisionDate = body.decisionDate;
      if (body.isPartiesAnonymized !== undefined) updates.isPartiesAnonymized = body.isPartiesAnonymized;
      if (body.unionName !== undefined) updates.unionName = body.unionName;
      if (body.employerName !== undefined) updates.employerName = body.employerName;
      if (body.arbitratorName !== undefined) updates.arbitratorName = body.arbitratorName;
      if (body.jurisdiction !== undefined) updates.jurisdiction = body.jurisdiction;
      if (body.grievanceType !== undefined) updates.grievanceType = body.grievanceType;
      if (body.issueSummary !== undefined) updates.issueSummary = body.issueSummary;
      if (body.unionPosition !== undefined) updates.unionPosition = body.unionPosition;
      if (body.employerPosition !== undefined) updates.employerPosition = body.employerPosition;
      if (body.outcome !== undefined) updates.outcome = body.outcome;
      if (body.decisionSummary !== undefined) updates.decisionSummary = body.decisionSummary;
      if (body.reasoning !== undefined) updates.reasoning = body.reasoning;
      if (body.keyFindings !== undefined) updates.keyPrinciples = body.keyFindings;
      if (body.relatedLegislation !== undefined) updates.relatedLegislation = body.relatedLegislation;
      if (body.precedentLevel !== undefined) updates.precedentialValue = body.precedentLevel;
      if (body.citedCases !== undefined) updates.citedCases = body.citedCases;
      if (body.decisionDocumentUrl !== undefined) {
        updates.documentUrl = body.decisionDocumentUrl;
        if (body.documentPath !== undefined) updates.documentPath = body.documentPath;
      }
      if (body.redactedDocumentUrl !== undefined) {
        updates.redactedDocumentUrl = body.redactedDocumentUrl;
        if (body.redactedDocumentPath !== undefined) updates.redactedDocumentPath = body.redactedDocumentPath;
        updates.hasRedactedVersion = !!body.redactedDocumentUrl;
      }
      if (body.sharingLevel !== undefined) updates.sharingLevel = body.sharingLevel;
      if (body.sharedWithOrgIds !== undefined) updates.sharedWithOrgIds = body.sharedWithOrgIds;
      if (body.sector !== undefined) updates.sector = body.sector;
      if (body.province !== undefined) updates.province = body.province;

      // Update precedent
      const [updated] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(arbitrationPrecedents)
          .set(updates)
          .where(eq(arbitrationPrecedents.id, id))
          .returning();
      });

      // Handle tags if provided
      if (body.tags !== undefined && Array.isArray(body.tags)) {
        // Delete existing tags
        await withRLSContext({ organizationId: userOrgId }, async (db) => {
          return await db.delete(precedentTags).where(eq(precedentTags.precedentId, id));
        });

        // Add new tags
        if (body.tags.length > 0) {
          const userUuid = await getOrCreateUserUuid(userId);
          const tagInserts = body.tags.map((tagName: string) => ({
            precedentId: id,
            tagName: tagName.toLowerCase().trim(),
            createdBy: userUuid,
          }));

          await withRLSContext({ organizationId: userOrgId }, async (db) => {
            return await db.insert(precedentTags).values(tagInserts);
          });
        }
      }

      // Fetch complete updated precedent
      const completePrecedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
          with: {
            sourceOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            },
            tags: true,
          }
        });
      });

      return NextResponse.json(completePrecedent);
    } catch (error) {
      logger.error('Failed to update precedent', error as Error, {
        precedentId: id,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update precedent',
      error
    );
    }
    })(request, { params });
};

// DELETE /api/arbitration/precedents/[id] - Delete precedent (owner only)
export const DELETE = async (request: NextRequest, context: RouteContext) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
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

      const userOrgId = organizationId;

      // Fetch existing precedent
      const existing = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, id),
        });
      });

      if (!existing) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      // Verify ownership
      if (existing.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the owner can delete this precedent'
    );
      }

      // Delete related data (cascades handled by DB, but doing explicitly for clarity)
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.delete(precedentTags).where(eq(precedentTags.precedentId, id));
      });
      // Delete citations where this precedent is cited
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.delete(precedentCitations).where(eq(precedentCitations.precedentId, id));
      });
      // Delete citations where this precedent cites others
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.delete(precedentCitations).where(eq(precedentCitations.citingPrecedentId, id));
      });

      // Delete precedent
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.delete(arbitrationPrecedents).where(eq(arbitrationPrecedents.id, id));
      });

      return NextResponse.json({ message: "Precedent deleted successfully" });
    } catch (error) {
      logger.error('Failed to delete precedent', error as Error, {
        precedentId: id,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete precedent',
      error
    );
    }
    })(request, { params });
};
