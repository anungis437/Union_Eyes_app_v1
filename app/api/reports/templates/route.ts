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
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all templates (public ones + this tenant's private ones)
    const templates = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.isTemplate, true),
          // Either public or belongs to this tenant
          // SQL: (is_public = true OR tenant_id = orgId)
        )
      )
      .orderBy(reports.name);

    // Filter in memory since complex OR conditions in where clause
    const filteredTemplates = templates.filter(
      t => t.isPublic || t.tenantId === orgId
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
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}
