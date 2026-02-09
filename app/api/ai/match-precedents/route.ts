import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * AI Precedent Matching API Route
 * 
 * POST /api/ai/match-precedents
 * Match claims/grievances to relevant arbitration precedents
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  matchClaimToPrecedents,
  analyzeClaimWithPrecedents,
  generateLegalMemorandum,
} from '@/lib/services/ai/precedent-matching-service';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

    // CRITICAL: Rate limit AI calls (expensive OpenAI API)
    const rateLimitResult = await checkRateLimit(
      `ai-completion:${context.userId}`,
      RATE_LIMITS.AI_COMPLETION
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for AI operations. Please try again later.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    try {
      const body = await request.json();
      const {
        action = 'match', // 'match', 'analyze', 'memorandum'
        claim,
        options = {},
      } = body;

      if (!claim || !claim.facts || !claim.issueType) {
        return NextResponse.json(
          { error: 'Claim object with facts and issueType is required' },
          { status: 400 }
        );
      }

      switch (action) {
        case 'match':
          // Simple precedent matching without full analysis
          const matches = await matchClaimToPrecedents(claim, options);
          return NextResponse.json({
            action: 'match',
            claim: {
              issueType: claim.issueType,
              jurisdiction: claim.jurisdiction,
            },
            matches,
            count: matches.length,
          });

        case 'analyze':
          // Full analysis with outcome prediction and strength assessment
          const analysis = await analyzeClaimWithPrecedents(claim, options);
          return NextResponse.json({
            action: 'analyze',
            claim: {
              issueType: claim.issueType,
              jurisdiction: claim.jurisdiction,
            },
            analysis: {
              predictedOutcome: analysis.predictedOutcome,
              strengthAnalysis: analysis.strengthAnalysis,
              suggestedArguments: analysis.suggestedArguments,
              topMatches: analysis.matches.slice(0, 5),
              totalMatchesFound: analysis.matches.length,
            },
          });

        case 'memorandum':
          // Generate full legal memorandum
          const fullAnalysis = await analyzeClaimWithPrecedents(claim, options);
          const memorandum = await generateLegalMemorandum(claim, fullAnalysis);

          return NextResponse.json({
            action: 'memorandum',
            claim: {
              issueType: claim.issueType,
              jurisdiction: claim.jurisdiction,
            },
            memorandum,
            analysis: {
              predictedOutcome: fullAnalysis.predictedOutcome,
              matchCount: fullAnalysis.matches.length,
            },
          });

        default:
          return NextResponse.json(
            { error: 'Invalid action. Use: match, analyze, or memorandum' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Precedent matching error:', error);
      return NextResponse.json(
        {
          error: 'Precedent matching failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};

/**
 * Example request bodies:
 * 
 * MATCH:
 * {
 *   "action": "match",
 *   "claim": {
 *     "facts": "Employee with 15 years seniority was terminated for alleged misconduct. No prior warnings or progressive discipline applied.",
 *     "issueType": "wrongful_dismissal",
 *     "jurisdiction": "british_columbia"
 *   },
 *   "options": {
 *     "limit": 10,
 *     "minRelevance": 0.7
 *   }
 * }
 * 
 * ANALYZE:
 * {
 *   "action": "analyze",
 *   "claim": {
 *     "facts": "Employee with 15 years seniority was terminated for alleged misconduct. No prior warnings or progressive discipline applied.",
 *     "issueType": "wrongful_dismissal",
 *     "jurisdiction": "british_columbia",
 *     "unionArguments": "Employer failed to follow progressive discipline policy.",
 *     "employerArguments": "Serious misconduct warranted immediate termination."
 *   }
 * }
 * 
 * MEMORANDUM:
 * {
 *   "action": "memorandum",
 *   "claim": {
 *     "facts": "...detailed facts...",
 *     "issueType": "wrongful_dismissal",
 *     "jurisdiction": "british_columbia"
 *   }
 * }
 */
