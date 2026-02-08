/**
 * Daily Analytics Cron Job
 * Q1 2025 - Advanced Analytics
 * 
 * Runs daily to calculate metrics, generate predictions, and detect trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/migrations/schema';
import { calculateMetrics, generatePredictions, detectMetricTrends } from '@/actions/analytics-actions';
import { generateInsights, saveInsights } from '@/lib/ai/insights-generator';
import { getNotificationService } from '@/lib/services/notification-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Send notifications for critical insights
 */
async function sendInsightNotifications(organizationId: string, insights: any[]): Promise<void> {
  try {
    const notificationService = getNotificationService();
    
    // Get organization admins
    const admins = await db.query.organizationMembers.findMany({
      where: (members, { eq, and }) => and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'admin')
      ),
      limit: 10,
    });

    if (admins.length === 0) {
      console.log(`[Analytics Cron] No admins found for organization ${organizationId}`);
      return;
    }

    // Create notification message
    const insightSummary = insights
      .map((insight) => `• ${insight.title} (${insight.priority})`)
      .join('
');

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
          console.error(`[Analytics Cron] Failed to send notification to ${admin.email}:`, err);
        });
      }
    }

    console.log(`[Analytics Cron] Sent ${insights.length} insight notifications to ${admins.length} admins`);
  } catch (error) {
    console.error(`[Analytics Cron] Error sending insight notifications:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[Analytics Cron] Starting daily analytics calculation...');
    
    // Get all active organizations
    const allOrgs = await db.query.organizations.findMany({
      where: (orgs, { eq }) => eq(orgs.status, 'active')
    });
    
    console.log(`[Analytics Cron] Processing ${allOrgs.length} organizations`);
    
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
              console.error(`[Analytics Cron] Failed to send notifications for org ${org.id}:`, err);
            });
          }
        } catch (error) {
          console.error(`[Analytics Cron] Error generating insights for org ${org.id}:`, error);
          results.errors.push(`Org ${org.id}: Failed to generate insights - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        
      } catch (error) {
        console.error(`[Analytics Cron] Error processing org ${org.id}:`, error);
        results.errors.push(`Org ${org.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('[Analytics Cron] Daily analytics calculation completed');
    console.log(`[Analytics Cron] Results:`, results);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
    console.error('[Analytics Cron] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
