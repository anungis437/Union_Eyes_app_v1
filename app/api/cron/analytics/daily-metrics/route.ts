/**
 * Daily Analytics Cron Job
 * Q1 2025 - Advanced Analytics
 * 
 * Runs daily to calculate metrics, generate predictions, and detect trends
 */

import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { calculateMetrics, generatePredictions, detectMetricTrends } from '@/actions/analytics-actions';
import { generateInsights, saveInsights } from '@/lib/ai/insights-generator';
import { getNotificationService } from '@/lib/services/notification-service';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Send notifications for critical insights
 */
async function async function sendInsightNotifications(organizationId: string, insights: any Record<string, unknown>[]): Promise<void> {
  try {
    const notificationService = getNotificationService();
    
    // Get organization admins
    const admins = await withRLSContext(async (tx) => {
      return await tx.query({
      where: (members, { and }) => and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'admin')
      ),
      limit: 10,
    });
    });

    if (admins.length === 0) {
return;
    }

    // Create notification message
    const insightSummary = insights
      .map((insight) => `Ã¢â‚¬Â¢ ${insight.title} (${insight.priority})`)
      .join('\n');

    // Send email to each admin
    for (const admin of admins) {
      if (admin.email) {
        await notificationService.send({
          organizationId,
          recipientId: admin.id,
          recipientEmail: admin.email,
          type: 'email',
          priority: 'high',
          subject: `Critical Analytics Insights - ${new Date().toLocaleDateString()}`,
          body: `New critical analytics insights have been detected:

${insightSummary}

Log in to the dashboard to view full details and recommendations.`,
          actionUrl: '/dashboard/analytics/insights',
          actionLabel: 'View Insights',
          userId: 'system',
        }).catch((err) => {
});
      }
    }
} catch (error) {
throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
// Get all active organizations
    const allOrgs = await withRLSContext(async (tx) => {
      return await tx.query({
      where: (orgs, { eq }) => eq(orgs.status, 'active')
    });
    });
const results = {
      organizations: allOrgs.length,
      metricsCalculated: 0,
      predictionsGenerated: 0,
      trendsDetected: 0,
      insightsGenerated: 0,
      errors: [] as string[]
    };
    
    // Calculate daily metrics for each organization
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    for (const org of allOrgs) {
      try {
        // Calculate claims volume metric
        const claimsVolumeResult = await calculateMetrics({
          metricType: 'claims_volume',
          metricName: 'Daily Claims Volume',
          periodType: 'daily',
          periodStart: yesterday,
          periodEnd: yesterdayEnd
        });
        
        if (claimsVolumeResult.success) {
          results.metricsCalculated++;
        } else {
          results.errors.push(`Org ${org.id}: Failed to calculate claims volume - ${claimsVolumeResult.error}`);
        }
        
        // Calculate resolution time metric
        const resolutionTimeResult = await calculateMetrics({
          metricType: 'resolution_time',
          metricName: 'Average Resolution Time',
          periodType: 'daily',
          periodStart: yesterday,
          periodEnd: yesterdayEnd
        });
        
        if (resolutionTimeResult.success) {
          results.metricsCalculated++;
        } else {
          results.errors.push(`Org ${org.id}: Failed to calculate resolution time - ${resolutionTimeResult.error}`);
        }
        
        // Calculate member growth metric
        const memberGrowthResult = await calculateMetrics({
          metricType: 'member_growth',
          metricName: 'New Members',
          periodType: 'daily',
          periodStart: yesterday,
          periodEnd: yesterdayEnd
        });
        
        if (memberGrowthResult.success) {
          results.metricsCalculated++;
        }
        
        // Generate weekly predictions (only on Mondays)
        const today = new Date();
        if (today.getDay() === 1) { // Monday
          const predictionsResult = await generatePredictions({
            predictionType: 'claims_volume',
            periodsAhead: 7,
            modelName: 'ensemble'
          });
          
          if (predictionsResult.success) {
            results.predictionsGenerated += 7;
          } else {
            results.errors.push(`Org ${org.id}: Failed to generate predictions - ${predictionsResult.error}`);
          }
        }
        
        // Detect trends (only on Mondays)
        if (today.getDay() === 1) {
          const trendResult = await detectMetricTrends({
            metricType: 'claims_volume',
            daysBack: 30
          });
          
          if (trendResult.success) {
            results.trendsDetected++;
          } else {
            results.errors.push(`Org ${org.id}: Failed to detect trends - ${trendResult.error}`);
          }
        }
        // Generate AI insights (daily for critical/high priority items)
        try {
          const insights = await generateInsights({
            organizationId: org.id,
            analysisType: 'comprehensive',
            timeRange: 7, // Last 7 days
            minConfidence: 0.7
          });
          
          // Filter for critical and high priority insights
          const criticalInsights = insights.filter(
            (insight) => insight.priority === 'critical' || insight.priority === 'high'
          );
          
          if (criticalInsights.length > 0) {
            await saveInsights(org.id, criticalInsights);
            results.insightsGenerated += criticalInsights.length;
            
            // Send notifications for critical insights
            await sendInsightNotifications(org.id, criticalInsights).catch((err) => {
});
          }
        } catch (error) {
results.errors.push(`Org ${org.id}: Failed to generate insights - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        
      } catch (error) {
results.errors.push(`Org ${org.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

