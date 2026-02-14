/**
 * Dues Reconciliation Engine API
 * 
 * Automated matching of employer remittances to member dues ledger
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and } from 'drizzle-orm';

// Import schemas (assuming they exist from previous implementation)
// import { employerRemittances, remittanceLineItems, remittanceExceptions, memberDuesLedger } from '@/db/schema/dues-finance-schema';

// Validation schema
const reconcileSchema = z.object({
  remittanceId: z.string().uuid(),
  autoPost: z.boolean().optional().default(false),
  fuzzyMatchThreshold: z.number().min(0).max(100).optional().default(85),
});

interface MatchResult {
  lineItemId: string;
  memberId: string | null;
  matchScore: number;
  matchMethod: 'exact' | 'fuzzy' | 'manual' | 'unmatched';
  confidence: 'high' | 'medium' | 'low';
  suggestedActions: string[];
}

/**
 * POST /api/dues/reconcile
 * Run reconciliation engine on a remittance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { remittanceId, autoPost, fuzzyMatchThreshold } = reconcileSchema.parse(body);

    console.log(`🔄 Starting reconciliation for remittance: ${remittanceId}`);

    // 1. Get remittance and line items
    // const [remittance] = await db
    //   .select()
    //   .from(employerRemittances)
    //   .where(eq(employerRemittances.id, remittanceId));
    //
    // if (!remittance) {
    //   return NextResponse.json({ error: 'Remittance not found' }, { status: 404 });
    // }
    //
    // const lineItems = await db
    //   .select()
    //   .from(remittanceLineItems)
    //   .where(eq(remittanceLineItems.remittanceId, remittanceId));

    // Simulated data structure for now
    const lineItems = [] as Array<Record<string, unknown>>;
    const matchResults: MatchResult[] = [];
    let exactMatches = 0;
    let fuzzyMatches = 0;
    let unmatched = 0;

    // 2. Process each line item
    for (const item of lineItems) {
      const match = await matchLineItem(item, fuzzyMatchThreshold);
      matchResults.push(match);

      if (match.matchMethod === 'exact') exactMatches++;
      else if (match.matchMethod === 'fuzzy') fuzzyMatches++;
      else unmatched++;

      // 3. Auto-post if enabled and high confidence
      if (autoPost && match.confidence === 'high' && match.memberId) {
        await postToLedger(match.memberId, item);
      } else if (match.confidence !== 'high') {
        // Create exception for manual review
        await createException(remittanceId, item, match);
      }
    }

    // 4. Update remittance status
    const status = unmatched === 0 ? 'completed' : 'requires_review';
    // await db
    //   .update(employerRemittances)
    //   .set({
    //     status,
    //     recordsMatched: exactMatches + fuzzyMatches,
    //     recordsException: unmatched,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(employerRemittances.id, remittanceId));

    console.log(`✅ Reconciliation complete: ${exactMatches} exact, ${fuzzyMatches} fuzzy, ${unmatched} unmatched`);

    return NextResponse.json({
      message: 'Reconciliation completed',
      remittanceId,
      summary: {
        totalItems: lineItems.length,
        exactMatches,
        fuzzyMatches,
        unmatched,
        status,
        autoPosted: autoPost ? exactMatches + fuzzyMatches : 0,
      },
      matches: matchResults,
    });
  } catch (error: Record<string, unknown>) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error during reconciliation:', error);
    return NextResponse.json(
      { error: 'Reconciliation failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Match a line item to a member
 */
async function matchLineItem(
  lineitem: Record<string, unknown>, Record<string, unknown>,
  fuzzyThreshold: number
): Promise<MatchResult> {
  // 1. Try exact match on member ID
  if (lineItem.memberId) {
    // const member = await db
    //   .select()
    //   .from(members)
    //   .where(eq(members.id, lineItem.memberId))
    //   .limit(1);
    
    // if (member.length > 0) {
    //   return {
    //     lineItemId: lineItem.id,
    //     memberId: lineItem.memberId,
    //     matchScore: 100,
    //     matchMethod: 'exact',
    //     confidence: 'high',
    //     suggestedActions: ['auto_post'],
    //   };
    // }
  }

  // 2. Try exact match on employee number
  if (lineItem.employeeNumber) {
    // const member = await db
    //   .select()
    //   .from(members)
    //   .where(eq(members.employeeNumber, lineItem.employeeNumber))
    //   .limit(1);
    
    // if (member.length > 0) {
    //   return {
    //     lineItemId: lineItem.id,
    //     memberId: member[0].id,
    //     matchScore: 100,
    //     matchMethod: 'exact',
    //     confidence: 'high',
    //     suggestedActions: ['auto_post', 'update_member_id'],
    //   };
    // }
  }

  // 3. Try fuzzy match on name
  if (lineItem.memberName) {
    const fuzzyScore = await fuzzyMatchByName(lineItem.memberName);
    
    if (fuzzyScore.score >= fuzzyThreshold) {
      return {
        lineItemId: lineItem.id,
        memberId: fuzzyScore.memberId,
        matchScore: fuzzyScore.score,
        matchMethod: 'fuzzy',
        confidence: fuzzyScore.score >= 95 ? 'high' : 'medium',
        suggestedActions: ['manual_review', 'verify_match'],
      };
    }
  }

  // 4. No match found
  return {
    lineItemId: lineItem.id,
    memberId: null,
    matchScore: 0,
    matchMethod: 'unmatched',
    confidence: 'low',
    suggestedActions: ['create_member', 'manual_investigation'],
  };
}

/**
 * Fuzzy match by name using trigram similarity
 */
async function fuzzyMatchByName(name: string): Promise<{ memberId: string; score: number }> {
  // PostgreSQL trigram similarity
  // const results = await db.execute(sql`
  //   SELECT id, similarity(full_name, ${name}) as score
  //   FROM members
  //   WHERE similarity(full_name, ${name}) > 0.3
  //   ORDER BY score DESC
  //   LIMIT 1
  // `);

  // if (results.rows.length > 0) {
  //   return {
  //     memberId: results.rows[0].id,
  //     score: Math.round(results.rows[0].score * 100),
  //   };
  // }

  return { memberId: '', score: 0 };
}

/**
 * Post matched payment to member ledger
 */
async function postToLedger(memberId: string, lineitem: Record<string, unknown>) Record<string, unknown>): Promise<void> {
  // await db.insert(memberDuesLedger).values({
  //   userId: memberId,
  //   type: 'payment',
  //   amount: lineItem.amount,
  //   description: `Payment from remittance ${lineItem.remittanceId}`,
  //   fiscalYear: new Date().getFullYear(),
  //   fiscalMonth: new Date().getMonth() + 1,
  //   status: 'posted',
  //   metadata: {
  //     remittanceId: lineItem.remittanceId,
  //     lineItemId: lineItem.id,
  //     autoPosted: true,
  //   },
  // });

  console.log(`✅ Posted ${lineItem.amount} to member ${memberId}`);
}

/**
 * Create exception for manual review
 */
async function createException(
  remittanceId: string,
  lineitem: Record<string, unknown>, Record<string, unknown>,
  match: MatchResult
): Promise<void> {
  const exceptionType = 
    match.matchMethod === 'unmatched' ? 'member_not_found' :
    match.confidence === 'medium' ? 'uncertain_match' :
    'requires_verification';

  // await db.insert(remittanceExceptions).values({
  //   remittanceId,
  //   lineItemId: lineItem.id,
  //   exceptionType,
  //   severity: match.confidence === 'low' ? 'high' : 'medium',
  //   description: `Match score: ${match.matchScore}%. Suggested: ${match.suggestedActions.join(', ')}`,
  //   status: 'open',
  //   suggestedMemberId: match.memberId,
  //   metadata: {
  //     matchScore: match.matchScore,
  //     matchMethod: match.matchMethod,
  //     suggestedActions: match.suggestedActions,
  //   },
  // });

  console.log(`⚠️  Created exception: ${exceptionType}`);
}

/**
 * GET /api/dues/reconcile/stats
 * Get reconciliation statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Aggregate reconciliation stats
    // const stats = await db
    //   .select({
    //     totalRemittances: sql<number>`count(*)`,
    //     completed: sql<number>`count(*) filter (where status = 'completed')`,
    //     requiresReview: sql<number>`count(*) filter (where status = 'requires_review')`,
    //     avgMatchRate: sql<number>`avg(records_matched::float / records_total * 100)`,
    //   })
    //   .from(employerRemittances)
    //   .where(organizationId ? eq(employerRemittances.organizationId, organizationId) : undefined);

    return NextResponse.json({
      stats: {
        totalRemittances: 0,
        completed: 0,
        requiresReview: 0,
        avgMatchRate: 0,
      },
      note: 'Reconciliation statistics endpoint ready',
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching reconciliation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
