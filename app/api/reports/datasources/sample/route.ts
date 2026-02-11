import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from '@/db/db';
import { getDataSource, getFieldMetadata } from '@/lib/report-executor';

async function handler(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.organizationId && !user.tenantId)) {
      return NextResponse.json(
        { error: 'Authentication and organization context required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const fieldId = searchParams.get('fieldId');

    if (!sourceId || !fieldId) {
      return NextResponse.json(
        { error: 'sourceId and fieldId are required' },
        { status: 400 }
      );
    }

    const dataSource = getDataSource(sourceId);
    const field = getFieldMetadata(sourceId, fieldId);

    if (!dataSource || !field) {
      return NextResponse.json(
        { error: 'Unknown data source or field' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId || user.tenantId;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 }
      );
    }

    const table = dataSource.table;
    const column = field.column;

    const results = await db.execute(sql`
      SELECT ${sql.raw(column)} as value
      FROM ${sql.raw(table)}
      WHERE ${sql.raw(table)}.organization_id = ${organizationId}
        AND ${sql.raw(column)} IS NOT NULL
      LIMIT 3
    `);

    const rows = results as Array<{ value: unknown }>;
    const samples = rows.map((row) => ({ value: row.value }));

    return NextResponse.json({
      samples,
      count: samples.length,
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch sample data' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(handler);
