import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UsageData {
  feature: string;
  tokensUsed: number;
  requestCount: number;
  estimatedCost: number;
  averageResponseTime: number;
}

interface ProviderStats {
  provider: string;
  tokensUsed: number;
  requestCount: number;
  successRate: number;
  averageCost: number;
}

interface TrendData {
  date: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
}

interface AIUsageMetricsProps {
  tenantId: string;
  className?: string;
}

export function AIUsageMetrics({ tenantId, className = '' }: AIUsageMetricsProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [usageByFeature, setUsageByFeature] = useState<UsageData[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
    averageResponseTime: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/ai/usage/metrics?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setUsageByFeature(data.usageByFeature || []);
      setProviderStats(data.providerStats || []);
      setTrendData(data.trendData || []);
      setTotalStats(data.totalStats || totalStats);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, tenantId, totalStats]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getFeatureColor = (feature: string) => {
    const colors: Record<string, string> = {
      'document-analysis': 'bg-blue-500',
      'predictions': 'bg-green-500',
      'nl-query': 'bg-purple-500',
      'chat': 'bg-orange-500',
      'report-generation': 'bg-pink-500',
    };
    return colors[feature] || 'bg-gray-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              AI Usage Metrics
            </CardTitle>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">
                Total Tokens
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(totalStats.totalTokens)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all AI features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">
                Total Cost
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalStats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated API costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">
                Total Requests
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(totalStats.totalRequests)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              API calls made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatTime(totalStats.averageResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="features">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="features">By Feature</TabsTrigger>
              <TabsTrigger value="providers">By Provider</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Usage by Feature */}
            <TabsContent value="features" className="space-y-4">
              <div className="space-y-4">
                {usageByFeature.map((usage) => (
                  <div key={usage.feature} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getFeatureColor(
                            usage.feature
                          )}`}
                        />
                        <span className="font-medium capitalize">
                          {usage.feature.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatNumber(usage.tokensUsed)} tokens</span>
                        <span>{formatCurrency(usage.estimatedCost)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress
                        value={
                          (usage.tokensUsed / totalStats.totalTokens) * 100
                        }
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {((usage.tokensUsed / totalStats.totalTokens) * 100).toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{usage.requestCount} requests</span>
                      <span>
                        Avg: {formatTime(usage.averageResponseTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Usage by Provider */}
            <TabsContent value="providers" className="space-y-4">
              <div className="space-y-4">
                {providerStats.map((provider) => (
                  <Card key={provider.provider}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-semibold text-lg capitalize">
                            {provider.provider}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(provider.tokensUsed)} tokens •{' '}
                            {provider.requestCount} requests
                          </div>
                        </div>
                        <Badge
                          variant={
                            provider.successRate >= 0.95
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {(provider.successRate * 100).toFixed(1)}% Success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Average Cost per Request
                          </div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(provider.averageCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Total Cost
                          </div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(
                              provider.averageCost * provider.requestCount
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Trends */}
            <TabsContent value="trends" className="space-y-4">
              {/* Simple text-based trend visualization */}
              <div className="space-y-4">
                {trendData.map((trend, idx) => {
                  const prevTrend = trendData[idx - 1];
                  const tokenChange = prevTrend
                    ? ((trend.tokensUsed - prevTrend.tokensUsed) /
                        prevTrend.tokensUsed) *
                      100
                    : 0;
                  const costChange = prevTrend
                    ? ((trend.cost - prevTrend.cost) / prevTrend.cost) * 100
                    : 0;

                  return (
                    <Card key={trend.date}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="font-medium">{trend.date}</div>
                          <div className="flex gap-2">
                            {tokenChange !== 0 && (
                              <Badge
                                variant={
                                  tokenChange > 0 ? 'destructive' : 'default'
                                }
                              >
                                {tokenChange > 0 ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {Math.abs(tokenChange).toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Tokens
                            </div>
                            <div className="font-semibold">
                              {formatNumber(trend.tokensUsed)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Cost
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(trend.cost)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Requests
                            </div>
                            <div className="font-semibold">
                              {formatNumber(trend.requestCount)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Budget Alert */}
      {totalStats.totalCost > 1000 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-900 mb-1">
                  High Usage Alert
                </div>
                <p className="text-sm text-orange-700">
                  Your AI usage costs have exceeded $1,000 for the selected time
                  period. Consider reviewing your usage patterns or implementing
                  cost controls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
