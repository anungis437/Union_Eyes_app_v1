/**
 * Case Outcomes API
 * 
 * Tracks case resolutions and outcomes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, decimal, boolean } from 'drizzle-orm/pg-core';

// Case outcomes schema
export const caseOutcomes = pgTable('case_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Case Reference
  caseId: uuid('case_id').notNull(),
  caseType: text('case_type').notNull(),
  organizationId: uuid('organization_id').notNull(),
  
  // Outcome Type
  outcomeType: text('outcome_type').notNull(), // withdrawn, settled, upheld, denied, arbitration_won, arbitration_lost, mediated
  outcomeCategory: text('outcome_category').notNull(), // favorable, unfavorable, partial, neutral
  
  // Resolution Details
  resolutionDate: timestamp('resolution_date').notNull(),
  resolutionLevel: text('resolution_level').notNull(), // informal, step_1, step_2, step_3, arbitration, mediation
  
  // Settlement Terms (if applicable)
  settlementTerms: text('settlement_terms'),
  monetaryValue: decimal('monetary_value', { precision: 12, scale: 2 }),
  currency: text('currency').default('CAD'),
  
  // Back Pay / Remedies
  backPay: decimal('back_pay', { precision: 12, scale: 2 }),
  benefits: text('benefits'), // Description of benefit restoration
  reinstatement: boolean('reinstatement').default(false),
  otherRemedy: text('other_remedy'),
  
  // Procedural Outcomes
  issueSustained: boolean('issue_sustained'), // Was the grievance/claim sustained?
  partialSustained: boolean('partial_sustained').default(false),
  
  // Decision Details
  decisionMaker: text('decision_maker'), // Arbitrator name, manager name, etc.
  decisionSummary: text('decision_summary'),
  decisionDocument: text('decision_document'), // URL to decision PDF
  
  // Precedent Value
  isPrecedent: boolean('is_precedent').default(false),
  precedentNotes: text('precedent_notes'),
  relatedCaseIds: jsonb('related_case_ids').$type<string[]>(),
  
  // Appeal Information
  isAppealable: boolean('is_appealable').default(false),
  appealed: boolean('appealed').default(false),
  appealDeadline: timestamp('appeal_deadline'),
  appealCaseId: uuid('appeal_case_id'),
  
  // Enforcement
  requiresEnforcement: boolean('requires_enforcement').default(false),
  enforcementStatus: text('enforcement_status'), // pending, in_progress, completed, breached
  enforcementDeadline: timestamp('enforcement_deadline'),
  enforcementNotes: text('enforcement_notes'),
  
  // Analytics Tags
  tags: jsonb('tags').$type<string[]>(), // tags for reporting: "wrongful_termination", "hours_of_work", etc.
  
  // Lessons Learned
  lessonsLearned: text('lessons_learned'),
  improvementActions: text('improvement_actions'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'),
});

// Validation schema for creating outcome
const createOutcomeSchema = z.object({
  caseId: z.string().uuid(),
  caseType: z.string(),
  organizationId: z.string().uuid(),
  outcomeType: z.enum(['withdrawn', 'settled', 'upheld', 'denied', 'arbitration_won', 'arbitration_lost', 'mediated']),
  outcomeCategory: z.enum(['favorable', 'unfavorable', 'partial', 'neutral']),
  resolutionDate: z.string().datetime(),
  resolutionLevel: z.enum(['informal', 'step_1', 'step_2', 'step_3', 'arbitration', 'mediation']),
  settlementTerms: z.string().optional(),
  monetaryValue: z.number().optional(),
  backPay: z.number().optional(),
  benefits: z.string().optional(),
  reinstatement: z.boolean().optional(),
  otherRemedy: z.string().optional(),
  issueSustained: z.boolean(),
  partialSustained: z.boolean().optional(),
  decisionMaker: z.string().optional(),
  decisionSummary: z.string().optional(),
  isPrecedent: z.boolean().optional(),
  precedentNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/cases/outcomes
 * List case outcomes with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const outcomeType = searchParams.get('outcomeType');
    const outcomeCategory = searchParams.get('outcomeCategory');
    const resolutionLevel = searchParams.get('resolutionLevel');
    const isPrecedent = searchParams.get('isPrecedent');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query conditions
    const conditions = [];
    if (caseId) {
      conditions.push(eq(caseOutcomes.caseId, caseId));
    }
    if (outcomeType) {
      conditions.push(eq(caseOutcomes.outcomeType, outcomeType));
    }
    if (outcomeCategory) {
      conditions.push(eq(caseOutcomes.outcomeCategory, outcomeCategory));
    }
    if (resolutionLevel) {
      conditions.push(eq(caseOutcomes.resolutionLevel, resolutionLevel));
    }
    if (isPrecedent !== null) {
      conditions.push(eq(caseOutcomes.isPrecedent, isPrecedent === 'true'));
    }

    // Fetch outcomes
    const outcomes = await db
      .select()
      .from(caseOutcomes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(caseOutcomes.resolutionDate));

    return NextResponse.json({ outcomes });
  } catch (error: any) {
    console.error('Error fetching outcomes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outcomes', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/outcomes
 * Create case outcome
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createOutcomeSchema.parse(body);

    // Create outcome
    const [newOutcome] = await db
      .insert(caseOutcomes)
      .values({
        ...validatedData,
        monetaryValue: validatedData.monetaryValue?.toString(),
        backPay: validatedData.backPay?.toString(),
        currency: 'CAD',
        createdBy: 'system', // TODO: Get from auth
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Outcome created successfully',
        outcome: newOutcome,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating outcome:', error);
    return NextResponse.json(
      { error: 'Failed to create outcome', details: error.message },
      { status: 500 }
    );
  }
}
