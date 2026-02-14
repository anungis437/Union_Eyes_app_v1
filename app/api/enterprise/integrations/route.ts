/**
 * API Integrations Management
 * 
 * Manages third-party integrations (HR, Payroll, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiIntegrations, integrationSyncLogs } from '@/db/schema/integration-schema';
import { and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating integration
const createIntegrationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  integrationType: z.enum(['hr_system', 'payroll_system', 'accounting', 'calendar', 'email', 'custom']),
  provider: z.string().optional(),
  connectionType: z.enum(['api', 'sftp', 'file_upload', 'database', 'csv_import']),
  apiEndpoint: z.string().url().optional(),
  authType: z.string().optional(),
  credentials: z.record(z.any()).optional(),
  fieldMapping: z.record(z.any()),
  syncDirection: z.enum(['inbound', 'outbound', 'bidirectional']).default('inbound'),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).optional(),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/enterprise/integrations
 * List integrations
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const integrationType = searchParams.get('integrationType');
    
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(apiIntegrations.organizationId, organizationId));
    }
    
    if (integrationType) {
      conditions.push(eq(apiIntegrations.integrationType, integrationType));
    }
    
    const integrationsQuery = db
      .select()
      .from(apiIntegrations)
      .orderBy(desc(apiIntegrations.createdAt));
    
    if (conditions.length > 0) {
      integrationsQuery.where(and(...conditions));
    }
    
    const integrations = await integrationsQuery;
    
    // Redact sensitive information
    const sanitizedIntegrations = integrations.map(int => ({
      ...int,
      credentials: int.credentials ? '***REDACTED***' : null,
    }));
    
    return NextResponse.json({ integrations: sanitizedIntegrations });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/integrations
 * Create new integration
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createIntegrationSchema.parse(body);
    
    // TODO: Extract from auth
    const createdBy = 'system';
    
    // Create integration
    const [integration] = await db
      .insert(apiIntegrations)
      .values({
        ...validatedData,
        createdBy,
        connectionStatus: 'not_tested',
      })
      .returning();
    
    return NextResponse.json({
      message: 'Integration created successfully',
      integration: {
        ...integration,
        credentials: integration.credentials ? '***REDACTED***' : null,
      },
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    console.error('Error creating integration:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create integration', details: error.message },
      { status: 500 }
    );
  }
}
