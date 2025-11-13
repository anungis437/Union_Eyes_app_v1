/**
 * ActionConfig - Workflow action configuration component
 * 
 * Provides UI for configuring actions with template selection and schema-based config.
 */

import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../providers/WorkflowProvider';
import type { WorkflowAction, ActionType, WorkflowCondition } from '../services/WorkflowEngine';

// Icons
const NotificationIcon = () => <span>🔔</span>;
const TaskIcon = () => <span>✓</span>;
const StatusIcon = () => <span>🏷️</span>;
const DocumentIcon = () => <span>📄</span>;
const EmailIcon = () => <span>✉️</span>;
const WebhookIcon = () => <span>🔗</span>;
const ApiIcon = () => <span>🌐</span>;
const WorkflowIcon = () => <span>⚙️</span>;
const PlusIcon = () => <span>➕</span>;
const RemoveIcon = () => <span>✖️</span>;

export interface ActionConfigProps {
  action: WorkflowAction;
  onChange: (action: WorkflowAction) => void;
  workflowActions?: WorkflowAction[]; // For displaying action connections
  className?: string;
}

export function ActionConfig({ 
  action, 
  onChange, 
  workflowActions = [],
  className = '' 
}: ActionConfigProps) {
  const { actionService } = useWorkflow();
  const [localAction, setLocalAction] = useState<WorkflowAction>(action);
  const [template, setTemplate] = useState<any>(null);

  // Load template when action type changes
  useEffect(() => {
    const templates = actionService.listTemplates();
    const found = templates.find(t => t.type === localAction.type);
    setTemplate(found || null);
  }, [localAction.type, actionService]);

  // Update action and notify parent
  const updateAction = (updates: Partial<WorkflowAction>) => {
    const updated = { ...localAction, ...updates };
    setLocalAction(updated);
    onChange(updated);
  };

  // Update action config
  const updateConfig = (key: string, value: any) => {
    updateAction({
      config: { ...localAction.config, [key]: value },
    });
  };

  // Add condition
  const addCondition = () => {
    const newCondition: WorkflowCondition = {
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
  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const conditions = [...(localAction.conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    updateAction({ conditions });
  };

  // Remove condition
  const removeCondition = (index: number) => {
    const conditions = [...(localAction.conditions || [])];
    conditions.splice(index, 1);
    updateAction({ conditions });
  };

  // Add success action
  const addSuccessAction = (actionId: string) => {
    const onSuccess = [...(localAction.onSuccess || [])];
    if (!onSuccess.includes(actionId)) {
      onSuccess.push(actionId);
      updateAction({ onSuccess });
    }
  };

  // Remove success action
  const removeSuccessAction = (actionId: string) => {
    const onSuccess = [...(localAction.onSuccess || [])];
    const index = onSuccess.indexOf(actionId);
    if (index > -1) {
      onSuccess.splice(index, 1);
      updateAction({ onSuccess });
    }
  };

  // Add failure action
  const addFailureAction = (actionId: string) => {
    const onFailure = [...(localAction.onFailure || [])];
    if (!onFailure.includes(actionId)) {
      onFailure.push(actionId);
      updateAction({ onFailure });
    }
  };

  // Remove failure action
  const removeFailureAction = (actionId: string) => {
    const onFailure = [...(localAction.onFailure || [])];
    const index = onFailure.indexOf(actionId);
    if (index > -1) {
      onFailure.splice(index, 1);
      updateAction({ onFailure });
    }
  };

  // Action type options
  const actionTypes: { value: ActionType; label: string; icon: React.ReactNode }[] = [
    { value: 'send_notification', label: 'Send Notification', icon: <NotificationIcon /> },
    { value: 'assign_task', label: 'Assign Task', icon: <TaskIcon /> },
    { value: 'update_status', label: 'Update Status', icon: <StatusIcon /> },
    { value: 'create_document', label: 'Create Document', icon: <DocumentIcon /> },
    { value: 'send_email', label: 'Send Email', icon: <EmailIcon /> },
    { value: 'webhook', label: 'Webhook', icon: <WebhookIcon /> },
    { value: 'api_call', label: 'API Call', icon: <ApiIcon /> },
    { value: 'run_workflow', label: 'Run Workflow', icon: <WorkflowIcon /> },
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
  const renderConfigField = (field: any) => {
    const value = localAction.config?.[field.name] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'text':
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateConfig(field.name, parseFloat(e.target.value))}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => updateConfig(field.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          >
            {!field.required && <option value="">-- Select --</option>}
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              updateConfig(field.name, selected);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          >
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateConfig(field.name, parsed);
              } catch {
                updateConfig(field.name, e.target.value);
              }
            }}
            placeholder={field.placeholder}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            required={field.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          />
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Action Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Action Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {actionTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateAction({ type: type.value, config: {} })}
              className={`p-3 border-2 rounded-lg transition-colors text-left ${
                localAction.type === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{type.icon}</span>
                <span className="font-medium text-sm">{type.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Configuration */}
      {template && template.configSchema && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration</h4>
          <div className="space-y-4">
            {template.configSchema.map((field: any) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderConfigField(field)}
                {field.description && (
                  <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retry Configuration */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Retry Configuration</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Attempts</label>
            <input
              type="number"
              min="1"
              max="10"
              value={localAction.retryConfig?.maxAttempts ?? 3}
              onChange={(e) => updateAction({
                retryConfig: {
                  ...localAction.retryConfig,
                  maxAttempts: parseInt(e.target.value),
                  delayMs: localAction.retryConfig?.delayMs ?? 1000,
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Delay (ms)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={localAction.retryConfig?.delayMs ?? 1000}
              onChange={(e) => updateAction({
                retryConfig: {
                  ...localAction.retryConfig,
                  maxAttempts: localAction.retryConfig?.maxAttempts ?? 3,
                  delayMs: parseInt(e.target.value),
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Conditions (optional)
          </h4>
          <button
            onClick={addCondition}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <PlusIcon />
            <span>Add Condition</span>
          </button>
        </div>

        {localAction.conditions && localAction.conditions.length > 0 ? (
          <div className="space-y-3">
            {localAction.conditions.map((condition, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Field</label>
                    <input
                      type="text"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      placeholder="e.g., status"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Operator</label>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Value</label>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="e.g., approved"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeCondition(index)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <RemoveIcon />
                  <span>Remove condition</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
            No conditions added. Action will always execute.
          </div>
        )}
      </div>
    </div>
  );
}
