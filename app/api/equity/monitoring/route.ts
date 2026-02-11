import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
/**
 * API Route: Equity Monitoring
 * Aggregate equity statistics for officers (requires consent + anonymization)
 * Phase 3: Equity & Demographics - SECURED with PIPEDA compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting for equity analytics (sensitive demographic data)
      const rateLimitResult = await checkRateLimit(
        `${organizationId}`,
        RATE_LIMITS.EQUITY_ANALYTICS
      );
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for equity monitoring', {
          userId,
          organizationId,
          limit: rateLimitResult.limit,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/monitoring',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
          },
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded for equity analytics.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organizationId');
      
      if (!requestedOrgId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/monitoring',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Missing organizationId parameter',
          },
        });
        return NextResponse.json(
          { error: 'Bad Request - organizationId is required' },
          { status: 400 }
        );
      }

      // CRITICAL: Verify organization access (PIPEDA compliance)
      if (requestedOrgId !== organizationId) {
        logger.warn('Unauthorized equity monitoring access attempt', {
          userId,
          requestedOrgId,
          userOrgId: organizationId,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/monitoring',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'critical',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Cross-organization access denied - PIPEDA violation attempt',
            requestedOrgId,
          },
        });
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other organization equity data' },
          { status: 403 }
        );
      }

      // Query anonymized equity statistics
      // Uses v_equity_statistics_anonymized view (10+ member threshold)
      const result = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE data_collection_consent = true) as total_consented,
        COUNT(*) FILTER (WHERE gender_identity = 'woman') as women_count,
        COUNT(*) FILTER (WHERE gender_identity = 'man') as men_count,
        COUNT(*) FILTER (WHERE gender_identity IN ('non_binary', 'two_spirit', 'gender_fluid', 'agender', 'other')) as non_binary_count,
        COUNT(*) FILTER (WHERE is_indigenous = true) as indigenous_count,
        COUNT(*) FILTER (WHERE is_visible_minority = true) as visible_minority_count,
        COUNT(*) FILTER (WHERE has_disability = true) as disability_count,
        COUNT(*) FILTER (WHERE is_lgbtq2plus = true) as lgbtq2plus_count,
        COUNT(*) FILTER (WHERE is_newcomer = true) as newcomer_count,
        COUNT(*) FILTER (WHERE intersectionality_count > 1) as multiple_equity_groups,
        AVG(intersectionality_count) as avg_intersectionality_score,
        COUNT(*) FILTER (WHERE indigenous_identity = 'first_nations_status' OR indigenous_identity = 'first_nations_non_status') as first_nations_count,
        COUNT(*) FILTER (WHERE indigenous_identity = 'inuit') as inuit_count,
        COUNT(*) FILTER (WHERE indigenous_identity = 'metis') as metis_count
      FROM member_demographics
      WHERE organization_id = ${requestedOrgId}::uuid
        AND data_collection_consent = true
        AND allow_aggregate_reporting = true
    `);

      const stats = result[0] as any;

      // Anonymization threshold check
      const totalConsented = parseInt(stats.total_consented || '0');
      if (totalConsented < 10) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/monitoring',
          method: 'GET',
          eventType: 'success',
          severity: 'high',
          details: {
            dataType: 'EQUITY_DATA',
            organizationId: requestedOrgId,
            insufficientData: true,
            threshold: 10,
            current: totalConsented,
            privacyCompliant: true,
          },
        });
        return NextResponse.json({
          success: true,
          data: {
            insufficient_data: true,
            message: 'Fewer than 10 members with consent. Data suppressed for privacy.',
            threshold: 10,
            current: totalConsented,
          },
        });
      }

      // Format response with percentages
      const formattedStats = {
        total_members_consented: totalConsented,
        gender_distribution: {
          women: {
            count: parseInt(stats.women_count || '0'),
            percentage: ((parseInt(stats.women_count || '0') / totalConsented) * 100).toFixed(1),
          },
          men: {
            count: parseInt(stats.men_count || '0'),
            percentage: ((parseInt(stats.men_count || '0') / totalConsented) * 100).toFixed(1),
          },
          non_binary: {
            count: parseInt(stats.non_binary_count || '0'),
            percentage: ((parseInt(stats.non_binary_count || '0') / totalConsented) * 100).toFixed(1),
          },
        },
        equity_groups: {
          indigenous: {
            count: parseInt(stats.indigenous_count || '0'),
            percentage: ((parseInt(stats.indigenous_count || '0') / totalConsented) * 100).toFixed(1),
            breakdown: {
              first_nations: parseInt(stats.first_nations_count || '0'),
              inuit: parseInt(stats.inuit_count || '0'),
              metis: parseInt(stats.metis_count || '0'),
            },
          },
          visible_minority: {
            count: parseInt(stats.visible_minority_count || '0'),
            percentage: ((parseInt(stats.visible_minority_count || '0') / totalConsented) * 100).toFixed(1),
          },
          persons_with_disabilities: {
            count: parseInt(stats.disability_count || '0'),
            percentage: ((parseInt(stats.disability_count || '0') / totalConsented) * 100).toFixed(1),
          },
          lgbtq2plus: {
            count: parseInt(stats.lgbtq2plus_count || '0'),
            percentage: ((parseInt(stats.lgbtq2plus_count || '0') / totalConsented) * 100).toFixed(1),
          },
          newcomer: {
            count: parseInt(stats.newcomer_count || '0'),
            percentage: ((parseInt(stats.newcomer_count || '0') / totalConsented) * 100).toFixed(1),
          },
        },
        intersectionality: {
          multiple_equity_groups_count: parseInt(stats.multiple_equity_groups || '0'),
          avg_intersectionality_score: parseFloat(stats.avg_intersectionality_score || '0').toFixed(2),
        },
      };
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/monitoring',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          organizationId: requestedOrgId,
          totalConsented,
          privacyCompliant: true,
          anonymized: true,
        },
      });
      return NextResponse.json({
        success: true,
        data: formattedStats,
        privacy_notice: 'Data anonymized. Minimum 10 members with consent required for reporting.',
      });

    } catch (error) {
      logger.error('Failed to fetch equity monitoring data', error as Error, {
        userId,
        organizationId,
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/monitoring',
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

