'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  TrendLineChart, 
  BarChartComponent, 
  AreaChartComponent,
  KPICard 
} from '@/components/analytics/ChartComponents';
import { 
  Download, 
  RefreshCw, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity
} from 'lucide-react';

interface OperationalSummary {
  queueSize: number;
  avgWaitTime: number;
  slaCompliance: number;
  workloadBalance: number;
  previousPeriod: {
    queueSize: number;
    avgWaitTime: number;
    slaCompliance: number;
    workloadBalance: number;
  };
}

interface QueueMetrics {
  priority: string;
  count: number;
  avgAge: number;
  oldest: number;
}

interface StewardWorkload {
  stewardId: string;
  stewardName: string;
  activeCases: number;
  capacity: number;
  utilization: number;
  avgResponseTime: number;
}

interface SLAMetrics {
  date: string;
  onTime: number;
  overdue: number;
  compliance: number;
}

interface BottleneckItem {
  stage: string;
  count: number;
  avgDuration: number;
  severity: 'high' | 'medium' | 'low';
}

export default function OperationalAnalytics() {
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [queues, setQueues] = useState<QueueMetrics[]>([]);
  const [workload, setWorkload] = useState<StewardWorkload[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);

  useEffect(() => {
    fetchOperationalData();
  }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOperationalData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, queuesRes, workloadRes, slaRes, bottlenecksRes] = await Promise.all([
        fetch(`/api/analytics/operational?days=${dateRange}`),
        fetch(`/api/analytics/operational/queues?days=${dateRange}`),
        fetch(`/api/analytics/operational/workload?days=${dateRange}`),
        fetch(`/api/analytics/operational/sla?days=${dateRange}`),
        fetch(`/api/analytics/operational/bottlenecks?days=${dateRange}`)
      ]);

      const [summaryData, queuesData, workloadData, slaData, bottlenecksData] = await Promise.all([
        summaryRes.json(),
        queuesRes.json(),
        workloadRes.json(),
        slaRes.json(),
        bottlenecksRes.json()
      ]);

      setSummary(summaryData);
      setQueues(queuesData);
      setWorkload(workloadData);
      setSlaMetrics(slaData);
      setBottlenecks(bottlenecksData);
    } catch (error) {
      console.error('Error fetching operational data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    console.log(`Exporting operational analytics as ${format}`);
    // Export implementation
  };

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const queueChange = calculateChange(summary.queueSize, summary.previousPeriod.queueSize);
  const waitTimeChange = calculateChange(summary.avgWaitTime, summary.previousPeriod.avgWaitTime);
  const slaChange = calculateChange(summary.slaCompliance, summary.previousPeriod.slaCompliance);
  const balanceChange = calculateChange(summary.workloadBalance, summary.previousPeriod.workloadBalance);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operational Analytics</h1>
          <p className="text-muted-foreground">
            Monitor queues, workload distribution, SLA compliance, and system efficiency
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
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchOperationalData}>
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
          title="Queue Size"
          value={summary.queueSize.toString()}
          change={queueChange}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          inverseColors={true}
        />
        <KPICard
          title="Avg Wait Time"
          value={formatDuration(summary.avgWaitTime)}
          change={waitTimeChange}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          inverseColors={true}
        />
        <KPICard
          title="SLA Compliance"
          value={`${summary.slaCompliance.toFixed(1)}%`}
          change={slaChange}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Workload Balance"
          value={`${summary.workloadBalance.toFixed(0)}%`}
          change={balanceChange}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="queues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queues">Queue Status</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="sla">SLA Tracking</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>

        {/* Queue Status Tab */}
        <TabsContent value="queues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Queue Distribution by Priority</CardTitle>
                <CardDescription>Current queue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={queues}
                  xKey="priority"
                  yKeys={[{ key: 'count', name: 'Claims', color: '#3b82f6' }]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue Aging Analysis</CardTitle>
                <CardDescription>Average age by priority</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={queues}
                  xKey="priority"
                  yKeys={[{ key: 'avgAge', name: 'Avg Age (hours)', color: '#f59e0b' }]}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Queue Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queues.map((queue) => (
                  <div key={queue.priority} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium capitalize">{queue.priority} Priority</p>
                      <p className="text-sm text-muted-foreground">{queue.count} claims in queue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Avg Age</p>
                      <p className="font-semibold">{formatDuration(queue.avgAge)}</p>
                      {queue.oldest > 72 && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Oldest: {formatDuration(queue.oldest)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workload Tab */}
        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Steward Workload Distribution</CardTitle>
              <CardDescription>Caseload and capacity utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={workload}
                xKey="stewardName"
                yKeys={[
                  { key: 'activeCases', name: 'Active Cases', color: '#3b82f6' },
                  { key: 'capacity', name: 'Capacity', color: '#94a3b8' }
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Steward Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Steward</th>
                      <th className="text-right p-2">Active Cases</th>
                      <th className="text-right p-2">Capacity</th>
                      <th className="text-right p-2">Utilization</th>
                      <th className="text-right p-2">Avg Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workload.map((steward) => (
                      <tr key={steward.stewardId} className="border-b">
                        <td className="p-2 font-medium">{steward.stewardName}</td>
                        <td className="p-2 text-right">{steward.activeCases}</td>
                        <td className="p-2 text-right">{steward.capacity}</td>
                        <td className="p-2 text-right">
                          <span className={`font-semibold ${
                            steward.utilization > 90 ? 'text-red-600' : 
                            steward.utilization > 75 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {steward.utilization.toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-2 text-right">{formatDuration(steward.avgResponseTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Tracking Tab */}
        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Compliance Trend</CardTitle>
              <CardDescription>Daily compliance rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                data={slaMetrics}
                xKey="date"
                yKey="compliance"
                height={300}
                color="#10b981"
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>On-Time vs Overdue</CardTitle>
                <CardDescription>Daily breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChartComponent
                  data={slaMetrics}
                  xKey="date"
                  yKeys={[
                    { key: 'onTime', name: 'On Time', color: '#10b981' },
                    { key: 'overdue', name: 'Overdue', color: '#ef4444' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Compliance</span>
                  <span className="text-2xl font-bold text-green-600">
                    {summary.slaCompliance.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-semibold">95.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variance</span>
                  <span className={`font-semibold ${
                    summary.slaCompliance >= 95 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(summary.slaCompliance - 95).toFixed(1)}%
                  </span>
                </div>
                {summary.slaCompliance < 95 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Below Target</p>
                        <p className="text-xs text-muted-foreground">
                          Review workload distribution and response times
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Bottlenecks</CardTitle>
              <CardDescription>Identified workflow slowdowns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bottlenecks.map((bottleneck) => (
                  <div key={bottleneck.stage} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{bottleneck.stage}</p>
                        <p className="text-sm text-muted-foreground">{bottleneck.count} claims affected</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(bottleneck.severity)}`}>
                        {bottleneck.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg Duration</span>
                      <span className="font-semibold">{formatDuration(bottleneck.avgDuration)}</span>
                    </div>
                  </div>
                ))}
                {bottlenecks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p>No significant bottlenecks detected</p>
                    <p className="text-sm">System operating efficiently</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.workloadBalance < 70 && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Rebalance Workload</p>
                      <p className="text-xs text-muted-foreground">
                        Workload balance is {summary.workloadBalance.toFixed(0)}%. Consider reassigning cases.
                      </p>
                    </div>
                  </div>
                )}
                {summary.avgWaitTime > 48 && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Reduce Wait Times</p>
                      <p className="text-xs text-muted-foreground">
                        Average wait time is {formatDuration(summary.avgWaitTime)}. Consider adding capacity.
                      </p>
                    </div>
                  </div>
                )}
                {summary.queueSize > 50 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">High Queue Volume</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.queueSize} claims in queue. Prioritize high-priority items.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
