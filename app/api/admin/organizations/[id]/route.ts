/**
 * Individual Organization API Routes
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 * 
 * CRUD operations for specific organizations by ID.
 * Features:
 * - Get organization details with full hierarchy info
 * - Update organization with hierarchy validation
 * - Delete (archive) organization with safety checks
 * - Get organization statistics
 * 
 * @module app/api/admin/organizations/[id]/route
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizations, organizationMembers } from "@/db/schema-organizations";
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationDescendants,
} from "@/db/queries/organization-queries";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth, withAdminAuth } from "@/lib/api-auth-guard";

// =====================================================
// GET - Get Organization by ID
// =====================================================

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
  try {
      const { id } = params;

      // Wrap all operations in RLS context to share transaction
      return withRLSContext(async (tx) => {
        // Get organization (pass tx for transaction reuse)
        const org = await getOrganizationById(id, tx);

        if (!org) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
          );
        }

        // Get additional statistics using RLS-protected queries
        const [memberCountResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, id),
              eq(organizationMembers.status, "active")
            )
          );

        const [childCountResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(organizations)
          .where(eq(organizations.parentId, id));

        // Get parent info if exists
        let parentOrg = null;
        if (org.parentId) {
          const [parent] = await tx
            .select({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
              organizationType: organizations.organizationType,
            })
            .from(organizations)
            .where(eq(organizations.id, org.parentId))
            .limit(1);
          parentOrg = parent;
        }

        // Get descendants count
        const descendants = await getOrganizationDescendants(id, true, tx);

        return NextResponse.json({
          data: {
            ...org,
            memberCount: Number(memberCountResult?.count || 0),
            childCount: Number(childCountResult?.count || 0),
            descendantsCount: descendants.length,
            parent: parentOrg,
          },
        });
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      return NextResponse.json(
        { error: "Failed to fetch organization" },
        { status: 500 }
      );
    }
    })(request, { params });
};

// =====================================================
// PUT - Update Organization
// =====================================================

export const PUT = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
      const { id } = params;
      const body = await request.json();

      // Wrap all operations in RLS context for transaction consistency
      return withRLSContext(async (tx) => {
        // Check if organization exists
        const existingOrg = await getOrganizationById(id, tx);
        if (!existingOrg) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
          );
        }

        // Validate slug uniqueness if being changed
        if (body.slug && body.slug !== existingOrg.slug) {
          const [slugCheck] = await tx
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.slug, body.slug))
            .limit(1);

          if (slugCheck) {
            return NextResponse.json(
              { error: "Organization with this slug already exists" },
              { status: 409 }
            );
          }
        }

        // Validate parent change
        if (body.parentId !== undefined && body.parentId !== existingOrg.parentId) {
          // Cannot set parent to self or descendant
          if (body.parentId === id) {
            return NextResponse.json(
              { error: "Organization cannot be its own parent" },
              { status: 400 }
            );
          }

        if (body.parentId) {
          // Check if new parent is a descendant
          const descendants = await getOrganizationDescendants(id, true, tx);
          const descendantIds = descendants.map((d: any) => d.id);
          if (descendantIds.includes(body.parentId)) {
            return NextResponse.json(
              { error: "Cannot set a descendant as parent" },
              { status: 400 }
            );
          }

          // Get new parent and validate hierarchy
          const [newParent] = await tx
            .select()
            .from(organizations)
            .where(eq(organizations.id, body.parentId))
            .limit(1);

          if (!newParent) {
            return NextResponse.json(
              { error: "Parent organization not found" },
              { status: 404 }
            );
          }

          // Validate type hierarchy
          const orgType = body.organizationType || existingOrg.organizationType;
          const typeHierarchy: Record<string, string[]> = {
            congress: ['federation'],
            federation: ['union', 'region'],
            union: ['local', 'district'],
            local: [],
            region: ['local'],
            district: ['local'],
          };

          const allowedChildTypes = typeHierarchy[newParent.organizationType] || [];
          if (!allowedChildTypes.includes(orgType)) {
            return NextResponse.json(
              {
                error: `Invalid hierarchy: ${orgType} cannot be a child of ${newParent.organizationType}`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Update organization (pass tx for transaction reuse)
      const updatedOrg = await updateOrganization(id, {
        ...body,
        updatedBy: userId,
      }, tx);

      return NextResponse.json({
        data: updatedOrg,
        message: "Organization updated successfully",
      });
    });
    } catch (error) {
      console.error("Error updating organization:", error);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }
    })(request, { params });
};

// =====================================================
// DELETE - Archive Organization
// =====================================================

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withAdminAuth(async (request, context) => {
  try {
      const { id } = params;

      // Wrap all operations in RLS context for transaction consistency
      return withRLSContext(async (tx) => {
        // Check if organization exists
        const existingOrg = await getOrganizationById(id, tx);
        if (!existingOrg) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
          );
        }

        // Check for child organizations
        const [childrenResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(organizations)
          .where(eq(organizations.parentId, id));

        if (childrenResult && Number(childrenResult.count) > 0) {
          return NextResponse.json(
            {
              error: `Cannot archive organization with ${childrenResult.count} child organization(s). Please archive or reassign children first.`,
            },
            { status: 400 }
          );
        }

        // Check for active members
        const [membersResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, id),
              eq(organizationMembers.status, "active")
            )
          );

        const memberCount = Number(membersResult?.count || 0);
        if (memberCount > 0) {
          // Parse query params for force delete
          const searchParams = request.nextUrl.searchParams;
          const force = searchParams.get("force") === "true";

          if (!force) {
            return NextResponse.json(
              {
                error: `Organization has ${memberCount} active member(s). Use force=true to archive anyway.`,
                memberCount,
              },
              { status: 400 }
            );
          }
        }

        // Archive organization (soft delete) - pass tx for transaction reuse
        await deleteOrganization(id, tx);

        return NextResponse.json({
          data: {
            id,
            status: "archived",
          },
          message: "Organization archived successfully",
        });
      });
    } catch (error) {
      console.error("Error archiving organization:", error);
      return NextResponse.json(
        { error: "Failed to archive organization" },
        { status: 500 }
      );
    }
    })(request, { params });
};
