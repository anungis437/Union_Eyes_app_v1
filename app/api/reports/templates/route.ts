import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Report Templates API
 * 
 * GET /api/reports/templates - Get saved report templates
 * Returns report configurations marked as templates for cloning
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (req: NextRequest) => {
  return withRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

  try {

      if (!userId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      // Get all templates (public ones + this organization's private ones)
      const templates = await db
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.isTemplate, true),
            // Either public or belongs to this organization
            // SQL: (is_public = true OR organization_id = organizationId)
          )
        )
        .orderBy(reports.name);

      // Filter in memory since complex OR conditions in where clause
      const filteredTemplates = templates.filter(
        t => t.isPublic || t.organizationId === organizationId
      );

      return NextResponse.json({
        templates: filteredTemplates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          config: template.config,
          isPublic: template.isPublic,
          runCount: template.runCount,
          lastRunAt: template.lastRunAt,
          createdAt: template.createdAt,
        })),
      });
    } catch (error: any) {
return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }
    })(request);
};

