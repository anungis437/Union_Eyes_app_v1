import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface WorkflowAnalytics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  nodePerformance: {
    nodeId: string;
    nodeName: string;
    averageTime: number;
    failureRate: number;
  }[];
}

interface OverviewAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  runningExecutions: number;
  pausedExecutions: number;
  completedToday: number;
  averageSuccessRate: number;
  averageExecutionTime: number;
}

interface WorkflowAnalyticsProps {
  tenantId: string;
  workflowId?: string;
  className?: string;
}

export function WorkflowAnalytics({
  tenantId,
  workflowId,
  className = '',
}: WorkflowAnalyticsProps) {
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>(
    workflowId || 'overview'
  );
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
  const [timeRange, setTimeRange] = useState<string>('7d');

  // Fetch workflows list
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows', {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch workflows');

      const data = await response.json();
      setWorkflows(data.map((w: any) => ({ id: w.id, name: w.name })));
    } catch (error) {
    }
  }, [tenantId]);

  // Fetch workflow analytics
  const fetchWorkflowAnalytics = useCallback(async (wfId: string) => {
    try {
      const response = await fetch(`/api/workflows/${wfId}/analytics`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
    }
  }, [tenantId]);

  // Fetch overview analytics
  const fetchOverviewAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/overview', {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch overview analytics');

      const data = await response.json();
      setOverview(data);
    } catch (error) {
    }
  }, [tenantId]);

  // Fetch data based on selection
  const fetchData = useCallback(async () => {
    setLoading(true);

    if (selectedWorkflow === 'overview') {
      await fetchOverviewAnalytics();
      setAnalytics(null);
    } else {
      await fetchWorkflowAnalytics(selectedWorkflow);
      setOverview(null);
    }

    setLoading(false);
  }, [selectedWorkflow, fetchOverviewAnalytics, fetchWorkflowAnalytics]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeRange]);

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Analytics</h2>
          <p className="text-gray-500">
            Monitor workflow performance and execution metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-64">
              <BarChart3 className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview (All Workflows)</SelectItem>
              {workflows.map((wf) => (
                <SelectItem key={wf.id} value={wf.id}>
                  {wf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Overview Metrics */}
          {overview && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Activity className="w-4 h-4" />
                      Active Workflows
                    </div>
                    <div className="text-2xl font-bold">{overview.activeWorkflows}</div>
                    <div className="text-xs text-gray-500">
                      of {overview.totalWorkflows} total
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Success Rate
                    </div>
                    <div className="text-2xl font-bold">
                      {overview.averageSuccessRate.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {overview.averageSuccessRate >= 90 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-green-500">Excellent</span>
                        </>
                      ) : overview.averageSuccessRate >= 75 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-yellow-500" />
                          <span className="text-yellow-500">Good</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <span className="text-red-500">Needs attention</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Clock className="w-4 h-4" />
                      Avg. Execution Time
                    </div>
                    <div className="text-2xl font-bold">
                      {formatDuration(overview.averageExecutionTime)}
                    </div>
                    <div className="text-xs text-gray-500">Across all workflows</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Activity className="w-4 h-4" />
                      Executions Today
                    </div>
                    <div className="text-2xl font-bold">{overview.completedToday}</div>
                    <div className="text-xs text-gray-500">
                      {overview.runningExecutions} running •{' '}
                      {overview.pausedExecutions} paused
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Workflow-Specific Metrics */}
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Activity className="w-4 h-4" />
                      Total Executions
                    </div>
                    <div className="text-2xl font-bold">
                      {analytics.totalExecutions}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Success Rate
                    </div>
                    <div className="text-2xl font-bold">
                      {analytics.successRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {analytics.successfulExecutions} successful
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Failed Executions
                    </div>
                    <div className="text-2xl font-bold">
                      {analytics.failedExecutions}
                    </div>
                    <div className="text-xs text-gray-500">
                      {((analytics.failedExecutions / analytics.totalExecutions) * 100).toFixed(1)}% failure rate
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Clock className="w-4 h-4" />
                      Avg. Execution Time
                    </div>
                    <div className="text-2xl font-bold">
                      {formatDuration(analytics.averageExecutionTime)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Node Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Node Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Node Name</TableHead>
                          <TableHead>Average Time</TableHead>
                          <TableHead>Failure Rate</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.nodePerformance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No node performance data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          analytics.nodePerformance.map((node) => (
                            <TableRow key={node.nodeId}>
                              <TableCell className="font-medium">
                                {node.nodeName}
                              </TableCell>
                              <TableCell>{formatDuration(node.averageTime)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`${
                                        node.failureRate > 10
                                          ? 'bg-red-500'
                                          : node.failureRate > 5
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                      } h-2 rounded-full`}
                                      style={{ width: `${Math.min(node.failureRate, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm">{node.failureRate.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {node.failureRate > 10 ? (
                                  <Badge variant="destructive">Needs attention</Badge>
                                ) : node.failureRate > 5 ? (
                                  <Badge className="bg-yellow-500">Monitor</Badge>
                                ) : (
                                  <Badge className="bg-green-500">Healthy</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
