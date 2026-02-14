/**
 * Policy Rules API
 * 
 * Manages policy rules and evaluations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policyRules } from '@/db/schema/policy-engine-schema';
import { and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { policyEngine } from '@/lib/services/policy-engine';
import { requireUserForOrganization } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

// Validation schema for creating policy rule
const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  ruleType: z.enum(['eligibility', 'cooling_off', 'quorum', 'retention', 'approval', 'access_control', 'custom']),
  category: z.enum(['membership', 'voting', 'finance', 'governance', 'data', 'employment', 'operational']),
  conditions: z.record(z.any()),
  actions: z.record(z.any()),
  exceptions: z.record(z.any()).optional(),
  effectiveDate: z.string().date(),
  expirationDate: z.string().date().optional(),
  sourceDocument: z.string().optional(),
  legalReference: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

/**
 * GET /api/governance/policies/rules
 * List policy rules
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const organizationId = searchParams.get('organizationId');
    const ruleType = searchParams.get('ruleType');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(policyRules.organizationId, organizationId));
    }
    
    if (ruleType) {
      conditions.push(eq(policyRules.ruleType, ruleType));
    }
    
    if (category) {
      conditions.push(eq(policyRules.category, category));
    }
    
    if (status) {
      conditions.push(eq(policyRules.status, status));
    }
    
    const rulesQuery = db
      .select()
      .from(policyRules)
      .orderBy(desc(policyRules.createdAt));
    
    if (conditions.length > 0) {
      rulesQuery.where(and(...conditions));
    }
    
    const rules = await rulesQuery;
    
    return NextResponse.json({ rules });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching policy rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policy rules', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/governance/policies/rules
 * Create new policy rule
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createRuleSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);
    const createdBy = authContext.userId;
    
    // Create rule
    const [rule] = await db
      .insert(policyRules)
      .values({
        ...validatedData,
        createdBy,
        status: 'draft', // Rules start as draft until approved
      })
      .returning();
    
    return NextResponse.json({
      message: 'Policy rule created successfully',
      rule,
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    logger.error('Error creating policy rule:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create policy rule', details: error.message },
      { status: 500 }
    );
  }
}
