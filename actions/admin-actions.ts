"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { tenantUsers, users } from "@/db/schema/user-management-schema";
import { tenants, tenantConfigurations, tenantUsage } from "@/db/schema/tenant-management-schema";
import { eq, and, desc, sql, count, like, or, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

// Type definitions
export type UserRole = "member" | "steward" | "officer" | "admin";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  status: "active" | "inactive";
  lastLogin: string | null;
  joinedAt: string | null;
}

interface TenantWithStats {
  id: string;
  slug: string;
  name: string;
  status: string;
  subscriptionTier: string;
  totalUsers: number;
  activeUsers: number;
  storageUsed: string;
  createdAt: string;
  contactEmail: string | null;
  phone: string | null;
}

interface SystemStats {
  totalMembers: number;
  totalTenants: number;
  activeTenants: number;
  totalStorage: number;
  activeToday: number;
}

interface SystemConfig {
  category: string;
  key: string;
  value: any;
  description: string | null;
}

// Authorization check
async function requireAdmin() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Check if user is admin in any tenant
  const adminRole = await db
    .select({ role: tenantUsers.role })
    .from(tenantUsers)
    .where(and(
      eq(tenantUsers.userId, userId),
      eq(tenantUsers.role, "admin")
    ))
    .limit(1);

  if (adminRole.length === 0) {
    throw new Error("Admin access required");
  }

  return userId;
}

/**
 * Get system-wide statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  try {
    await requireAdmin();

    // Total unique users across all tenants
    const totalMembersResult = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(eq(tenantUsers.isActive, true));

    // Total tenants
    const totalTenantsResult = await db
      .select({ count: count() })
      .from(tenants)
      .where(isNull(tenants.deletedAt));

    // Active tenants
    const activeTenantsResult = await db
      .select({ count: count() })
      .from(tenants)
      .where(and(
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt)
      ));

    // Total storage used (sum from tenant_usage)
    const storageResult = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${tenantUsage.storageUsedGb}), 0)` 
      })
      .from(tenantUsage);

    // Users active in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeTodayResult = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.isActive, true),
        sql`${tenantUsers.lastAccessAt} > ${oneDayAgo}`
      ));

    return {
      totalMembers: totalMembersResult[0]?.count || 0,
      totalTenants: totalTenantsResult[0]?.count || 0,
      activeTenants: activeTenantsResult[0]?.count || 0,
      totalStorage: parseFloat(storageResult[0]?.total || "0"),
      activeToday: activeTodayResult[0]?.count || 0,
    };
  } catch (error) {
    logger.error("Failed to fetch system stats", error);
    throw new Error("Failed to fetch system statistics");
  }
}

/**
 * Get all users across tenants with filtering
 */
export async function getAdminUsers(
  searchQuery?: string,
  tenantId?: string,
  role?: UserRole
): Promise<AdminUser[]> {
  try {
    await requireAdmin();

    // Build filter conditions
    const conditions = [isNull(tenants.deletedAt)];
    
    if (tenantId) {
      conditions.push(eq(tenantUsers.tenantId, tenantId));
    }
    
    if (role) {
      conditions.push(eq(tenantUsers.role, role));
    }
    
    if (searchQuery) {
      conditions.push(
        or(
          like(tenantUsers.userId, `%${searchQuery}%`),
          like(tenants.tenantName, `%${searchQuery}%`)
        )!
      );
    }

    const results = await db
      .select({
        userId: tenantUsers.userId,
        role: tenantUsers.role,
        tenantId: tenantUsers.tenantId,
        tenantName: tenants.tenantName,
        isActive: tenantUsers.isActive,
        lastAccessAt: tenantUsers.lastAccessAt,
        joinedAt: tenantUsers.joinedAt,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenants.tenantId, tenantUsers.tenantId))
      .where(and(...conditions))
      .orderBy(desc(tenantUsers.lastAccessAt));

    return results.map(u => ({
      id: u.userId,
      name: u.userId.split('_')[0] || "User", // Extract from Clerk ID
      email: u.userId, // Temporary - need to fetch from Clerk
      role: u.role as UserRole,
      tenantId: u.tenantId,
      tenantName: u.tenantName,
      status: u.isActive ? "active" : "inactive",
      lastLogin: u.lastAccessAt?.toISOString() || null,
      joinedAt: u.joinedAt?.toISOString() || null,
    }));
  } catch (error) {
    logger.error("Failed to fetch admin users", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Get all tenants with statistics
 */
export async function getAdminTenants(searchQuery?: string): Promise<TenantWithStats[]> {
  try {
    await requireAdmin();

    // Build where conditions
    const whereConditions = searchQuery
      ? and(
          isNull(tenants.deletedAt),
          or(
            like(tenants.tenantName, `%${searchQuery}%`),
            like(tenants.tenantSlug, `%${searchQuery}%`)
          )!
        )
      : isNull(tenants.deletedAt);

    const tenantList = await db
      .select({
        tenantId: tenants.tenantId,
        tenantSlug: tenants.tenantSlug,
        tenantName: tenants.tenantName,
        status: tenants.status,
        subscriptionTier: tenants.subscriptionTier,
        contactEmail: tenants.contactEmail,
        phone: tenants.phone,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(whereConditions)
      .orderBy(desc(tenants.createdAt));

    // Get user counts for each tenant
    const tenantsWithStats = await Promise.all(
      tenantList.map(async (tenant) => {
        const [userCount] = await db
          .select({ 
            total: count(),
            active: sql<number>`COUNT(*) FILTER (WHERE ${tenantUsers.isActive} = true)`
          })
          .from(tenantUsers)
          .where(eq(tenantUsers.tenantId, tenant.tenantId));

        const [usage] = await db
          .select({ storageUsed: tenantUsage.storageUsedGb })
          .from(tenantUsage)
          .where(eq(tenantUsage.tenantId, tenant.tenantId))
          .orderBy(desc(tenantUsage.periodEnd))
          .limit(1);

        return {
          id: tenant.tenantId,
          slug: tenant.tenantSlug,
          name: tenant.tenantName,
          status: tenant.status,
          subscriptionTier: tenant.subscriptionTier,
          totalUsers: userCount?.total || 0,
          activeUsers: userCount?.active || 0,
          storageUsed: usage?.storageUsed || "0",
          createdAt: tenant.createdAt?.toISOString() || "",
          contactEmail: tenant.contactEmail,
          phone: tenant.phone,
        };
      })
    );

    return tenantsWithStats;
  } catch (error) {
    logger.error("Failed to fetch admin tenants", error);
    throw new Error("Failed to fetch tenants");
  }
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  tenantId: string,
  newRole: UserRole
): Promise<void> {
  try {
    const adminId = await requireAdmin();

    await db
      .update(tenantUsers)
      .set({ 
        role: newRole,
        updatedAt: new Date()
      })
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ));

    logger.info("User role updated", {
      adminId,
      userId,
      tenantId,
      newRole,
    });

    revalidatePath("/[locale]/dashboard/admin");
  } catch (error) {
    logger.error("Failed to update user role", error);
    throw new Error("Failed to update user role");
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const adminId = await requireAdmin();

    const [user] = await db
      .select({ isActive: tenantUsers.isActive })
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    await db
      .update(tenantUsers)
      .set({ 
        isActive: !user.isActive,
        updatedAt: new Date()
      })
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ));

    logger.info("User status toggled", {
      adminId,
      userId,
      tenantId,
      newStatus: !user.isActive,
    });

    revalidatePath("/[locale]/dashboard/admin");
  } catch (error) {
    logger.error("Failed to toggle user status", error);
    throw new Error("Failed to update user status");
  }
}

/**
 * Delete user from tenant
 */
export async function deleteUserFromTenant(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const adminId = await requireAdmin();

    await db
      .delete(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ));

    logger.info("User removed from tenant", {
      adminId,
      userId,
      tenantId,
    });

    revalidatePath("/[locale]/dashboard/admin");
  } catch (error) {
    logger.error("Failed to delete user from tenant", error);
    throw new Error("Failed to remove user");
  }
}

/**
 * Update tenant information
 */
export async function updateTenant(
  tenantId: string,
  data: {
    tenantName?: string;
    contactEmail?: string;
    phone?: string;
    status?: string;
    subscriptionTier?: string;
  }
): Promise<void> {
  try {
    await requireAdmin();

    await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tenants.tenantId, tenantId));

    logger.info("Tenant updated", { tenantId, data });

    revalidatePath("/[locale]/dashboard/admin");
  } catch (error) {
    logger.error("Failed to update tenant", error);
    throw new Error("Failed to update tenant");
  }
}

/**
 * Create new tenant
 */
export async function createTenant(data: {
  tenantSlug: string;
  tenantName: string;
  contactEmail: string;
  phone?: string;
  subscriptionTier?: string;
}): Promise<string> {
  try {
    await requireAdmin();

    const [tenant] = await db
      .insert(tenants)
      .values({
        tenantSlug: data.tenantSlug,
        tenantName: data.tenantName,
        contactEmail: data.contactEmail,
        phone: data.phone,
        subscriptionTier: data.subscriptionTier || "free",
        status: "active",
      })
      .returning({ tenantId: tenants.tenantId });

    logger.info("Tenant created", { tenantId: tenant.tenantId, data });

    revalidatePath("/[locale]/dashboard/admin");

    return tenant.tenantId;
  } catch (error) {
    logger.error("Failed to create tenant", error);
    throw new Error("Failed to create tenant");
  }
}

/**
 * Get system configurations
 */
export async function getSystemConfigs(category?: string): Promise<SystemConfig[]> {
  try {
    await requireAdmin();

    // Build where conditions
    const whereConditions = category
      ? and(
          eq(tenantConfigurations.isEncrypted, false),
          eq(tenantConfigurations.category, category)
        )
      : eq(tenantConfigurations.isEncrypted, false);

    const configs = await db
      .select({
        category: tenantConfigurations.category,
        key: tenantConfigurations.key,
        value: tenantConfigurations.value,
        description: tenantConfigurations.description,
      })
      .from(tenantConfigurations)
      .where(whereConditions);

    return configs.map(c => ({
      category: c.category,
      key: c.key,
      value: c.value,
      description: c.description,
    }));
  } catch (error) {
    logger.error("Failed to fetch system configs", error);
    throw new Error("Failed to fetch configurations");
  }
}

/**
 * Update system configuration
 */
export async function updateSystemConfig(
  tenantId: string,
  category: string,
  key: string,
  value: any
): Promise<void> {
  try {
    const adminId = await requireAdmin();

    // Check if config exists
    const [existing] = await db
      .select()
      .from(tenantConfigurations)
      .where(and(
        eq(tenantConfigurations.tenantId, tenantId),
        eq(tenantConfigurations.category, category),
        eq(tenantConfigurations.key, key)
      ))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(tenantConfigurations)
        .set({ 
          value,
          updatedAt: new Date()
        })
        .where(eq(tenantConfigurations.configId, existing.configId));
    } else {
      // Create new
      await db
        .insert(tenantConfigurations)
        .values({
          tenantId,
          category,
          key,
          value,
        });
    }

    logger.info("System config updated", {
      adminId,
      tenantId,
      category,
      key,
    });

    revalidatePath("/[locale]/dashboard/admin");
  } catch (error) {
    logger.error("Failed to update system config", error);
    throw new Error("Failed to update configuration");
  }
}

/**
 * Get recent activity logs (simplified - would need audit log table in production)
 */
export async function getRecentActivity(limit: number = 10): Promise<any[]> {
  try {
    await requireAdmin();

    // For now, return recent user joins
    const recentUsers = await db
      .select({
        userId: tenantUsers.userId,
        tenantName: tenants.tenantName,
        role: tenantUsers.role,
        joinedAt: tenantUsers.joinedAt,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenants.tenantId, tenantUsers.tenantId))
      .where(isNull(tenants.deletedAt))
      .orderBy(desc(tenantUsers.joinedAt))
      .limit(limit);

    return recentUsers.map(u => ({
      action: "User joined",
      user: u.userId,
      tenant: u.tenantName,
      role: u.role,
      timestamp: u.joinedAt?.toISOString(),
    }));
  } catch (error) {
    logger.error("Failed to fetch recent activity", error);
    return [];
  }
}
