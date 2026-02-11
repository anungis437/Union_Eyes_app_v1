/**
 * Member Engagement Analytics Dashboard
 * 
 * Comprehensive analytics for member engagement, cohort analysis, retention tracking,
 * and churn risk prediction. Provides insights into member activity patterns,
 * engagement levels, and retention metrics.
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
  UsersIcon,
  UserCheckIcon,
  UserMinusIcon,
  AlertCircleIcon,
  ActivityIcon,
  CalendarIcon,
  PercentIcon,
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface MemberAnalytics {
  totalMembers: number;
  activeMembers: number;
  newMembers30Days: number;
  churnedMembers30Days: number;
  retentionRate: number;
  avgClaimsPerMember: number;
  avgEngagementScore: number;
  engagementDistribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  periodComparison: {
    memberGrowth: number;
    activeGrowth: number;
    retentionChange: number;
  };
}

interface CohortData {
  cohortMonth: string;
  size: number;
  active: number;
  retentionRate: number;
  avgLifetimeClaims: number;
}

interface ChurnRiskMember {
  id: string;
  name: string;
  daysSinceLastActivity: number;
  totalClaims: number;
  churnRiskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface EngagementTrend {
  month: string;
  activeMembers: number;
  newMembers: number;
  churnedMembers: number;
  engagementScore: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function MemberEngagementDashboard() {
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [churnRisk, setChurnRisk] = useState<ChurnRiskMember[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('90'); // days
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium'>('high');

  const fetchMemberAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch main analytics
      const analyticsResponse = await fetch(
        `/api/analytics/members?days=${dateRange}`
      );
      const analyticsData = await analyticsResponse.json();
      
      // Fetch cohort analysis
      const cohortsResponse = await fetch(
        `/api/analytics/members/cohorts?months=12`
      );
      const cohortsData = await cohortsResponse.json();
      
      // Fetch churn risk members
      const churnResponse = await fetch(
        `/api/analytics/members/churn-risk?riskLevel=${riskFilter}`
      );
      const churnData = await churnResponse.json();
      
      // Fetch engagement trends
      const trendsResponse = await fetch(
        `/api/analytics/members/trends?months=12`
      );
      const trendsData = await trendsResponse.json();

      setAnalytics(analyticsData);
      setCohorts(cohortsData);
      setChurnRisk(churnData);
      setEngagementTrends(trendsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [dateRange, riskFilter]);

  useEffect(() => {
    fetchMemberAnalytics();
  }, [fetchMemberAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/analytics/refresh', { method: 'POST' });
      await fetchMemberAnalytics();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await fetch('/api/analytics/members/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, dateRange }),
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `member-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
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
          <h1 className="text-3xl font-bold">Member Engagement Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Cohort analysis, retention tracking, and churn risk prediction
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
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
          title="Total Members"
          value={analytics.totalMembers.toLocaleString()}
          change={analytics.periodComparison.memberGrowth}
          changeLabel={`${analytics.periodComparison.memberGrowth > 0 ? '+' : ''}${analytics.periodComparison.memberGrowth}% vs previous period`}
          icon={<UsersIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Active Members"
          value={analytics.activeMembers.toLocaleString()}
          change={analytics.periodComparison.activeGrowth}
          changeLabel={`${analytics.periodComparison.activeGrowth > 0 ? '+' : ''}${analytics.periodComparison.activeGrowth}% vs previous period`}
          icon={<UserCheckIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Retention Rate"
          value={`${analytics.retentionRate.toFixed(1)}%`}
          change={analytics.periodComparison.retentionChange}
          changeLabel={`${analytics.periodComparison.retentionChange > 0 ? '+' : ''}${analytics.periodComparison.retentionChange}% vs previous period`}
          icon={<PercentIcon className="w-5 h-5" />}
        />

        <KPICard
          title="Avg Engagement Score"
          value={analytics.avgEngagementScore.toFixed(0)}
          change={0}
          changeLabel={`${analytics.avgClaimsPerMember.toFixed(1)} avg claims per member`}
          icon={<ActivityIcon className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="churn">Churn Risk</TabsTrigger>
          <TabsTrigger value="trends">Engagement Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  title="Engagement Distribution"
                  data={[
                    { name: 'High Engagement', value: analytics.engagementDistribution.high },
                    { name: 'Medium Engagement', value: analytics.engagementDistribution.medium },
                    { name: 'Low Engagement', value: analytics.engagementDistribution.low },
                    { name: 'Inactive', value: analytics.engagementDistribution.inactive },
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <ArrowUpIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-900">New Members (30 days)</div>
                        <div className="text-2xl font-bold text-green-900">{analytics.newMembers30Days}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <ArrowDownIcon className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Churned Members (30 days)</div>
                        <div className="text-2xl font-bold text-red-900">{analytics.churnedMembers30Days}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <ActivityIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">Avg Claims per Member</div>
                        <div className="text-2xl font-bold text-blue-900">{analytics.avgClaimsPerMember.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Member Growth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChartComponent
                title="Member Growth Trend"
                data={engagementTrends.map(t => ({
                  name: t.month,
                  active: t.activeMembers,
                  new: t.newMembers,
                }))}
                areas={[
                  { dataKey: 'active', name: 'Active', fill: CHART_COLORS.primary[0], stroke: CHART_COLORS.primary[0] },
                  { dataKey: 'new', name: 'New', fill: CHART_COLORS.success[0], stroke: CHART_COLORS.success[0] }
                ]}
                height={300}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Retention Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track retention rates by signup cohort
              </p>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                title="Cohort Retention Analysis"
                data={cohorts.map(c => ({
                  name: c.cohortMonth,
                  size: c.size,
                  active: c.active,
                  retention: c.retentionRate,
                }))}
                bars={[
                  { dataKey: 'size', name: 'Total Size', fill: CHART_COLORS.primary[0] },
                  { dataKey: 'active', name: 'Active', fill: CHART_COLORS.success[0] }
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cohort Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cohorts.map((cohort) => (
                  <div key={cohort.cohortMonth} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{cohort.cohortMonth}</div>
                      <div className="text-sm text-muted-foreground">
                        {cohort.size} members • {cohort.active} active • {cohort.avgLifetimeClaims.toFixed(1)} avg claims
                      </div>
                    </div>
                    <div className={`text-right`}>
                      <div className={`font-bold text-lg ${
                        cohort.retentionRate >= 80 ? 'text-green-600' :
                        cohort.retentionRate >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {cohort.retentionRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Retention</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Risk Tab */}
        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Members at Risk of Churning</CardTitle>
                <Select value={riskFilter} onValueChange={(val) => setRiskFilter(val as typeof riskFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {churnRisk.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No members at risk in this category
                  </div>
                ) : (
                  churnRisk.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          member.riskLevel === 'high' ? 'bg-red-500' :
                          member.riskLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.totalClaims} claims • Last activity: {member.daysSinceLastActivity} days ago
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          member.riskLevel === 'high' ? 'text-red-600' :
                          member.riskLevel === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {member.churnRiskScore}
                        </div>
                        <div className="text-sm text-muted-foreground">Risk Score</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircleIcon className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {churnRisk.filter(m => m.riskLevel === 'high').length}
                    </div>
                    <div className="text-sm text-red-700">High Risk Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircleIcon className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {churnRisk.filter(m => m.riskLevel === 'medium').length}
                    </div>
                    <div className="text-sm text-yellow-700">Medium Risk Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserCheckIcon className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {analytics.activeMembers - churnRisk.length}
                    </div>
                    <div className="text-sm text-green-700">Healthy Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                title="Engagement Score Trend"
                data={engagementTrends.map(t => ({
                  name: t.month,
                  value: t.engagementScore,
                }))}
                lines={[
                  { dataKey: 'value', stroke: CHART_COLORS.purple[0], name: 'Score' }
                ]}
                height={250}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New vs Churned Members</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  title="New vs Churned Members"
                  data={engagementTrends.map(t => ({
                    name: t.month,
                    new: t.newMembers,
                    churned: t.churnedMembers,
                  }))}
                  bars={[
                    { dataKey: 'new', name: 'New', fill: CHART_COLORS.success[0] },
                    { dataKey: 'churned', name: 'Churned', fill: CHART_COLORS.danger[0] }
                  ]}
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Member Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <AreaChartComponent
                  title="Active Member Trend"
                  data={engagementTrends.map(t => ({
                    name: t.month,
                    value: t.activeMembers,
                  }))}
                  areas={[
                    { dataKey: 'value', name: 'Active', fill: CHART_COLORS.primary[0], stroke: CHART_COLORS.primary[0] }
                  ]}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
