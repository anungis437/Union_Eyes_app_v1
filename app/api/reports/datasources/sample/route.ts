import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from '@/db/db';
import { getDataSource, getFieldMetadata } from '@/lib/report-executor';
import { safeTableName, safeColumnName } from '@/lib/safe-sql-identifiers';

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

    // SECURITY: Validate table and column names against allowlist
    const ALLOWED_TABLES: Record<string, string[]> = {
      'claims': ['claim_number', 'status', 'claim_type', 'amount'],
      'members': ['first_name', 'last_name', 'email', 'status', 'membership_number'],
      'organization_members': ['first_name', 'last_name', 'email', 'status'],
      'deadlines': ['title', 'status', 'priority'],
      'grievances': ['grievance_number', 'status', 'grievance_type'],
    };

    const table = dataSource.table;
    const column = field.column;

    // Validate table exists in allowlist
    if (!ALLOWED_TABLES[table]) {
      return NextResponse.json(
        { error: 'Invalid data source table' },
        { status: 400 }
      );
    }

    // Validate column exists for this table
    if (!ALLOWED_TABLES[table].includes(column)) {
      return NextResponse.json(
        { error: 'Invalid field column' },
        { status: 400 }
      );
    }

    // SECURITY: Use validated identifiers with safe escaping functions
    const safeTable = safeTableName(table);
    const safeColumn = safeColumnName(column);
    
    const results = await db.execute(sql`
      SELECT ${safeColumn} as value
      FROM ${safeTable}
      WHERE ${safeTable}.organization_id = ${organizationId}
        AND ${safeColumn} IS NOT NULL
      LIMIT 3
    `);

    const rows = results as unknown as Array<{ value: unknown }>;
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
