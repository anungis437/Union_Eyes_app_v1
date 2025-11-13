/**
 * TriggerConfig - Workflow trigger configuration component
 * 
 * Provides UI for configuring different trigger types with their specific options.
 */

import React, { useState } from 'react';
import type { WorkflowTrigger, TriggerType, WorkflowCondition } from '../services/WorkflowEngine';

// Icons
const ManualIcon = () => <span>👆</span>;
const DocumentIcon = () => <span>📄</span>;
const CaseIcon = () => <span>⚖️</span>;
const ClockIcon = () => <span>⏰</span>;
const WebhookIcon = () => <span>🔗</span>;
const ApiIcon = () => <span>🌐</span>;
const PlusIcon = () => <span>➕</span>;
const RemoveIcon = () => <span>✖️</span>;

export interface TriggerConfigProps {
  trigger: WorkflowTrigger;
  onChange: (trigger: WorkflowTrigger) => void;
  className?: string;
}

export function TriggerConfig({ trigger, onChange, className = '' }: TriggerConfigProps) {
  const [localTrigger, setLocalTrigger] = useState<WorkflowTrigger>(trigger);

  // Update trigger and notify parent
  const updateTrigger = (updates: Partial<WorkflowTrigger>) => {
    const updated = { ...localTrigger, ...updates };
    setLocalTrigger(updated);
    onChange(updated);
  };

  // Update trigger config
  const updateConfig = (key: string, value: any) => {
    updateTrigger({
      config: { ...localTrigger.config, [key]: value },
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

    updateTrigger({
      conditions: [...(localTrigger.conditions || []), newCondition],
    });
  };

  // Update condition
  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const conditions = [...(localTrigger.conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    updateTrigger({ conditions });
  };

  // Remove condition
  const removeCondition = (index: number) => {
    const conditions = [...(localTrigger.conditions || [])];
    conditions.splice(index, 1);
    updateTrigger({ conditions });
  };

  // Trigger type options
  const triggerTypes: { value: TriggerType; label: string; icon: React.ReactNode }[] = [
    { value: 'manual', label: 'Manual', icon: <ManualIcon /> },
    { value: 'document_upload', label: 'Document Upload', icon: <DocumentIcon /> },
    { value: 'document_status_change', label: 'Document Status Change', icon: <DocumentIcon /> },
    { value: 'case_status_change', label: 'Case Status Change', icon: <CaseIcon /> },
    { value: 'date_time', label: 'Scheduled', icon: <ClockIcon /> },
    { value: 'webhook', label: 'Webhook', icon: <WebhookIcon /> },
    { value: 'api', label: 'API', icon: <ApiIcon /> },
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
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              This workflow will be triggered manually by users or API calls.
            </p>
          </div>
        );

      case 'document_upload':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type Filter (optional)
              </label>
              <input
                type="text"
                value={localTrigger.config?.documentType || ''}
                onChange={(e) => updateConfig('documentType', e.target.value)}
                placeholder="e.g., contract, invoice"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to trigger on all document uploads
              </p>
            </div>
          </div>
        );

      case 'document_status_change':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Status
              </label>
              <input
                type="text"
                value={localTrigger.config?.fromStatus || ''}
                onChange={(e) => updateConfig('fromStatus', e.target.value)}
                placeholder="e.g., draft"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Status
              </label>
              <input
                type="text"
                value={localTrigger.config?.toStatus || ''}
                onChange={(e) => updateConfig('toStatus', e.target.value)}
                placeholder="e.g., approved"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'case_status_change':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Status
              </label>
              <input
                type="text"
                value={localTrigger.config?.fromStatus || ''}
                onChange={(e) => updateConfig('fromStatus', e.target.value)}
                placeholder="e.g., open"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Status
              </label>
              <input
                type="text"
                value={localTrigger.config?.toStatus || ''}
                onChange={(e) => updateConfig('toStatus', e.target.value)}
                placeholder="e.g., closed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'date_time':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Type
              </label>
              <select
                value={localTrigger.config?.scheduleType || 'cron'}
                onChange={(e) => updateConfig('scheduleType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cron">Cron Expression</option>
                <option value="interval">Interval</option>
              </select>
            </div>

            {localTrigger.config?.scheduleType === 'cron' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={localTrigger.config?.schedule || ''}
                  onChange={(e) => updateConfig('schedule', e.target.value)}
                  placeholder="0 9 * * 1-5 (9 AM weekdays)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: minute hour day month weekday
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval
                </label>
                <select
                  value={localTrigger.config?.schedule || 'hourly'}
                  onChange={(e) => updateConfig('schedule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                A unique webhook URL will be generated after creating this workflow.
              </p>
              <p className="text-xs text-blue-700">
                You can configure signature verification and request validation in the workflow settings.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localTrigger.config?.verifySignature || false}
                  onChange={(e) => updateConfig('verifySignature', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Verify webhook signature</span>
              </label>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              This workflow can be triggered via API using the workflow ID.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trigger Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Trigger Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {triggerTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateTrigger({ type: type.value, config: {} })}
              className={`p-3 border-2 rounded-lg transition-colors text-left ${
                localTrigger.type === type.value
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

      {/* Trigger Configuration */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration</h4>
        {renderTriggerConfig()}
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

        {localTrigger.conditions && localTrigger.conditions.length > 0 ? (
          <div className="space-y-3">
            {localTrigger.conditions.map((condition, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {/* Field */}
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

                  {/* Operator */}
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

                  {/* Value */}
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

                {/* Remove button */}
                <button
                  onClick={() => removeCondition(index)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <RemoveIcon />
                  <span>Remove condition</span>
                </button>
              </div>
            ))}

            {/* Condition logic */}
            {localTrigger.conditions.length > 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Condition Logic</label>
                <p className="text-sm text-gray-600">
                  All conditions must match (AND logic)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
            No conditions added. Workflow will trigger for all matching events.
          </div>
        )}
      </div>
    </div>
  );
}
