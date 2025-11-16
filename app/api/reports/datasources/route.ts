/**
 * Data Sources API
 * 
 * GET /api/reports/datasources - Get available data sources and their fields
 * Returns metadata for building reports dynamically
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Define available data sources with field metadata
    const dataSources = [
      {
        id: 'claims',
        name: 'Claims',
        description: 'Union member claims and grievances',
        icon: 'FileText',
        fields: [
          { fieldId: 'id', fieldName: 'Claim ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'title', fieldName: 'Title', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'type', fieldName: 'Type', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'status', fieldName: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'priority', fieldName: 'Priority', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'claim_amount', fieldName: 'Claim Amount', type: 'number', aggregatable: true, filterable: true, sortable: true },
          { fieldId: 'created_at', fieldName: 'Created Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'resolved_at', fieldName: 'Resolved Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'assigned_steward_id', fieldName: 'Assigned Steward', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'resolution', fieldName: 'Resolution', type: 'string', aggregatable: false, filterable: true, sortable: false },
        ],
      },
      {
        id: 'members',
        name: 'Members',
        description: 'Union membership records',
        icon: 'Users',
        fields: [
          { fieldId: 'id', fieldName: 'Member ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'name', fieldName: 'Full Name', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'email', fieldName: 'Email', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'status', fieldName: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'union_number', fieldName: 'Union Number', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'created_at', fieldName: 'Join Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'phone', fieldName: 'Phone', type: 'string', aggregatable: false, filterable: true, sortable: false },
          { fieldId: 'department', fieldName: 'Department', type: 'string', aggregatable: false, filterable: true, sortable: true },
        ],
      },
      {
        id: 'deadlines',
        name: 'Deadlines',
        description: 'Critical deadlines and tasks',
        icon: 'Clock',
        fields: [
          { fieldId: 'id', fieldName: 'Deadline ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'title', fieldName: 'Title', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'type', fieldName: 'Type', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'status', fieldName: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'due_date', fieldName: 'Due Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'completed_at', fieldName: 'Completed Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'claim_id', fieldName: 'Related Claim', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'priority', fieldName: 'Priority', type: 'string', aggregatable: false, filterable: true, sortable: true },
        ],
      },
      {
        id: 'grievances',
        name: 'Grievances',
        description: 'Formal grievance records',
        icon: 'AlertTriangle',
        fields: [
          { fieldId: 'id', fieldName: 'Grievance ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'title', fieldName: 'Title', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'type', fieldName: 'Type', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'severity', fieldName: 'Severity', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'status', fieldName: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'filed_date', fieldName: 'Filed Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'resolution_date', fieldName: 'Resolution Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
          { fieldId: 'member_id', fieldName: 'Filed By Member', type: 'string', aggregatable: false, filterable: true, sortable: true },
        ],
      },
    ];

    return NextResponse.json({
      dataSources,
    });
  } catch (error: any) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources', details: error.message },
      { status: 500 }
    );
  }
}
