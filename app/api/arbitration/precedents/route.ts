import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Arbitration Precedents API
 * Route: /api/arbitration/precedents
 * Methods: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db, organizations } from "@/db";
import { 
  arbitrationPrecedents,
  precedentTags,
  NewArbitrationPrecedent,
  ArbitrationPrecedent
} from "@/db/schema";
import { eq, and, or, ilike, inArray, gte, lte, sql } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// Helper to check if user can access precedent based on sharing level
async function canAccessPrecedent(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string,
  precedent: any
): Promise<boolean> {
  // Owner always has access
  if (precedent.sourceOrganizationId === userOrgId) {
    return true;
  }

  const sharingLevel = precedent.sharingLevel;

  switch (sharingLevel) {
    case "private":
      // Check explicit grants
      return precedent.sharedWithOrgIds?.includes(userOrgId) || false;
    
    case "federation":
      // TODO: Check federation hierarchy when implemented
      return false;
    
    case "congress":
      // TODO: Check CLC membership when implemented
      return false;
    
    case "public":
      // Everyone can access
      return true;
    
    default:
      return false;
  }
}

// GET /api/arbitration/precedents - List precedents with filters
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Use authenticated organization context
      if (!organizationId) {
        return NextResponse.json({ error: "No organization context" }, { status: 400 });
      }

      const userOrgId = organizationId;
      const userOrgHierarchyPath = ''; // TODO: Add once hierarchy is implemented

      // Parse query params
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      const grievanceType = searchParams.get("grievanceType");
      const outcome = searchParams.get("outcome");
      const jurisdiction = searchParams.get("jurisdiction");
      const precedentLevel = searchParams.get("precedentLevel");
      const sector = searchParams.get("sector");
      const arbitratorName = searchParams.get("arbitratorName");
      const searchQuery = searchParams.get("q");
      const fromDate = searchParams.get("fromDate");
      const toDate = searchParams.get("toDate");

      // Build filters
      const filters: any[] = [];

      if (grievanceType) {
        filters.push(eq(arbitrationPrecedents.grievanceType, grievanceType));
      }

      if (outcome) {
        filters.push(eq(arbitrationPrecedents.outcome, outcome));
      }

      if (jurisdiction) {
        filters.push(eq(arbitrationPrecedents.jurisdiction, jurisdiction));
      }

      if (precedentLevel) {
        filters.push(eq(arbitrationPrecedents.precedentLevel, precedentLevel));
      }

      if (sector) {
        filters.push(eq(arbitrationPrecedents.sector, sector));
      }

      if (arbitratorName) {
        filters.push(ilike(arbitrationPrecedents.arbitratorName, `%${arbitratorName}%`));
      }

      if (searchQuery) {
        filters.push(
          or(
            ilike(arbitrationPrecedents.caseTitle, `%${searchQuery}%`),
            ilike(arbitrationPrecedents.issueSummary, `%${searchQuery}%`),
            ilike(arbitrationPrecedents.decisionSummary, `%${searchQuery}%`)
          )
        );
      }

      if (fromDate) {
        filters.push(gte(arbitrationPrecedents.decisionDate, fromDate));
      }

      if (toDate) {
        filters.push(lte(arbitrationPrecedents.decisionDate, toDate));
      }

      // Query precedents with RLS enforcement
      const precedents = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findMany({
        where: filters.length > 0 ? and(...filters) : undefined,
        limit,
        offset,
        orderBy: (p, { desc }) => [desc(p.decisionDate), desc(p.createdAt)],
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

      // Filter by access permissions
      const accessiblePrecedents = await Promise.all(
        precedents.map(async (precedent) => {
          const hasAccess = await canAccessPrecedent( userId,
            userOrgId,
            userOrgHierarchyPath,
            precedent
          );
          return hasAccess ? precedent : null;
        })
      );

      const filteredPrecedents = accessiblePrecedents.filter((p): p is ArbitrationPrecedent & { 
        sourceOrganization: { id: string; name: string; slug: string; };
        tags: any[];
      } => p !== null);

      // Get total count for pagination with RLS
      const [{ count }] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .select({ count: sql<number>`count(*)::int` })
          .from(arbitrationPrecedents)
          .where(filters.length > 0 ? and(...filters) : undefined);
      });

      return NextResponse.json({
        precedents: filteredPrecedents,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        }
      });
    } catch (error) {
      logger.error('Failed to fetch precedents', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: "Failed to fetch precedents" },
        { status: 500 }
      );
    }
    })(request);
};

// POST /api/arbitration/precedents - Create new precedent
export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Validate organization context
      if (!organizationId) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      const userUuid = await getOrCreateUserUuid(userId);
      const userOrgId = organizationId;

      const body = await request.json();

      // Validate required fields
      if (!body.caseTitle || !body.decisionDate || !body.arbitratorName || 
          !body.jurisdiction || !body.grievanceType || !body.outcome || 
          !body.issueSummary || !body.decisionSummary) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Create precedent
      const newPrecedent: NewArbitrationPrecedent = {
        sourceOrganizationId: userOrgId,
        sourceDecisionId: body.sourceDecisionId || null,
        caseNumber: body.caseNumber || null,
        caseTitle: body.caseTitle,
        decisionDate: body.decisionDate,
        isPartiesAnonymized: body.isPartiesAnonymized ?? false,
        unionName: body.unionName || null,
        employerName: body.employerName || null,
        arbitratorName: body.arbitratorName,
        jurisdiction: body.jurisdiction,
        grievanceType: body.grievanceType,
        issueSummary: body.issueSummary,
        unionPosition: body.unionPosition || null,
        employerPosition: body.employerPosition || null,
        outcome: body.outcome,
        decisionSummary: body.decisionSummary,
        reasoning: body.reasoning || null,
        keyPrinciples: body.keyFindings || [],
        relatedLegislation: body.relatedLegislation || null,
        precedentialValue: body.precedentLevel || "medium",
        citedCases: body.citedCases || [],
        citationCount: 0,
        documentUrl: body.decisionDocumentUrl || null,
        documentPath: body.documentPath || null,
        redactedDocumentUrl: body.redactedDocumentUrl || null,
        redactedDocumentPath: body.redactedDocumentPath || null,
        hasRedactedVersion: !!body.redactedDocumentUrl,
        sharingLevel: body.sharingLevel || "private",
        sharedWithOrgIds: body.sharedWithOrgIds || [],
        sector: body.sector || null,
        province: body.province || null,
        viewCount: 0,
        downloadCount: 0,
        createdBy: userUuid,
      };

      const [createdPrecedent] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .insert(arbitrationPrecedents)
          .values(newPrecedent)
          .returning();
      });

      // Add tags if provided
      if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
        const tagInserts = body.tags.map((tagName: string) => ({
          precedentId: createdPrecedent.id,
          tagName: tagName.toLowerCase().trim(),
          createdBy: userUuid,
        }));

        await withRLSContext({ organizationId: userOrgId }, async (db) => {
          return await db.insert(precedentTags).values(tagInserts);
        });
      }

      // Fetch complete precedent with relations
      const completePrecedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, createdPrecedent.id),
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

      return NextResponse.json(completePrecedent, { status: 201 });
    } catch (error) {
      logger.error('Failed to create precedent', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: "Failed to create precedent" },
        { status: 500 }
      );
    }
    })(request);
};

