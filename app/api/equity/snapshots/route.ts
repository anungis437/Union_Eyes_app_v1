import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Equity Snapshots
 * Time-series equity demographics for tracking progress
 * Phase 2: Equity & Demographics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { equitySnapshots } from '@/db/migrations/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const limit = parseInt(searchParams.get('limit') || '12'); // Default 12 months

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Bad Request - organizationId is required' },
          { status: 400 }
        );
      }

      const snapshots = await db
        .select()
        .from(equitySnapshots)
        .where(eq(equitySnapshots.organizationId, organizationId))
        .orderBy(desc(equitySnapshots.snapshotDate))
        .limit(limit);

      return NextResponse.json({
        success: true,
        data: snapshots,
        count: snapshots.length,
      });

    } catch (error) {
      logger.error('Failed to fetch equity snapshots', error as Error, {
        userId: userId,
        organizationId: request.nextUrl.searchParams.get('organizationId'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const { organizationId, snapshotDate } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      if (!organizationId) {
        return NextResponse.json(
          { error: 'Bad Request - organizationId is required' },
          { status: 400 }
        );
      }

      const date = snapshotDate || new Date().toISOString().split('T')[0];

      // Call database function to generate snapshot
      const result = await db.execute(
        sql`SELECT generate_equity_snapshot(${organizationId}::uuid, ${date}::date) as snapshot_id`
      );

      const snapshotId = (result[0] as any).snapshot_id;

      // Fetch the generated snapshot
      const snapshot = await db
        .select()
        .from(equitySnapshots)
        .where(eq(equitySnapshots.id, snapshotId))
        .limit(1);

      return NextResponse.json({
        success: true,
        data: snapshot[0],
        message: 'Equity snapshot generated successfully',
      });

    } catch (error) {
      logger.error('Failed to generate equity snapshot', error as Error, {
        userId: userId,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};
