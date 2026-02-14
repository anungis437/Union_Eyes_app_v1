/**
 * Individual Case Study API Endpoint
 * 
 * GET /api/case-studies/[slug] - Fetch case study by slug
 * PATCH /api/case-studies/[slug] - Update case study
 * DELETE /api/case-studies/[slug] - Delete case study
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { caseStudies } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const [caseStudy] = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.slug, params.slug))
      .limit(1);

    if (!caseStudy) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ caseStudy });
  } catch (error) {
    logger.error('Failed to fetch case study:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case study' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();

    // If changing to published status, set publishedAt timestamp
    if (body.status === 'published' && !body.publishedAt) {
      body.publishedAt = new Date();
    }

    const [updated] = await db
      .update(caseStudies)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(caseStudies.slug, params.slug))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ caseStudy: updated });
  } catch (error) {
    logger.error('Failed to update case study:', error);
    return NextResponse.json(
      { error: 'Failed to update case study' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const [deleted] = await db
      .delete(caseStudies)
      .where(eq(caseStudies.slug, params.slug))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete case study:', error);
    return NextResponse.json(
      { error: 'Failed to delete case study' },
      { status: 500 }
    );
  }
}
