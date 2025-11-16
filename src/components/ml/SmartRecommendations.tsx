'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Calendar, 
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface Recommendation {
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  action?: {
    label: string;
    url: string;
  };
  metadata?: any;
}

interface SmartRecommendationsProps {
  type?: 'steward' | 'deadline' | 'strategy' | 'priority' | 'all';
  claimId?: string;
  className?: string;
}

const priorityConfig = {
  high: { color: 'destructive', icon: AlertTriangle },
  medium: { color: 'default' as const, icon: TrendingUp },
  low: { color: 'secondary' as const, icon: CheckCircle },
};

const typeIcons = {
  steward: Users,
  deadline: Calendar,
  strategy: Target,
  priority: TrendingUp,
};

/**
 * Smart Recommendations Component
 * AI-powered recommendations for steward assignment, deadlines, and strategies
 */
export function SmartRecommendations({ 
  type = 'all',
  claimId,
  className = '' 
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type });
      if (claimId) params.append('claimId', claimId);

      const response = await fetch(`/api/ml/recommendations?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError('Failed to load recommendations');
      console.error('Recommendations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [type, claimId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={fetchRecommendations} 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
          <CardDescription>
            AI-powered insights and suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm mt-1">No recommendations at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchRecommendations}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'} based on AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const priorityConf = priorityConfig[rec.priority];
            const PriorityIcon = priorityConf.icon;
            const TypeIcon = typeIcons[rec.type as keyof typeof typeIcons] || Lightbulb;

            return (
              <div
                key={index}
                className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <TypeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium leading-tight">{rec.title}</h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={priorityConf.color} className="text-xs">
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(rec.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>

                    {/* Metadata Display */}
                    {rec.metadata && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {rec.metadata.count !== undefined && (
                          <div>Count: {rec.metadata.count}</div>
                        )}
                        {rec.metadata.avgWorkload !== undefined && (
                          <div>Avg Workload: {Math.round(rec.metadata.avgWorkload)} claims/steward</div>
                        )}
                        {rec.metadata.oldestClaim && (
                          <div>Oldest: {rec.metadata.oldestClaim.age} days</div>
                        )}
                      </div>
                    )}

                    {rec.action && (
                      <Link href={rec.action.url}>
                        <Button size="sm" variant="outline" className="mt-2">
                          {rec.action.label}
                          <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
