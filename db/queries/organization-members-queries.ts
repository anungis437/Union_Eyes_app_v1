/**
 * Organization Members Queries
 * Database queries for managing organization members
 */

import { db } from "../db";
import { organizationMembers, SelectOrganizationMember, InsertOrganizationMember } from "../schema/organization-members-schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

/**
 * Get all active members for an organization
 */
export async function getOrganizationMembers(organizationId: string): Promise<SelectOrganizationMember[]> {
  const tenantId = organizationId;
  return await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt)
      )
    )
    .orderBy(desc(organizationMembers.createdAt));
}

/**
 * Get member by ID and organization
 */
export async function getMemberById(organizationId: string, id: string): Promise<SelectOrganizationMember | undefined> {
  const tenantId = organizationId;
  const result = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.id, id),
        isNull(organizationMembers.deletedAt)
      )
    )
    .limit(1);
  
  return result[0];
}

/**
 * Get member by user ID
 */
export async function getMemberByUserId(
  organizationId: string,
  userId: string
): Promise<SelectOrganizationMember | undefined> {
  const tenantId = organizationId;
  const result = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        isNull(organizationMembers.deletedAt)
      )
    )
    .limit(1);
  
  return result[0];
}

/**
 * Create a new member
 */
export async function createMember(member: InsertOrganizationMember): Promise<SelectOrganizationMember> {
  const result = await db
    .insert(organizationMembers)
    .values(member)
    .returning();
  
  return result[0];
}

/**
 * Add an existing user to an organization
 */
export async function addOrganizationMember(params: {
  organizationId: string;
  userId: string;
  role: "member" | "steward" | "officer" | "admin";
  isPrimary?: boolean;
  name: string;
  email: string;
  phone?: string | null;
}): Promise<SelectOrganizationMember> {
  const existing = await getMemberByUserId(params.organizationId, params.userId);
  if (existing) {
    return existing;
  }

  return createMember({
    organizationId: params.organizationId,
    userId: params.userId,
    role: params.role,
    status: "active",
    isPrimary: params.isPrimary ?? false,
    name: params.name,
    email: params.email,
    phone: params.phone ?? undefined,
  });
}

/**
 * Update a member
 */
export async function updateMember(
  id: string,
  updates: Partial<InsertOrganizationMember>
): Promise<SelectOrganizationMember | undefined> {
  const result = await db
    .update(organizationMembers)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembers.id, id),
        isNull(organizationMembers.deletedAt)
      )
    )
    .returning();
  
  return result[0];
}

/**
 * Soft delete a member
 */
export async function deleteMember(id: string): Promise<boolean> {
  const result = await db
    .update(organizationMembers)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizationMembers.id, id))
    .returning();
  
  return result.length > 0;
}

/**
 * Get member count for an organization
 */
export async function getMemberCount(organizationId: string): Promise<number> {
  const tenantId = organizationId;
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt)
      )
    );
  
  return result[0]?.count || 0;
}

/**
 * Get active member count for an organization
 */
export async function getActiveMemberCount(organizationId: string): Promise<number> {
  const tenantId = organizationId;
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.status, "active"),
        isNull(organizationMembers.deletedAt)
      )
    );
  
  return result[0]?.count || 0;
}

/**
 * Get members by role
 */
export async function getMembersByRole(
  organizationId: string,
  role: "member" | "steward" | "officer" | "admin"
): Promise<SelectOrganizationMember[]> {
  const tenantId = organizationId;
  return await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.role, role),
        isNull(organizationMembers.deletedAt)
      )
    )
    .orderBy(desc(organizationMembers.createdAt));
}

/**
 * Get members by status
 */
export async function getMembersByStatus(
  organizationId: string,
  status: "active" | "inactive" | "on-leave"
): Promise<SelectOrganizationMember[]> {
  const tenantId = organizationId;
  return await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.status, status),
        isNull(organizationMembers.deletedAt)
      )
    )
    .orderBy(desc(organizationMembers.createdAt));
}

/**
 * Search members using full-text search
 */
export async function searchMembers(
  organizationId: string,
  searchQuery: string,
  filters?: {
    role?: "member" | "steward" | "officer" | "admin";
    status?: "active" | "inactive" | "on-leave";
    department?: string;
  }
): Promise<SelectOrganizationMember[]> {
  const tenantId = organizationId;
  const conditions = [
    eq(organizationMembers.organizationId, organizationId),
    isNull(organizationMembers.deletedAt),
  ];

  // Add full-text search if query provided
  if (searchQuery && searchQuery.trim()) {
    // Convert search query to tsquery format (handle multiple words)
    const tsQuery = searchQuery.trim().split(/\s+/).join(' & ');
    conditions.push(sql`${organizationMembers.searchVector} @@ to_tsquery('english', ${tsQuery})`);
  }

  // Add filters
  if (filters?.role) {
    conditions.push(eq(organizationMembers.role, filters.role));
  }
  if (filters?.status) {
    conditions.push(eq(organizationMembers.status, filters.status));
  }
  if (filters?.department) {
    conditions.push(eq(organizationMembers.department, filters.department));
  }

  const query = db
    .select()
    .from(organizationMembers)
    .where(and(...conditions));

  // Order by relevance if search query provided
  if (searchQuery && searchQuery.trim()) {
    const tsQuery = searchQuery.trim().split(/\s+/).join(' & ');
    return await query.orderBy(
      sql`ts_rank(${organizationMembers.searchVector}, to_tsquery('english', ${tsQuery})) DESC`
    );
  }

  return await query.orderBy(desc(organizationMembers.createdAt));
}
