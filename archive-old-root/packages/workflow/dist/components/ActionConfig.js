import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ActionConfig - Workflow action configuration component
 *
 * Provides UI for configuring actions with template selection and schema-based config.
 */
import { useState, useEffect } from 'react';
import { useWorkflow } from '../providers/WorkflowProvider';
// Icons
const NotificationIcon = () => _jsx("span", { children: "\uD83D\uDD14" });
const TaskIcon = () => _jsx("span", { children: "\u2713" });
const StatusIcon = () => _jsx("span", { children: "\uD83C\uDFF7\uFE0F" });
const DocumentIcon = () => _jsx("span", { children: "\uD83D\uDCC4" });
const EmailIcon = () => _jsx("span", { children: "\u2709\uFE0F" });
const WebhookIcon = () => _jsx("span", { children: "\uD83D\uDD17" });
const ApiIcon = () => _jsx("span", { children: "\uD83C\uDF10" });
const WorkflowIcon = () => _jsx("span", { children: "\u2699\uFE0F" });
const PlusIcon = () => _jsx("span", { children: "\u2795" });
const RemoveIcon = () => _jsx("span", { children: "\u2716\uFE0F" });
export function ActionConfig({ action, onChange, workflowActions = [], className = '' }) {
    const { actionService } = useWorkflow();
    const [localAction, setLocalAction] = useState(action);
    const [template, setTemplate] = useState(null);
    // Load template when action type changes
    useEffect(() => {
        const templates = actionService.listTemplates();
        const found = templates.find(t => t.type === localAction.type);
        setTemplate(found || null);
    }, [localAction.type, actionService]);
    // Update action and notify parent
    const updateAction = (updates) => {
        const updated = { ...localAction, ...updates };
        setLocalAction(updated);
        onChange(updated);
    };
    // Update action config
    const updateConfig = (key, value) => {
        updateAction({
            config: { ...localAction.config, [key]: value },
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
        updateAction({
            conditions: [...(localAction.conditions || []), newCondition],
        });
    };
    // Update condition
    const updateCondition = (index, updates) => {
        const conditions = [...(localAction.conditions || [])];
        conditions[index] = { ...conditions[index], ...updates };
        updateAction({ conditions });
    };
    // Remove condition
    const removeCondition = (index) => {
        const conditions = [...(localAction.conditions || [])];
        conditions.splice(index, 1);
        updateAction({ conditions });
    };
    // Add success action
    const addSuccessAction = (actionId) => {
        const onSuccess = [...(localAction.onSuccess || [])];
        if (!onSuccess.includes(actionId)) {
            onSuccess.push(actionId);
            updateAction({ onSuccess });
        }
    };
    // Remove success action
    const removeSuccessAction = (actionId) => {
        const onSuccess = [...(localAction.onSuccess || [])];
        const index = onSuccess.indexOf(actionId);
        if (index > -1) {
            onSuccess.splice(index, 1);
            updateAction({ onSuccess });
        }
    };
    // Add failure action
    const addFailureAction = (actionId) => {
        const onFailure = [...(localAction.onFailure || [])];
        if (!onFailure.includes(actionId)) {
            onFailure.push(actionId);
            updateAction({ onFailure });
        }
    };
    // Remove failure action
    const removeFailureAction = (actionId) => {
        const onFailure = [...(localAction.onFailure || [])];
        const index = onFailure.indexOf(actionId);
        if (index > -1) {
            onFailure.splice(index, 1);
            updateAction({ onFailure });
        }
    };
    // Action type options
    const actionTypes = [
        { value: 'send_notification', label: 'Send Notification', icon: _jsx(NotificationIcon, {}) },
        { value: 'assign_task', label: 'Assign Task', icon: _jsx(TaskIcon, {}) },
        { value: 'update_status', label: 'Update Status', icon: _jsx(StatusIcon, {}) },
        { value: 'create_document', label: 'Create Document', icon: _jsx(DocumentIcon, {}) },
        { value: 'send_email', label: 'Send Email', icon: _jsx(EmailIcon, {}) },
        { value: 'webhook', label: 'Webhook', icon: _jsx(WebhookIcon, {}) },
        { value: 'api_call', label: 'API Call', icon: _jsx(ApiIcon, {}) },
        { value: 'run_workflow', label: 'Run Workflow', icon: _jsx(WorkflowIcon, {}) },
    ];
    // Condition operators
    const operators = [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Not Contains' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'in', label: 'In' },
        { value: 'not_in', label: 'Not In' },
        { value: 'matches_regex', label: 'Matches Regex' },
    ];
    // Render config field based on schema
    const renderConfigField = (field) => {
        const value = localAction.config?.[field.name] ?? field.defaultValue ?? '';
        switch (field.type) {
            case 'text':
            case 'string':
                return (_jsx("input", { type: "text", value: value, onChange: (e) => updateConfig(field.name, e.target.value), placeholder: field.placeholder, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required }));
            case 'textarea':
                return (_jsx("textarea", { value: value, onChange: (e) => updateConfig(field.name, e.target.value), placeholder: field.placeholder, rows: 4, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required }));
            case 'number':
                return (_jsx("input", { type: "number", value: value, onChange: (e) => updateConfig(field.name, parseFloat(e.target.value)), placeholder: field.placeholder, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required }));
            case 'boolean':
                return (_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: !!value, onChange: (e) => updateConfig(field.name, e.target.checked), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: field.label })] }));
            case 'select':
                return (_jsxs("select", { value: value, onChange: (e) => updateConfig(field.name, e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required, children: [!field.required && _jsx("option", { value: "", children: "-- Select --" }), field.options?.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] }));
            case 'multiselect':
                return (_jsx("select", { multiple: true, value: Array.isArray(value) ? value : [], onChange: (e) => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        updateConfig(field.name, selected);
                    }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required, children: field.options?.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }));
            case 'json':
                return (_jsx("textarea", { value: typeof value === 'string' ? value : JSON.stringify(value, null, 2), onChange: (e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            updateConfig(field.name, parsed);
                        }
                        catch {
                            updateConfig(field.name, e.target.value);
                        }
                    }, placeholder: field.placeholder, rows: 6, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm", required: field.required }));
            default:
                return (_jsx("input", { type: "text", value: value, onChange: (e) => updateConfig(field.name, e.target.value), placeholder: field.placeholder, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: field.required }));
        }
    };
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Action Type" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: actionTypes.map((type) => (_jsx("button", { onClick: () => updateAction({ type: type.value, config: {} }), className: `p-3 border-2 rounded-lg transition-colors text-left ${localAction.type === type.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xl", children: type.icon }), _jsx("span", { className: "font-medium text-sm", children: type.label })] }) }, type.value))) })] }), template && template.configSchema && (_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Configuration" }), _jsx("div", { className: "space-y-4", children: template.configSchema.map((field) => (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: [field.label, field.required && _jsx("span", { className: "text-red-500 ml-1", children: "*" })] }), renderConfigField(field), field.description && (_jsx("p", { className: "text-xs text-gray-500 mt-1", children: field.description }))] }, field.name))) })] })), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Retry Configuration" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Max Attempts" }), _jsx("input", { type: "number", min: "1", max: "10", value: localAction.retryConfig?.maxAttempts ?? 3, onChange: (e) => updateAction({
                                            retryConfig: {
                                                ...localAction.retryConfig,
                                                maxAttempts: parseInt(e.target.value),
                                                delayMs: localAction.retryConfig?.delayMs ?? 1000,
                                            },
                                        }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Delay (ms)" }), _jsx("input", { type: "number", min: "100", step: "100", value: localAction.retryConfig?.delayMs ?? 1000, onChange: (e) => updateAction({
                                            retryConfig: {
                                                ...localAction.retryConfig,
                                                maxAttempts: localAction.retryConfig?.maxAttempts ?? 3,
                                                delayMs: parseInt(e.target.value),
                                            },
                                        }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h4", { className: "text-sm font-medium text-gray-700", children: "Conditions (optional)" }), _jsxs("button", { onClick: addCondition, className: "flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors", children: [_jsx(PlusIcon, {}), _jsx("span", { children: "Add Condition" })] })] }), localAction.conditions && localAction.conditions.length > 0 ? (_jsx("div", { className: "space-y-3", children: localAction.conditions.map((condition, index) => (_jsxs("div", { className: "p-4 border border-gray-200 rounded-lg", children: [_jsxs("div", { className: "grid grid-cols-3 gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Field" }), _jsx("input", { type: "text", value: condition.field, onChange: (e) => updateCondition(index, { field: e.target.value }), placeholder: "e.g., status", className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Operator" }), _jsx("select", { value: condition.operator, onChange: (e) => updateCondition(index, { operator: e.target.value }), className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500", children: operators.map((op) => (_jsx("option", { value: op.value, children: op.label }, op.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Value" }), _jsx("input", { type: "text", value: condition.value, onChange: (e) => updateCondition(index, { value: e.target.value }), placeholder: "e.g., approved", className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" })] })] }), _jsxs("button", { onClick: () => removeCondition(index), className: "flex items-center gap-1 text-xs text-red-600 hover:text-red-700", children: [_jsx(RemoveIcon, {}), _jsx("span", { children: "Remove condition" })] })] }, index))) })) : (_jsx("div", { className: "p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500", children: "No conditions added. Action will always execute." }))] })] }));
}
//# sourceMappingURL=ActionConfig.js.map