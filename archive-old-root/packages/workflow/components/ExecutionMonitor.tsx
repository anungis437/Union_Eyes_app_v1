/**
 * ExecutionMonitor - Real-time workflow execution tracking
 * 
 * Displays execution progress, action timeline, logs, and errors.
 * Supports live updates via polling and manual refresh.
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import type { WorkflowExecution, WorkflowAction, ExecutionStatus, ActionExecution } from '../services/WorkflowEngine';

// Icons
const CheckIcon = () => <span className="text-green-600">✓</span>;
const ErrorIcon = () => <span className="text-red-600">✗</span>;
const LoadingIcon = () => <span className="animate-spin">⚙️</span>;
const CancelIcon = () => <span>⛔</span>;
const RefreshIcon = () => <span>🔄</span>;
const ClockIcon = () => <span>🕒</span>;
const PlayIcon = () => <span>▶️</span>;
const PauseIcon = () => <span>⏸️</span>;

export interface ExecutionMonitorProps {
  executionId: string;
  workflowId?: string;
  organizationId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onClose?: () => void;
  className?: string;
}

export function ExecutionMonitor({
  executionId,
  workflowId,
  organizationId,
  autoRefresh = true,
  refreshInterval = 2000,
  onClose,
  className = '',
}: ExecutionMonitorProps) {
  const {
    execution,
    isLoading,
    error,
    isPending,
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    progress,
    currentAction,
    execute,
    cancel,
    refresh,
  } = useWorkflowExecution(
    workflowId || '',
    executionId,
    {
      autoLoad: true,
      pollInterval: autoRefresh ? refreshInterval : undefined,
    }
  );

  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(true);

  // Toggle action expansion
  const toggleAction = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  // Get status color
  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get action status icon
  const getActionStatusIcon = (actionId: string) => {
    if (!execution) return null;

    const actionHistory = execution.actionsHistory?.find((h: ActionExecution) => h.actionId === actionId);
    
    if (!actionHistory) {
      if (currentAction === actionId) {
        return <LoadingIcon />;
      }
      return <span className="text-gray-400">○</span>;
    }

    if (actionHistory.status === 'completed') {
      return <CheckIcon />;
    } else if (actionHistory.status === 'failed') {
      return <ErrorIcon />;
    } else if (actionHistory.status === 'running') {
      return <LoadingIcon />;
    }

    return <span className="text-gray-400">○</span>;
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!execution?.startedAt) return '0s';
    const endTime = execution.completedAt || new Date();
    const elapsed = endTime.getTime() - execution.startedAt.getTime();
    return formatDuration(elapsed);
  };

  // Loading state
  if (isLoading && !execution) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <LoadingIcon />
          <p className="text-gray-600 mt-2">Loading execution...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-start gap-3">
          <ErrorIcon />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Execution</h3>
            <p className="text-red-700 text-sm">{error.message}</p>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1 text-sm text-red-700 hover:text-red-900 border border-red-300 rounded hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No execution
  if (!execution) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <p>No execution found</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Workflow Execution
            </h2>
            <p className="text-sm text-gray-600">ID: {execution.id}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshIcon />
            </button>

            {/* Cancel */}
            {(isPending || isRunning) && (
              <button
                onClick={cancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CancelIcon />
                  <span>Cancel</span>
                </span>
              </button>
            )}

            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Status and Progress */}
        <div className="space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(execution.status)}`}>
              {execution.status.toUpperCase()}
            </span>
            
            {/* Elapsed time */}
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <ClockIcon />
              <span>{getElapsedTime()}</span>
            </span>

            {/* Progress percentage */}
            {isRunning && (
              <span className="text-sm text-gray-600">
                {progress.toFixed(0)}% complete
              </span>
            )}
          </div>

          {/* Progress bar */}
          {(isPending || isRunning) && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Error message */}
        {execution.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ErrorIcon />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">Execution Error</h4>
                <p className="text-red-700 text-sm">{execution.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context */}
      {execution.context && Object.keys(execution.context).length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Execution Context</h3>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-700">
              {JSON.stringify(execution.context, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Action Timeline */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Action Timeline</h3>

        {execution.actionsHistory && execution.actionsHistory.length > 0 ? (
          <div className="space-y-2">
            {execution.actionsHistory.map((history: ActionExecution, index: number) => {
              const isExpanded = expandedActions.has(history.actionId);
              const duration = history.completedAt && history.startedAt
                ? history.completedAt.getTime() - history.startedAt.getTime()
                : null;

              return (
                <div
                  key={`${history.actionId}-${index}`}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Action header */}
                  <button
                    onClick={() => toggleAction(history.actionId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Status icon */}
                      <div className="text-xl">
                        {getActionStatusIcon(history.actionId)}
                      </div>

                      {/* Action info */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Action {index + 1}: {history.actionId}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {history.status === 'completed' && duration && (
                            <span>Completed in {formatDuration(duration)}</span>
                          )}
                          {history.status === 'failed' && (
                            <span className="text-red-600">Failed</span>
                          )}
                          {history.status === 'running' && (
                            <span className="text-blue-600">Running...</span>
                          )}
                        </div>
                      </div>

                      {/* Retry badge */}
                      {history.attempts && history.attempts > 1 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Retry #{history.attempts - 1}
                        </span>
                      )}

                      {/* Expand icon */}
                      <span className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>

                  {/* Action details */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
                      {/* Result */}
                      {history.result && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Result</h5>
                          <div className="bg-white rounded p-3 text-sm text-gray-700 overflow-x-auto">
                            <pre>{JSON.stringify(history.result, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {history.error && (
                        <div>
                          <h5 className="text-sm font-semibold text-red-700 mb-2">Error</h5>
                          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                            {history.error}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {history.startedAt && (
                          <div>
                            <span className="text-gray-600">Started:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(history.startedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        {history.completedAt && (
                          <div>
                            <span className="text-gray-600">Completed:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(history.completedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No actions executed yet</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Workflow ID:</span>
            <span className="ml-2 text-gray-900 font-mono">{execution.workflowId}</span>
          </div>
          <div>
            <span className="text-gray-600">Execution ID:</span>
            <span className="ml-2 text-gray-900 font-mono">{execution.id}</span>
          </div>
          {execution.startedAt && (
            <div>
              <span className="text-gray-600">Started:</span>
              <span className="ml-2 text-gray-900">
                {new Date(execution.startedAt).toLocaleString()}
              </span>
            </div>
          )}
          {execution.completedAt && (
            <div>
              <span className="text-gray-600">Completed:</span>
              <span className="ml-2 text-gray-900">
                {new Date(execution.completedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
