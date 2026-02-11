import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Report Execution API
 * 
 * POST /api/reports/execute - Execute a report configuration and return results
 * Dynamically builds and executes SQL queries based on report config
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

interface ReportConfig {
  dataSourceId: string;
  fields: Array<{
    fieldId: string;
    fieldName: string;
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
    alias?: string;
  }>;
  filters: Array<{
    id: string;
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  groupBy: string[];
  sortBy: Array<{
    fieldId: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

export const POST = async (req: NextRequest) => {
  return withRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit report execution
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.REPORT_EXECUTION,
      `report-execute-adhoc:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

  try {

      if (!userId || !organizationId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const body = await req.json();
      const config: ReportConfig = body.config;

      if (!config || !config.dataSourceId || !config.fields || config.fields.length === 0) {
        return NextResponse.json(
          { error: 'Invalid report configuration' },
          { status: 400 }
        );
      }

      // Build SQL query dynamically
      const query = buildSQLQuery(config, organizationId);

      // Execute query
      const startTime = Date.now();
      const results = await db.execute(sql.raw(query));
      const executionTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: results,
        rowCount: results.length,
        executionTime,
        query: query, // Return for transparency (remove in production)
      });
    } catch (error: any) {
      console.error('Error executing report:', error);
      return NextResponse.json(
        { error: 'Failed to execute report', details: error.message },
        { status: 500 }
      );
    }
    })(request);
};

/**
 * Build SQL query from report configuration
 */
function buildSQLQuery(config: ReportConfig, tenantId: string): string {
  const tableName = config.dataSourceId; // 'claims', 'members', 'deadlines'
  
  // Build SELECT clause
  let selectClause = 'SELECT ';
  const selectFields = config.fields.map(field => {
    if (field.aggregation) {
      const aggFunc = field.aggregation.toUpperCase();
      if (aggFunc === 'DISTINCT') {
        return `COUNT(DISTINCT ${field.fieldId}) AS ${field.alias || field.fieldId}`;
      }
      return `${aggFunc}(${field.fieldId}) AS ${field.alias || field.fieldId}`;
    }
    return field.fieldId;
  });
  selectClause += selectFields.join(', ');

  // Build FROM clause
  let fromClause = `FROM ${tableName}`;

  // Build WHERE clause (always include tenant filter)
  let whereClause = `WHERE tenant_id = '${tenantId}'`;
  
  if (config.filters && config.filters.length > 0) {
    const filterConditions = config.filters.map((filter, index) => {
      const operator = filter.logicalOperator || 'AND';
      const prefix = index === 0 ? 'AND' : operator;
      
      let condition = '';
      switch (filter.operator) {
        case 'equals':
          condition = `${filter.fieldId} = '${filter.value}'`;
          break;
        case 'not_equals':
          condition = `${filter.fieldId} != '${filter.value}'`;
          break;
        case 'contains':
          condition = `${filter.fieldId} ILIKE '%${filter.value}%'`;
          break;
        case 'greater_than':
          condition = `${filter.fieldId} > '${filter.value}'`;
          break;
        case 'less_than':
          condition = `${filter.fieldId} < '${filter.value}'`;
          break;
        case 'between':
          condition = `${filter.fieldId} BETWEEN '${filter.value.from}' AND '${filter.value.to}'`;
          break;
        case 'in':
          const values = Array.isArray(filter.value) 
            ? filter.value.map(v => `'${v}'`).join(', ')
            : `'${filter.value}'`;
          condition = `${filter.fieldId} IN (${values})`;
          break;
        default:
          condition = `${filter.fieldId} = '${filter.value}'`;
      }
      
      return `${prefix} ${condition}`;
    });
    whereClause += ' ' + filterConditions.join(' ');
  }

  // Build GROUP BY clause
  let groupByClause = '';
  if (config.groupBy && config.groupBy.length > 0) {
    groupByClause = `GROUP BY ${config.groupBy.join(', ')}`;
  }

  // Build ORDER BY clause
  let orderByClause = '';
  if (config.sortBy && config.sortBy.length > 0) {
    const sortFields = config.sortBy.map(sort => 
      `${sort.fieldId} ${sort.direction.toUpperCase()}`
    );
    orderByClause = `ORDER BY ${sortFields.join(', ')}`;
  }

  // Build LIMIT clause
  const limitClause = `LIMIT ${config.limit || 1000}`;

  // Combine all clauses
  const query = [
    selectClause,
    fromClause,
    whereClause,
    groupByClause,
    orderByClause,
    limitClause,
  ]
    .filter(clause => clause !== '')
    .join(' \\n');

  return query;
}

