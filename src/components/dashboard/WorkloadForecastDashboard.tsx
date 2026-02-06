'use client';

/**
 * UC-08: Workload Forecasting Dashboard
 * 
 * Displays predicted case volume to help stewards plan resource allocation.
 * Features:
 * - Historical + predicted volume line chart with confidence intervals
 * - Trend indicators and analysis
 * - Peak date alerts
 * - Resource allocation recommendations
 * - Forecast accuracy metrics
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface ForecastPoint {
  date: string;
  predictedVolume: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactor: number;
}

interface WorkloadForecast {
  organizationId: string;
  forecastHorizon: number;
  predictions: ForecastPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  accuracy: number;
  averageVolume: number;
  peakDates: string[];
  resourceRecommendations: string[];
  generatedAt: string;
}

interface ChartDataPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  displayDate: string;
}

export function WorkloadForecastDashboard() {
  const [forecast, setForecast] = useState<WorkloadForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, granularity]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ml/predictions/workload-forecast?horizon=${horizon}&granularity=${granularity}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Forecast error:', errorData);
        setForecast(null);
        return;
      }

      const data = await response.json();
      setForecast(data);
    } catch (error) {
      console.error('Error loading workload forecast:', error);
      setForecast(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadForecast();
  };

  const handleExport = () => {
    if (!forecast) return;

    const csvData = [
      ['Date', 'Predicted Volume', 'Lower Bound', 'Upper Bound', 'Trend'],
      ...forecast.predictions.map(p => [
        p.date,
        p.predictedVolume.toString(),
        p.confidenceInterval.lower.toString(),
        p.confidenceInterval.upper.toString(),
        p.trend
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-forecast-${horizon}day-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4" />;
      case 'stable':
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-orange-600 bg-orange-50';
      case 'decreasing':
        return 'text-blue-600 bg-blue-50';
      case 'stable':
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 85) return 'text-green-600 bg-green-50';
    if (accuracy >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const prepareChartData = (): ChartDataPoint[] => {
    if (!forecast) return [];

    return forecast.predictions.map(p => ({
      date: p.date,
      predicted: p.predictedVolume,
      lower: p.confidenceInterval.lower,
      upper: p.confidenceInterval.upper,
      displayDate: formatDateForChart(p.date)
    }));
  };

  const formatDateForChart = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (granularity === 'weekly') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading workload forecast...</p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-600" />
            Workload Forecast Not Available
          </CardTitle>
          <CardDescription>
            No forecast data found. Please run the training script to generate predictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              To generate workload forecasts, run the following command:
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>pnpm ml:train:workload</code>
            </pre>
            <p className="text-sm text-gray-600">
              This will analyze historical case data and generate 30, 60, and 90-day forecasts
              to help you plan staffing and resource allocation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = prepareChartData();

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workload Forecast</h2>
          <p className="text-muted-foreground">
            Predict case volume to optimize resource allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!forecast}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast Horizon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast.forecastHorizon} Days</div>
            <p className="text-xs text-muted-foreground">
              Through {new Date(forecast.predictions[forecast.predictions.length - 1].date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast.averageVolume}</div>
            <p className="text-xs text-muted-foreground">
              Cases per {granularity === 'daily' ? 'day' : 'week'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
            {getTrendIcon(forecast.trend)}
          </CardHeader>
          <CardContent>
            <Badge className={getTrendColor(forecast.trend)}>
              {forecast.trend.charAt(0).toUpperCase() + forecast.trend.slice(1)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {forecast.trend === 'increasing' && 'Plan for increased capacity'}
              {forecast.trend === 'decreasing' && 'Opportunity for training'}
              {forecast.trend === 'stable' && 'Maintain current staffing'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast.accuracy}%</div>
            <Badge className={getAccuracyColor(forecast.accuracy)}>
              {forecast.accuracy >= 80 ? 'High Confidence' : 'Moderate Confidence'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Forecast Settings</CardTitle>
              <CardDescription>Adjust time horizon and granularity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Time Horizon</label>
              <div className="flex gap-2">
                {([30, 60, 90] as const).map((days) => (
                  <Button
                    key={days}
                    variant={horizon === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHorizon(days)}
                  >
                    {days} Days
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Granularity</label>
              <div className="flex gap-2">
                <Button
                  variant={granularity === 'daily' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('daily')}
                >
                  Daily
                </Button>
                <Button
                  variant={granularity === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('weekly')}
                >
                  Weekly
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Dates Alert */}
      {forecast.peakDates.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              High Volume Dates Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800 mb-2">
              {forecast.peakDates.length} days with volume 20%+ above average:
            </p>
            <div className="flex flex-wrap gap-2">
              {forecast.peakDates.slice(0, 10).map(date => (
                <Badge key={date} variant="outline" className="bg-white">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Badge>
              ))}
              {forecast.peakDates.length > 10 && (
                <Badge variant="outline" className="bg-white">
                  +{forecast.peakDates.length - 10} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume Forecast with Confidence Intervals</CardTitle>
          <CardDescription>
            Predicted case volume with ±20% confidence bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                interval={granularity === 'daily' ? Math.floor(chartData.length / 10) : 0}
              />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-4 border rounded-lg shadow-lg">
                        <p className="font-semibold mb-2">{payload[0].payload.displayDate}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-600">
                            Predicted: <span className="font-bold">{payload[1].value}</span> cases
                          </p>
                          <p className="text-gray-600">
                            Range: {payload[0].value} - {payload[2].value} cases
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="lower"
                stackId="1"
                stroke="none"
                fill="#93c5fd"
                fillOpacity={0.3}
                name="Lower Bound"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stackId="2"
                stroke="#3b82f6"
                fill="none"
                strokeWidth={3}
                name="Predicted Volume"
              />
              <Area
                type="monotone"
                dataKey="upper"
                stackId="3"
                stroke="none"
                fill="#93c5fd"
                fillOpacity={0.3}
                name="Upper Bound"
              />
              <ReferenceLine 
                y={forecast.averageVolume} 
                stroke="#6b7280" 
                strokeDasharray="5 5"
                label={{ value: 'Average', position: 'right', fill: '#6b7280' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resource Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resource Allocation Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered staffing suggestions based on forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecast.resourceRecommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {recommendation.startsWith('⚠️') && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                  {recommendation.startsWith('✅') && <Info className="h-5 w-5 text-green-600" />}
                  {recommendation.startsWith('📈') && <TrendingUp className="h-5 w-5 text-blue-600" />}
                  {recommendation.startsWith('📉') && <TrendingDown className="h-5 w-5 text-gray-600" />}
                  {!recommendation.match(/^[⚠️✅📈📉]/) && <Info className="h-5 w-5 text-gray-600" />}
                </div>
                <p className="text-sm text-gray-700 flex-1">
                  {recommendation.replace(/^[⚠️✅📈📉💡📅⚡📆➡️]\s*/, '')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forecast Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Forecast Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Generated</p>
              <p className="font-medium">
                {new Date(forecast.generatedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Model Type</p>
              <p className="font-medium">Time Series Decomposition</p>
            </div>
            <div>
              <p className="text-gray-600">Data Points</p>
              <p className="font-medium">{forecast.predictions.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Organization</p>
              <p className="font-medium truncate">{forecast.organizationId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
