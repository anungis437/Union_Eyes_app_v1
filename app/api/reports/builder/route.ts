import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Report Builder API
 * 
 * POST /api/reports/builder - Save report configuration
 * Stores custom report definitions for later execution
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (req: NextRequest) => {
  return withEnhancedRoleAuth(50, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { user.id, orgId } = await auth();

      if (!user.id || !orgId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const body = await req.json();

      // Validate required fields
      if (!body.name || !body.config) {
        return NextResponse.json(
          { error: 'Report name and configuration are required' },
          { status: 400 }
        );
      }

      // Validate config structure
      const config = body.config;
      if (!config.dataSourceId || !config.fields || config.fields.length === 0) {
        return NextResponse.json(
          { error: 'Invalid report configuration: missing data source or fields' },
          { status: 400 }
        );
      }

      // Create report
      const [report] = await db
        .insert(reports)
        .values({
          tenantId: orgId,
          name: body.name,
          description: body.description || null,
          reportType: 'custom',
          category: body.category || 'custom',
          config: config,
          isPublic: body.isPublic || false,
          isTemplate: body.isTemplate || false,
          templateId: body.templateId || null,
          createdBy: user.id,
        })
        .returning();

      return NextResponse.json({
        success: true,
        report: {
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          category: report.category,
          createdAt: report.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Error creating report:', error);
      return NextResponse.json(
        { error: 'Failed to create report', details: error.message },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const GET = async (req: NextRequest) => {
  return withEnhancedRoleAuth(50, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { user.id, orgId } = await auth();

      if (!user.id || !orgId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get all custom reports for this tenant
      const customReports = await db
        .select()
        .from(reports)
        .where(eq(reports.tenantId, orgId))
        .orderBy(reports.createdAt);

      return NextResponse.json({
        reports: customReports.map(report => ({
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          category: report.category,
          isPublic: report.isPublic,
          isTemplate: report.isTemplate,
          createdAt: report.createdAt,
          lastRunAt: report.lastRunAt,
          runCount: report.runCount,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports', details: error.message },
        { status: 500 }
      );
    }
  })
  })(request);
};
