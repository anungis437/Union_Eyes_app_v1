/**
 * Visual Report Builder
 * 
 * Drag-and-drop interface for building custom reports without SQL
 * Allows users to select data sources, fields, filters, and visualizations
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform (Visual Report Builder)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Play, 
  Save, 
  Copy, 
  Eye, 
  Download,
  Settings,
  Table as TableIcon,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Filter,
  Columns,
  AlertCircle,
} from 'lucide-react';
import { FilterBuilder } from './FilterBuilder';
import { ChartSelector } from './ChartSelector';
import { ReportPreview } from './ReportPreview';

// ============================================================================
// Types
// ============================================================================

interface DataSource {
  id: string;
  name: string;
  table: string;
  description: string;
  fields: DataField[];
}

interface DataField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  aggregatable: boolean;
  filterable: boolean;
  sortable: boolean;
}

interface SelectedField {
  fieldId: string;
  fieldName: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  alias?: string;
}

interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface SortRule {
  fieldId: string;
  direction: 'asc' | 'desc';
}

interface ReportConfig {
  name: string;
  description: string;
  dataSourceId: string;
  fields: SelectedField[];
  filters: ReportFilter[];
  groupBy: string[];
  sortBy: SortRule[];
  visualizationType: 'table' | 'bar' | 'line' | 'pie' | 'area' | 'composed';
  chartConfig?: {
    xAxis?: string;
    yAxis?: string[];
    colors?: string[];
  };
  limit?: number;
}

interface ReportBuilderProps {
  initialConfig?: Partial<ReportConfig>;
  onSave?: (config: ReportConfig) => void;
  onExecute?: (config: ReportConfig) => void;
  className?: string;
}

// ============================================================================
// Mock Data Sources (would come from API in production)
// ============================================================================

const DATA_SOURCES: DataSource[] = [
  {
    id: 'claims',
    name: 'Claims',
    table: 'claims',
    description: 'All claim records',
    fields: [
      { id: 'id', name: 'Claim ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'title', name: 'Title', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'type', name: 'Type', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'status', name: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'priority', name: 'Priority', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'claim_amount', name: 'Claim Amount', type: 'number', aggregatable: true, filterable: true, sortable: true },
      { id: 'created_at', name: 'Created Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
      { id: 'resolved_at', name: 'Resolved Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
    ],
  },
  {
    id: 'members',
    name: 'Members',
    table: 'members',
    description: 'Union member records',
    fields: [
      { id: 'id', name: 'Member ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'name', name: 'Name', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'email', name: 'Email', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'status', name: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'union_number', name: 'Union Number', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'created_at', name: 'Join Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
    ],
  },
  {
    id: 'deadlines',
    name: 'Deadlines',
    table: 'deadlines',
    description: 'Claim deadlines and milestones',
    fields: [
      { id: 'id', name: 'Deadline ID', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'title', name: 'Title', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'type', name: 'Type', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'status', name: 'Status', type: 'string', aggregatable: false, filterable: true, sortable: true },
      { id: 'due_date', name: 'Due Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
      { id: 'completed_at', name: 'Completed Date', type: 'date', aggregatable: false, filterable: true, sortable: true },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function ReportBuilder({
  initialConfig,
  onSave,
  onExecute,
  className,
}: ReportBuilderProps) {
  // Fetch data sources from API
  const [dataSources, setDataSources] = useState<DataSource[]>(DATA_SOURCES);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(true);

  useEffect(() => {
    async function fetchDataSources() {
      try {
        const response = await fetch('/api/reports/datasources');
        if (response.ok) {
          const result = await response.json();
          const apiDataSources = result.dataSources.map((ds: any) => ({
            id: ds.id,
            name: ds.name,
            table: ds.id, // Use id as table name
            description: ds.description,
            fields: ds.fields.map((f: any) => ({
              id: f.fieldId,
              name: f.fieldName,
              type: f.type,
              aggregatable: f.aggregatable,
              filterable: f.filterable,
              sortable: f.sortable,
            })),
          }));
          setDataSources(apiDataSources);
        }
      } catch (error) {
        console.error('Error fetching data sources:', error);
        // Keep using mock data if API fails
      } finally {
        setIsLoadingDataSources(false);
      }
    }

    fetchDataSources();
  }, []);
  // State
  const [config, setConfig] = useState<ReportConfig>({
    name: initialConfig?.name || '',
    description: initialConfig?.description || '',
    dataSourceId: initialConfig?.dataSourceId || '',
    fields: initialConfig?.fields || [],
    filters: initialConfig?.filters || [],
    groupBy: initialConfig?.groupBy || [],
    sortBy: initialConfig?.sortBy || [],
    visualizationType: initialConfig?.visualizationType || 'table',
    chartConfig: initialConfig?.chartConfig || {},
    limit: initialConfig?.limit || 100,
  });

  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data source when selected
  useEffect(() => {
    if (config.dataSourceId) {
      const source = DATA_SOURCES.find(ds => ds.id === config.dataSourceId);
      setSelectedDataSource(source || null);
    }
  }, [config.dataSourceId]);

  // Handlers
  const handleDataSourceChange = (dataSourceId: string) => {
    setConfig({
      ...config,
      dataSourceId,
      fields: [], // Reset fields when changing data source
      filters: [],
      groupBy: [],
      sortBy: [],
    });
  };

  const handleAddField = (field: DataField, aggregation?: string) => {
    const newField: SelectedField = {
      fieldId: field.id,
      fieldName: field.name,
      aggregation: aggregation as any,
      alias: aggregation ? `${aggregation}_${field.id}` : undefined,
    };

    setConfig({
      ...config,
      fields: [...config.fields, newField],
    });
    setShowFieldDialog(false);
  };

  const handleRemoveField = (index: number) => {
    setConfig({
      ...config,
      fields: config.fields.filter((_, i) => i !== index),
    });
  };

  const handleAddFilter = (filter: ReportFilter) => {
    setConfig({
      ...config,
      filters: [...config.filters, filter],
    });
    setShowFilterDialog(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    setConfig({
      ...config,
      filters: config.filters.filter(f => f.id !== filterId),
    });
  };

  const handleAddGroupBy = (fieldId: string) => {
    if (!config.groupBy.includes(fieldId)) {
      setConfig({
        ...config,
        groupBy: [...config.groupBy, fieldId],
      });
    }
  };

  const handleRemoveGroupBy = (fieldId: string) => {
    setConfig({
      ...config,
      groupBy: config.groupBy.filter(f => f !== fieldId),
    });
  };

  const handleAddSort = (fieldId: string, direction: 'asc' | 'desc') => {
    const existingIndex = config.sortBy.findIndex(s => s.fieldId === fieldId);
    if (existingIndex >= 0) {
      // Update existing sort
      const newSortBy = [...config.sortBy];
      newSortBy[existingIndex] = { fieldId, direction };
      setConfig({ ...config, sortBy: newSortBy });
    } else {
      // Add new sort
      setConfig({
        ...config,
        sortBy: [...config.sortBy, { fieldId, direction }],
      });
    }
  };

  const handleRemoveSort = (fieldId: string) => {
    setConfig({
      ...config,
      sortBy: config.sortBy.filter(s => s.fieldId !== fieldId),
    });
  };

  const handleExecute = async () => {
    if (!validateConfig()) return;

    setIsExecuting(true);
    setError(null);

    try {
      if (onExecute) {
        await onExecute(config);
      }
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to execute report');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSave = async () => {
    if (!validateConfig()) return;

    try {
      if (onSave) {
        await onSave(config);
      }
      setShowSaveDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save report');
    }
  };

  const validateConfig = (): boolean => {
    if (!config.name.trim()) {
      setError('Report name is required');
      return false;
    }
    if (!config.dataSourceId) {
      setError('Please select a data source');
      return false;
    }
    if (config.fields.length === 0) {
      setError('Please select at least one field');
      return false;
    }
    return true;
  };

  const getFieldName = (fieldId: string): string => {
    if (!selectedDataSource) return fieldId;
    const field = selectedDataSource.fields.find(f => f.id === fieldId);
    return field?.name || fieldId;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Report Builder</h2>
          <p className="text-gray-600 text-sm mt-1">
            Create custom reports without writing SQL
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={!config.name || config.fields.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!config.dataSourceId || config.fields.length === 0 || isExecuting}
          >
            {isExecuting ? (
              <>Loading...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Report Details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-name">Report Name</Label>
                <Input
                  id="report-name"
                  placeholder="e.g., Monthly Claims Summary"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="report-description">Description</Label>
                <Input
                  id="report-description"
                  placeholder="Brief description of this report"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="data-source">Data Source</Label>
                <Select value={config.dataSourceId} onValueChange={handleDataSourceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map(source => (
                      <SelectItem key={source.id} value={source.id}>
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{source.name}</div>
                            <div className="text-xs text-gray-500">{source.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Fields */}
          {selectedDataSource && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Columns className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Selected Fields</h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowFieldDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {config.fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Columns className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No fields selected</p>
                  <p className="text-sm">Click "Add Field" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {config.fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.fieldName}</span>
                        {field.aggregation && (
                          <Badge variant="outline" className="text-xs">
                            {field.aggregation.toUpperCase()}
                          </Badge>
                        )}
                        {field.alias && (
                          <span className="text-sm text-gray-500">as {field.alias}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Filters */}
          {selectedDataSource && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFilterDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Filter
                </Button>
              </div>

              {config.filters.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No filters applied (all data will be included)
                </div>
              ) : (
                <div className="space-y-2">
                  {config.filters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{getFieldName(filter.fieldId)}</span>
                        <span className="text-gray-500 mx-2">{filter.operator.replace('_', ' ')}</span>
                        <span className="font-medium">{String(filter.value)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFilter(filter.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Group By & Sort */}
          {selectedDataSource && config.fields.length > 0 && (
            <Card className="p-6">
              <Tabs defaultValue="groupby">
                <TabsList>
                  <TabsTrigger value="groupby">Group By</TabsTrigger>
                  <TabsTrigger value="sort">Sort Order</TabsTrigger>
                </TabsList>

                <TabsContent value="groupby" className="mt-4">
                  <div className="space-y-3">
                    <Label>Group By Fields</Label>
                    <Select onValueChange={handleAddGroupBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add grouping field" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.fields
                          .filter(f => !config.groupBy.includes(f.fieldId))
                          .map(field => (
                            <SelectItem key={field.fieldId} value={field.fieldId}>
                              {field.fieldName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {config.groupBy.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.groupBy.map(fieldId => (
                          <Badge key={fieldId} variant="secondary" className="flex items-center gap-1">
                            {getFieldName(fieldId)}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1"
                              onClick={() => handleRemoveGroupBy(fieldId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sort" className="mt-4">
                  <div className="space-y-3">
                    {config.fields.map(field => (
                      <div key={field.fieldId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm font-medium">{field.fieldName}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={config.sortBy.find(s => s.fieldId === field.fieldId && s.direction === 'asc') ? 'default' : 'outline'}
                            onClick={() => handleAddSort(field.fieldId, 'asc')}
                          >
                            ↑ Asc
                          </Button>
                          <Button
                            size="sm"
                            variant={config.sortBy.find(s => s.fieldId === field.fieldId && s.direction === 'desc') ? 'default' : 'outline'}
                            onClick={() => handleAddSort(field.fieldId, 'desc')}
                          >
                            ↓ Desc
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>

        {/* Visualization Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Visualization</h3>
            <ChartSelector
              value={config.visualizationType}
              onChange={(type) => setConfig({ ...config, visualizationType: type })}
              fields={config.fields}
              onChartConfigChange={(chartConfig) => setConfig({ ...config, chartConfig })}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Options</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="limit">Result Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max="10000"
                  value={config.limit}
                  onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum rows to return (1-10,000)</p>
              </div>
            </div>
          </Card>

          {/* Config Summary */}
          <Card className="p-6 bg-blue-50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Report Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Data Source:</span>
                <span className="font-medium">{selectedDataSource?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fields:</span>
                <span className="font-medium">{config.fields.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filters:</span>
                <span className="font-medium">{config.filters.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grouped:</span>
                <span className="font-medium">{config.groupBy.length > 0 ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Visualization:</span>
                <span className="font-medium capitalize">{config.visualizationType}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Field Selection Dialog */}
      {showFieldDialog && selectedDataSource && (
        <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Field</DialogTitle>
              <DialogDescription>
                Select a field to include in your report
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {selectedDataSource.fields.map(field => (
                <Card
                  key={field.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleAddField(field)}
                >
                  <h4 className="font-medium">{field.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Type: {field.type}</p>
                  {field.aggregatable && (
                    <div className="flex gap-1 mt-2">
                      {['count', 'sum', 'avg', 'min', 'max'].map(agg => (
                        <Badge
                          key={agg}
                          variant="outline"
                          className="text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddField(field, agg);
                          }}
                        >
                          {agg}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Builder Dialog */}
      {showFilterDialog && selectedDataSource && (
        <FilterBuilder
          open={showFilterDialog}
          onClose={() => setShowFilterDialog(false)}
          fields={selectedDataSource.fields}
          onAddFilter={handleAddFilter}
        />
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Save this report configuration for future use
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Report "<span className="font-medium">{config.name}</span>" will be saved with {config.fields.length} field(s) and {config.filters.length} filter(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && (
        <ReportPreview
          open={showPreview}
          onClose={() => setShowPreview(false)}
          config={config}
        />
      )}
    </div>
  );
}
