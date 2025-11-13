import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TriggerConfig - Workflow trigger configuration component
 *
 * Provides UI for configuring different trigger types with their specific options.
 */
import { useState } from 'react';
// Icons
const ManualIcon = () => _jsx("span", { children: "\uD83D\uDC46" });
const DocumentIcon = () => _jsx("span", { children: "\uD83D\uDCC4" });
const CaseIcon = () => _jsx("span", { children: "\u2696\uFE0F" });
const ClockIcon = () => _jsx("span", { children: "\u23F0" });
const WebhookIcon = () => _jsx("span", { children: "\uD83D\uDD17" });
const ApiIcon = () => _jsx("span", { children: "\uD83C\uDF10" });
const PlusIcon = () => _jsx("span", { children: "\u2795" });
const RemoveIcon = () => _jsx("span", { children: "\u2716\uFE0F" });
export function TriggerConfig({ trigger, onChange, className = '' }) {
    const [localTrigger, setLocalTrigger] = useState(trigger);
    // Update trigger and notify parent
    const updateTrigger = (updates) => {
        const updated = { ...localTrigger, ...updates };
        setLocalTrigger(updated);
        onChange(updated);
    };
    // Update trigger config
    const updateConfig = (key, value) => {
        updateTrigger({
            config: { ...localTrigger.config, [key]: value },
        });
    };
    // Add condition
    const addCondition = () => {
        const newCondition = {
            id: `condition-${Date.now()}`,
            field: '',
            operator: 'equals',
            value: '',
        };
        updateTrigger({
            conditions: [...(localTrigger.conditions || []), newCondition],
        });
    };
    // Update condition
    const updateCondition = (index, updates) => {
        const conditions = [...(localTrigger.conditions || [])];
        conditions[index] = { ...conditions[index], ...updates };
        updateTrigger({ conditions });
    };
    // Remove condition
    const removeCondition = (index) => {
        const conditions = [...(localTrigger.conditions || [])];
        conditions.splice(index, 1);
        updateTrigger({ conditions });
    };
    // Trigger type options
    const triggerTypes = [
        { value: 'manual', label: 'Manual', icon: _jsx(ManualIcon, {}) },
        { value: 'document_upload', label: 'Document Upload', icon: _jsx(DocumentIcon, {}) },
        { value: 'document_status_change', label: 'Document Status Change', icon: _jsx(DocumentIcon, {}) },
        { value: 'case_status_change', label: 'Case Status Change', icon: _jsx(CaseIcon, {}) },
        { value: 'date_time', label: 'Scheduled', icon: _jsx(ClockIcon, {}) },
        { value: 'webhook', label: 'Webhook', icon: _jsx(WebhookIcon, {}) },
        { value: 'api', label: 'API', icon: _jsx(ApiIcon, {}) },
    ];
    // Condition operators
    const operators = [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Not Contains' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'in', label: 'In (comma-separated)' },
        { value: 'not_in', label: 'Not In (comma-separated)' },
        { value: 'matches_regex', label: 'Matches Regex' },
    ];
    // Render trigger type specific config
    const renderTriggerConfig = () => {
        switch (localTrigger.type) {
            case 'manual':
                return (_jsx("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: _jsx("p", { className: "text-sm text-blue-900", children: "This workflow will be triggered manually by users or API calls." }) }));
            case 'document_upload':
                return (_jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Document Type Filter (optional)" }), _jsx("input", { type: "text", value: localTrigger.config?.documentType || '', onChange: (e) => updateConfig('documentType', e.target.value), placeholder: "e.g., contract, invoice", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Leave empty to trigger on all document uploads" })] }) }));
            case 'document_status_change':
                return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "From Status" }), _jsx("input", { type: "text", value: localTrigger.config?.fromStatus || '', onChange: (e) => updateConfig('fromStatus', e.target.value), placeholder: "e.g., draft", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "To Status" }), _jsx("input", { type: "text", value: localTrigger.config?.toStatus || '', onChange: (e) => updateConfig('toStatus', e.target.value), placeholder: "e.g., approved", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] }));
            case 'case_status_change':
                return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "From Status" }), _jsx("input", { type: "text", value: localTrigger.config?.fromStatus || '', onChange: (e) => updateConfig('fromStatus', e.target.value), placeholder: "e.g., open", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "To Status" }), _jsx("input", { type: "text", value: localTrigger.config?.toStatus || '', onChange: (e) => updateConfig('toStatus', e.target.value), placeholder: "e.g., closed", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] }));
            case 'date_time':
                return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Schedule Type" }), _jsxs("select", { value: localTrigger.config?.scheduleType || 'cron', onChange: (e) => updateConfig('scheduleType', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "cron", children: "Cron Expression" }), _jsx("option", { value: "interval", children: "Interval" })] })] }), localTrigger.config?.scheduleType === 'cron' ? (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Cron Expression" }), _jsx("input", { type: "text", value: localTrigger.config?.schedule || '', onChange: (e) => updateConfig('schedule', e.target.value), placeholder: "0 9 * * 1-5 (9 AM weekdays)", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Format: minute hour day month weekday" })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Interval" }), _jsxs("select", { value: localTrigger.config?.schedule || 'hourly', onChange: (e) => updateConfig('schedule', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "hourly", children: "Every Hour" }), _jsx("option", { value: "daily", children: "Daily" }), _jsx("option", { value: "weekly", children: "Weekly" }), _jsx("option", { value: "monthly", children: "Monthly" })] })] }))] }));
            case 'webhook':
                return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: [_jsx("p", { className: "text-sm text-blue-900 mb-2", children: "A unique webhook URL will be generated after creating this workflow." }), _jsx("p", { className: "text-xs text-blue-700", children: "You can configure signature verification and request validation in the workflow settings." })] }), _jsx("div", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: localTrigger.config?.verifySignature || false, onChange: (e) => updateConfig('verifySignature', e.target.checked), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Verify webhook signature" })] }) })] }));
            case 'api':
                return (_jsx("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: _jsx("p", { className: "text-sm text-blue-900", children: "This workflow can be triggered via API using the workflow ID." }) }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Trigger Type" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: triggerTypes.map((type) => (_jsx("button", { onClick: () => updateTrigger({ type: type.value, config: {} }), className: `p-3 border-2 rounded-lg transition-colors text-left ${localTrigger.type === type.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xl", children: type.icon }), _jsx("span", { className: "font-medium text-sm", children: type.label })] }) }, type.value))) })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Configuration" }), renderTriggerConfig()] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h4", { className: "text-sm font-medium text-gray-700", children: "Conditions (optional)" }), _jsxs("button", { onClick: addCondition, className: "flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors", children: [_jsx(PlusIcon, {}), _jsx("span", { children: "Add Condition" })] })] }), localTrigger.conditions && localTrigger.conditions.length > 0 ? (_jsxs("div", { className: "space-y-3", children: [localTrigger.conditions.map((condition, index) => (_jsxs("div", { className: "p-4 border border-gray-200 rounded-lg", children: [_jsxs("div", { className: "grid grid-cols-3 gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Field" }), _jsx("input", { type: "text", value: condition.field, onChange: (e) => updateCondition(index, { field: e.target.value }), placeholder: "e.g., status", className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Operator" }), _jsx("select", { value: condition.operator, onChange: (e) => updateCondition(index, { operator: e.target.value }), className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500", children: operators.map((op) => (_jsx("option", { value: op.value, children: op.label }, op.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Value" }), _jsx("input", { type: "text", value: condition.value, onChange: (e) => updateCondition(index, { value: e.target.value }), placeholder: "e.g., approved", className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" })] })] }), _jsxs("button", { onClick: () => removeCondition(index), className: "flex items-center gap-1 text-xs text-red-600 hover:text-red-700", children: [_jsx(RemoveIcon, {}), _jsx("span", { children: "Remove condition" })] })] }, index))), localTrigger.conditions.length > 1 && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Condition Logic" }), _jsx("p", { className: "text-sm text-gray-600", children: "All conditions must match (AND logic)" })] }))] })) : (_jsx("div", { className: "p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500", children: "No conditions added. Workflow will trigger for all matching events." }))] })] }));
}
//# sourceMappingURL=TriggerConfig.js.map