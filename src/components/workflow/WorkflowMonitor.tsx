import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  StopCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { formatDistanceToNow } from 'date-fns';

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  currentNodeId?: string;
  currentNodeName?: string;
  claimId?: string;
  initiatedBy: string;
  error?: string;
  progress: number;
}

interface WorkflowMonitorProps {
  tenantId: string;
  onViewDetails?: (instanceId: string) => void;
  className?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-gray-500', label: 'Pending' },
  running: { icon: Play, color: 'bg-blue-500', label: 'Running' },
  paused: { icon: Pause, color: 'bg-yellow-500', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  cancelled: { icon: StopCircle, color: 'bg-gray-500', label: 'Cancelled' },
};

export function WorkflowMonitor({
  tenantId,
  onViewDetails,
  className = '',
}: WorkflowMonitorProps) {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [filteredInstances, setFilteredInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    paused: 0,
    completed: 0,
    failed: 0,
  });

  // Fetch workflow instances
  const fetchInstances = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(
        `/api/workflow-instances?${params.toString()}`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch instances');

      const data = await response.json();
      setInstances(data);
      calculateStats(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  // Calculate statistics
  const calculateStats = (data: WorkflowInstance[]) => {
    const stats = {
      total: data.length,
      running: data.filter((i) => i.status === 'running').length,
      paused: data.filter((i) => i.status === 'paused').length,
      completed: data.filter((i) => i.status === 'completed').length,
      failed: data.filter((i) => i.status === 'failed').length,
    };
    setStats(stats);
  };

  // Filter instances based on search and status
  useEffect(() => {
    let filtered = [...instances];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (instance) =>
          instance.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          instance.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          instance.claimId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInstances(filtered);
  }, [instances, searchQuery]);

  // Auto-refresh
  useEffect(() => {
    fetchInstances();

    const interval = setInterval(() => {
      fetchInstances();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchInstances, refreshInterval]);

  // Cancel workflow
  const handleCancel = async (instanceId: string) => {
    try {
      const response = await fetch(`/api/workflow-instances/${instanceId}/cancel`, {
        method: 'POST',
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) throw new Error('Failed to cancel workflow');

      fetchInstances();
    } catch (error) {
    }
  };

  // Calculate duration
  const getDuration = (instance: WorkflowInstance) => {
    if (!instance.startedAt) return 'N/A';

    const endTime = instance.completedAt
      ? new Date(instance.completedAt)
      : new Date();
    const startTime = new Date(instance.startedAt);
    const durationMs = endTime.getTime() - startTime.getTime();

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-500">
              <Play className="w-4 h-4" />
              Running
            </div>
            <div className="text-2xl font-bold">{stats.running}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <Pause className="w-4 h-4" />
              Paused
            </div>
            <div className="text-2xl font-bold">{stats.paused}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-500">
              <XCircle className="w-4 h-4" />
              Failed
            </div>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workflow Instances</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">5s</SelectItem>
                  <SelectItem value="10000">10s</SelectItem>
                  <SelectItem value="30000">30s</SelectItem>
                  <SelectItem value="60000">1m</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInstances}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by workflow name, ID, or claim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instances Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Node</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredInstances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No workflow instances found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstances.map((instance) => {
                    const statusInfo = statusConfig[instance.status];
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={instance.id}>
                        <TableCell className="font-medium">
                          {instance.workflowName}
                          <div className="text-xs text-gray-500">{instance.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusInfo.color} text-white flex items-center gap-1 w-fit`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                          {instance.error && (
                            <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {instance.error.substring(0, 50)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {instance.currentNodeName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`${statusInfo.color} h-2 rounded-full transition-all`}
                                style={{ width: `${instance.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {instance.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDistanceToNow(new Date(instance.startedAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getDuration(instance)}</div>
                        </TableCell>
                        <TableCell>
                          {instance.claimId ? (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {instance.claimId}
                            </code>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails?.(instance.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(instance.status === 'running' ||
                              instance.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(instance.id)}
                              >
                                <StopCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
