/**
 * Data Sources API
 * 
 * GET /api/reports/datasources - Get available data sources and their fields
 * Returns metadata for building reports dynamically
 * 
 * Created: November 16, 2025
 * Updated: December 5, 2025 (Phase 2 enhancements)
 * Part of: Phase 2 - Enhanced Analytics & Reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { getAllDataSources } from '@/lib/report-executor';

async function getHandler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    // Get data sources from report executor registry
    const dataSources = getAllDataSources();

    // Transform to API format
    const formattedDataSources = dataSources.map(ds => ({
      id: ds.id,
      name: ds.name,
      table: ds.table,
      description: `Data source for ${ds.name.toLowerCase()}`,
      icon: getIconForDataSource(ds.id),
      joinable: ds.joinable || [],
      fields: ds.fields.map(field => ({
        fieldId: field.id,
        fieldName: field.name,
        column: field.column,
        type: field.type,
        aggregatable: field.aggregatable,
        filterable: field.filterable,
        sortable: field.sortable,
        nullable: field.nullable,
      })),
    }));

    return NextResponse.json({
      dataSources: formattedDataSources,
      count: formattedDataSources.length,
    });
  } catch (error: any) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get icon name for data source
 */
function getIconForDataSource(dataSourceId: string): string {
  const iconMap: Record<string, string> = {
    claims: 'FileText',
    organization_members: 'Users',
    claim_deadlines: 'Clock',
    dues_assignments: 'DollarSign',
  };

  return iconMap[dataSourceId] || 'Table';
}

export const GET = withTenantAuth(getHandler);
