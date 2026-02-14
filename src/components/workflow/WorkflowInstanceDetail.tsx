import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  FileText,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, formatDistanceToNow } from 'date-fns';

interface NodeExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  assignedTo?: string;
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  currentNodeId?: string;
  context: Record<string, unknown>;
  executionPath: string[];
  error?: string;
  claimId?: string;
  initiatedBy: string;
  nodeExecutions: NodeExecution[];
}

interface WorkflowInstanceDetailProps {
  instanceId: string;
  organizationId: string;
  onBack?: () => void;
  className?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-gray-500', label: 'Pending' },
  running: { icon: Play, color: 'bg-blue-500', label: 'Running' },
  paused: { icon: Pause, color: 'bg-yellow-500', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  cancelled: { icon: StopCircle, color: 'bg-gray-500', label: 'Cancelled' },
  skipped: { icon: AlertCircle, color: 'bg-gray-400', label: 'Skipped' },
};

export function WorkflowInstanceDetail({
  instanceId,
  organizationId,
  onBack,
  className = '',
}: WorkflowInstanceDetailProps) {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<NodeExecution | null>(null);

  // Fetch instance details
  const fetchInstanceDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflow-instances/${instanceId}`, {
        headers: {
          'X-Organization-ID': organizationId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch instance details');

      const data = await response.json();
      setInstance(data);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, [instanceId, organizationId]);

  useEffect(() => {
    fetchInstanceDetails();

    // Auto-refresh for running/paused instances
    const interval = setInterval(() => {
      if (instance && (instance.status === 'running' || instance.status === 'paused')) {
        fetchInstanceDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchInstanceDetails, instance]);

  // Calculate duration
  const getDuration = () => {
    if (!instance || !instance.startedAt) return 'N/A';

    const endTime = instance.completedAt
      ? new Date(instance.completedAt)
      : new Date();
    const startTime = new Date(instance.startedAt);
    const durationMs = endTime.getTime() - startTime.getTime();

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Calculate node execution duration
  const getNodeDuration = (execution: NodeExecution) => {
    if (!execution.startedAt) return 'N/A';

    const endTime = execution.completedAt
      ? new Date(execution.completedAt)
      : new Date();
    const startTime = new Date(execution.startedAt);
    const durationMs = endTime.getTime() - startTime.getTime();

    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 1) return '<1s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!instance) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Workflow instance not found</AlertDescription>
      </Alert>
    );
  }

  const statusInfo = statusConfig[instance.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">{instance.workflowName}</h2>
            <p className="text-sm text-gray-500">
              Instance ID: {instance.id} • Version {instance.workflowVersion}
            </p>
          </div>
        </div>
        <Badge className={`${statusInfo.color} text-white flex items-center gap-2`}>
          <StatusIcon className="w-4 h-4" />
          {statusInfo.label}
        </Badge>
      </div>

      {/* Error Alert */}
      {instance.error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{instance.error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              Started
            </div>
            <div className="font-semibold">
              {format(new Date(instance.startedAt), 'MMM d, yyyy HH:mm:ss')}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(instance.startedAt), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              Duration
            </div>
            <div className="font-semibold">{getDuration()}</div>
            {instance.completedAt && (
              <div className="text-xs text-gray-500">
                Ended {format(new Date(instance.completedAt), 'HH:mm:ss')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <User className="w-4 h-4" />
              Initiated By
            </div>
            <div className="font-semibold">{instance.initiatedBy}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <FileText className="w-4 h-4" />
              Claim ID
            </div>
            <div className="font-semibold">
              {instance.claimId ? (
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {instance.claimId}
                </code>
              ) : (
                <span className="text-gray-400">N/A</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instance.nodeExecutions.map((execution, index) => {
              const execStatusInfo = statusConfig[execution.status];
              const ExecStatusIcon = execStatusInfo.icon;
              const isLast = index === instance.nodeExecutions.length - 1;

              return (
                <div key={execution.id} className="relative">
                  {!isLast && (
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className="flex gap-4">
                    <div
                      className={`${execStatusInfo.color} text-white rounded-full p-2 flex items-center justify-center w-10 h-10 flex-shrink-0`}
                    >
                      <ExecStatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h4 className="font-semibold">{execution.nodeName}</h4>
                          <p className="text-sm text-gray-500">
                            {execution.nodeType} • {getNodeDuration(execution)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecution(execution)}
                        >
                          View Details
                        </Button>
                      </div>
                      {execution.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>{execution.error}</AlertDescription>
                        </Alert>
                      )}
                      {execution.retryCount > 0 && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Retried {execution.retryCount} time(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Execution Path */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {instance.executionPath.map((nodeId, index) => {
              const execution = instance.nodeExecutions.find(
                (e) => e.nodeId === nodeId
              );
              const isCurrent = nodeId === instance.currentNodeId;

              return (
                <React.Fragment key={nodeId}>
                  <Badge
                    variant={isCurrent ? 'default' : 'secondary'}
                    className={isCurrent ? 'animate-pulse' : ''}
                  >
                    {execution?.nodeName || nodeId}
                  </Badge>
                  {index < instance.executionPath.length - 1 && (
                    <span className="text-gray-400">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Context Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Context Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(instance.context, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Node Execution Details Modal/Panel */}
      {selectedExecution && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Node Execution Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedExecution(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Node Information</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Name</TableCell>
                    <TableCell>{selectedExecution.nodeName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Type</TableCell>
                    <TableCell>{selectedExecution.nodeType}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Status</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[selectedExecution.status].color}>
                        {statusConfig[selectedExecution.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Duration</TableCell>
                    <TableCell>{getNodeDuration(selectedExecution)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Retry Count</TableCell>
                    <TableCell>{selectedExecution.retryCount}</TableCell>
                  </TableRow>
                  {selectedExecution.assignedTo && (
                    <TableRow>
                      <TableCell className="font-medium">Assigned To</TableCell>
                      <TableCell>{selectedExecution.assignedTo}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedExecution.input && (
              <div>
                <h4 className="font-semibold mb-2">Input</h4>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(selectedExecution.input, null, 2)}
                </pre>
              </div>
            )}

            {selectedExecution.output && (
              <div>
                <h4 className="font-semibold mb-2">Output</h4>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(selectedExecution.output, null, 2)}
                </pre>
              </div>
            )}

            {selectedExecution.error && (
              <div>
                <h4 className="font-semibold mb-2">Error</h4>
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{selectedExecution.error}</AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
