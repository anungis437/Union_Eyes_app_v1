/**
 * Phase 5B: Single Arbitration Precedent API
 * Route: /api/arbitration/precedents/[id]
 * Methods: GET (retrieve), PATCH (update), DELETE (remove)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { db, organizations } from "@/db";
import { 
  arbitrationPrecedents,
  precedentTags,
  precedentCitations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Helper to check if user can access precedent
async function canAccessPrecedent(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string,
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
      // TODO: Check federation hierarchy
      return false;
    case "congress":
      // TODO: Check CLC membership
      return false;
    case "public":
      return true;
    default:
      return false;
  }
}

// GET /api/arbitration/precedents/[id] - Retrieve single precedent
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    
    if (!orgSlug) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const userOrgId = org.id;
    const userOrgHierarchyPath = ''; // TODO: Add once hierarchy is implemented

    // Fetch precedent with relations
    const precedent = await db.query.arbitrationPrecedents.findFirst({
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

    if (!precedent) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    // Check access permission
    const hasAccess = await canAccessPrecedent(
      userId,
      userOrgId,
      userOrgHierarchyPath,
      precedent
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Increment view count (don't await to avoid slowing response)
    if (precedent.sourceOrganizationId !== userOrgId) {
      db.update(arbitrationPrecedents)
        .set({ viewCount: (precedent.viewCount || 0) + 1 })
        .where(eq(arbitrationPrecedents.id, id))
        .execute()
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
    return NextResponse.json(
      { error: "Failed to fetch precedent" },
      { status: 500 }
    );
  }
}

// PATCH /api/arbitration/precedents/[id] - Update precedent (owner only)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    
    if (!orgSlug) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const userOrgId = org.id;

    // Fetch existing precedent
    const existing = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    // Verify ownership
    if (existing.sourceOrganizationId !== userOrgId) {
      return NextResponse.json({ error: "Only the owner can update this precedent" }, { status: 403 });
    }

    const body = await request.json();

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
    const [updated] = await db
      .update(arbitrationPrecedents)
      .set(updates)
      .where(eq(arbitrationPrecedents.id, id))
      .returning();

    // Handle tags if provided
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      // Delete existing tags
      await db.delete(precedentTags).where(eq(precedentTags.precedentId, id));

      // Add new tags
      if (body.tags.length > 0) {
        const userUuid = await getOrCreateUserUuid(userId);
        const tagInserts = body.tags.map((tagName: string) => ({
          precedentId: id,
          tagName: tagName.toLowerCase().trim(),
          createdBy: userUuid,
        }));

        await db.insert(precedentTags).values(tagInserts);
      }
    }

    // Fetch complete updated precedent
    const completePrecedent = await db.query.arbitrationPrecedents.findFirst({
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

    return NextResponse.json(completePrecedent);
  } catch (error) {
    logger.error('Failed to update precedent', error as Error, {
      precedentId: id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: "Failed to update precedent" },
      { status: 500 }
    );
  }
}

// DELETE /api/arbitration/precedents/[id] - Delete precedent (owner only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    
    if (!orgSlug) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const userOrgId = org.id;

    // Fetch existing precedent
    const existing = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    // Verify ownership
    if (existing.sourceOrganizationId !== userOrgId) {
      return NextResponse.json({ error: "Only the owner can delete this precedent" }, { status: 403 });
    }

    // Delete related data (cascades handled by DB, but doing explicitly for clarity)
    await db.delete(precedentTags).where(eq(precedentTags.precedentId, id));
    // Delete citations where this precedent is cited
    await db.delete(precedentCitations).where(eq(precedentCitations.precedentId, id));
    // Delete citations where this precedent cites others
    await db.delete(precedentCitations).where(eq(precedentCitations.citingPrecedentId, id));

    // Delete precedent
    await db.delete(arbitrationPrecedents).where(eq(arbitrationPrecedents.id, id));

    return NextResponse.json({ message: "Precedent deleted successfully" });
  } catch (error) {
    logger.error('Failed to delete precedent', error as Error, {
      precedentId: id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: "Failed to delete precedent" },
      { status: 500 }
    );
  }
}
