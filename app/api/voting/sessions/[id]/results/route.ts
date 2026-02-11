import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, votes } from '@/db/schema/voting-schema';
import { eq, desc, count } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

interface RouteParams {
  params: {
    id: string;
  };
}

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const sessionId = params.id;
      const { searchParams } = new URL(request.url);
      const includeVotes = searchParams.get('includeVotes') === 'true';

      // Get session
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        return NextResponse.json(
          { error: 'Voting session not found' },
          { status: 404 }
        );
      }

      // Check if results should be visible
      const settings = session.settings as Record<string, unknown> || {};
      const showLiveResults = settings.showLiveResults ?? false;
      const canViewResults = session.status === 'closed' || showLiveResults;

      if (!canViewResults) {
        return NextResponse.json(
          { error: 'Results are not available until the session is closed' },
          { status: 403 }
        );
      }

      // Get options with vote counts
      const options = await db
        .select()
        .from(votingOptions)
        .where(eq(votingOptions.sessionId, sessionId))
        .orderBy(votingOptions.orderIndex);

      const [totalVotesCount] = await db
        .select({ count: count() })
        .from(votes)
        .where(eq(votes.sessionId, sessionId));

      const totalVotes = totalVotesCount.count || 0;

      // Get vote counts per option
      const optionsWithResults = await Promise.all(
        options.map(async (option) => {
          const [voteCountResult] = await db
            .select({ count: count() })
            .from(votes)
            .where(eq(votes.optionId, option.id));

          const voteCount = voteCountResult.count || 0;
          const percentage = totalVotes > 0 
            ? Math.round((voteCount / totalVotes) * 100) 
            : 0;

          return {
            id: option.id,
            text: option.text,
            description: option.description,
            voteCount,
            percentage,
          };
        })
      );

      // Sort by vote count descending
      optionsWithResults.sort((a, b) => b.voteCount - a.voteCount);

      // Calculate turnout
      const totalEligible = session.totalEligibleVoters || 0;
      const turnoutPercentage = totalEligible > 0
        ? Math.round((totalVotes / totalEligible) * 100)
        : 0;

      // Check if quorum is met
      const quorumThreshold = session.quorumThreshold || 50;
      const quorumMet = session.requiresQuorum
        ? turnoutPercentage >= quorumThreshold
        : true;

      // Winner (if applicable)
      const winner = optionsWithResults.length > 0 && quorumMet
        ? optionsWithResults[0]
        : null;

      const results = {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
          type: session.type,
          startTime: session.startTime,
          endTime: session.endTime,
        },
        stats: {
          totalVotes,
          totalEligibleVoters: totalEligible,
          turnoutPercentage,
          quorumMet,
          quorumThreshold,
          requiresQuorum: session.requiresQuorum || true,
        },
        options: optionsWithResults,
        winner: winner ? {
          optionId: winner.id,
          text: winner.text,
          voteCount: winner.voteCount,
          percentage: winner.percentage,
        } : null,
      };

      // Optionally include individual votes (anonymized)
      if (includeVotes && session.status === 'closed') {
        const votesList = await db
          .select({
            id: votes.id,
            optionId: votes.optionId,
            castAt: votes.castAt,
            isAnonymous: votes.isAnonymous,
            voterType: votes.voterType,
          })
          .from(votes)
          .where(eq(votes.sessionId, sessionId))
          .orderBy(desc(votes.castAt));

        return NextResponse.json({
          ...results,
          votes: votesList,
        });
      }

      return NextResponse.json(results);
    } catch (error) {
return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request, { params });
};
