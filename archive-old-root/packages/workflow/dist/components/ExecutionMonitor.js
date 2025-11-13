import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ExecutionMonitor - Real-time workflow execution tracking
 *
 * Displays execution progress, action timeline, logs, and errors.
 * Supports live updates via polling and manual refresh.
 */
import { useState } from 'react';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
// Icons
const CheckIcon = () => _jsx("span", { className: "text-green-600", children: "\u2713" });
const ErrorIcon = () => _jsx("span", { className: "text-red-600", children: "\u2717" });
const LoadingIcon = () => _jsx("span", { className: "animate-spin", children: "\u2699\uFE0F" });
const CancelIcon = () => _jsx("span", { children: "\u26D4" });
const RefreshIcon = () => _jsx("span", { children: "\uD83D\uDD04" });
const ClockIcon = () => _jsx("span", { children: "\uD83D\uDD52" });
const PlayIcon = () => _jsx("span", { children: "\u25B6\uFE0F" });
const PauseIcon = () => _jsx("span", { children: "\u23F8\uFE0F" });
export function ExecutionMonitor({ executionId, workflowId, organizationId, autoRefresh = true, refreshInterval = 2000, onClose, className = '', }) {
    const { execution, isLoading, error, isPending, isRunning, isCompleted, isFailed, isCancelled, progress, currentAction, execute, cancel, refresh, } = useWorkflowExecution(workflowId || '', executionId, {
        autoLoad: true,
        pollInterval: autoRefresh ? refreshInterval : undefined,
    });
    const [expandedActions, setExpandedActions] = useState(new Set());
    const [showLogs, setShowLogs] = useState(true);
    // Toggle action expansion
    const toggleAction = (actionId) => {
        setExpandedActions(prev => {
            const next = new Set(prev);
            if (next.has(actionId)) {
                next.delete(actionId);
            }
            else {
                next.add(actionId);
            }
            return next;
        });
    };
    // Get status color
    const getStatusColor = (status) => {
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
    const getActionStatusIcon = (actionId) => {
        if (!execution)
            return null;
        const actionHistory = execution.actionsHistory?.find((h) => h.actionId === actionId);
        if (!actionHistory) {
            if (currentAction === actionId) {
                return _jsx(LoadingIcon, {});
            }
            return _jsx("span", { className: "text-gray-400", children: "\u25CB" });
        }
        if (actionHistory.status === 'completed') {
            return _jsx(CheckIcon, {});
        }
        else if (actionHistory.status === 'failed') {
            return _jsx(ErrorIcon, {});
        }
        else if (actionHistory.status === 'running') {
            return _jsx(LoadingIcon, {});
        }
        return _jsx("span", { className: "text-gray-400", children: "\u25CB" });
    };
    // Format duration
    const formatDuration = (ms) => {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };
    // Calculate elapsed time
    const getElapsedTime = () => {
        if (!execution?.startedAt)
            return '0s';
        const endTime = execution.completedAt || new Date();
        const elapsed = endTime.getTime() - execution.startedAt.getTime();
        return formatDuration(elapsed);
    };
    // Loading state
    if (isLoading && !execution) {
        return (_jsx("div", { className: `flex items-center justify-center p-12 ${className}`, children: _jsxs("div", { className: "text-center", children: [_jsx(LoadingIcon, {}), _jsx("p", { className: "text-gray-600 mt-2", children: "Loading execution..." })] }) }));
    }
    // Error state
    if (error) {
        return (_jsx("div", { className: `p-6 bg-red-50 border border-red-200 rounded-lg ${className}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(ErrorIcon, {}), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-red-900 mb-1", children: "Error Loading Execution" }), _jsx("p", { className: "text-red-700 text-sm", children: error.message })] }), _jsx("button", { onClick: refresh, className: "px-3 py-1 text-sm text-red-700 hover:text-red-900 border border-red-300 rounded hover:bg-red-100 transition-colors", children: "Retry" })] }) }));
    }
    // No execution
    if (!execution) {
        return (_jsx("div", { className: `p-6 text-center text-gray-500 ${className}`, children: _jsx("p", { children: "No execution found" }) }));
    }
    return (_jsxs("div", { className: `bg-white rounded-lg shadow ${className}`, children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Workflow Execution" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["ID: ", execution.id] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: refresh, disabled: isLoading, className: "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50", title: "Refresh", children: _jsx(RefreshIcon, {}) }), (isPending || isRunning) && (_jsx("button", { onClick: cancel, className: "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors", children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(CancelIcon, {}), _jsx("span", { children: "Cancel" })] }) })), onClose && (_jsx("button", { onClick: onClose, className: "px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors", children: "Close" }))] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: `px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(execution.status)}`, children: execution.status.toUpperCase() }), _jsxs("span", { className: "flex items-center gap-1 text-sm text-gray-600", children: [_jsx(ClockIcon, {}), _jsx("span", { children: getElapsedTime() })] }), isRunning && (_jsxs("span", { className: "text-sm text-gray-600", children: [progress.toFixed(0), "% complete"] }))] }), (isPending || isRunning) && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2 overflow-hidden", children: _jsx("div", { className: "bg-blue-600 h-full transition-all duration-300 ease-out", style: { width: `${progress}%` } }) }))] }), execution.error && (_jsx("div", { className: "mt-4 p-4 bg-red-50 border border-red-200 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(ErrorIcon, {}), _jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-semibold text-red-900 mb-1", children: "Execution Error" }), _jsx("p", { className: "text-red-700 text-sm", children: execution.error })] })] }) }))] }), execution.context && Object.keys(execution.context).length > 0 && (_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "Execution Context" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 overflow-x-auto", children: _jsx("pre", { className: "text-sm text-gray-700", children: JSON.stringify(execution.context, null, 2) }) })] })), _jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-4", children: "Action Timeline" }), execution.actionsHistory && execution.actionsHistory.length > 0 ? (_jsx("div", { className: "space-y-2", children: execution.actionsHistory.map((history, index) => {
                            const isExpanded = expandedActions.has(history.actionId);
                            const duration = history.completedAt && history.startedAt
                                ? history.completedAt.getTime() - history.startedAt.getTime()
                                : null;
                            return (_jsxs("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: [_jsx("button", { onClick: () => toggleAction(history.actionId), className: "w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left", children: _jsxs("div", { className: "flex items-center gap-3 flex-1", children: [_jsx("div", { className: "text-xl", children: getActionStatusIcon(history.actionId) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "font-medium text-gray-900", children: ["Action ", index + 1, ": ", history.actionId] }), _jsxs("div", { className: "text-sm text-gray-600 mt-1", children: [history.status === 'completed' && duration && (_jsxs("span", { children: ["Completed in ", formatDuration(duration)] })), history.status === 'failed' && (_jsx("span", { className: "text-red-600", children: "Failed" })), history.status === 'running' && (_jsx("span", { className: "text-blue-600", children: "Running..." }))] })] }), history.attempts && history.attempts > 1 && (_jsxs("span", { className: "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", children: ["Retry #", history.attempts - 1] })), _jsx("span", { className: "text-gray-400", children: isExpanded ? '▼' : '▶' })] }) }), isExpanded && (_jsxs("div", { className: "p-4 bg-gray-50 border-t border-gray-200 space-y-3", children: [history.result && (_jsxs("div", { children: [_jsx("h5", { className: "text-sm font-semibold text-gray-700 mb-2", children: "Result" }), _jsx("div", { className: "bg-white rounded p-3 text-sm text-gray-700 overflow-x-auto", children: _jsx("pre", { children: JSON.stringify(history.result, null, 2) }) })] })), history.error && (_jsxs("div", { children: [_jsx("h5", { className: "text-sm font-semibold text-red-700 mb-2", children: "Error" }), _jsx("div", { className: "bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700", children: history.error })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [history.startedAt && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Started:" }), _jsx("span", { className: "ml-2 text-gray-900", children: new Date(history.startedAt).toLocaleTimeString() })] })), history.completedAt && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Completed:" }), _jsx("span", { className: "ml-2 text-gray-900", children: new Date(history.completedAt).toLocaleTimeString() })] }))] })] }))] }, `${history.actionId}-${index}`));
                        }) })) : (_jsx("div", { className: "text-center text-gray-500 py-8", children: _jsx("p", { children: "No actions executed yet" }) }))] }), _jsxs("div", { className: "p-6 bg-gray-50", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "Metadata" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Workflow ID:" }), _jsx("span", { className: "ml-2 text-gray-900 font-mono", children: execution.workflowId })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Execution ID:" }), _jsx("span", { className: "ml-2 text-gray-900 font-mono", children: execution.id })] }), execution.startedAt && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Started:" }), _jsx("span", { className: "ml-2 text-gray-900", children: new Date(execution.startedAt).toLocaleString() })] })), execution.completedAt && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Completed:" }), _jsx("span", { className: "ml-2 text-gray-900", children: new Date(execution.completedAt).toLocaleString() })] }))] })] })] }));
}
//# sourceMappingURL=ExecutionMonitor.js.map