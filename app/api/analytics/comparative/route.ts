import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Comparative Analytics API
 * Q1 2025 - Advanced Analytics
 * 
 * Cross-organization benchmarking and comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { comparativeAnalyses, organizations } from '@/db/migrations/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit analytics queries
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-comparative:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    try {
      const searchParams = request.nextUrl.searchParams;
      const organizationId = searchParams.get('organizationId');
      const metric = searchParams.get('metric') || 'claims_volume';
      const timeRange = searchParams.get('timeRange') || '30d';

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization ID is required' },
          { status: 400 }
        );
      }

      // Calculate time range
      const days = parseInt(timeRange.replace('d', '')) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch comparative analyses
      const analyses = await db
        .select()
        .from(comparativeAnalyses)
        .where(
          eq(comparativeAnalyses.organizationId, organizationId)
        )
        .orderBy(desc(comparativeAnalyses.createdAt))
        .limit(1);

      if (analyses.length === 0) {
        // Generate sample comparative data if none exists
        return NextResponse.json({
          success: true,
          comparisonData: generateSampleComparison(metric),
          gapAnalysis: generateSampleGapAnalysis(metric),
          industryBenchmark: generateSampleBenchmark(metric)
        });
      }

      const analysis = analyses[0];

      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'comparative_analytics_fetch',
        resourceType: 'analytics',
        resourceId: organizationId,
        metadata: { metric, timeRange },
        dataType: 'ANALYTICS',
      });

      return NextResponse.json({
        success: true,
        comparisonData: analysis.results || [],
        gapAnalysis: analysis.gaps || [],
        industryBenchmark: analysis.benchmarks || null,
        strengths: analysis.strengths || [],
        recommendations: analysis.recommendations || []
      });
    } catch (error) {
      console.error('Error fetching comparative analysis:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comparative analysis' },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit comparative analytics generation
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ADVANCED_ANALYTICS,
      `analytics-comparative-generate:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      const { organizationId, metricType, peerOrganizationIds } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      if (!organizationId || !metricType) {
        return NextResponse.json(
          { error: 'Organization ID and metric type are required' },
          { status: 400 }
        );
      }

      // Generate comparative analysis
      const comparisonData = await generateComparativeAnalysis(
        organizationId,
        metricType,
        peerOrganizationIds || []
      );

      // Save to database
      const [result] = await db
        .insert(comparativeAnalyses)
        .values({
          organizationId,
          analysisName: `${metricType} Comparative Analysis`,
          comparisonType: peerOrganizationIds && peerOrganizationIds.length > 0 ? 'peer_comparison' : 'industry_benchmark',
          organizationIds: peerOrganizationIds,
          metrics: [metricType],
          timeRange: { days: 30 },
          results: comparisonData.peerComparison,
          benchmarks: comparisonData.industryBenchmark,
          gaps: comparisonData.gapAnalysis,
          strengths: comparisonData.strengths,
          recommendations: [],
          visualizationData: null,
          createdBy: organizationId // TODO: Get actual user ID
        })
        .returning();

      return NextResponse.json({
        success: true,
        analysis: result
      });
    } catch (error) {
      console.error('Error creating comparative analysis:', error);
      return NextResponse.json(
        { error: 'Failed to create comparative analysis' },
        { status: 500 }
      );
    }
    })(request);
};

// Helper functions for generating sample data
function generateSampleComparison(metric: string) {
  const baseValue = metric === 'claims_volume' ? 150 : metric === 'resolution_time' ? 5.2 : 250;
  
  return [
    {
      organizationName: 'Your Organization',
      metricValue: baseValue,
      rank: 3,
      percentile: 65,
      trend: 'up' as const,
      changePercent: 12.5
    },
    {
      organizationName: 'Peer Organization A',
      metricValue: baseValue * 1.2,
      rank: 1,
      percentile: 92,
      trend: 'up' as const,
      changePercent: 8.3
    },
    {
      organizationName: 'Peer Organization B',
      metricValue: baseValue * 1.1,
      rank: 2,
      percentile: 78,
      trend: 'stable' as const,
      changePercent: 2.1
    },
    {
      organizationName: 'Peer Organization C',
      metricValue: baseValue * 0.9,
      rank: 4,
      percentile: 45,
      trend: 'down' as const,
      changePercent: -5.2
    },
    {
      organizationName: 'Peer Organization D',
      metricValue: baseValue * 0.8,
      rank: 5,
      percentile: 30,
      trend: 'down' as const,
      changePercent: -8.7
    }
  ];
}

function generateSampleGapAnalysis(metric: string) {
  return [
    {
      metric: 'Claims Processing Speed',
      currentValue: 5.2,
      benchmarkValue: 4.5,
      gap: -0.7,
      gapPercent: -13.5,
      status: 'behind' as const,
      recommendation:
        'Consider implementing automated claim validation to reduce processing time by 15-20%'
    },
    {
      metric: 'Member Satisfaction Score',
      currentValue: 8.5,
      benchmarkValue: 8.2,
      gap: 0.3,
      gapPercent: 3.7,
      status: 'ahead' as const,
      recommendation: 'Maintain current service levels and share best practices with peers'
    },
    {
      metric: 'Claim Approval Rate',
      currentValue: 92.3,
      benchmarkValue: 90.0,
      gap: 2.3,
      gapPercent: 2.6,
      status: 'ahead' as const,
      recommendation: 'Strong performance. Document approval criteria for consistency'
    }
  ];
}

function generateSampleBenchmark(metric: string) {
  const yourValue = metric === 'claims_volume' ? 150 : metric === 'resolution_time' ? 5.2 : 250;
  const industryAvg =
    metric === 'claims_volume' ? 135 : metric === 'resolution_time' ? 4.8 : 230;

  return {
    yourValue,
    industryAverage: industryAvg,
    percentile: 65,
    status: 'on_par' as const
  };
}

async function generateComparativeAnalysis(
  organizationId: string,
  metricType: string,
  peerIds: string[]
) {
  // This would implement real comparative analysis logic
  // For now, return sample data structure
  return {
    peerComparison: generateSampleComparison(metricType),
    industryBenchmark: generateSampleBenchmark(metricType),
    gapAnalysis: generateSampleGapAnalysis(metricType),
    strengths: ['High member satisfaction', 'Strong claim approval rate'],
    weaknesses: ['Slower claim processing', 'Limited automation']
  };
}
