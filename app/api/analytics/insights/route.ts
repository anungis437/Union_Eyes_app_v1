/**
 * Insights API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for AI-generated insights and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { insightRecommendations } from '@/db/migrations/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const conditions = [];
    
    if (status) {
      conditions.push(eq(insightRecommendations.status, status));
    }
    
    if (priority) {
      conditions.push(eq(insightRecommendations.priority, priority));
    }
    
    if (category) {
      conditions.push(eq(insightRecommendations.category, category));
    }
    
    const insights = await db.query.insightRecommendations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(insightRecommendations.createdAt)],
      limit
    });
    
    return NextResponse.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { insightId, status, notes, dismissalReason } = body;
    
    if (!insightId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: insightId, status' },
        { status: 400 }
      );
    }
    
    if (!['new', 'acknowledged', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: new, acknowledged, in_progress, completed, dismissed' },
        { status: 400 }
      );
    }
    
    // Update insight status
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'acknowledged') {
      updateData.acknowledgedBy = userId;
      updateData.acknowledgedAt = new Date();
    }
    
    if (status === 'dismissed') {
      updateData.dismissedBy = userId;
      updateData.dismissedAt = new Date();
      if (dismissalReason) updateData.dismissalReason = dismissalReason;
    }
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    if (notes) {
      updateData.notes = notes;
    }
    
    const [updated] = await db
      .update(insightRecommendations)
      .set(updateData)
      .where(eq(insightRecommendations.id, insightId))
      .returning();
    
    return NextResponse.json({
      success: true,
      insight: updated
    });
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // This endpoint would be used by the AI system to create new insights
    // For now, it's a placeholder for future implementation
    
    const body = await request.json();
    const {
      organizationId,
      insightType,
      category,
      priority,
      title,
      description,
      dataSource,
      metrics,
      trend,
      impact,
      recommendations,
      actionRequired,
      actionDeadline,
      estimatedBenefit,
      confidenceScore,
      relatedEntities
    } = body;
    
    // Validate required fields
    if (!organizationId || !insightType || !category || !priority || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const [insight] = await db.insert(insightRecommendations).values({
      organizationId,
      insightType,
      category,
      priority,
      title,
      description,
      dataSource,
      metrics,
      trend,
      impact,
      recommendations,
      actionRequired: actionRequired || false,
      actionDeadline: actionDeadline ? new Date(actionDeadline) : undefined,
      estimatedBenefit,
      confidenceScore: confidenceScore?.toString(),
      relatedEntities
    }).returning();
    
    return NextResponse.json({
      success: true,
      insight
    });
  } catch (error) {
    console.error('Error creating insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
