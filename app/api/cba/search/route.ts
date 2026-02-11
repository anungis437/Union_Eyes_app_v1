/**
 * CBA Search API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { collectiveAgreements, cbaClause } from "@/db/schema";
import { eq, desc, and, or, like, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = withEnhancedRoleAuth(20, async (request: NextRequest, context) => {
  const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const { query, filters = {}, limit = 20, offset = 0 } = body;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Build query conditions
        const conditions = [];
        
        // Text search across title, employer, union
        if (query) {
          conditions.push(
            or(
              like(collectiveAgreements.title, `%${query}%`),
              like(collectiveAgreements.employerName, `%${query}%`),
              like(collectiveAgreements.unionName, `%${query}%`),
              like(collectiveAgreements.cbaNumber, `%${query}%`)
            )
          );
        }

      // Filter by jurisdiction
      if (filters.jurisdiction && filters.jurisdiction.length > 0) {
        conditions.push(
          or(...filters.jurisdiction.map((j: string) => 
            eq(collectiveAgreements.jurisdiction, j as any)
          ))
        );
      }

      // Filter by employer
      if (filters.employer) {
        conditions.push(like(collectiveAgreements.employerName, `%${filters.employer}%`));
      }

      // Filter by union
      if (filters.union) {
        conditions.push(like(collectiveAgreements.unionName, `%${filters.union}%`));
      }

      // Filter by status
      if (filters.status && filters.status.length > 0) {
        conditions.push(
          or(...filters.status.map((s: string) => 
            eq(collectiveAgreements.status, s as any)
          ))
        );
      }

      // Filter by date range
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          conditions.push(gte(collectiveAgreements.effectiveDate, filters.dateRange.start));
        }
        if (filters.dateRange.end) {
          conditions.push(lte(collectiveAgreements.expiryDate, filters.dateRange.end));
        }
      }

      // Execute query
      const results = await tx
        .select({
          id: collectiveAgreements.id,
          cbaNumber: collectiveAgreements.cbaNumber,
          title: collectiveAgreements.title,
          jurisdiction: collectiveAgreements.jurisdiction,
          employerName: collectiveAgreements.employerName,
          employerId: collectiveAgreements.employerId,
          unionName: collectiveAgreements.unionName,
          unionLocal: collectiveAgreements.unionLocal,
          effectiveDate: collectiveAgreements.effectiveDate,
          expiryDate: collectiveAgreements.expiryDate,
          status: collectiveAgreements.status,
          industrySector: collectiveAgreements.industrySector,
          language: collectiveAgreements.language,
          documentUrl: collectiveAgreements.documentUrl,
          createdAt: collectiveAgreements.createdAt,
          updatedAt: collectiveAgreements.updatedAt,
        })
        .from(collectiveAgreements)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(collectiveAgreements.effectiveDate))
        .limit(limit)
        .offset(offset);

      // Count total for pagination
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(collectiveAgreements)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return NextResponse.json({
        results,
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + limit < countResult.count,
      });
      }, user.organizationId);
  } catch (error) {
return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const GET = withEnhancedRoleAuth(10, async (request: NextRequest, context) => {
  const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const recent = searchParams.get("recent") === "true";
      const limit = parseInt(searchParams.get("limit") || "10");

      let results;

      if (recent) {
        // Get most recently added CBAs
        results = await db
          .select({
            id: collectiveAgreements.id,
            cbaNumber: collectiveAgreements.cbaNumber,
            title: collectiveAgreements.title,
            jurisdiction: collectiveAgreements.jurisdiction,
            employerName: collectiveAgreements.employerName,
            unionName: collectiveAgreements.unionName,
            effectiveDate: collectiveAgreements.effectiveDate,
            expiryDate: collectiveAgreements.expiryDate,
            status: collectiveAgreements.status,
            createdAt: collectiveAgreements.createdAt,
          })
          .from(collectiveAgreements)
          .orderBy(desc(collectiveAgreements.createdAt))
          .limit(limit);
      } else {
        // Get active CBAs
        results = await db
          .select({
            id: collectiveAgreements.id,
            cbaNumber: collectiveAgreements.cbaNumber,
            title: collectiveAgreements.title,
            jurisdiction: collectiveAgreements.jurisdiction,
            employerName: collectiveAgreements.employerName,
            unionName: collectiveAgreements.unionName,
            effectiveDate: collectiveAgreements.effectiveDate,
            expiryDate: collectiveAgreements.expiryDate,
            status: collectiveAgreements.status,
          })
          .from(collectiveAgreements)
          .where(eq(collectiveAgreements.status, "active"))
          .orderBy(desc(collectiveAgreements.effectiveDate))
          .limit(limit);
      }

    return NextResponse.json({ results });
  } catch (error) {
return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

