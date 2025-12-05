/**
 * Phase 5B: Arbitration Precedent Citations API
 * Route: /api/arbitration/precedents/[id]/citations
 * Methods: GET (list citations), POST (add citation)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { db, organizations } from "@/db";
import { 
  arbitrationPrecedents,
  precedentCitations,
  NewPrecedentCitation,
} from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/arbitration/precedents/[id]/citations - List citations for precedent
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

    // Check if precedent exists
    const precedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, id),
    });

    if (!precedent) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    // Get citations where this precedent is cited BY others
    const citedBy = await db.query.precedentCitations.findMany({
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

    // Get citations where this precedent CITES others
    const citations = await db.query.precedentCitations.findMany({
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
    return NextResponse.json(
      { error: "Failed to fetch citations" },
      { status: 500 }
    );
  }
}

// POST /api/arbitration/precedents/[id]/citations - Add citation
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = await getOrCreateUserUuid(userId);

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

    // Check if precedent exists
    const precedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, id),
    });

    if (!precedent) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.citedPrecedentId) {
      return NextResponse.json(
        { error: "citedPrecedentId is required" },
        { status: 400 }
      );
    }

    // Check if cited precedent exists
    const citedPrecedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, body.citedPrecedentId),
    });

    if (!citedPrecedent) {
      return NextResponse.json({ error: "Cited precedent not found" }, { status: 404 });
    }

    // Check if citation already exists
    const existingCitation = await db.query.precedentCitations.findFirst({
      where: and(
        eq(precedentCitations.citingPrecedentId, id),
        eq(precedentCitations.precedentId, body.citedPrecedentId)
      ),
    });

    if (existingCitation) {
      return NextResponse.json(
        { error: "Citation already exists" },
        { status: 409 }
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

    const [createdCitation] = await db
      .insert(precedentCitations)
      .values(newCitation)
      .returning();

    // Increment citation count on cited precedent
    await db
      .update(arbitrationPrecedents)
      .set({ citationCount: (citedPrecedent.citationCount || 0) + 1 })
      .where(eq(arbitrationPrecedents.id, body.citedPrecedentId));

    // Fetch complete citation with relations
    const completeCitation = await db.query.precedentCitations.findFirst({
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

    return NextResponse.json(completeCitation, { status: 201 });
  } catch (error) {
    logger.error('Failed to create citation', error as Error, {
      precedentId: id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: "Failed to create citation" },
      { status: 500 }
    );
  }
}
