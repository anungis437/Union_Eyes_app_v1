/**
 * Claims Analytics Dashboard
 * 
 * Comprehensive analytics for claim tracking, trends, performance metrics,
 * and forecasting. Provides insights into claim volumes, resolution times,
 * steward performance, and predictive analytics.
 * 
 * Created: November 15, 2025
 * Part of: Area 8 - Complete Analytics Platform
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendLineChart, 
  BarChartComponent, 
  PieChartComponent, 
  KPICard,
  AreaChartComponent,
  CHART_COLORS
} from '@/src/components/analytics/ChartComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  RefreshCwIcon,
  DownloadIcon,
  TrendingUpIcon,
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UserCheckIcon,
  BarChart3Icon,
  CalendarIcon,
  FilterIcon,
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ClaimsAnalytics {
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  deniedClaims: number;
  avgResolutionDays: number;
  medianResolutionDays: number;
  winRate: number;
  claimsByStatus: Record<string, number>;
  claimsByType: Record<string, number>;
  claimsByPriority: Record<string, number>;
  periodComparison: {
    claimsGrowth: number;
    resolutionTimeChange: number;
    winRateChange: number;
  };
}

interface TrendData {
  date: string;
  newClaims: number;
  resolvedClaims: number;
  avgResolutionDays: number;
  forecast?: number;
}

interface StewardPerformance {
  id: string;
  name: string;
  caseload: number;
  resolvedCount: number;
  avgResolutionDays: number;
  winRate: number;
  performanceScore: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  change: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClaimsAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<ClaimsAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [stewardPerformance, setStewardPerformance] = useState<StewardPerformance[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30'); // days
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchClaimsAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch main analytics
      const analyticsResponse = await fetch(
        `/api/analytics/claims?days=${dateRange}&groupBy=${viewMode}`
      );
      const analyticsData = await analyticsResponse.json();
      
      // Fetch trends with forecasting
      const trendsResponse = await fetch(
        `/api/analytics/claims/trends?days=${dateRange}&groupBy=${viewMode}&forecast=true`
      );
      const trendsData = await trendsResponse.json();
      
      // Fetch steward performance
      const stewardsResponse = await fetch(
        `/api/analytics/claims/stewards?days=${dateRange}`
      );
      const stewardsData = await stewardsResponse.json();
      
      // Fetch category breakdown
      const categoriesResponse = await fetch(
        `/api/analytics/claims/categories?days=${dateRange}`
      );
      const categoriesData = await categoriesResponse.json();

      setAnalytics(analyticsData);
      setTrends(trendsData);
      setStewardPerformance(stewardsData);
      setCategoryBreakdown(categoriesData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [dateRange, viewMode]);

  useEffect(() => {
    fetchClaimsAnalytics();
  }, [fetchClaimsAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/analytics/refresh', { method: 'POST' });
      await fetchClaimsAnalytics();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await fetch('/api/analytics/claims/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, dateRange, viewMode }),
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claims-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCwIcon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claims Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into claim trends, performance, and forecasting
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(val) => setViewMode(val as typeof viewMode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Claims"
          value={analytics.totalClaims.toLocaleString()}
          change={analytics.periodComparison.claimsGrowth}
          changeLabel={`${analytics.periodComparison.claimsGrowth > 0 ? '+' : ''}${analytics.periodComparison.claimsGrowth}% vs previous period`}
          icon={<FileTextIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Avg Resolution Time"
          value={`${analytics.avgResolutionDays.toFixed(1)} days`}
          change={analytics.periodComparison.resolutionTimeChange}
          changeLabel={`${analytics.periodComparison.resolutionTimeChange > 0 ? '+' : ''}${analytics.periodComparison.resolutionTimeChange}% vs previous period`}
          icon={<ClockIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          change={analytics.periodComparison.winRateChange}
          changeLabel={`${analytics.periodComparison.winRateChange > 0 ? '+' : ''}${analytics.periodComparison.winRateChange}% vs previous period`}
          icon={<CheckCircleIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Open Claims"
          value={analytics.openClaims.toLocaleString()}
          change={0}
          changeLabel={`${analytics.resolvedClaims} resolved this period`}
          icon={<AlertTriangleIcon className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends & Forecasting</TabsTrigger>
          <TabsTrigger value="breakdown">Claim Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Steward Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights & Patterns</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AreaChartComponent
              title="Claims Volume Trend"
              data={trends.map(t => ({
                name: t.date,
                value: t.newClaims,
                ...(t.forecast !== undefined && { forecast: t.forecast }),
              }))}
              areas={[
                { dataKey: 'value', name: 'Actual Claims', fill: CHART_COLORS.primary[0], stroke: CHART_COLORS.primary[0] },
                { dataKey: 'forecast', name: 'Forecast', fill: CHART_COLORS.purple[0], stroke: CHART_COLORS.purple[0] },
              ]}
              height={300}
            />

            <TrendLineChart
              title="Resolution Trend"
              data={trends.map(t => ({
                name: t.date,
                value: t.resolvedClaims,
              }))}
              lines={[
                { dataKey: 'value', stroke: CHART_COLORS.success[0], name: 'Resolved' }
              ]}
              height={300}
            />
          </div>

          <TrendLineChart
            title="Average Resolution Time Trend"
            data={trends.map(t => ({
              name: t.date,
              value: t.avgResolutionDays,
            }))}
            lines={[
              { dataKey: 'value', stroke: CHART_COLORS.warning[0], name: 'Avg Days' }
            ]}
            height={250}
          />
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <PieChartComponent
              title="By Status"
              data={Object.entries(analytics.claimsByStatus).map(([key, value]) => ({
                name: key.replace('_', ' ').toUpperCase(),
                value,
              }))}
              height={250}
            />

            <PieChartComponent
              title="By Type"
              data={Object.entries(analytics.claimsByType).map(([key, value]) => ({
                name: key.replace('_', ' ').toUpperCase(),
                value,
              }))}
              height={250}
            />

            <PieChartComponent
              title="By Priority"
              data={Object.entries(analytics.claimsByPriority).map(([key, value]) => ({
                name: key.toUpperCase(),
                value,
              }))}
              height={250}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown with Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{cat.category}</div>
                      <div className="text-sm text-muted-foreground">
                        {cat.count} claims ({cat.percentage.toFixed(1)}%)
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      cat.change > 0 ? 'text-green-600' : cat.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {cat.change > 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                      {Math.abs(cat.change).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <BarChartComponent
            title="Steward Performance Comparison"
            data={stewardPerformance.map(s => ({
              name: s.name,
              caseload: s.caseload,
              resolved: s.resolvedCount,
              winRate: s.winRate,
            }))}
            bars={[
              { dataKey: 'caseload', fill: CHART_COLORS.primary[0], name: 'Caseload' },
              { dataKey: 'resolved', fill: CHART_COLORS.success[0], name: 'Resolved' }
            ]}
            height={300}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <BarChartComponent
              title="Resolution Efficiency"
              data={stewardPerformance.map(s => ({
                name: s.name,
                days: s.avgResolutionDays,
              }))}
              bars={[
                { dataKey: 'days', fill: CHART_COLORS.warning[0], name: 'Avg Days' }
              ]}
              height={250}
            />

            <BarChartComponent
              title="Win Rate by Steward"
              data={stewardPerformance.map(s => ({
                name: s.name,
                rate: s.winRate,
              }))}
              bars={[
                { dataKey: 'rate', fill: CHART_COLORS.success[0], name: 'Win Rate %' }
              ]}
              height={250}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stewardPerformance
                  .sort((a, b) => b.performanceScore - a.performanceScore)
                  .slice(0, 10)
                  .map((steward, index) => (
                    <div key={steward.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{steward.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {steward.caseload} cases • {steward.resolvedCount} resolved • {steward.avgResolutionDays.toFixed(1)} avg days
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{steward.performanceScore}</div>
                        <div className="text-sm text-muted-foreground">Score</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUpIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900">Volume Trend</div>
                        <div className="text-sm text-blue-700 mt-1">
                          Claims volume increased by {analytics.periodComparison.claimsGrowth}% compared to the previous period.
                          {analytics.periodComparison.claimsGrowth > 20 && ' Consider resource allocation.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-green-900">Resolution Performance</div>
                        <div className="text-sm text-green-700 mt-1">
                          Average resolution time is {analytics.avgResolutionDays.toFixed(1)} days, with a median of {analytics.medianResolutionDays.toFixed(1)} days.
                          {analytics.avgResolutionDays < analytics.medianResolutionDays && ' Distribution shows some long-tail cases.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <BarChart3Icon className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-purple-900">Win Rate Analysis</div>
                        <div className="text-sm text-purple-700 mt-1">
                          Current win rate is {analytics.winRate.toFixed(1)}%, 
                          {analytics.periodComparison.winRateChange > 0 
                            ? ` up ${analytics.periodComparison.winRateChange}% from last period.` 
                            : ` down ${Math.abs(analytics.periodComparison.winRateChange)}% from last period.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-900">Open Cases</div>
                        <div className="text-sm text-orange-700 mt-1">
                          {analytics.openClaims} claims currently open. 
                          {analytics.openClaims > analytics.resolvedClaims && ' Open cases exceed resolved cases this period.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.periodComparison.resolutionTimeChange > 10 && (
                    <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                      <div className="font-medium text-yellow-900">⚠️ Resolution Time Increasing</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        Average resolution time has increased by {analytics.periodComparison.resolutionTimeChange}%. 
                        Review case complexity and resource allocation.
                      </div>
                    </div>
                  )}

                  {analytics.openClaims / analytics.totalClaims > 0.5 && (
                    <div className="p-4 border-l-4 border-red-500 bg-red-50">
                      <div className="font-medium text-red-900">🚨 High Open Case Ratio</div>
                      <div className="text-sm text-red-700 mt-1">
                        Over 50% of claims are currently open. Consider expediting case reviews and increasing steward capacity.
                      </div>
                    </div>
                  )}

                  {stewardPerformance.length > 0 && (
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                      <div className="font-medium text-blue-900">💡 Workload Distribution</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Top steward has {Math.max(...stewardPerformance.map(s => s.caseload))} cases while 
                        lowest has {Math.min(...stewardPerformance.map(s => s.caseload))}. 
                        Consider redistributing for better balance.
                      </div>
                    </div>
                  )}

                  {analytics.winRate > 85 && (
                    <div className="p-4 border-l-4 border-green-500 bg-green-50">
                      <div className="font-medium text-green-900">✅ Strong Performance</div>
                      <div className="text-sm text-green-700 mt-1">
                        Excellent win rate of {analytics.winRate.toFixed(1)}%. Document best practices for training purposes.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
