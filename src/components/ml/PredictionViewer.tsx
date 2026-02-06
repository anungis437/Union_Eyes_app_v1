'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PredictionViewerProps {
  claimId: string;
  className?: string;
}

interface OutcomePrediction {
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
  estimatedDuration: number;
  settlementRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

interface TimelinePrediction {
  estimatedCompletionDate: string;
  confidence: number;
  milestones: Array<{
    name: string;
    estimatedDate: string;
    probability: number;
  }>;
  riskFactors: string[];
}

const outcomeConfig = {
  favorable: { label: 'Favorable', color: 'bg-green-500', icon: CheckCircle },
  unfavorable: { label: 'Unfavorable', color: 'bg-red-500', icon: AlertCircle },
  settlement: { label: 'Settlement', color: 'bg-blue-500', icon: DollarSign },
  withdrawal: { label: 'Withdrawal', color: 'bg-gray-500', icon: Target },
};

/**
 * ML Prediction Viewer
 * Displays AI predictions for claim outcome and timeline
 */
export function PredictionViewer({ claimId, className = '' }: PredictionViewerProps) {
  const [outcomePrediction, setOutcomePrediction] = useState<OutcomePrediction | null>(null);
  const [timelinePrediction, setTimelinePrediction] = useState<TimelinePrediction | null>(null);
  const [isLoadingOutcome, setIsLoadingOutcome] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomePrediction = async () => {
    setIsLoadingOutcome(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/claim-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch outcome prediction');
      }

      const data = await response.json();
      setOutcomePrediction(data.prediction);
    } catch (err) {
      setError('Failed to load outcome prediction');
    } finally {
      setIsLoadingOutcome(false);
    }
  };

  const fetchTimelinePrediction = async () => {
    setIsLoadingTimeline(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline prediction');
      }

      const data = await response.json();
      setTimelinePrediction(data.prediction);
    } catch (err) {
      setError('Failed to load timeline prediction');
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Outcome Prediction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Outcome Prediction</CardTitle>
            </div>
            {!outcomePrediction && (
              <Button 
                size="sm" 
                onClick={fetchOutcomePrediction}
                disabled={isLoadingOutcome}
              >
                {isLoadingOutcome ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generate Prediction'
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            AI-powered prediction of case outcome
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outcomePrediction ? (
            <div className="space-y-6">
              {/* Main Outcome */}
              <div className="rounded-lg border p-6 bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${outcomeConfig[outcomePrediction.outcome].color}`}>
                    {React.createElement(outcomeConfig[outcomePrediction.outcome].icon, {
                      className: 'h-6 w-6 text-white'
                    })}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {outcomeConfig[outcomePrediction.outcome].label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(outcomePrediction.probability * 100)}% probability
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round(outcomePrediction.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>

              {/* Key Factors */}
              <div>
                <h4 className="font-medium mb-3">Key Factors</h4>
                <div className="space-y-2">
                  {outcomePrediction.factors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        factor.impact === 'positive' ? 'bg-green-500' :
                        factor.impact === 'negative' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="flex-1">{factor.factor}</span>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(factor.weight * 100)}% weight
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h4 className="font-medium mb-2">Analysis</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {outcomePrediction.reasoning}
                </p>
              </div>

              {/* Suggested Strategy */}
              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Suggested Strategy</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {outcomePrediction.suggestedStrategy}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settlement Range */}
              {outcomePrediction.settlementRange && (
                <div>
                  <h4 className="font-medium mb-2">Settlement Range</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Min:</span>
                      <span className="ml-2 font-medium">
                        ${outcomePrediction.settlementRange.min.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max:</span>
                      <span className="ml-2 font-medium">
                        ${outcomePrediction.settlementRange.max.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Estimated Duration */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated duration: {outcomePrediction.estimatedDuration} days
                </span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOutcomePrediction}
                disabled={isLoadingOutcome}
              >
                Refresh Prediction
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click &quot;Generate Prediction&quot; to see AI analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Prediction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Timeline Forecast</CardTitle>
            </div>
            {!timelinePrediction && (
              <Button 
                size="sm" 
                onClick={fetchTimelinePrediction}
                disabled={isLoadingTimeline}
              >
                {isLoadingTimeline ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generate Forecast'
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            Predicted milestones and completion date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelinePrediction ? (
            <div className="space-y-6">
              {/* Completion Date */}
              <div className="rounded-lg border p-6 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">
                      Estimated Completion
                    </h4>
                    <p className="text-2xl font-bold">
                      {new Date(timelinePrediction.estimatedCompletionDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round(timelinePrediction.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>

              {/* Milestones */}
              {timelinePrediction.milestones && timelinePrediction.milestones.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Key Milestones</h4>
                  <div className="space-y-3">
                    {timelinePrediction.milestones.map((milestone, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{milestone.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(milestone.estimatedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(milestone.probability * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {timelinePrediction.riskFactors && timelinePrediction.riskFactors.length > 0 && (
                <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Risk Factors</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {timelinePrediction.riskFactors.map((risk, index) => (
                          <li key={index}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTimelinePrediction}
                disabled={isLoadingTimeline}
              >
                Refresh Forecast
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click &quot;Generate Forecast&quot; to see timeline prediction</p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
