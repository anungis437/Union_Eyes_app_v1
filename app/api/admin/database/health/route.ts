/**
 * Database Health API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check admin role
        const adminCheck = await tx
          .select({ role: tenantUsers.role })
          .from(tenantUsers)
          .where(eq(tenantUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        // Get database size
        const [dbSize] = await tx.execute(sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as size_bytes
      `);

        // Get connection stats
        const [connectionStats] = await tx.execute(sql`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(*) FILTER (WHERE state = 'active') as active_connections,
          COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

        // Get table sizes
        const tableSizes = await tx.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

        return NextResponse.json({
          success: true,
          data: {
            database: dbSize,
            connections: connectionStats,
            largestTables: tableSizes,
          },
        });
      });
    } catch (error) {
      logger.error("Failed to fetch database health", error);
      return NextResponse.json(
        { error: "Failed to fetch database health" },
        { status: 500 }
      );
    }
    })(request);
};
