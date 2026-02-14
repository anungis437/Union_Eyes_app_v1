/**
 * Case Studies API Endpoint
 * 
 * SPRINT 7: POST protected with admin authentication
 * 
 * GET /api/case-studies - List all published case studies
 * GET /api/case-studies?status=draft - Filter by status
 * POST /api/case-studies - Create case study (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { caseStudies } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const organizationType = searchParams.get('organizationType');
    const published = searchParams.get('published'); // 'true' or 'false'

    const query = db.select().from(caseStudies);

    // Execute query (filter in memory since schema doesn&apos;t match original API)
    let results = await query;

    // Apply filters
    if (published === 'true') {
      results = results.filter((cs) => cs.publishedAt !== null);
    } else if (published === 'false') {
      results = results.filter((cs) => cs.publishedAt === null);
    }

    if (category) {
      results = results.filter((cs) => cs.category === category);
    }

    if (organizationType) {
      results = results.filter((cs) => cs.organizationType === organizationType);
    }

    // Sort by published date (most recent first)
    results.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ caseStudies: results });
  } catch (error) {
    console.error('Failed to fetch case studies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case studies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // SPRINT 7: Require admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.organizationType || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = body.slug || generateSlug(body.title);

    // Check for duplicate slug
    const existing = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Case study with this slug already exists' },
        { status: 409 }
      );
    }

    // Insert case study
    const [caseStudy] = await db
      .insert(caseStudies)
      .values({
        ...body,
        slug,
        status: body.status || 'draft',
      })
      .returning();

    return NextResponse.json({ caseStudy }, { status: 201 });
  } catch (error) {
    console.error('Failed to create case study:', error);
    return NextResponse.json(
      { error: 'Failed to create case study' },
      { status: 500 }
    );
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
