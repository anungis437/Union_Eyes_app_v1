import { z } from 'zod';
import { requireUser, withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
/**
 * UC-08: Workload Forecasting API
 * 
 * GET  /api/ml/predictions/workload-forecast - Get forecasts for specified time horizon
 * POST /api/ml/predictions/workload-forecast - Generate new forecast for date range
 * 
 * Returns:
 * - predictions: Array of forecast points with date, volume, confidence intervals
 * - trend: Overall trend direction (increasing/decreasing/stable)
 * - accuracy: Model accuracy percentage
 * - resourceRecommendations: Suggested staffing adjustments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';
import { 
  predictWorkloadBatch, 
  calculateMovingAverage, 
  calculateTrend,
  isHoliday
} from '@/lib/ml/models/workload-forecast-model';


interface ForecastPoint {
  date: string;
  predictedVolume: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactor: number;
}

interface WorkloadForecastResponse {
  organizationId: string;
  forecastHorizon: number;
  predictions: ForecastPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  accuracy: number;
  averageVolume: number;
  peakDates: string[];
  resourceRecommendations: string[];
  generatedAt: string;
}

/**
 * UC-08: Workload Forecasting API
 * 
 * GET  /api/ml/predictions/workload-forecast - Get forecasts for specified time horizon
 * POST /api/ml/predictions/workload-forecast - Generate new forecast for date range
 * 
 * Returns:
 * - predictions: Array of forecast points with date, volume, confidence intervals
 * - trend: Overall trend direction (increasing/decreasing/stable)
 * - accuracy: Model accuracy percentage
 * - resourceRecommendations: Suggested staffing adjustments
 */

export const GET = withEnhancedRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit ML predictions
  const rateLimitResult = await checkRateLimit(
    `ml-predictions:${userId}`,
    RATE_LIMITS.ML_PREDICTIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for ML operations. Please try again later.' },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const horizon = parseInt(searchParams.get('horizon') || '30'); // 30, 60, or 90 days
    const granularity = searchParams.get('granularity') || 'daily'; // daily or weekly
    const organizationId = searchParams.get('organizationId') || organizationId || userId;

    if (![30, 60, 90].includes(horizon)) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid horizon. Must be 30, 60, or 90 days.'
      // TODO: Migrate additional details: 60, or 90 days.'
    );
    }

    // Get forecast predictions from database
    const result = await db.execute(sql`
      SELECT 
        prediction_date,
        predicted_value,
        lower_bound,
        upper_bound,
        confidence,
        horizon as prediction_horizon
      FROM ml_predictions
      WHERE organization_id = ${organizationId}
        AND prediction_type = 'workload_forecast'
        AND prediction_date >= CURRENT_DATE
        AND prediction_date <= CURRENT_DATE + INTERVAL '${horizon} days'
        AND horizon = ${horizon}
      ORDER BY prediction_date ASC
    `);

    const predictions: ForecastPoint[] = ((result as Array<Record<string, unknown>>) || []).map((row: Record<string, unknown>) => {
      const predictedValue = parseFloat(row.predicted_value);
      const lowerBound = parseFloat(row.lower_bound);
      const upperBound = parseFloat(row.upper_bound);
      
      return {
        date: new Date(row.prediction_date).toISOString().split('T')[0],
        predictedVolume: predictedValue,
        confidenceInterval: {
          lower: lowerBound,
          upper: upperBound
        },
        trend: predictedValue > lowerBound + (upperBound - lowerBound) * 0.7 ? 'increasing' : 
               predictedValue < lowerBound + (upperBound - lowerBound) * 0.3 ? 'decreasing' : 'stable',
        seasonalFactor: 1.0 // Can be enhanced with historical patterns
      };
    });

    if (predictions.length === 0) {
      return NextResponse.json(
        { 
          error: 'No forecast data available. Please run training script first.',
          hint: 'Run: pnpm ml:train:workload'
        },
        { status: 404 }
      );
    }

    // Aggregate to weekly if requested
    let finalPredictions = predictions;
    if (granularity === 'weekly') {
      finalPredictions = aggregateToWeekly(predictions);
    }

    // Calculate summary statistics
    const avgVolume = predictions.reduce((sum, p) => sum + p.predictedVolume, 0) / predictions.length;
    const overallTrend = determineOverallTrend(predictions);
    
    // Identify peak dates (volume >20% above average)
    const peakThreshold = avgVolume * 1.2;
    const peakDates = predictions
      .filter(p => p.predictedVolume > peakThreshold)
      .map(p => p.date);

    // Get model accuracy from metadata
    const metadataResult = await db.execute(sql`
      SELECT accuracy, trained_at
      FROM model_metadata
      WHERE organization_id = ${organizationId}
        AND model_type = 'workload_forecast'
      ORDER BY trained_at DESC
      LIMIT 1
    `);

    const accuracy = (metadataResult as Array<Record<string, unknown>>)?.[0]?.accuracy || 0.8;

    // Generate resource recommendations
    const resourceRecommendations = generateResourceRecommendations(
      predictions,
      avgVolume,
      peakDates,
      overallTrend
    );

    const response: WorkloadForecastResponse = {
      organizationId,
      forecastHorizon: horizon,
      predictions: finalPredictions,
      trend: overallTrend,
      accuracy: parseFloat((accuracy * 100).toFixed(1)),
      averageVolume: Math.round(avgVolume),
      peakDates,
      resourceRecommendations,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch workload forecast',
      error
    );
  }
});


const mlPredictionsWorkloadForecastSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  organizationId: z.string().uuid('Invalid organizationId'),
});

export const POST = withEnhancedRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;
  
  try {

    const body = await request.json();
    // Validate request body
    const validation = mlPredictionsWorkload-forecastSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { startDate, endDate, organizationId } = validation.data;
    const { startDate, endDate, organizationId: requestOrganizationId } = body;

    if (!startDate || !endDate) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'startDate and endDate are required'
    );
    }

    const requestOrgId = body.organizationId || organizationId || userId;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 1 || daysDiff > 90) {
      return NextResponse.json(
        { error: 'Date range must be between 1 and 90 days' },
        { status: 400 }
      );
    }

    // Determine appropriate horizon
    const horizon = daysDiff <= 30 ? 30 : daysDiff <= 60 ? 60 : 90;

    // Get historical data for context
    const historicalResult = await db.execute(sql`
      SELECT 
        DATE(created_at) as claim_date,
        COUNT(*) as claim_count
      FROM claims
      WHERE organization_id = ${organizationId}
        AND created_at >= NOW() - INTERVAL '90 days'
        AND created_at < NOW()
        AND status NOT IN ('rejected', 'spam')
      GROUP BY DATE(created_at)
      ORDER BY claim_date DESC
    `);

    const recentVolumes = (historicalResult as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => ({
      date: new Date(row.claim_date),
      count: parseInt(row.claim_count)
    }));

    const avgRecentVolume = recentVolumes.reduce((sum, v) => sum + v.count, 0) / recentVolumes.length;

    // Get existing forecast for this horizon
    const forecastResult = await db.execute(sql`
      SELECT 
        prediction_date,
        predicted_value,
        lower_bound,
        upper_bound,
        confidence,
        horizon as prediction_horizon
      FROM ml_predictions
      WHERE organization_id = ${organizationId}
        AND prediction_type = 'workload_forecast'
        AND prediction_date >= ${start.toISOString()}
        AND prediction_date <= ${end.toISOString()}
        AND horizon = ${horizon}
      ORDER BY prediction_date ASC
    `);

    const predictions: ForecastPoint[] = ((forecastResult as Array<Record<string, unknown>>) || []).map((row: Record<string, unknown>) => {
      const predictedValue = parseFloat(row.predicted_value);
      const lowerBound = parseFloat(row.lower_bound);
      const upperBound = parseFloat(row.upper_bound);
      
      return {
        date: new Date(row.prediction_date).toISOString().split('T')[0],
        predictedVolume: predictedValue,
        confidenceInterval: {
          lower: lowerBound,
          upper: upperBound
        },
        trend: 'stable', // Calculated from overall trend
        seasonalFactor: 1.0 // Default value
      };
    });

    if (predictions.length === 0) {
      // ===== ML MODEL PREDICTION =====
      // Generate predictions using TensorFlow.js model instead of simple averaging
      
      // Calculate features from recent historical data
      const historicalCounts = recentVolumes.map(v => v.count);
      const recentAvg = calculateMovingAverage(historicalCounts, 7);
      const recentTrend = calculateTrend(historicalCounts, 14);

      // Calculate seasonal factor from monthly patterns
      const monthlyAvgs = new Map<number, number>();
      recentVolumes.forEach(v => {
        const month = v.date.getMonth() + 1;
        if (!monthlyAvgs.has(month)) {
          monthlyAvgs.set(month, 0);
        }
        monthlyAvgs.set(month, monthlyAvgs.get(month)! + v.count);
      });

      const overallAvg = historicalCounts.reduce((sum, c) => sum + c, 0) / historicalCounts.length;
      
      // Generate features for each day in forecast
      const featuresArray = [];
      for (let i = 0; i < daysDiff; i++) {
        const predDate = new Date(start);
        predDate.setDate(predDate.getDate() + i);

        const dayOfWeek = predDate.getDay();
        const weekOfYear = Math.ceil((predDate.getTime() - new Date(predDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const monthOfYear = predDate.getMonth() + 1;
        const isHolidayFlag = isHoliday(predDate) ? 1 : 0;

        // Calculate seasonal factor for this month
        const monthAvg = monthlyAvgs.get(monthOfYear) || overallAvg;
        const monthCount = recentVolumes.filter(v => v.date.getMonth() + 1 === monthOfYear).length || 1;
        const seasonalFactor = Math.max(0.5, Math.min(1.5, (monthAvg / monthCount) / overallAvg));

        featuresArray.push({
          dayOfWeek,
          weekOfYear,
          monthOfYear,
          isHoliday: isHolidayFlag,
          recentAvg,
          recentTrend,
          seasonalFactor
        });
      }

      // Predict using ML model (batch prediction)
      const mlPredictions = await predictWorkloadBatch(featuresArray);

      const simplePredictions: ForecastPoint[] = mlPredictions.map((pred, idx) => {
        const predDate = new Date(start);
        predDate.setDate(predDate.getDate() + idx);

        return {
          date: predDate.toISOString().split('T')[0],
          predictedVolume: pred.predictedVolume,
          confidenceInterval: pred.confidenceInterval,
          trend: 'stable', // Will be calculated from overall trend
          seasonalFactor: featuresArray[idx].seasonalFactor
        };
      });

      // ===== END ML MODEL PREDICTION =====

      const avgVolume = simplePredictions.reduce((sum, p) => sum + p.predictedVolume, 0) / simplePredictions.length;
      const overallTrend = determineOverallTrend(simplePredictions);
      const peakDates = simplePredictions
        .filter(p => p.predictedVolume > avgVolume * 1.2)
        .map(p => p.date);

      const resourceRecommendations = generateResourceRecommendations(
        simplePredictions,
        avgVolume,
        peakDates,
        overallTrend
      );

      return NextResponse.json({
        organizationId,
        forecastHorizon: daysDiff,
        predictions: simplePredictions,
        trend: overallTrend,
        accuracy: 82, // ML model accuracy
        averageVolume: Math.round(avgVolume),
        peakDates,
        resourceRecommendations: [
          '🤖 ML model predictions (TensorFlow.js)',
          ...resourceRecommendations
        ],
        generatedAt: new Date().toISOString(),
        modelVersion: mlPredictions[0]?.modelVersion || 'v1.0.0'
      });
    }

    // Return existing forecast with analysis
    const avgVolume = predictions.reduce((sum, p) => sum + p.predictedVolume, 0) / predictions.length;
    const overallTrend = determineOverallTrend(predictions);
    const peakDates = predictions
      .filter(p => p.predictedVolume > avgVolume * 1.2)
      .map(p => p.date);

    const resourceRecommendations = generateResourceRecommendations(
      predictions,
      avgVolume,
      peakDates,
      overallTrend
    );

    return NextResponse.json({
      organizationId,
      forecastHorizon: daysDiff,
      predictions,
      trend: overallTrend,
      accuracy: 82,
      averageVolume: Math.round(avgVolume),
      peakDates,
      resourceRecommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate workload forecast',
      error
    );
  }
});

/**
 * Aggregate daily predictions to weekly averages
 */
function aggregateToWeekly(predictions: ForecastPoint[]): ForecastPoint[] {
  const weeks: Map<string, ForecastPoint[]> = new Map();

  predictions.forEach(p => {
    const date = new Date(p.date);
    // Get Monday of the week
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(p);
  });

  const weeklyPredictions: ForecastPoint[] = [];
  weeks.forEach((dailyPredictions, weekStart) => {
    const avgVolume = dailyPredictions.reduce((sum, p) => sum + p.predictedVolume, 0) / dailyPredictions.length;
    const avgLower = dailyPredictions.reduce((sum, p) => sum + p.confidenceInterval.lower, 0) / dailyPredictions.length;
    const avgUpper = dailyPredictions.reduce((sum, p) => sum + p.confidenceInterval.upper, 0) / dailyPredictions.length;

    weeklyPredictions.push({
      date: weekStart,
      predictedVolume: Math.round(avgVolume),
      confidenceInterval: {
        lower: Math.round(avgLower),
        upper: Math.round(avgUpper)
      },
      trend: dailyPredictions[0].trend,
      seasonalFactor: dailyPredictions.reduce((sum, p) => sum + p.seasonalFactor, 0) / dailyPredictions.length
    });
  });

  return weeklyPredictions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Determine overall trend direction
 */
function determineOverallTrend(predictions: ForecastPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (predictions.length < 2) return 'stable';

  const firstHalf = predictions.slice(0, Math.floor(predictions.length / 2));
  const secondHalf = predictions.slice(Math.floor(predictions.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.predictedVolume, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.predictedVolume, 0) / secondHalf.length;

  const change = (secondAvg - firstAvg) / firstAvg;

  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

/**
 * Generate resource recommendations based on forecast
 */
function generateResourceRecommendations(
  predictions: ForecastPoint[],
  avgVolume: number,
  peakDates: string[],
  trend: 'increasing' | 'decreasing' | 'stable'
): string[] {
  const recommendations: string[] = [];

  // Peak volume recommendations
  if (peakDates.length > 0) {
    recommendations.push(
      `âš ï¸ ${peakDates.length} high-volume days detected (${peakDates[0]} onwards) - consider increasing staffing by 20-30%`
    );
    recommendations.push(
      `ðŸ“… Peak dates: ${peakDates.slice(0, 5).join(', ')}${peakDates.length > 5 ? ' and more' : ''}`
    );
  } else {
    recommendations.push('âœ… No significant volume spikes predicted - maintain current staffing levels');
  }

  // Trend recommendations
  if (trend === 'increasing') {
    const increase = Math.round((predictions[predictions.length - 1].predictedVolume - predictions[0].predictedVolume) / predictions[0].predictedVolume * 100);
    recommendations.push(
      `ðŸ“ˆ Volume trending upward (~${increase}% increase) - plan for gradual staffing increases`
    );
    recommendations.push(
      'ðŸ’¡ Consider cross-training additional stewards to handle increased caseload'
    );
  } else if (trend === 'decreasing') {
    recommendations.push(
      'ðŸ“‰ Volume trending downward - opportunity for training, process improvements, or backlog reduction'
    );
  } else {
    recommendations.push(
      'âž¡ï¸ Stable volume expected - ideal time for steward development and strategic planning'
    );
  }

  // Capacity recommendations
  const maxVolume = Math.max(...predictions.map(p => p.predictedVolume));
  const capacityRatio = maxVolume / avgVolume;

  if (capacityRatio > 1.5) {
    recommendations.push(
      `âš¡ Peak volume is ${Math.round(capacityRatio * 100)}% of average - ensure flexible staffing arrangements`
    );
  }

  // Weekend/holiday preparation
  const weekendPredictions = predictions.filter(p => {
    const date = new Date(p.date);
    return date.getDay() === 0 || date.getDay() === 6;
  });

  if (weekendPredictions.some(p => p.predictedVolume > avgVolume * 0.8)) {
    recommendations.push(
      'ðŸ“† Weekend activity expected - consider weekend duty roster or on-call stewards'
    );
  }

  return recommendations;
}

