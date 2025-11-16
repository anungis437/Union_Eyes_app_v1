import { aiOrchestrator } from '../core/orchestrator';
import logger from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Prediction Types
 */
export interface ClaimOutcomePrediction {
  outcome: 'favorable' | 'unfavorable' | 'settlement' | 'withdrawal';
  probability: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  reasoning: string;
  suggestedStrategy: string;
  estimatedDuration: number; // days
  settlementRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface TimelinePrediction {
  estimatedCompletionDate: string;
  confidence: number;
  milestones: Array<{
    name: string;
    estimatedDate: string;
    probability: number;
  }>;
  riskFactors: string[];
}

export interface ResourceAllocationPrediction {
  recommendedAssignee: string;
  estimatedEffort: number; // hours
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredSkills: string[];
  confidence: number;
}

/**
 * Predictive Analytics Engine
 * Uses historical data and AI to predict outcomes and optimize processes
 */
export class PredictiveAnalyticsEngine {
  private supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  /**
   * Predict claim outcome using historical data and AI
   */
  async predictClaimOutcome(
    claimData: {
      type: string;
      description: string;
      memberHistory?: any;
      employerHistory?: any;
      similarCases?: any[];
    }
  ): Promise<ClaimOutcomePrediction> {
    try {
      logger.info('Predicting claim outcome', { claimType: claimData.type });

      // Fetch historical data for similar claims
      const historicalData = await this.fetchSimilarHistoricalClaims(
        claimData.type,
        claimData.description
      );

      // Build context from historical data
      const historicalContext = this.buildHistoricalContext(historicalData);

      const systemPrompt = `You are an expert labor law analyst with extensive experience predicting claim outcomes.
Use historical data patterns and legal precedents to make accurate predictions.`;

      const userPrompt = `Analyze this claim and predict its outcome:

CLAIM TYPE: ${claimData.type}
DESCRIPTION: ${claimData.description}

HISTORICAL CONTEXT:
${historicalContext}

${claimData.memberHistory ? `MEMBER HISTORY: ${JSON.stringify(claimData.memberHistory)}` : ''}
${claimData.employerHistory ? `EMPLOYER HISTORY: ${JSON.stringify(claimData.employerHistory)}` : ''}

Provide a prediction in JSON format with:
1. outcome: Most likely outcome (favorable/unfavorable/settlement/withdrawal)
2. probability: Probability of predicted outcome (0-1)
3. confidence: Confidence in prediction (0-1)
4. factors: Array of key factors influencing outcome:
   - factor: Description of factor
   - impact: positive/negative/neutral
   - weight: Importance weight (0-1)
5. reasoning: Detailed explanation of prediction
6. suggestedStrategy: Recommended approach
7. estimatedDuration: Expected duration in days
8. settlementRange: If settlement likely, estimated range {min, max, currency}

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.4,
          maxTokens: 2000,
        }
      );

      const prediction = JSON.parse(response.content);

      // Log prediction for learning
      await this.logPrediction('claim_outcome', claimData, prediction);

      logger.info('Claim outcome predicted', {
        outcome: prediction.outcome,
        probability: prediction.probability,
        confidence: prediction.confidence,
      });

      return prediction;
    } catch (error) {
      logger.error('Claim outcome prediction failed', { error });
      throw new Error('Failed to predict claim outcome');
    }
  }

  /**
   * Predict timeline for claim resolution
   */
  async predictTimeline(claimId: string): Promise<TimelinePrediction> {
    try {
      logger.info('Predicting timeline', { claimId });

      // Fetch claim details
      const { data: claim, error } = await this.supabase
        .from('claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (error || !claim) {
        throw new Error('Claim not found');
      }

      // Fetch similar completed claims
      const historicalDurations = await this.fetchHistoricalDurations(claim.type);

      const systemPrompt = `You are an expert at predicting case timelines based on historical data and complexity factors.`;

      const userPrompt = `Predict the timeline for this claim:

CLAIM: ${JSON.stringify(claim)}

HISTORICAL DATA:
Average duration for ${claim.type} claims: ${historicalDurations.average} days
Median: ${historicalDurations.median} days
Range: ${historicalDurations.min} - ${historicalDurations.max} days

Provide prediction in JSON format with:
1. estimatedCompletionDate: ISO date string
2. confidence: Confidence level (0-1)
3. milestones: Array of key milestones with estimated dates
4. riskFactors: Array of factors that could delay completion

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 1500,
        }
      );

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Timeline prediction failed', { error });
      throw new Error('Failed to predict timeline');
    }
  }

  /**
   * Predict optimal resource allocation
   */
  async predictResourceAllocation(claimData: {
    type: string;
    description: string;
    complexity: 'low' | 'medium' | 'high';
  }): Promise<ResourceAllocationPrediction> {
    try {
      logger.info('Predicting resource allocation', { claimType: claimData.type });

      // Fetch available stewards and their workload
      const { data: stewards } = await this.supabase
        .from('users')
        .select('id, name, role, skills')
        .eq('role', 'steward')
        .eq('active', true);

      const systemPrompt = `You are an expert at optimizing resource allocation for legal cases.`;

      const userPrompt = `Recommend resource allocation for this claim:

CLAIM: ${JSON.stringify(claimData)}

AVAILABLE STEWARDS: ${JSON.stringify(stewards)}

Provide recommendation in JSON format with:
1. recommendedAssignee: Steward ID or "hire_external" if needed
2. estimatedEffort: Estimated hours required
3. priority: Case priority (low/medium/high/critical)
4. requiredSkills: Array of required skills
5. confidence: Confidence in recommendation (0-1)

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 1000,
        }
      );

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Resource allocation prediction failed', { error });
      throw new Error('Failed to predict resource allocation');
    }
  }

  /**
   * Predict settlement value range
   */
  async predictSettlementValue(claimData: {
    type: string;
    description: string;
    damagesClaimed?: number;
  }): Promise<{
    min: number;
    max: number;
    mostLikely: number;
    confidence: number;
    factors: string[];
  }> {
    try {
      logger.info('Predicting settlement value', { claimType: claimData.type });

      // Fetch historical settlement data
      const { data: historicalSettlements } = await this.supabase
        .from('claims')
        .select('settlement_amount, type')
        .eq('type', claimData.type)
        .eq('status', 'settled')
        .not('settlement_amount', 'is', null);

      const systemPrompt = `You are an expert at estimating settlement values in labor law cases.`;

      const userPrompt = `Estimate settlement value for this claim:

CLAIM: ${JSON.stringify(claimData)}

HISTORICAL SETTLEMENTS: ${JSON.stringify(historicalSettlements)}

Provide estimate in JSON format with:
1. min: Minimum likely settlement
2. max: Maximum likely settlement
3. mostLikely: Most probable settlement value
4. confidence: Confidence level (0-1)
5. factors: Array of factors influencing valuation

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 1000,
        }
      );

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Settlement value prediction failed', { error });
      throw new Error('Failed to predict settlement value');
    }
  }

  /**
   * Identify patterns and anomalies in claims data
   */
  async detectAnomalies(
    tenantId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedClaims: string[];
    }>;
    patterns: Array<{
      pattern: string;
      frequency: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  }> {
    try {
      logger.info('Detecting anomalies', { tenantId, timeRange });

      // Fetch claims data for analysis
      const { data: claims } = await this.supabase
        .from('claims')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      const systemPrompt = `You are an expert data analyst specializing in identifying patterns and anomalies in legal case data.`;

      const userPrompt = `Analyze this claims data for anomalies and patterns:

DATA: ${JSON.stringify(claims)}

Provide analysis in JSON format with:
1. anomalies: Array of detected anomalies
2. patterns: Array of identified patterns

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      );

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Anomaly detection failed', { error });
      throw new Error('Failed to detect anomalies');
    }
  }

  /**
   * Helper: Fetch similar historical claims
   */
  private async fetchSimilarHistoricalClaims(
    claimType: string,
    description: string
  ): Promise<any[]> {
    try {
      // Use vector search for similarity
      const similarClaims = await aiOrchestrator.searchSimilarDocuments(
        description,
        10,
        { claimType, status: 'closed' }
      );

      return similarClaims;
    } catch (error) {
      logger.warn('Failed to fetch similar claims', { error });
      return [];
    }
  }

  /**
   * Helper: Build context from historical data
   */
  private buildHistoricalContext(historicalData: any[]): string {
    if (!historicalData.length) {
      return 'No historical data available.';
    }

    const outcomes = historicalData.reduce((acc, claim) => {
      const outcome = claim.metadata?.outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});

    return `Historical outcomes: ${JSON.stringify(outcomes)}
Total similar cases: ${historicalData.length}`;
  }

  /**
   * Helper: Fetch historical durations
   */
  private async fetchHistoricalDurations(claimType: string): Promise<{
    average: number;
    median: number;
    min: number;
    max: number;
  }> {
    const { data: claims } = await this.supabase
      .from('claims')
      .select('created_at, resolved_at')
      .eq('type', claimType)
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null);

    if (!claims || claims.length === 0) {
      return { average: 30, median: 30, min: 7, max: 90 }; // defaults
    }

    const durations = claims.map((c) => {
      const start = new Date(c.created_at);
      const end = new Date(c.resolved_at);
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    durations.sort((a, b) => a - b);

    return {
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      min: durations[0],
      max: durations[durations.length - 1],
    };
  }

  /**
   * Helper: Log prediction for learning
   */
  private async logPrediction(
    predictionType: string,
    input: any,
    output: any
  ): Promise<void> {
    try {
      await this.supabase.from('ai_predictions').insert({
        prediction_type: predictionType,
        input_data: input,
        output_data: output,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Failed to log prediction', { error });
    }
  }
}

// Singleton instance
export const predictiveAnalyticsEngine = new PredictiveAnalyticsEngine();
