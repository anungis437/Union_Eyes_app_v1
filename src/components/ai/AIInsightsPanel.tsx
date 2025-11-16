import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  X,
  ChevronRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@unioneyes/ui/components/card';
import { Button } from '@unioneyes/ui/components/button';
import { Badge } from '@unioneyes/ui/components/badge';
import { ScrollArea } from '@unioneyes/ui/components/scroll-area';

interface Insight {
  id: string;
  type: 'suggestion' | 'warning' | 'opportunity';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
  dismissed?: boolean;
  helpful?: boolean;
}

interface AIInsightsPanelProps {
  tenantId: string;
  context?: {
    page?: string;
    claimId?: string;
    memberId?: string;
    [key: string]: any;
  };
  onInsightAction?: (insight: Insight) => void;
  className?: string;
}

export function AIInsightsPanel({
  tenantId,
  context,
  onInsightAction,
  className = '',
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInsights();
  }, [context]);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      // In production, this would call your AI insights API
      // For now, simulate with mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockInsights: Insight[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Claim Approaching Deadline',
          description: 'Claim #C-2024-001 requires action within 3 days to avoid deadline issues.',
          priority: 'high',
          actionLabel: 'View Claim',
          actionUrl: '/claims/C-2024-001',
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'suggestion',
          title: 'Consider Settlement Option',
          description: 'AI predicts 78% chance of favorable settlement for Claim #C-2024-002.',
          priority: 'medium',
          actionLabel: 'View Analysis',
          actionUrl: '/claims/C-2024-002/predictions',
          createdAt: new Date(),
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'Pattern Detected',
          description: 'Similar claims from this employer could be grouped for efficiency.',
          priority: 'low',
          actionLabel: 'View Pattern',
          createdAt: new Date(),
        },
      ];

      setInsights(mockInsights);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissInsight = (insightId: string) => {
    setDismissedIds((prev) => new Set(prev).add(insightId));
    setInsights((prev) => prev.filter((i) => i.id !== insightId));
  };

  const provideFeedback = async (insightId: string, helpful: boolean) => {
    setInsights((prev) =>
      prev.map((insight) =>
        insight.id === insightId ? { ...insight, helpful } : insight
      )
    );

    // In production, send feedback to backend
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          feedbackType: 'insight',
          referenceId: insightId,
          rating: helpful ? 5 : 1,
          feedbackText: helpful ? 'Helpful insight' : 'Not helpful',
        }),
      });
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  };

  const handleAction = (insight: Insight) => {
    if (onInsightAction) {
      onInsightAction(insight);
    }
    if (insight.actionUrl) {
      window.location.href = insight.actionUrl;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'opportunity':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const visibleInsights = insights.filter((i) => !dismissedIds.has(i.id));

  if (visibleInsights.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          AI Insights
          {visibleInsights.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {visibleInsights.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading insights...
              </div>
            ) : (
              visibleInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg space-y-3 ${getTypeColor(insight.type)}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getTypeIcon(insight.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{insight.title}</div>
                        <p className="text-xs mt-1 opacity-90">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={getPriorityColor(insight.priority)} className="text-xs">
                        {insight.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissInsight(insight.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Action Button */}
                  {insight.actionLabel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(insight)}
                      className="w-full justify-between"
                    >
                      {insight.actionLabel}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Feedback */}
                  {insight.helpful === undefined && (
                    <div className="flex items-center justify-between pt-2 border-t border-current/20">
                      <span className="text-xs opacity-75">Was this helpful?</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => provideFeedback(insight.id, true)}
                          className="h-7 px-2"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => provideFeedback(insight.id, false)}
                          className="h-7 px-2"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Confirmation */}
                  {insight.helpful !== undefined && (
                    <div className="pt-2 border-t border-current/20 text-xs opacity-75">
                      {insight.helpful
                        ? '✓ Thank you for your feedback!'
                        : '✓ Feedback received, we\'ll improve!'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          className="w-full mt-4"
        >
          Refresh Insights
        </Button>
      </CardContent>
    </Card>
  );
}
