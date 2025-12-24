/**
 * AI Monitoring Dashboard - Real-Time Model Performance & Data Quality
 * 
 * Implements the 4-tab dashboard specified in AI_MONITORING_PROCEDURES.md:
 * - Tab 1: Overview (system health, key metrics)
 * - Tab 2: Model Performance (accuracy, precision, recall, F1)
 * - Tab 3: Data Quality (drift detection, completeness)
 * - Tab 4: User Activity (adoption metrics, usage trends)
 * 
 * @see docs/ai/AI_MONITORING_PROCEDURES.md for complete specifications
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  Database, 
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Types
interface ModelMetrics {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  predictions24h: number;
  avgConfidence: number;
  lastUpdated: Date;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface DriftMetrics {
  metric: string;
  currentValue: number;
  baselineValue: number;
  psiScore: number; // Population Stability Index
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface AlertItem {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  message: string;
  modelName: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface UsageMetrics {
  date: string;
  activeUsers: number;
  predictions: number;
  avgResponseTime: number;
}

// Mock data (replace with real API calls in production)
const generateMockModelMetrics = (): ModelMetrics[] => [
  {
    modelName: 'Claim Outcome Prediction',
    accuracy: 0.867,
    precision: 0.842,
    recall: 0.823,
    f1Score: 0.832,
    predictions24h: 1247,
    avgConfidence: 0.78,
    lastUpdated: new Date(),
    status: 'healthy',
    trend: 'stable'
  },
  {
    modelName: 'Timeline Forecasting',
    accuracy: 0.782,
    precision: 0.765,
    recall: 0.798,
    f1Score: 0.781,
    predictions24h: 856,
    avgConfidence: 0.72,
    lastUpdated: new Date(),
    status: 'warning',
    trend: 'down'
  },
  {
    modelName: 'Churn Risk Prediction',
    accuracy: 0.891,
    precision: 0.878,
    recall: 0.865,
    f1Score: 0.871,
    predictions24h: 2134,
    avgConfidence: 0.84,
    lastUpdated: new Date(),
    status: 'healthy',
    trend: 'up'
  },
  {
    modelName: 'Smart Assignment',
    accuracy: 0.724,
    precision: 0.698,
    recall: 0.745,
    f1Score: 0.721,
    predictions24h: 432,
    avgConfidence: 0.68,
    lastUpdated: new Date(),
    status: 'warning',
    trend: 'down'
  }
];

const generateMockDriftMetrics = (): DriftMetrics[] => [
  {
    metric: 'Feature: Member Age',
    currentValue: 42.3,
    baselineValue: 41.8,
    psiScore: 0.12,
    threshold: 0.25,
    status: 'healthy'
  },
  {
    metric: 'Feature: Case Complexity',
    currentValue: 3.2,
    baselineValue: 2.9,
    psiScore: 0.28,
    threshold: 0.25,
    status: 'critical'
  },
  {
    metric: 'Feature: Union Tenure',
    currentValue: 5.7,
    baselineValue: 5.6,
    psiScore: 0.08,
    threshold: 0.25,
    status: 'healthy'
  },
  {
    metric: 'Prediction Distribution',
    currentValue: 0.62,
    baselineValue: 0.58,
    psiScore: 0.22,
    threshold: 0.25,
    status: 'warning'
  }
];

const generateMockAlerts = (): AlertItem[] => [
  {
    id: '1',
    severity: 'P2',
    message: 'Timeline Forecasting accuracy below 80% for 2 consecutive days',
    modelName: 'Timeline Forecasting',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    acknowledged: false
  },
  {
    id: '2',
    severity: 'P1',
    message: 'Data drift detected: Case Complexity PSI = 0.28 (threshold: 0.25)',
    modelName: 'Claim Outcome Prediction',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    acknowledged: false
  },
  {
    id: '3',
    severity: 'P3',
    message: 'Smart Assignment acceptance rate below 75%',
    modelName: 'Smart Assignment',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    acknowledged: true
  }
];

const generateMockUsageData = (): UsageMetrics[] => {
  const data: UsageMetrics[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 30) + 40,
      predictions: Math.floor(Math.random() * 2000) + 3000,
      avgResponseTime: Math.random() * 500 + 800
    });
  }
  return data;
};

export function AIMonitoringDashboard() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [driftMetrics, setDriftMetrics] = useState<DriftMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [usageData, setUsageData] = useState<UsageMetrics[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load data on mount
  useEffect(() => {
    loadData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    // In production, replace with real API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    setModelMetrics(generateMockModelMetrics());
    setDriftMetrics(generateMockDriftMetrics());
    setAlerts(generateMockAlerts());
    setUsageData(generateMockUsageData());
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const exportData = () => {
    // Implement CSV export functionality
    console.log('Exporting dashboard data...');
  };

  // Calculate overall system health
  const systemHealth = modelMetrics.filter(m => m.status === 'healthy').length / modelMetrics.length;
  const criticalAlerts = alerts.filter(a => !a.acknowledged && (a.severity === 'P1' || a.severity === 'P2')).length;

  return (
    <div className="w-full space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time model performance, data quality, and usage metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(systemHealth * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {modelMetrics.filter(m => m.status === 'healthy').length} of {modelMetrics.length} models healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.length} total alerts (unacknowledged: {alerts.filter(a => !a.acknowledged).length})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions (24h)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modelMetrics.reduce((sum, m) => sum + m.predictions24h, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {modelMetrics.length} models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData[usageData.length - 1]?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              18% adoption rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Alerts Require Attention</AlertTitle>
          <AlertDescription>
            {criticalAlerts} high-priority alert{criticalAlerts > 1 ? 's' : ''} need{criticalAlerts === 1 ? 's' : ''} immediate review. 
            Check the Overview tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart3 className="mr-2 h-4 w-4" />
            Model Performance
          </TabsTrigger>
          <TabsTrigger value="data-quality">
            <Database className="mr-2 h-4 w-4" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="usage">
            <Users className="mr-2 h-4 w-4" />
            User Activity
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Real-time alerts requiring attention ({alerts.filter(a => !a.acknowledged).length} unacknowledged)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start justify-between rounded-lg border p-3 ${
                      alert.acknowledged ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            alert.severity === 'P1' ? 'destructive' :
                            alert.severity === 'P2' ? 'destructive' :
                            alert.severity === 'P3' ? 'default' : 'secondary'
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-medium">{alert.modelName}</span>
                        {alert.acknowledged && (
                          <Badge variant="outline">Acknowledged</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Status Summary</CardTitle>
              <CardDescription>
                Quick overview of all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modelMetrics.map(model => (
                  <div key={model.modelName} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {model.status === 'healthy' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : model.status === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{model.modelName}</p>
                        <p className="text-sm text-muted-foreground">
                          Accuracy: {(model.accuracy * 100).toFixed(1)}% | 
                          F1: {model.f1Score.toFixed(3)} | 
                          Predictions: {model.predictions24h.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : model.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : null}
                      <Badge
                        variant={
                          model.status === 'healthy' ? 'default' :
                          model.status === 'warning' ? 'secondary' : 'destructive'
                        }
                      >
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Model Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {modelMetrics.map(model => (
              <Card key={model.modelName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{model.modelName}</span>
                    <Badge
                      variant={
                        model.status === 'healthy' ? 'default' :
                        model.status === 'warning' ? 'secondary' : 'destructive'
                      }
                    >
                      {model.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Last updated: {model.lastUpdated.toLocaleTimeString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Accuracy</span>
                      <span className={`text-sm font-bold ${
                        model.accuracy >= 0.85 ? 'text-green-600' :
                        model.accuracy >= 0.75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(model.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Precision</span>
                      <span className="text-sm">{(model.precision * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Recall</span>
                      <span className="text-sm">{(model.recall * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">F1 Score</span>
                      <span className="text-sm font-bold">{model.f1Score.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Confidence</span>
                      <span className="text-sm">{(model.avgConfidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Predictions (24h)</span>
                      <span className="text-sm font-bold">{model.predictions24h.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Model Accuracy Trends (30 Days)</CardTitle>
              <CardDescription>
                Track model performance over time (minimum threshold: 85%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0.7, 1.0]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="activeUsers" name="Claim Outcome %" stroke="#8884d8" />
                  <Line type="monotone" dataKey="predictions" name="Timeline Forecast %" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Data Quality */}
        <TabsContent value="data-quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Drift Detection</CardTitle>
              <CardDescription>
                Population Stability Index (PSI) monitoring - Alert threshold: 0.25
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driftMetrics.map((drift, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{drift.metric}</p>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Current: {drift.currentValue.toFixed(2)}</span>
                          <span>Baseline: {drift.baselineValue.toFixed(2)}</span>
                          <span className={`font-bold ${
                            drift.psiScore >= drift.threshold ? 'text-red-600' :
                            drift.psiScore >= drift.threshold * 0.8 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            PSI: {drift.psiScore.toFixed(3)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          drift.status === 'healthy' ? 'default' :
                          drift.status === 'warning' ? 'secondary' : 'destructive'
                        }
                      >
                        {drift.status}
                      </Badge>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          drift.psiScore >= drift.threshold ? 'bg-red-600' :
                          drift.psiScore >= drift.threshold * 0.8 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min((drift.psiScore / drift.threshold) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Completeness</CardTitle>
              <CardDescription>
                Missing data rates by feature (target: {'<'}5%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { feature: 'Member Age', completeness: 98.5 },
                    { feature: 'Case Type', completeness: 99.2 },
                    { feature: 'Union Tenure', completeness: 96.8 },
                    { feature: 'Industry', completeness: 97.1 },
                    { feature: 'Prior Cases', completeness: 94.3 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis domain={[90, 100]} />
                  <Tooltip />
                  <Bar dataKey="completeness" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: User Activity */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users (30 Days)</CardTitle>
              <CardDescription>
                Daily active stewards using AI features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="activeUsers" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Predictions (30 Days)</CardTitle>
                <CardDescription>
                  Total AI predictions requested
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="predictions" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time (30 Days)</CardTitle>
                <CardDescription>
                  Average API response time (ms)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgResponseTime" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Breakdown</CardTitle>
              <CardDescription>
                Distribution of AI feature usage by stewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { feature: 'Claim Outcome Prediction', uses: 1247 },
                    { feature: 'Timeline Forecasting', uses: 856 },
                    { feature: 'Legal Precedent Search', uses: 2134 },
                    { feature: 'Natural Language Query', uses: 432 },
                    { feature: 'Smart Assignment', uses: 324 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="uses" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
        <span>Auto-refresh: Every 5 minutes</span>
      </div>
    </div>
  );
}

export default AIMonitoringDashboard;
