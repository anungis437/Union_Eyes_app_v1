'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  TrendLineChart, 
  BarChartComponent, 
  PieChartComponent,
  AreaChartComponent,
  KPICard 
} from '@/components/analytics/ChartComponents';
import { 
  Download, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface FinancialSummary {
  totalClaimValue: number;
  totalSettlements: number;
  totalCosts: number;
  avgClaimValue: number;
  recoveryRate: number;
  costPerClaim: number;
  roi: number;
  previousPeriod: {
    totalClaimValue: number;
    totalSettlements: number;
    totalCosts: number;
    recoveryRate: number;
    roi: number;
  };
}

interface FinancialTrend {
  date: string;
  claimValue: number;
  settlements: number;
  costs: number;
  netValue: number;
}

interface OutcomeFinancial {
  outcome: string;
  count: number;
  totalValue: number;
  avgValue: number;
  percentage: number;
}

interface CategoryFinancial {
  category: string;
  totalValue: number;
  avgValue: number;
  settlements: number;
  costs: number;
  roi: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export default function FinancialAnalytics() {
  const [dateRange, setDateRange] = useState('90');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [trends, setTrends] = useState<FinancialTrend[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeFinancial[]>([]);
  const [categories, setCategories] = useState<CategoryFinancial[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange, viewMode]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, trendsRes, outcomesRes, categoriesRes, costsRes] = await Promise.all([
        fetch(`/api/analytics/financial?days=${dateRange}`),
        fetch(`/api/analytics/financial/trends?days=${dateRange}&groupBy=${viewMode}`),
        fetch(`/api/analytics/financial/outcomes?days=${dateRange}`),
        fetch(`/api/analytics/financial/categories?days=${dateRange}`),
        fetch(`/api/analytics/financial/costs?days=${dateRange}`)
      ]);

      const [summaryData, trendsData, outcomesData, categoriesData, costsData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        outcomesRes.json(),
        categoriesRes.json(),
        costsRes.json()
      ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setOutcomes(outcomesData);
      setCategories(categoriesData);
      setCostBreakdown(costsData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    console.log(`Exporting financial analytics as ${format}`);
    // Export implementation
  };

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const valueChange = calculateChange(summary.totalClaimValue, summary.previousPeriod.totalClaimValue);
  const settlementChange = calculateChange(summary.totalSettlements, summary.previousPeriod.totalSettlements);
  const costChange = calculateChange(summary.totalCosts, summary.previousPeriod.totalCosts);
  const roiChange = calculateChange(summary.roi, summary.previousPeriod.roi);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground">
            Track claim values, settlements, costs, and financial performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchFinancialData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Claim Value"
          value={formatCurrency(summary.totalClaimValue)}
          change={valueChange}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Total Settlements"
          value={formatCurrency(summary.totalSettlements)}
          change={settlementChange}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Recovery Rate"
          value={`${summary.recoveryRate.toFixed(1)}%`}
          change={calculateChange(summary.recoveryRate, summary.previousPeriod.recoveryRate)}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="ROI"
          value={`${summary.roi.toFixed(1)}%`}
          change={roiChange}
          icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Financial Trends</CardTitle>
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <AreaChartComponent
                  data={trends}
                  xKey="date"
                  yKeys={[
                    { key: 'claimValue', name: 'Claim Value', color: '#3b82f6' },
                    { key: 'settlements', name: 'Settlements', color: '#10b981' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Value Trend</CardTitle>
                <CardDescription>Settlements minus costs over time</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendLineChart
                  data={trends}
                  xKey="date"
                  yKey="netValue"
                  height={300}
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Claim Value</span>
                  <span className="font-semibold">{formatCurrency(summary.avgClaimValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cost Per Claim</span>
                  <span className="font-semibold">{formatCurrency(summary.costPerClaim)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Costs</span>
                  <span className="font-semibold">{formatCurrency(summary.totalCosts)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Net Recovery</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(summary.totalSettlements - summary.totalCosts)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance vs Previous Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Claim Value</span>
                  <span className={`font-semibold ${valueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(valueChange)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Settlements</span>
                  <span className={`font-semibold ${settlementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(settlementChange)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Costs</span>
                  <span className={`font-semibold ${costChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(costChange)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">ROI</span>
                  <span className={`font-bold ${roiChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(roiChange)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary.roi > 50 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Strong ROI</p>
                      <p className="text-xs text-muted-foreground">
                        ROI of {summary.roi.toFixed(1)}% indicates excellent returns
                      </p>
                    </div>
                  </div>
                )}
                {summary.recoveryRate > 70 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">High Recovery Rate</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.recoveryRate.toFixed(1)}% of claim value recovered
                      </p>
                    </div>
                  </div>
                )}
                {summary.costPerClaim < summary.avgClaimValue * 0.3 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Cost Efficient</p>
                      <p className="text-xs text-muted-foreground">
                        Costs are only {((summary.costPerClaim / summary.avgClaimValue) * 100).toFixed(1)}% of claim value
                      </p>
                    </div>
                  </div>
                )}
                {summary.roi < 20 && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Low ROI</p>
                      <p className="text-xs text-muted-foreground">
                        Consider reviewing cost management strategies
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outcomes Tab */}
        <TabsContent value="outcomes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Financial Outcomes Distribution</CardTitle>
                <CardDescription>Total value by outcome type</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  data={outcomes.map(o => ({ name: o.outcome, value: o.totalValue }))}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {outcomes.map((outcome) => (
                    <div key={outcome.outcome} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{outcome.outcome}</span>
                        <span className="text-sm text-muted-foreground">
                          {outcome.count} claims ({outcome.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Value</span>
                          <p className="font-semibold">{formatCurrency(outcome.totalValue)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Value</span>
                          <p className="font-semibold">{formatCurrency(outcome.avgValue)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Performance by Category</CardTitle>
              <CardDescription>ROI and settlement analysis across claim types</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={categories}
                xKey="category"
                yKeys={[
                  { key: 'totalValue', name: 'Total Value', color: '#3b82f6' },
                  { key: 'settlements', name: 'Settlements', color: '#10b981' },
                  { key: 'costs', name: 'Costs', color: '#ef4444' }
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Total Value</th>
                      <th className="text-right p-2">Avg Value</th>
                      <th className="text-right p-2">Settlements</th>
                      <th className="text-right p-2">Costs</th>
                      <th className="text-right p-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.category} className="border-b">
                        <td className="p-2 font-medium">{cat.category}</td>
                        <td className="p-2 text-right">{formatCurrency(cat.totalValue)}</td>
                        <td className="p-2 text-right">{formatCurrency(cat.avgValue)}</td>
                        <td className="p-2 text-right">{formatCurrency(cat.settlements)}</td>
                        <td className="p-2 text-right">{formatCurrency(cat.costs)}</td>
                        <td className={`p-2 text-right font-semibold ${cat.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cat.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Distribution of costs by category</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  data={costBreakdown.map(c => ({ name: c.category, value: c.amount }))}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costBreakdown.map((cost) => (
                    <div key={cost.category} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{cost.category}</p>
                        <p className="text-sm text-muted-foreground">{cost.percentage.toFixed(1)}% of total</p>
                      </div>
                      <span className="font-semibold">{formatCurrency(cost.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t-2">
                    <p className="font-bold">Total Costs</p>
                    <span className="font-bold text-lg">{formatCurrency(summary.totalCosts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
