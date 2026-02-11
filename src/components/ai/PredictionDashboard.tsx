import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface ClaimOutcomePrediction {
  outcome: 'favorable' | 'unfavorable' | 'settlement' | 'withdrawal';
  probability: number;
  confidence: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
  }[];
  reasoning: string;
  suggestedStrategy: string;
  estimatedDuration: number; // days
  settlementRange?: {
    min: number;
    max: number;
    mostLikely: number;
  };
}

interface TimelinePrediction {
  estimatedCompletionDate: Date;
  confidence: number;
  milestones: {
    name: string;
    estimatedDate: Date;
    probability: number;
  }[];
  riskFactors: string[];
}

interface ResourcePrediction {
  recommendedAssignee: string;
  estimatedEffort: number; // hours
  priority: number; // 1-10
  requiredSkills: string[];
  confidence: number;
  reasoning: string;
}

interface SettlementEstimate {
  min: number;
  max: number;
  mostLikely: number;
  confidence: number;
  factors: string[];
}

interface PredictionDashboardProps {
  claimId?: string;
  claimData?: any;
  tenantId: string;
  className?: string;
}

export function PredictionDashboard({
  claimId,
  claimData,
  tenantId,
  className = '',
}: PredictionDashboardProps) {
  const [outcomePrediction, setOutcomePrediction] = useState<ClaimOutcomePrediction | null>(null);
  const [timelinePrediction, setTimelinePrediction] = useState<TimelinePrediction | null>(null);
  const [resourcePrediction, setResourcePrediction] = useState<ResourcePrediction | null>(null);
  const [settlementEstimate, setSettlementEstimate] = useState<SettlementEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('outcome');

  const loadPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchOutcomePrediction(),
        fetchTimelinePrediction(),
        fetchResourcePrediction(),
        fetchSettlementEstimate(),
      ]);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [claimId, claimData, tenantId]);

  useEffect(() => {
    if (claimId || claimData) {
      loadPredictions();
    }
  }, [claimId, claimData, loadPredictions]);

  const fetchOutcomePrediction = async () => {
    if (!claimData) return;

    const response = await fetch('/api/ai/predict/outcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(claimData),
    });

    if (response.ok) {
      const { prediction } = await response.json();
      setOutcomePrediction(prediction);
    }
  };

  const fetchTimelinePrediction = async () => {
    if (!claimId) return;

    const response = await fetch('/api/ai/predict/timeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({ claimId }),
    });

    if (response.ok) {
      const { prediction } = await response.json();
      setTimelinePrediction(prediction);
    }
  };

  const fetchResourcePrediction = async () => {
    if (!claimData) return;

    const response = await fetch('/api/ai/predict/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(claimData),
    });

    if (response.ok) {
      const { prediction } = await response.json();
      setResourcePrediction(prediction);
    }
  };

  const fetchSettlementEstimate = async () => {
    if (!claimData) return;

    const response = await fetch('/api/ai/predict/settlement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(claimData),
    });

    if (response.ok) {
      const { prediction } = await response.json();
      setSettlementEstimate(prediction);
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'favorable':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'settlement':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'unfavorable':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'withdrawal':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'favorable':
        return <CheckCircle className="h-5 w-5" />;
      case 'settlement':
        return <Target className="h-5 w-5" />;
      case 'unfavorable':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Generating AI predictions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            AI Predictions
          </span>
          <Button variant="outline" size="sm" onClick={loadPredictions}>
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="outcome">Outcome</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="settlement">Settlement</TabsTrigger>
          </TabsList>

          {/* Outcome Tab */}
          <TabsContent value="outcome" className="space-y-4">
            {outcomePrediction ? (
              <>
                {/* Primary Prediction */}
                <div className={`p-6 border-2 rounded-lg ${getOutcomeColor(outcomePrediction.outcome)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getOutcomeIcon(outcomePrediction.outcome)}
                      <div>
                        <div className="text-2xl font-bold capitalize">
                          {outcomePrediction.outcome}
                        </div>
                        <div className="text-sm opacity-75">
                          {(outcomePrediction.probability * 100).toFixed(0)}% Probability
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-75">Confidence</div>
                      <div className="text-xl font-semibold">
                        {(outcomePrediction.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={outcomePrediction.probability * 100} className="h-2" />
                </div>

                {/* Reasoning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Reasoning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {outcomePrediction.reasoning}
                    </p>
                  </CardContent>
                </Card>

                {/* Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contributing Factors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {outcomePrediction.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                          factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{factor.factor}</div>
                          <div className="text-xs text-muted-foreground">
                            Weight: {(factor.weight * 100).toFixed(0)}%
                          </div>
                        </div>
                        <Badge variant={factor.impact === 'positive' ? 'default' : 'destructive'}>
                          {factor.impact}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Strategy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Suggested Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{outcomePrediction.suggestedStrategy}</p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="text-2xl font-bold">
                            {outcomePrediction.estimatedDuration}
                          </div>
                          <div className="text-sm text-muted-foreground">Days to Resolution</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {outcomePrediction.settlementRange && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(outcomePrediction.settlementRange.mostLikely)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Est. Settlement
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No outcome prediction available
              </p>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {timelinePrediction ? (
              <>
                {/* Completion Date */}
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-primary" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Estimated Completion
                          </div>
                          <div className="text-2xl font-bold">
                            {formatDate(timelinePrediction.estimatedCompletionDate)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <div className="text-xl font-semibold">
                          {(timelinePrediction.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Milestones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Predicted Milestones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timelinePrediction.milestones.map((milestone, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{milestone.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(milestone.estimatedDate)}
                            </div>
                            <Progress 
                              value={milestone.probability * 100} 
                              className="h-1 mt-2" 
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(milestone.probability * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Factors */}
                {timelinePrediction.riskFactors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Timeline Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {timelinePrediction.riskFactors.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-orange-500 flex-shrink-0">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No timeline prediction available
              </p>
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            {resourcePrediction ? (
              <>
                {/* Assignee Recommendation */}
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Recommended Steward
                        </div>
                        <div className="text-2xl font-bold">
                          {resourcePrediction.recommendedAssignee}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">
                        {(resourcePrediction.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">
                        Estimated Effort
                      </div>
                      <div className="text-2xl font-bold">
                        {resourcePrediction.estimatedEffort}h
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">
                        Priority Level
                      </div>
                      <div className="text-2xl font-bold">
                        {resourcePrediction.priority}/10
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Required Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Required Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {resourcePrediction.requiredSkills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Reasoning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assignment Reasoning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {resourcePrediction.reasoning}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No resource prediction available
              </p>
            )}
          </TabsContent>

          {/* Settlement Tab */}
          <TabsContent value="settlement" className="space-y-4">
            {settlementEstimate ? (
              <>
                {/* Settlement Range */}
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-6">
                      <DollarSign className="h-8 w-8 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Most Likely Settlement
                        </div>
                        <div className="text-3xl font-bold">
                          {formatCurrency(settlementEstimate.mostLikely)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-sm text-muted-foreground">Minimum</div>
                        <div className="text-xl font-semibold">
                          {formatCurrency(settlementEstimate.min)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Maximum</div>
                        <div className="text-xl font-semibold">
                          {formatCurrency(settlementEstimate.max)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Prediction Confidence</span>
                      <span className="text-muted-foreground">
                        {(settlementEstimate.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={settlementEstimate.confidence * 100} />
                  </CardContent>
                </Card>

                {/* Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contributing Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {settlementEstimate.factors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary flex-shrink-0">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Visual Range */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Settlement Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-16 bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 rounded-lg">
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg"
                        style={{
                          left: `${((settlementEstimate.mostLikely - settlementEstimate.min) / 
                                  (settlementEstimate.max - settlementEstimate.min)) * 100}%`
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No settlement estimate available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
