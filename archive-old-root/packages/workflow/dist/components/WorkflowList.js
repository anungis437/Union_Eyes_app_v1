import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * WorkflowList - Display and manage workflows
 *
 * Lists workflows with filtering, sorting, and bulk operations.
 */
import { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../providers/WorkflowProvider';
// Icons (using lucide-react or similar)
const PlayIcon = () => _jsx("span", { children: "\u25B6\uFE0F" });
const PauseIcon = () => _jsx("span", { children: "\u23F8\uFE0F" });
const EditIcon = () => _jsx("span", { children: "\u270F\uFE0F" });
const DeleteIcon = () => _jsx("span", { children: "\uD83D\uDDD1\uFE0F" });
const CopyIcon = () => _jsx("span", { children: "\uD83D\uDCCB" });
const SettingsIcon = () => _jsx("span", { children: "\u2699\uFE0F" });
const PlusIcon = () => _jsx("span", { children: "\u2795" });
const SearchIcon = () => _jsx("span", { children: "\uD83D\uDD0D" });
export function WorkflowList({ organizationId, onWorkflowClick, onWorkflowEdit, onWorkflowDelete, onWorkflowCreate, className = '', }) {
    const { workflows, loadWorkflows, updateWorkflow, deleteWorkflow, builder, isLoading } = useWorkflow();
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('updated');
    // Load workflows on mount
    useEffect(() => {
        loadWorkflows(organizationId);
    }, [organizationId, loadWorkflows]);
    // Filter and sort workflows
    const filteredWorkflows = useMemo(() => {
        let result = Array.from(workflows.values());
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(w => w.name.toLowerCase().includes(query) ||
                w.description?.toLowerCase().includes(query));
        }
        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(w => w.status === statusFilter);
        }
        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return b.createdAt.getTime() - a.createdAt.getTime();
                case 'updated':
                    return b.updatedAt.getTime() - a.updatedAt.getTime();
                default:
                    return 0;
            }
        });
        return result;
    }, [workflows, searchQuery, statusFilter, sortBy]);
    // Toggle workflow status
    const handleToggleStatus = async (workflow) => {
        const newStatus = workflow.status === 'active' ? 'paused' : 'active';
        try {
            await updateWorkflow(workflow.id, { status: newStatus });
        }
        catch (error) {
            console.error('Failed to update workflow status:', error);
        }
    };
    // Clone workflow
    const handleClone = async (workflow) => {
        try {
            const cloned = builder.cloneWorkflow(workflow);
            // Trigger create workflow UI
            onWorkflowCreate?.();
        }
        catch (error) {
            console.error('Failed to clone workflow:', error);
        }
    };
    // Delete workflow
    const handleDelete = async (workflowId) => {
        if (!confirm('Are you sure you want to delete this workflow?')) {
            return;
        }
        try {
            await deleteWorkflow(workflowId);
            onWorkflowDelete?.(workflowId);
        }
        catch (error) {
            console.error('Failed to delete workflow:', error);
        }
    };
    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'paused':
                return 'bg-yellow-100 text-yellow-800';
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'archived':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    // Get trigger type display
    const getTriggerDisplay = (workflow) => {
        const type = workflow.trigger.type;
        const icons = {
            manual: '👆',
            document_upload: '📄',
            document_status_change: '📝',
            case_status_change: '⚖️',
            date_time: '⏰',
            webhook: '🔗',
            api: '🌐',
        };
        const labels = {
            manual: 'Manual',
            document_upload: 'Document Upload',
            document_status_change: 'Document Status',
            case_status_change: 'Case Status',
            date_time: 'Scheduled',
            webhook: 'Webhook',
            api: 'API',
        };
        return (_jsxs("span", { className: "flex items-center gap-1 text-sm text-gray-600", children: [_jsx("span", { children: icons[type] || '⚡' }), _jsx("span", { children: labels[type] || type })] }));
    };
    if (isLoading && workflows.size === 0) {
        return (_jsx("div", { className: `flex items-center justify-center p-12 ${className}`, children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin text-4xl mb-4", children: "\u2699\uFE0F" }), _jsx("p", { className: "text-gray-600", children: "Loading workflows..." })] }) }));
    }
    return (_jsxs("div", { className: `bg-white rounded-lg shadow ${className}`, children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Workflows" }), _jsxs("button", { onClick: onWorkflowCreate, className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(PlusIcon, {}), _jsx("span", { children: "Create Workflow" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(SearchIcon, {}) }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search workflows...", className: "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "all", children: "All Status" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" }), _jsx("option", { value: "draft", children: "Draft" }), _jsx("option", { value: "archived", children: "Archived" })] }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "updated", children: "Recently Updated" }), _jsx("option", { value: "created", children: "Recently Created" }), _jsx("option", { value: "name", children: "Name (A-Z)" })] })] })] }), _jsx("div", { className: "divide-y divide-gray-200", children: filteredWorkflows.length === 0 ? (_jsxs("div", { className: "p-12 text-center", children: [_jsx("p", { className: "text-gray-500 text-lg mb-2", children: "No workflows found" }), _jsx("p", { className: "text-gray-400 text-sm", children: searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first workflow to get started' })] })) : (filteredWorkflows.map((workflow) => (_jsx("div", { className: "p-6 hover:bg-gray-50 transition-colors cursor-pointer", onClick: () => onWorkflowClick?.(workflow), children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 truncate", children: workflow.name }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`, children: workflow.status })] }), workflow.description && (_jsx("p", { className: "text-gray-600 text-sm mb-3 line-clamp-2", children: workflow.description })), _jsxs("div", { className: "flex flex-wrap items-center gap-4 text-sm text-gray-500", children: [_jsx("div", { className: "flex items-center gap-1", children: getTriggerDisplay(workflow) }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { children: "\u26A1" }), _jsxs("span", { children: [workflow.actions.length, " actions"] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { children: "\uD83D\uDD52" }), _jsxs("span", { children: ["Updated ", new Date(workflow.updatedAt).toLocaleDateString()] })] })] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-4", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { onClick: () => handleToggleStatus(workflow), className: "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors", title: workflow.status === 'active' ? 'Pause' : 'Activate', children: workflow.status === 'active' ? _jsx(PauseIcon, {}) : _jsx(PlayIcon, {}) }), _jsx("button", { onClick: () => onWorkflowEdit?.(workflow), className: "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors", title: "Edit", children: _jsx(EditIcon, {}) }), _jsx("button", { onClick: () => handleClone(workflow), className: "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors", title: "Clone", children: _jsx(CopyIcon, {}) }), _jsx("button", { onClick: () => handleDelete(workflow.id), className: "p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors", title: "Delete", children: _jsx(DeleteIcon, {}) })] })] }) }, workflow.id)))) }), filteredWorkflows.length > 0 && (_jsxs("div", { className: "p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center", children: ["Showing ", filteredWorkflows.length, " of ", workflows.size, " workflows"] }))] }));
}
//# sourceMappingURL=WorkflowList.js.map