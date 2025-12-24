"use server";

/**
 * Organization Query Functions
 * 
 * Provides data access layer for hierarchical organizations.
 * Supports CLC → Federation → Union → Local hierarchy with
 * materialized paths for efficient descendant queries.
 * 
 * Key Features:
 * - Hierarchical queries using database functions (O(1) descendants)
 * - Row-Level Security (RLS) enforcement via get_user_visible_orgs()
 * - Soft deletes (status='archived')
 * - Automatic hierarchy path maintenance
 * - Type-safe with full TypeScript inference
 * 
 * @module db/queries/organization-queries
 */

import { db } from "@/db/db";
import { 
  organizations, 
  organizationRelationships,
  organizationMembers,
  type Organization,
  type NewOrganization,
  type OrganizationRelationship,
  type NewOrganizationRelationship,
} from "@/db/schema-organizations";
import { eq, and, or, inArray, isNull, sql, desc, asc } from "drizzle-orm";

// =====================================================
// TYPE EXPORTS
// =====================================================

export type InsertOrganization = NewOrganization;
export type SelectOrganization = Organization;
export type InsertOrganizationRelationship = NewOrganizationRelationship;
export type SelectOrganizationRelationship = OrganizationRelationship;

// =====================================================
// SINGLE ORGANIZATION QUERIES
// =====================================================

/**
 * Get organization by ID
 * 
 * @param id - Organization UUID
 * @returns Organization or null if not found
 * 
 * @example
 * ```typescript
 * const org = await getOrganizationById("10000000-0000-0000-0000-000000000001");
 * console.log(org?.name); // "Canadian Labour Congress"
 * ```
 */
export async function getOrganizationById(
  id: string
): Promise<SelectOrganization | null> {
  try {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error("Error fetching organization by ID:", error);
    throw new Error(`Failed to fetch organization with ID ${id}`);
  }
}

/**
 * Get organization by slug
 * 
 * Slugs are unique identifiers suitable for URLs.
 * 
 * @param slug - Organization slug (e.g., "clc", "cupe-national", "cupe-123")
 * @returns Organization or null if not found
 * 
 * @example
 * ```typescript
 * const cupe = await getOrganizationBySlug("cupe-national");
 * console.log(cupe?.member_count); // 700000
 * ```
 */
export async function getOrganizationBySlug(
  slug: string
): Promise<SelectOrganization | null> {
  try {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error("Error fetching organization by slug:", error);
    throw new Error(`Failed to fetch organization with slug "${slug}"`);
  }
}

/**
 * Get organization with parent reference
 * 
 * Useful for breadcrumb navigation.
 * 
 * @param id - Organization UUID
 * @returns Organization with parent loaded or null
 */
export async function getOrganizationWithParent(
  id: string
): Promise<(SelectOrganization & { parent?: SelectOrganization }) | null> {
  try {
    // Get the organization first
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    const org = result[0] ?? null;
    if (!org) return null;

    // Get parent if exists
    if (org.parentId) {
      const parentResult = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, org.parentId))
        .limit(1);
      
      const parent = parentResult[0] ?? undefined;
      return { ...org, parent };
    }

    return org;
  } catch (error) {
    console.error("Error fetching organization with parent:", error);
    throw new Error(`Failed to fetch organization with parent for ID ${id}`);
  }
}

// =====================================================
// HIERARCHICAL QUERIES
// =====================================================

/**
 * Get organizations with optional parent filter
 * 
 * If parentId provided: returns children of that parent
 * If parentId is null/undefined: returns root organizations (no parent)
 * 
 * @param parentId - Optional parent organization UUID
 * @param includeInactive - Include archived/suspended orgs (default: false)
 * @returns Array of organizations
 * 
 * @example
 * ```typescript
 * const rootOrgs = await getOrganizations();
 * // Returns: [CLC, Independent unions]
 * 
 * const clcChildren = await getOrganizations("10000000-0000-0000-0000-000000000001");
 * // Returns: [CUPE National, Unifor National, UFCW Canada]
 * ```
 */
export async function getOrganizations(
  parentId?: string,
  includeInactive = false
): Promise<SelectOrganization[]> {
  try {
    const conditions = [];

    if (parentId) {
      // Get children of specific parent
      conditions.push(eq(organizations.parentId, parentId));
    } else {
      // Get root organizations (no parent)
      conditions.push(isNull(organizations.parentId));
    }

    if (!includeInactive) {
      conditions.push(eq(organizations.status, "active"));
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(asc(organizations.name));
    
    return result;
  } catch (error) {
    console.error("Error fetching organizations:", error);
    throw new Error(`Failed to fetch organizations${parentId ? ` for parent ${parentId}` : ""}`);
  }
}

/**
 * Get direct children of an organization
 * 
 * @param parentId - Parent organization UUID
 * @param includeInactive - Include archived/suspended orgs (default: false)
 * @returns Array of child organizations
 * 
 * @example
 * ```typescript
 * const clcChildren = await getOrganizationChildren("10000000-0000-0000-0000-000000000001");
 * // Returns: [CUPE National, Unifor National, UFCW Canada]
 * ```
 */
export async function getOrganizationChildren(
  parentId: string,
  includeInactive = false
): Promise<SelectOrganization[]> {
  try {
    const conditions = [eq(organizations.parentId, parentId)];

    if (!includeInactive) {
      conditions.push(eq(organizations.status, "active"));
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(asc(organizations.name));

    return result;
  } catch (error) {
    console.error("Error fetching organization children:", error);
    throw new Error(`Failed to fetch children for organization ${parentId}`);
  }
}

/**
 * Get all descendants of an organization (children, grandchildren, etc.)
 * 
 * Uses materialized path for O(1) query performance.
 * Returns organizations in breadth-first order (by hierarchy_level).
 * 
 * @param ancestorId - Ancestor organization UUID
 * @param includeInactive - Include archived/suspended orgs (default: false)
 * @returns Array of descendant organizations sorted by hierarchy level
 * 
 * @example
 * ```typescript
 * const clcDescendants = await getOrganizationDescendants("10000000-0000-0000-0000-000000000001");
 * // Returns: All unions, locals, chapters under CLC (breadth-first)
 * ```
 */
export async function getOrganizationDescendants(
  ancestorId: string,
  includeInactive = false
): Promise<SelectOrganization[]> {
  try {
    // Use hierarchy_path array containment for efficient descendant lookup
    // @> operator checks if left array contains right array
    const conditions = [
      sql`${organizations.hierarchyPath} @> ARRAY[${ancestorId}]::uuid[]`,
      sql`${organizations.id} != ${ancestorId}`, // Exclude self
    ];

    if (!includeInactive) {
      conditions.push(eq(organizations.status, "active"));
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(
        asc(organizations.hierarchyLevel),
        asc(organizations.name)
      );
    
    return result;
  } catch (error) {
    console.error("Error fetching organization descendants:", error);
    throw new Error(`Failed to fetch descendants for organization ${ancestorId}`);
  }
}

/**
 * Get all ancestors of an organization (parent, grandparent, etc.)
 * 
 * Returns ancestors from root to immediate parent.
 * 
 * @param childId - Child organization UUID
 * @returns Array of ancestor organizations from root to parent
 * 
 * @example
 * ```typescript
 * const ancestors = await getOrganizationAncestors("cupe-123-uuid");
 * // Returns: [CLC, CUPE National] (root to parent order)
 * ```
 */
export async function getOrganizationAncestors(
  childIdOrSlug: string
): Promise<SelectOrganization[]> {
  try {
    console.log('[getOrganizationAncestors] Looking up organization:', childIdOrSlug);
    
    // Check if input is a slug or UUID by attempting to find by slug first
    let child;
    
    // Try to find by slug first (more common in API routes)
    const [childBySlug] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, childIdOrSlug))
      .limit(1);
    
    if (childBySlug) {
      child = childBySlug;
      console.log('[getOrganizationAncestors] Found by slug:', { id: child.id, slug: child.slug, hierarchyPath: child.hierarchyPath });
    } else {
      // Fall back to finding by UUID
      const [childById] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, childIdOrSlug))
        .limit(1);
      child = childById;
      if (child) {
        console.log('[getOrganizationAncestors] Found by ID:', { id: child.id, slug: child.slug, hierarchyPath: child.hierarchyPath });
      }
    }

    if (!child) {
      console.log('[getOrganizationAncestors] Organization not found');
      return [];
    }

    if (!child.hierarchyPath || child.hierarchyPath.length === 0) {
      console.log('[getOrganizationAncestors] No hierarchy path, returning empty array');
      return [];
    }

    console.log('[getOrganizationAncestors] Fetching ancestors for path:', child.hierarchyPath);

    // Query all ancestors using slugs from hierarchy_path (hierarchyPath contains slugs, not UUIDs)
    const ancestors = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.slug, child.hierarchyPath))
      .orderBy(asc(organizations.hierarchyLevel));

    console.log('[getOrganizationAncestors] Found ancestors:', ancestors.length);
    return ancestors;
  } catch (error) {
    console.error("[getOrganizationAncestors] Error:", error);
    throw new Error(`Failed to fetch ancestors for organization ${childIdOrSlug}`);
  }
}

/**
 * Get full organization tree
 * 
 * Returns all active organizations with their hierarchical structure.
 * Optionally start from a specific root to get a subtree.
 * 
 * @param rootId - Optional root organization UUID (default: CLC root)
 * @param maxDepth - Maximum hierarchy levels to return (default: unlimited)
 * @returns Array of all organizations in tree order
 * 
 * @example
 * ```typescript
 * const fullTree = await getOrganizationTree();
 * // Returns: All organizations from CLC root down
 * 
 * const cupeTree = await getOrganizationTree("cupe-national-uuid");
 * // Returns: CUPE National and all its locals
 * ```
 */
export async function getOrganizationTree(
  rootId?: string,
  maxDepth?: number
): Promise<SelectOrganization[]> {
  try {
    const conditions = [eq(organizations.status, "active")];

    if (rootId) {
      // Get subtree: root + all descendants
      const rootCondition = or(
        eq(organizations.id, rootId),
        sql`${organizations.hierarchyPath} @> ARRAY[${rootId}]::uuid[]`
      );
      if (rootCondition) conditions.push(rootCondition);

      if (maxDepth !== undefined) {
        // Get root level first
        const rootResult = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, rootId))
          .limit(1);

        const root = rootResult[0];
        if (root) {
          conditions.push(
            sql`${organizations.hierarchyLevel} <= ${root.hierarchyLevel + maxDepth}`
          );
        }
      }
    } else if (maxDepth !== undefined) {
      // Limit depth from absolute root
      conditions.push(sql`${organizations.hierarchyLevel} <= ${maxDepth}`);
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(
        asc(organizations.hierarchyLevel),
        asc(organizations.name)
      );
    
    return result;
  } catch (error) {
    console.error("Error fetching organization tree:", error);
    throw new Error("Failed to fetch organization tree");
  }
}

/**
 * Get organizations visible to a user
 * 
 * Uses RLS function get_user_visible_orgs() to return organizations
 * the user has access to (their org + descendants, respecting RLS).
 * 
 * @param userId - User's auth ID (from Supabase Auth)
 * @returns Array of organizations user can access
 * 
 * @example
 * ```typescript
 * const myOrgs = await getUserVisibleOrganizations("user-123");
 * // Returns: User's org + all child orgs they can see
 * ```
 */
export async function getUserVisibleOrganizations(
  userId: string
): Promise<SelectOrganization[]> {
  try {
    // Call database function that enforces RLS
    const result = await db.execute<SelectOrganization>(
      sql`
        SELECT o.* 
        FROM organizations o
        WHERE o.id IN (SELECT get_user_visible_orgs(${userId}))
          AND o.status = 'active'
        ORDER BY o.hierarchy_level, o.name
      `
    );

    return Array.from(result) as SelectOrganization[];
  } catch (error) {
    console.error("Error fetching user visible organizations:", error);
    throw new Error(`Failed to fetch organizations for user ${userId}`);
  }
}

/**
 * Get user's primary organization
 * 
 * Returns the organization where user is an active member.
 * If member of multiple orgs, returns the highest-level one.
 * 
 * @param userId - User's auth ID
 * @returns Primary organization or null
 */
export async function getUserPrimaryOrganization(
  userId: string
): Promise<SelectOrganization | null> {
  try {
    const [result] = await db
      .select({
        organization: organizations,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id)
      )
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
          eq(organizations.status, "active")
        )
      )
      .orderBy(asc(organizations.hierarchyLevel)) // Highest level org first
      .limit(1);

    return result?.organization || null;
  } catch (error) {
    console.error("Error fetching user primary organization:", error);
    throw new Error(`Failed to fetch primary organization for user ${userId}`);
  }
}

// =====================================================
// SEARCH & FILTER QUERIES
// =====================================================

/**
 * Search organizations by name
 * 
 * Case-insensitive search across name, short_name, display_name.
 * 
 * @param searchTerm - Search string
 * @param limit - Maximum results (default: 20)
 * @returns Array of matching organizations
 */
export async function searchOrganizations(
  searchTerm: string,
  limit = 20
): Promise<SelectOrganization[]> {
  try {
    const pattern = `%${searchTerm.toLowerCase()}%`;

    const result = await db
      .select()
      .from(organizations)
      .where(
        and(
          or(
            sql`LOWER(${organizations.name}) LIKE ${pattern}`,
            sql`LOWER(${organizations.shortName}) LIKE ${pattern}`,
            sql`LOWER(${organizations.displayName}) LIKE ${pattern}`
          ),
          eq(organizations.status, "active")
        )
      )
      .orderBy(asc(organizations.hierarchyLevel), asc(organizations.name))
      .limit(limit);
    
    return result;
  } catch (error) {
    console.error("Error searching organizations:", error);
    throw new Error(`Failed to search organizations with term "${searchTerm}"`);
  }
}

/**
 * Get organizations by type
 * 
 * @param type - Organization type (congress, federation, union, local, region, district)
 * @param parentId - Optional parent filter
 * @returns Array of organizations of specified type
 */
export async function getOrganizationsByType(
  type: 'congress' | 'federation' | 'union' | 'local' | 'region' | 'district',
  parentId?: string
): Promise<SelectOrganization[]> {
  try {
    const conditions = [
      eq(organizations.organizationType, type),
      eq(organizations.status, "active"),
    ];

    if (parentId) {
      conditions.push(eq(organizations.parentId, parentId));
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(asc(organizations.name));
    
    return result;
  } catch (error) {
    console.error("Error fetching organizations by type:", error);
    throw new Error(`Failed to fetch organizations of type "${type}"`);
  }
}

/**
 * Get CLC-affiliated organizations
 * 
 * @param includeRoot - Include CLC itself (default: false)
 * @returns Array of CLC-affiliated organizations
 */
export async function getCLCAffiliatedOrganizations(
  includeRoot = false
): Promise<SelectOrganization[]> {
  try {
    const conditions = [
      eq(organizations.clcAffiliated, true),
      eq(organizations.status, "active"),
    ];

    if (!includeRoot) {
      conditions.push(sql`${organizations.organizationType} != 'congress'`);
    }

    const result = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(asc(organizations.hierarchyLevel), asc(organizations.name));
    
    return result;
  } catch (error) {
    console.error("Error fetching CLC-affiliated organizations:", error);
    throw new Error("Failed to fetch CLC-affiliated organizations");
  }
}

// =====================================================
// CREATE & UPDATE OPERATIONS
// =====================================================

/**
 * Create a new organization
 * 
 * Automatically:
 * - Sets hierarchy_path based on parent
 * - Sets hierarchy_level based on parent
 * - Validates organization_type hierarchy rules
 * - Triggers hierarchy path updates for children
 * 
 * @param data - Organization data
 * @returns Newly created organization
 * 
 * @example
 * ```typescript
 * const newLocal = await createOrganization({
 *   name: "CUPE Local 456",
 *   slug: "cupe-456",
 *   organizationType: "local",
 *   parentId: "cupe-national-uuid",
 *   jurisdiction: "ontario",
 *   sectors: ["public_service"],
 *   clcAffiliated: true,
 * });
 * ```
 */
export async function createOrganization(
  data: InsertOrganization
): Promise<SelectOrganization> {
  try {
    // Get parent to determine hierarchy
    let hierarchyPath: string[] = [];
    let hierarchyLevel = 0;

    if (data.parentId) {
      const parent = await getOrganizationById(data.parentId);
      if (!parent) {
        throw new Error(`Parent organization with ID ${data.parentId} not found`);
      }

      hierarchyPath = [...parent.hierarchyPath, parent.id];
      hierarchyLevel = parent.hierarchyLevel + 1;

      // Validate organization type hierarchy
      validateOrganizationHierarchy(parent.organizationType, data.organizationType);
    }

    // Insert with computed hierarchy fields
    const [newOrg] = await db
      .insert(organizations)
      .values({
        ...data,
        hierarchyPath,
        hierarchyLevel,
        status: data.status || "active",
        memberCount: data.memberCount || 0,
        activeMemberCount: data.activeMemberCount || 0,
        sectors: data.sectors || [],
        featuresEnabled: data.featuresEnabled || [],
        settings: data.settings || {},
      })
      .returning();

    console.log(`Created organization: ${newOrg.name} (${newOrg.id})`);
    return newOrg;
  } catch (error) {
    console.error("Error creating organization:", error);
    throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update an organization
 * 
 * If parentId changes:
 * - Recalculates hierarchy_path
 * - Updates all descendant paths (via trigger)
 * - Validates new hierarchy
 * 
 * @param id - Organization UUID
 * @param data - Updated fields
 * @returns Updated organization
 * 
 * @example
 * ```typescript
 * const updated = await updateOrganization("org-uuid", {
 *   memberCount: 52000,
 *   sectors: ["retail", "food_service"],
 * });
 * ```
 */
export async function updateOrganization(
  id: string,
  data: Partial<InsertOrganization>
): Promise<SelectOrganization> {
  try {
    // Check if parent is changing
    if (data.parentId !== undefined) {
      const current = await getOrganizationById(id);
      if (!current) {
        throw new Error(`Organization with ID ${id} not found`);
      }

      // Prevent creating circular references
      if (data.parentId === id) {
        throw new Error("Organization cannot be its own parent");
      }

      // If changing parent, recalculate hierarchy
      if (data.parentId !== current.parentId) {
        let hierarchyPath: string[] = [];
        let hierarchyLevel = 0;

        if (data.parentId) {
          const newParent = await getOrganizationById(data.parentId);
          if (!newParent) {
            throw new Error(`Parent organization with ID ${data.parentId} not found`);
          }

          // Prevent moving org under its own descendant
          if (newParent.hierarchyPath.includes(id)) {
            throw new Error("Cannot move organization under its own descendant");
          }

          hierarchyPath = [...newParent.hierarchyPath, newParent.id];
          hierarchyLevel = newParent.hierarchyLevel + 1;

          validateOrganizationHierarchy(
            newParent.organizationType,
            data.organizationType || current.organizationType
          );
        }

        // Include hierarchy updates
        data = {
          ...data,
          hierarchyPath,
          hierarchyLevel,
        };
      }
    }

    const [updated] = await db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Organization with ID ${id} not found`);
    }

    console.log(`Updated organization: ${updated.name} (${id})`);
    return updated;
  } catch (error) {
    console.error("Error updating organization:", error);
    throw new Error(`Failed to update organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Soft delete an organization
 * 
 * Sets status to 'archived'. Organization and descendants remain
 * in database but are hidden from active queries.
 * 
 * @param id - Organization UUID
 * @returns Archived organization
 * 
 * @example
 * ```typescript
 * await deleteOrganization("old-local-uuid");
 * ```
 */
export async function deleteOrganization(
  id: string
): Promise<SelectOrganization> {
  try {
    // Check if organization has active children
    const children = await getOrganizationChildren(id, false);
    if (children.length > 0) {
      throw new Error(
        `Cannot delete organization with ${children.length} active child organizations. ` +
        `Archive or reassign children first.`
      );
    }

    const [archived] = await db
      .update(organizations)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    if (!archived) {
      throw new Error(`Organization with ID ${id} not found`);
    }

    console.log(`Archived organization: ${archived.name} (${id})`);
    return archived;
  } catch (error) {
    console.error("Error deleting organization:", error);
    throw new Error(`Failed to delete organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// =====================================================
// RELATIONSHIP QUERIES
// =====================================================

/**
 * Create organization relationship
 * 
 * Records formal relationships beyond parent-child
 * (e.g., affiliation, coalition, solidarity).
 * 
 * @param data - Relationship data
 * @returns Created relationship
 */
export async function createOrganizationRelationship(
  data: InsertOrganizationRelationship
): Promise<SelectOrganizationRelationship> {
  try {
    const [relationship] = await db
      .insert(organizationRelationships)
      .values(data)
      .returning();

    console.log(
      `Created relationship: ${relationship.parentOrgId} -> ${relationship.childOrgId} ` +
      `(${relationship.relationshipType})`
    );
    return relationship;
  } catch (error) {
    console.error("Error creating organization relationship:", error);
    throw new Error("Failed to create organization relationship");
  }
}

/**
 * Get relationships for an organization
 * 
 * @param orgId - Organization UUID
 * @param asParent - Get relationships where org is parent (default: true)
 * @returns Array of relationships
 */
export async function getOrganizationRelationships(
  orgId: string,
  asParent = true
): Promise<SelectOrganizationRelationship[]> {
  try {
    const field = asParent
      ? organizationRelationships.parentOrgId
      : organizationRelationships.childOrgId;

    const result = await db
      .select()
      .from(organizationRelationships)
      .where(
        and(
          eq(field, orgId),
          or(
            isNull(organizationRelationships.endDate),
            sql`${organizationRelationships.endDate} > NOW()`
          )
        )
      )
      .orderBy(desc(organizationRelationships.effectiveDate));
    
    return result as SelectOrganizationRelationship[];
  } catch (error) {
    console.error("Error fetching organization relationships:", error);
    throw new Error(`Failed to fetch relationships for organization ${orgId}`);
  }
}

// =====================================================
// STATISTICS QUERIES
// =====================================================

/**
 * Get organization member count statistics
 * 
 * Aggregates member counts from descendants.
 * 
 * @param id - Organization UUID
 * @param includeDescendants - Include child org members (default: true)
 * @returns Total member count
 */
export async function getOrganizationMemberStats(
  id: string,
  includeDescendants = true
): Promise<{
  totalMembers: number;
  activeMembers: number;
  descendantOrgs: number;
}> {
  try {
    if (!includeDescendants) {
      const org = await getOrganizationById(id);
      return {
        totalMembers: org?.memberCount || 0,
        activeMembers: org?.activeMemberCount || 0,
        descendantOrgs: 0,
      };
    }

    // Get org + all descendants
    const [org, descendants] = await Promise.all([
      getOrganizationById(id),
      getOrganizationDescendants(id, false),
    ]);

    if (!org) {
      throw new Error(`Organization with ID ${id} not found`);
    }

    const allOrgs = [org, ...descendants];

    return {
      totalMembers: allOrgs.reduce((sum, o) => sum + (o.memberCount || 0), 0),
      activeMembers: allOrgs.reduce((sum, o) => sum + (o.activeMemberCount || 0), 0),
      descendantOrgs: descendants.length,
    };
  } catch (error) {
    console.error("Error fetching organization member stats:", error);
    throw new Error(`Failed to fetch member stats for organization ${id}`);
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate organization type hierarchy
 * 
 * Enforces business rules:
 * - Congress (CLC) has no parent
 * - Federations are under Congress
 * - Unions are under Congress or Federation
 * - Locals are under Unions
 * - Chapters are under Locals
 * - Sector Councils are under Congress/Federation/Union
 * 
 * @throws Error if hierarchy is invalid
 */
function validateOrganizationHierarchy(
  parentType: string,
  childType: string
): void {
  const validHierarchies: Record<string, string[]> = {
    congress: ["federation", "union", "sector_council"],
    federation: ["union", "sector_council"],
    union: ["local", "sector_council"],
    local: ["chapter"],
    chapter: [],
    sector_council: [],
  };

  const allowedChildren = validHierarchies[parentType] || [];

  if (!allowedChildren.includes(childType)) {
    throw new Error(
      `Invalid hierarchy: ${childType} cannot be a child of ${parentType}. ` +
      `Allowed children of ${parentType}: ${allowedChildren.join(", ") || "none"}`
    );
  }
}
