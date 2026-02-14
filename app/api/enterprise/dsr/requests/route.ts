/**
 * DSR (Data Subject Rights) API
 * 
 * Manages GDPR/CCPA/Law 25 data subject rights requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dsrRequests, dsrActivityLog } from '@/db/schema/data-governance-schema';
import { and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validation schema for DSR request
const createDSRRequestSchema = z.object({
  requestType: z.enum(['access', 'rectification', 'erasure', 'portability', 'objection', 'restriction']),
  subjectType: z.enum(['member', 'user', 'external']),
  subjectEmail: z.string().email(),
  subjectName: z.string().optional(),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  legalBasis: z.enum(['gdpr', 'ccpa', 'quebec_law_25', 'other']).default('gdpr'),
  jurisdiction: z.enum(['EU', 'California', 'Quebec', 'Canada']).default('EU'),
});

/**
 * GET /api/enterprise/dsr/requests
 * List DSR requests
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(dsrRequests.organizationId, organizationId));
    }
    
    if (status) {
      conditions.push(eq(dsrRequests.status, status));
    }
    
    const requestsQuery = db
      .select()
      .from(dsrRequests)
      .orderBy(desc(dsrRequests.submittedAt));
    
    if (conditions.length > 0) {
      requestsQuery.where(and(...conditions));
    }
    
    const requests = await requestsQuery;
    
    return NextResponse.json({ requests });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching DSR requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DSR requests', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/dsr/requests
 * Submit new DSR request
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createDSRRequestSchema.parse(body);
    
    // Calculate due date (30 days from submission, per GDPR)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    // Create DSR request
    const [request] = await db
      .insert(dsrRequests)
      .values({
        ...validatedData,
        dueDate: dueDate.toISOString().split('T')[0] as any,
        status: 'submitted',
      })
      .returning();
    
    // Log activity
    await db.insert(dsrActivityLog).values({
      requestId: request.id,
      activityType: 'status_change',
      description: 'DSR request submitted',
      performedBy: 'system',
      newValue: 'submitted',
    });
    
    return NextResponse.json({
      message: 'DSR request submitted successfully',
      request,
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    logger.error('Error creating DSR request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create DSR request', details: error.message },
      { status: 500 }
    );
  }
}
