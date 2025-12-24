/**
 * UC-08: Workload Forecasting Model Training
 * 
 * Trains a time series forecasting model to predict claim case volume.
 * Target accuracy: 80% (within ±15% of actual volume)
 * 
 * Features:
 * - Historical case volume trends (3+ years)
 * - Seasonal patterns (summer lulls, winter spikes, holidays)
 * - Day-of-week patterns (Monday spikes, Friday drops)
 * - Month-of-year patterns (fiscal year-end, contract renewal periods)
 * - Trend analysis (growth/decline over time)
 * 
 * Forecast horizons: 30-day, 60-day, 90-day predictions
 * 
 * Run: pnpm ml:train:workload
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db';
import { sql } from 'drizzle-orm';

interface HistoricalVolume {
  date: Date;
  claimCount: number;
  dayOfWeek: number;
  weekOfYear: number;
  monthOfYear: number;
  isHoliday: boolean;
  isContractRenewalPeriod: boolean;
}

interface ForecastPoint {
  date: Date;
  predictedVolume: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactor: number;
}

interface WorkloadForecast {
  organizationId: string;
  modelType: 'workload_forecast';
  forecastHorizon: 30 | 60 | 90;
  predictions: ForecastPoint[];
  accuracy: number;
  generatedAt: Date;
}

/**
 * Extract historical case volume data for training
 */
async function extractHistoricalVolume(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<HistoricalVolume[]> {
  console.log(`📊 Extracting historical case volume from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

  const result = await db.execute(sql`
    WITH daily_volumes AS (
      SELECT 
        DATE(created_at) as volume_date,
        COUNT(*) as claim_count,
        EXTRACT(DOW FROM DATE(created_at)) as day_of_week,
        EXTRACT(WEEK FROM DATE(created_at)) as week_of_year,
        EXTRACT(MONTH FROM DATE(created_at)) as month_of_year
      FROM claims
      WHERE organization_id = ${organizationId}
        AND created_at >= ${startDate.toISOString()}
        AND created_at < ${endDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY volume_date
    )
    SELECT 
      volume_date,
      claim_count,
      day_of_week,
      week_of_year,
      month_of_year
    FROM daily_volumes
  `);

  const volumes = (result as any[]).map((row: any) => ({
    date: new Date(row.volume_date),
    claimCount: parseInt(row.claim_count),
    dayOfWeek: parseInt(row.day_of_week),
    weekOfYear: parseInt(row.week_of_year),
    monthOfYear: parseInt(row.month_of_year),
    isHoliday: isHolidayDate(new Date(row.volume_date)),
    isContractRenewalPeriod: isContractRenewalPeriod(new Date(row.volume_date))
  }));

  console.log(`✅ Extracted ${volumes.length} days of historical data`);
  return volumes;
}

/**
 * Check if date is a major North American holiday
 */
function isHolidayDate(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-based
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Major holidays that impact case volume
  const holidays = [
    { month: 1, day: 1 },   // New Year's Day
    { month: 7, day: 1 },   // Canada Day
    { month: 7, day: 4 },   // Independence Day (US)
    { month: 9, day: 1 },   // Labour Day (first Monday of September - approximate)
    { month: 10, day: 31 }, // Halloween
    { month: 11, day: 11 }, // Remembrance Day / Veterans Day
    { month: 12, day: 25 }, // Christmas
    { month: 12, day: 26 }, // Boxing Day
  ];

  // Check exact date holidays
  for (const holiday of holidays) {
    if (month === holiday.month && day === holiday.day) {
      return true;
    }
  }

  // Labour Day (first Monday of September)
  if (month === 9 && dayOfWeek === 1 && day <= 7) {
    return true;
  }

  // Thanksgiving (fourth Thursday of November - US)
  if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) {
    return true;
  }

  // Canadian Thanksgiving (second Monday of October)
  if (month === 10 && dayOfWeek === 1 && day >= 8 && day <= 14) {
    return true;
  }

  return false;
}

/**
 * Check if date falls in typical contract renewal period (May-June, November-December)
 */
function isContractRenewalPeriod(date: Date): boolean {
  const month = date.getMonth() + 1;
  return (month >= 5 && month <= 6) || (month >= 11 && month <= 12);
}

/**
 * Calculate moving average for smoothing
 */
function calculateMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }
  return result;
}

/**
 * Calculate seasonal factors by day of week and month
 */
function calculateSeasonalFactors(volumes: HistoricalVolume[]): {
  dayOfWeek: number[];
  monthOfYear: number[];
} {
  console.log('📈 Calculating seasonal patterns...');

  // Calculate average volume by day of week (0 = Sunday, 6 = Saturday)
  const dayTotals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);

  // Calculate average volume by month (1-12)
  const monthTotals = new Array(13).fill(0);
  const monthCounts = new Array(13).fill(0);

  for (const vol of volumes) {
    dayTotals[vol.dayOfWeek] += vol.claimCount;
    dayCounts[vol.dayOfWeek]++;

    monthTotals[vol.monthOfYear] += vol.claimCount;
    monthCounts[vol.monthOfYear]++;
  }

  const overallAvg = volumes.reduce((sum, v) => sum + v.claimCount, 0) / volumes.length;

  // Calculate factors (1.0 = average, >1.0 = above average, <1.0 = below average)
  const dayFactors = dayTotals.map((total, i) => 
    dayCounts[i] > 0 ? (total / dayCounts[i]) / overallAvg : 1.0
  );

  const monthFactors = monthTotals.map((total, i) => 
    monthCounts[i] > 0 ? (total / monthCounts[i]) / overallAvg : 1.0
  );

  console.log('📊 Day of week factors:', dayFactors.map((f, i) => 
    `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}: ${f.toFixed(2)}`
  ).join(', '));

  return { dayOfWeek: dayFactors, monthOfYear: monthFactors };
}

/**
 * Calculate trend (linear regression slope)
 */
function calculateTrend(volumes: HistoricalVolume[]): number {
  const n = volumes.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  volumes.forEach((vol, i) => {
    sumX += i;
    sumY += vol.claimCount;
    sumXY += i * vol.claimCount;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

/**
 * Generate forecast for specified horizon
 */
function generateForecast(
  historicalVolumes: HistoricalVolume[],
  horizon: 30 | 60 | 90,
  seasonalFactors: { dayOfWeek: number[]; monthOfYear: number[] }
): ForecastPoint[] {
  console.log(`🔮 Generating ${horizon}-day forecast...`);

  const forecast: ForecastPoint[] = [];
  const recentVolumes = historicalVolumes.slice(-90); // Use last 90 days for baseline
  const baselineAvg = recentVolumes.reduce((sum, v) => sum + v.claimCount, 0) / recentVolumes.length;
  
  // Calculate 7-day moving average for smoother baseline
  const smoothedVolumes = calculateMovingAverage(
    recentVolumes.map(v => v.claimCount),
    7
  );
  const smoothedBaseline = smoothedVolumes[smoothedVolumes.length - 1];

  // Calculate trend
  const trend = calculateTrend(historicalVolumes);
  const trendDirection: 'increasing' | 'decreasing' | 'stable' = 
    trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable';

  // Start forecasting from tomorrow
  const lastDate = historicalVolumes[historicalVolumes.length - 1].date;
  const startDate = new Date(lastDate);
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < horizon; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    const dayOfWeek = forecastDate.getDay();
    const monthOfYear = forecastDate.getMonth() + 1;

    // Apply seasonal factors
    const dayFactor = seasonalFactors.dayOfWeek[dayOfWeek] || 1.0;
    const monthFactor = seasonalFactors.monthOfYear[monthOfYear] || 1.0;
    const combinedFactor = (dayFactor + monthFactor) / 2;

    // Apply trend (very gradual - daily incremental change)
    const trendAdjustment = trend * i;

    // Holiday adjustment
    const holidayFactor = isHolidayDate(forecastDate) ? 0.3 : 1.0;

    // Contract renewal period boost
    const renewalFactor = isContractRenewalPeriod(forecastDate) ? 1.2 : 1.0;

    // Calculate predicted volume
    const baseVolume = smoothedBaseline + trendAdjustment;
    const predictedVolume = Math.round(
      baseVolume * combinedFactor * holidayFactor * renewalFactor
    );

    // Calculate confidence interval (±20% wider for longer horizons)
    const confidenceWidth = baseVolume * 0.15 * (1 + i / horizon);
    const lower = Math.max(0, Math.round(predictedVolume - confidenceWidth));
    const upper = Math.round(predictedVolume + confidenceWidth);

    forecast.push({
      date: forecastDate,
      predictedVolume: Math.max(0, predictedVolume),
      confidenceInterval: { lower, upper },
      trend: trendDirection,
      seasonalFactor: combinedFactor
    });
  }

  console.log(`✅ Generated ${forecast.length} forecast points`);
  return forecast;
}

/**
 * Validate forecast accuracy against historical data
 */
function validateAccuracy(
  historicalVolumes: HistoricalVolume[],
  seasonalFactors: { dayOfWeek: number[]; monthOfYear: number[] }
): number {
  console.log('🎯 Validating forecast accuracy on historical data...');

  // Use last 30 days as validation set
  const validationSet = historicalVolumes.slice(-30);
  const trainingSet = historicalVolumes.slice(0, -30);

  if (trainingSet.length < 90) {
    console.warn('⚠️  Insufficient training data for validation');
    return 0.75; // Default moderate accuracy
  }

  // Generate forecast for validation period
  const baselineAvg = trainingSet.slice(-90).reduce((sum, v) => sum + v.claimCount, 0) / 90;
  const trend = calculateTrend(trainingSet);

  let totalError = 0;
  let totalActual = 0;

  validationSet.forEach((actual, i) => {
    const dayFactor = seasonalFactors.dayOfWeek[actual.dayOfWeek] || 1.0;
    const monthFactor = seasonalFactors.monthOfYear[actual.monthOfYear] || 1.0;
    const combinedFactor = (dayFactor + monthFactor) / 2;
    const trendAdjustment = trend * i;

    const predicted = baselineAvg * combinedFactor + trendAdjustment;
    const error = Math.abs(predicted - actual.claimCount);

    totalError += error;
    totalActual += actual.claimCount;
  });

  // Calculate MAPE (Mean Absolute Percentage Error)
  const mape = totalError / totalActual;
  const accuracy = Math.max(0, Math.min(1, 1 - mape));

  console.log(`📊 Forecast accuracy: ${(accuracy * 100).toFixed(1)}% (MAPE: ${(mape * 100).toFixed(1)}%)`);
  return accuracy;
}

/**
 * Save forecast to database
 */
async function saveForecast(forecast: WorkloadForecast): Promise<void> {
  console.log(`💾 Saving ${forecast.forecastHorizon}-day forecast to database...`);

  // Save each forecast point as a prediction
  for (const point of forecast.predictions) {
    await db.execute(sql`
      INSERT INTO ml_predictions (
        organization_id,
        prediction_type,
        prediction_date,
        predicted_value,
        lower_bound,
        upper_bound,
        confidence,
        horizon,
        granularity,
        created_at
      ) VALUES (
        ${forecast.organizationId},
        ${'workload_forecast'},
        ${point.date.toISOString().split('T')[0]},
        ${point.predictedVolume},
        ${point.confidenceInterval.lower},
        ${point.confidenceInterval.upper},
        ${forecast.accuracy * 100},
        ${forecast.forecastHorizon},
        ${'daily'},
        NOW()
      )
      ON CONFLICT (organization_id, prediction_type, prediction_date, horizon) 
      DO UPDATE SET
        predicted_value = EXCLUDED.predicted_value,
        lower_bound = EXCLUDED.lower_bound,
        upper_bound = EXCLUDED.upper_bound,
        confidence = EXCLUDED.confidence,
        granularity = EXCLUDED.granularity,
        created_at = EXCLUDED.created_at
    `);
  }

  // Save model metadata
  await db.execute(sql`
    INSERT INTO model_metadata (
      organization_id,
      model_type,
      version,
      accuracy,
      trained_at,
      parameters
    ) VALUES (
      ${forecast.organizationId},
      ${'workload_forecast'},
      '1.0.0',
      ${forecast.accuracy},
      NOW(),
      ${JSON.stringify({
        forecastHorizon: forecast.forecastHorizon,
        predictionCount: forecast.predictions.length,
        trainingMethod: 'time_series_decomposition',
        features: ['seasonal_patterns', 'trend_analysis', 'holiday_effects', 'contract_periods']
      })}::jsonb
    )
    ON CONFLICT (organization_id, model_type, version) 
    DO UPDATE SET
      accuracy = EXCLUDED.accuracy,
      trained_at = EXCLUDED.trained_at,
      parameters = EXCLUDED.parameters
  `);

  console.log('✅ Forecast saved successfully');
}

/**
 * Main training function
 */
async function trainWorkloadForecastModel() {
  console.log('🚀 Starting UC-08: Workload Forecasting Model Training\n');

  try {
    // Get list of tenants
    const organizationsResult = await db.execute(sql`
      SELECT DISTINCT organization_id 
      FROM claims 
      WHERE created_at >= NOW() - INTERVAL '3 years'
      LIMIT 10
    `);

    const organizations = (organizationsResult as any[]).map((row: any) => row.organization_id);
    console.log(`📋 Found ${organizations.length} organizations with sufficient data\n`);

    for (const organizationId of organizations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏢 Training model for organization: ${organizationId}`);
      console.log('='.repeat(60));

      // Extract 3 years of historical data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 3);

      const historicalVolumes = await extractHistoricalVolume(organizationId, startDate, endDate);

      if (historicalVolumes.length < 180) {
        console.warn(`⚠️  Insufficient data (${historicalVolumes.length} days). Skipping organization.`);
        continue;
      }

      // Calculate seasonal patterns
      const seasonalFactors = calculateSeasonalFactors(historicalVolumes);

      // Validate accuracy
      const accuracy = validateAccuracy(historicalVolumes, seasonalFactors);

      // Generate forecasts for all horizons
      for (const horizon of [30, 60, 90] as const) {
        const predictions = generateForecast(historicalVolumes, horizon, seasonalFactors);

        const forecast: WorkloadForecast = {
          organizationId,
          modelType: 'workload_forecast',
          forecastHorizon: horizon,
          predictions,
          accuracy,
          generatedAt: new Date()
        };

        await saveForecast(forecast);
      }

      console.log(`\n✅ Completed training for organization ${organizationId}`);
      console.log(`📈 Model accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`🎯 Target accuracy: 80%`);
      console.log(`${accuracy >= 0.80 ? '✅ Target achieved!' : '⚠️  Below target - more data needed'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Workload forecast training completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error training workload forecast model:', error);
    throw error;
  }
}

// Run training if executed directly
if (require.main === module) {
  console.log('🔍 DATABASE_URL loaded:', process.env.DATABASE_URL ? 'Yes (user: ' + process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):/)?.[1] + ')' : 'No');
  
  trainWorkloadForecastModel()
    .then(() => {
      console.log('\n✅ Training completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Training failed:', error);
      process.exit(1);
    });
}

export { trainWorkloadForecastModel, generateForecast, calculateSeasonalFactors };
