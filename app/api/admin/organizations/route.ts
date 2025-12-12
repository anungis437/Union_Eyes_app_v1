/**
 * Organization Management API Routes
 * 
 * Complete CRUD operations for hierarchical organizations.
 * Features:
 * - List organizations with filtering and pagination
 * - Create new organizations with hierarchy validation
 * - Update organizations with parent/type change checks
 * - Delete (archive) organizations with safety checks
 * - Bulk operations support
 * - Statistics aggregation
 * 
 * @module app/api/admin/organizations/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { organizations, organizationMembers } from "@/db/schema-organizations";
import {
  getOrganizations,
  getOrganizationChildren,
  createOrganization,
  searchOrganizations,
} from "@/db/queries/organization-queries";
import { eq, and, inArray, sql } from "drizzle-orm";

// =====================================================
// GET - List Organizations
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when profiles/roles are set up
    // For now, authenticated users can list organizations

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const parentId = searchParams.get("parent") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || "active";
    const search = searchParams.get("search") || undefined;
    const includeStats = searchParams.get("include_stats") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch organizations
    let orgsData;
    if (search) {
      orgsData = await searchOrganizations(search, limit);
    } else if (parentId) {
      orgsData = await getOrganizationChildren(parentId, status === "all");
    } else {
      orgsData = await getOrganizations(parentId || undefined, status === "all");
    }

    // Filter by type if specified
    let filteredOrgs = orgsData;
    if (type && type !== "all") {
      filteredOrgs = orgsData.filter((org: any) => org.organizationType === type);
    }

    // Add statistics if requested
    if (includeStats) {
      const orgsWithStats = await Promise.all(
        filteredOrgs.map(async (org: any) => {
          // Get member count
          const [memberCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, org.id),
                eq(organizationMembers.status, "active")
              )
            );

          // Get child count
          const [childCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(organizations)
            .where(eq(organizations.parentId, org.id));

          // Get active claims count (if claims table exists)
          let activeClaims = 0;
          try {
            const claimsResult = await db.execute(sql`
              SELECT COUNT(*) as count 
              FROM claims 
              WHERE organization_id = ${org.id} 
              AND status IN ('pending', 'in_progress', 'under_review')
            `);
            activeClaims = Number(claimsResult[0]?.count) || 0;
          } catch (error) {
            // Claims table may not exist yet
            console.warn("Could not fetch claims count:", error);
          }

          // Get parent name if exists
          let parentName = null;
          if (org.parentId) {
            const [parentResult] = await db
              .select({ name: organizations.name })
              .from(organizations)
              .where(eq(organizations.id, org.parentId))
              .limit(1);
            parentName = parentResult?.name;
          }

          return {
            ...org,
            memberCount: Number(memberCountResult?.count || 0),
            childCount: Number(childCountResult?.count || 0),
            activeClaims: Number(activeClaims),
            parentName,
          };
        })
      );

      return NextResponse.json({
        data: orgsWithStats,
        count: orgsWithStats.length,
        includeStats: true,
      });
    }

    return NextResponse.json({
      data: filteredOrgs,
      count: filteredOrgs.length,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create Organization
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when profiles/roles are set up
    // For now, authenticated users can create organizations

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.slug || !body.organizationType) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug, organizationType" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, body.slug))
      .limit(1);

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 409 }
      );
    }

    // Validate parent organization if specified
    if (body.parentId) {
      const [parentOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, body.parentId))
        .limit(1);

      if (!parentOrg) {
        return NextResponse.json(
          { error: "Parent organization not found" },
          { status: 404 }
        );
      }

      // Validate hierarchy rules
      const typeHierarchy: Record<string, string[]> = {
        congress: ['federation'],
        federation: ['union', 'region'],
        union: ['local', 'district'],
        local: [],
        region: ['local'],
        district: ['local'],
      };

      const allowedChildTypes = typeHierarchy[parentOrg.organizationType] || [];
      if (!allowedChildTypes.includes(body.organizationType)) {
        return NextResponse.json(
          {
            error: `Invalid hierarchy: ${body.organizationType} cannot be a child of ${parentOrg.organizationType}`,
          },
          { status: 400 }
        );
      }
    }

    // Create organization
    // Build hierarchy path
    let hierarchyPath: string[] = [];
    if (body.parentId) {
      const [parentOrg] = await db
        .select({ hierarchyPath: organizations.hierarchyPath })
        .from(organizations)
        .where(eq(organizations.id, body.parentId))
        .limit(1);
      if (parentOrg) {
        hierarchyPath = [...parentOrg.hierarchyPath, body.slug];
      } else {
        hierarchyPath = [body.slug];
      }
    } else {
      hierarchyPath = [body.slug];
    }

    const newOrg = await createOrganization({
      name: body.name,
      slug: body.slug,
      displayName: body.displayName || null,
      shortName: body.shortName || null,
      organizationType: body.organizationType,
      parentId: body.parentId || null,
      hierarchyPath,
      hierarchyLevel: hierarchyPath.length - 1,
      jurisdiction: body.jurisdiction || null,
      provinceTerritory: body.provinceTerritory || null,
      sectors: body.sectors || [],
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      address: body.address || null,
      clcAffiliated: body.clcAffiliated || false,
      affiliationDate: body.affiliationDate || null,
      charterNumber: body.charterNumber || null,
      subscriptionTier: body.subscriptionTier || 'basic',
      status: body.status || 'active',
      createdBy: userId,
    });

    return NextResponse.json(
      {
        data: newOrg,
        message: "Organization created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Bulk Update Organizations
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when profiles/roles are set up
    // For now, authenticated users can bulk update organizations

    const body = await request.json();

    // Validate request
    if (!body.organizationIds || !Array.isArray(body.organizationIds) || body.organizationIds.length === 0) {
      return NextResponse.json(
        { error: "organizationIds array is required" },
        { status: 400 }
      );
    }

    if (!body.updates || typeof body.updates !== "object") {
      return NextResponse.json(
        { error: "updates object is required" },
        { status: 400 }
      );
    }

    const { organizationIds, updates } = body;

    // Perform bulk update
    await db
      .update(organizations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(inArray(organizations.id, organizationIds));

    return NextResponse.json({
      data: {
        updatedCount: organizationIds.length,
        updatedIds: organizationIds,
      },
      message: `${organizationIds.length} organization(s) updated successfully`,
    });
  } catch (error) {
    console.error("Error bulk updating organizations:", error);
    return NextResponse.json(
      { error: "Failed to bulk update organizations" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Bulk Archive Organizations
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when profiles/roles are set up
    // For now, authenticated users can bulk delete organizations

    const body = await request.json();

    // Validate request
    if (!body.organizationIds || !Array.isArray(body.organizationIds) || body.organizationIds.length === 0) {
      return NextResponse.json(
        { error: "organizationIds array is required" },
        { status: 400 }
      );
    }

    const { organizationIds } = body;

    // Check for child organizations
    const [childrenResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(inArray(organizations.parentId, organizationIds));

    if (childrenResult && Number(childrenResult.count) > 0) {
      return NextResponse.json(
        {
          error: "Cannot archive organizations with children. Please archive or reassign child organizations first.",
        },
        { status: 400 }
      );
    }

    // Archive organizations (soft delete)
    await db
      .update(organizations)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(inArray(organizations.id, organizationIds));

    return NextResponse.json({
      data: {
        archivedCount: organizationIds.length,
        archivedIds: organizationIds,
      },
      message: `${organizationIds.length} organization(s) archived successfully`,
    });
  } catch (error) {
    console.error("Error bulk archiving organizations:", error);
    return NextResponse.json(
      { error: "Failed to bulk archive organizations" },
      { status: 500 }
    );
  }
}
