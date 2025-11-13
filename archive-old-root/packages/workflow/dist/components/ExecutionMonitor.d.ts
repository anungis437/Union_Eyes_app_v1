/**
 * ExecutionMonitor - Real-time workflow execution tracking
 *
 * Displays execution progress, action timeline, logs, and errors.
 * Supports live updates via polling and manual refresh.
 */
export interface ExecutionMonitorProps {
    executionId: string;
    workflowId?: string;
    organizationId: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
    onClose?: () => void;
    className?: string;
}
export declare function ExecutionMonitor({ executionId, workflowId, organizationId, autoRefresh, refreshInterval, onClose, className, }: ExecutionMonitorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ExecutionMonitor.d.ts.map