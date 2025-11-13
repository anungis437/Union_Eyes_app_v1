/**
 * WorkflowList - Display and manage workflows
 * 
 * Lists workflows with filtering, sorting, and bulk operations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../providers/WorkflowProvider';
import type { WorkflowDefinition, WorkflowStatus } from '../services/WorkflowEngine';

// Icons (using lucide-react or similar)
const PlayIcon = () => <span>▶️</span>;
const PauseIcon = () => <span>⏸️</span>;
const EditIcon = () => <span>✏️</span>;
const DeleteIcon = () => <span>🗑️</span>;
const CopyIcon = () => <span>📋</span>;
const SettingsIcon = () => <span>⚙️</span>;
const PlusIcon = () => <span>➕</span>;
const SearchIcon = () => <span>🔍</span>;

export interface WorkflowListProps {
  organizationId: string;
  onWorkflowClick?: (workflow: WorkflowDefinition) => void;
  onWorkflowEdit?: (workflow: WorkflowDefinition) => void;
  onWorkflowDelete?: (workflowId: string) => void;
  onWorkflowCreate?: () => void;
  className?: string;
}

export function WorkflowList({
  organizationId,
  onWorkflowClick,
  onWorkflowEdit,
  onWorkflowDelete,
  onWorkflowCreate,
  className = '',
}: WorkflowListProps) {
  const { workflows, loadWorkflows, updateWorkflow, deleteWorkflow, builder, isLoading } = useWorkflow();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');

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
      result = result.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
      );
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
  const handleToggleStatus = async (workflow: WorkflowDefinition) => {
    const newStatus: WorkflowStatus = workflow.status === 'active' ? 'paused' : 'active';
    
    try {
      await updateWorkflow(workflow.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update workflow status:', error);
    }
  };

  // Clone workflow
  const handleClone = async (workflow: WorkflowDefinition) => {
    try {
      const cloned = builder.cloneWorkflow(workflow);
      // Trigger create workflow UI
      onWorkflowCreate?.();
    } catch (error) {
      console.error('Failed to clone workflow:', error);
    }
  };

  // Delete workflow
  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await deleteWorkflow(workflowId);
      onWorkflowDelete?.(workflowId);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  // Get status badge color
  const getStatusColor = (status: WorkflowStatus) => {
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
  const getTriggerDisplay = (workflow: WorkflowDefinition) => {
    const type = workflow.trigger.type;
    const icons: Record<string, string> = {
      manual: '👆',
      document_upload: '📄',
      document_status_change: '📝',
      case_status_change: '⚖️',
      date_time: '⏰',
      webhook: '🔗',
      api: '🌐',
    };

    const labels: Record<string, string> = {
      manual: 'Manual',
      document_upload: 'Document Upload',
      document_status_change: 'Document Status',
      case_status_change: 'Case Status',
      date_time: 'Scheduled',
      webhook: 'Webhook',
      api: 'API',
    };

    return (
      <span className="flex items-center gap-1 text-sm text-gray-600">
        <span>{icons[type] || '⚡'}</span>
        <span>{labels[type] || type}</span>
      </span>
    );
  };

  if (isLoading && workflows.size === 0) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
          
          <button
            onClick={onWorkflowCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            <span>Create Workflow</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'updated')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Workflow List */}
      <div className="divide-y divide-gray-200">
        {filteredWorkflows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">No workflows found</p>
            <p className="text-gray-400 text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first workflow to get started'}
            </p>
          </div>
        ) : (
          filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onWorkflowClick?.(workflow)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name and status */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {workflow.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                      {workflow.status}
                    </span>
                  </div>

                  {/* Description */}
                  {workflow.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {workflow.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {/* Trigger */}
                    <div className="flex items-center gap-1">
                      {getTriggerDisplay(workflow)}
                    </div>

                    {/* Actions count */}
                    <div className="flex items-center gap-1">
                      <span>⚡</span>
                      <span>{workflow.actions.length} actions</span>
                    </div>

                    {/* Last updated */}
                    <div className="flex items-center gap-1">
                      <span>🕒</span>
                      <span>
                        Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {/* Toggle active/paused */}
                  <button
                    onClick={() => handleToggleStatus(workflow)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={workflow.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {workflow.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onWorkflowEdit?.(workflow)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <EditIcon />
                  </button>

                  {/* Clone */}
                  <button
                    onClick={() => handleClone(workflow)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Clone"
                  >
                    <CopyIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      {filteredWorkflows.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
          Showing {filteredWorkflows.length} of {workflows.size} workflows
        </div>
      )}
    </div>
  );
}
