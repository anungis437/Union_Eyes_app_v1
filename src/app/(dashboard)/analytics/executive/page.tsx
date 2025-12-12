/**
 * Executive Dashboard Page
 * 
 * High-level KPI dashboard for C-suite and executive leadership
 * Displays strategic insights, trends, and performance metrics
 * 
 * Created: November 14, 2025
 * Part of: Area 5 - Analytics & Reporting System
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendLineChart, 
  BarChartComponent, 
  PieChartComponent, 
  KPICard,
  AreaChartComponent,
  CHART_COLORS
} from '@/src/components/analytics/ChartComponents';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  RefreshCwIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
  FileTextIcon,
  DollarSignIcon,
  ClockIcon,
  CheckCircleIcon
} from 'lucide-react';

interface ExecutiveSummary {
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  avgResolutionDays: number;
  activeMembers: number;
  activeStewards: number;
  onTimeDeadlineRate: number;
  totalClaimValue: number;
  winRate: number;
  periodComparison: {
    claimsGrowth: number;
    resolutionTimeChange: number;
    winRateChange: number;
  };
}

interface TrendData {
  period: string;
  value: number;
  changePercentage: number;
}

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(30); // days

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/executive?days=${dateRange}`);
      const data = await response.json();
      
      setSummary(data.summary);
      setTrends(data.trends);
    } catch (error) {
      console.error('Failed to fetch executive dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh materialized views first
      await fetch('/api/analytics/refresh', { method: 'POST' });
      // Then reload dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/exports/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: 'executive-dashboard',
          dateRange: { days: dateRange },
        }),
      });
      const data = await response.json();
      alert(`Export job created: ${data.jobId}. Check /exports for status.`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Prepare chart data
  const claimsTrendData = trends.map((t) => ({
    name: t.period,
    claims: t.value,
    growth: t.changePercentage,
  }));

  const statusDistribution = [
    { name: 'Open', value: summary.openClaims, fill: CHART_COLORS.warning[0] },
    { name: 'Resolved', value: summary.resolvedClaims, fill: CHART_COLORS.success[0] },
    { name: 'In Progress', value: summary.totalClaims - summary.openClaims - summary.resolvedClaims, fill: CHART_COLORS.primary[0] },
  ];

  const performanceMetrics = [
    { subject: 'Resolution Speed', value: Math.max(0, 100 - summary.avgResolutionDays * 2) },
    { subject: 'Win Rate', value: summary.winRate },
    { subject: 'Deadline Compliance', value: summary.onTimeDeadlineRate },
    { subject: 'Member Engagement', value: 75 }, // Placeholder
    { subject: 'Steward Efficiency', value: 80 }, // Placeholder
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">Strategic insights and performance overview</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Claims"
          value={summary.totalClaims}
          change={summary.periodComparison.claimsGrowth}
          icon={<FileTextIcon />}
          trend={summary.periodComparison.claimsGrowth > 0 ? 'up' : 'down'}
        />
        <KPICard
          title="Avg Resolution Time"
          value={`${summary.avgResolutionDays.toFixed(1)} days`}
          change={summary.periodComparison.resolutionTimeChange}
          icon={<ClockIcon />}
          trend={summary.periodComparison.resolutionTimeChange < 0 ? 'up' : 'down'}
        />
        <KPICard
          title="Win Rate"
          value={summary.winRate}
          change={summary.periodComparison.winRateChange}
          icon={<TrendingUpIcon />}
          trend={summary.periodComparison.winRateChange > 0 ? 'up' : 'down'}
          format="percent"
        />
        <KPICard
          title="Deadline Compliance"
          value={summary.onTimeDeadlineRate}
          icon={<CheckCircleIcon />}
          trend={summary.onTimeDeadlineRate >= 90 ? 'up' : summary.onTimeDeadlineRate >= 75 ? 'neutral' : 'down'}
          format="percent"
        />
        <KPICard
          title="Total Claim Value"
          value={summary.totalClaimValue}
          icon={<DollarSignIcon />}
          format="currency"
        />
        <KPICard
          title="Active Members"
          value={summary.activeMembers}
          icon={<UsersIcon />}
        />
        <KPICard
          title="Active Stewards"
          value={summary.activeStewards}
          icon={<UsersIcon />}
        />
        <KPICard
          title="Open Claims"
          value={summary.openClaims}
          icon={<FileTextIcon />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendLineChart
          title="Claims Trend (Last 12 Months)"
          data={claimsTrendData}
          lines={[
            { dataKey: 'claims', stroke: CHART_COLORS.primary[0], name: 'Total Claims' },
          ]}
          height={350}
        />
        <PieChartComponent
          title="Claims by Status"
          data={statusDistribution}
          height={350}
          innerRadius={60}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <h3 className="text-lg font-semibold mb-4">Monthly Claims Volume & Growth</h3>
          <BarChartComponent
            title=""
            data={claimsTrendData}
            bars={[
              { dataKey: 'claims', fill: CHART_COLORS.primary[0], name: 'Claims' },
            ]}
            height={300}
            showGrid={true}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Resolution Rate</span>
                <span className="text-sm font-semibold">
                  {((summary.resolvedClaims / summary.totalClaims) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(summary.resolvedClaims / summary.totalClaims) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Win Rate</span>
                <span className="text-sm font-semibold">{summary.winRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${summary.winRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Deadline Compliance</span>
                <span className="text-sm font-semibold">{summary.onTimeDeadlineRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    summary.onTimeDeadlineRate >= 90
                      ? 'bg-green-600'
                      : summary.onTimeDeadlineRate >= 75
                      ? 'bg-yellow-500'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${summary.onTimeDeadlineRate}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Quick Stats</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg. Case Age:</span>
                  <span className="font-semibold">{summary.avgResolutionDays.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cases/Steward:</span>
                  <span className="font-semibold">
                    {(summary.totalClaims / Math.max(1, summary.activeStewards)).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Active Rate:</span>
                  <span className="font-semibold">
                    {((summary.activeMembers / Math.max(1, summary.totalClaims)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Insights Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Executive Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📈 Volume Trend</h4>
            <p className="text-sm text-blue-800">
              Claims volume is {summary.periodComparison.claimsGrowth > 0 ? 'up' : 'down'}{' '}
              {Math.abs(summary.periodComparison.claimsGrowth)}% compared to the previous period.
              {summary.periodComparison.claimsGrowth > 10 && ' Consider resource allocation.'}
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">⚡ Performance</h4>
            <p className="text-sm text-green-800">
              Average resolution time is {summary.avgResolutionDays.toFixed(1)} days.
              {summary.avgResolutionDays < 14
                ? ' Excellent performance!'
                : summary.avgResolutionDays < 30
                ? ' Meeting targets.'
                : ' Needs improvement.'}
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">🎯 Compliance</h4>
            <p className="text-sm text-purple-800">
              Deadline compliance at {summary.onTimeDeadlineRate.toFixed(1)}%.
              {summary.onTimeDeadlineRate >= 90
                ? ' Outstanding!'
                : summary.onTimeDeadlineRate >= 75
                ? ' On track.'
                : ' Requires attention.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
