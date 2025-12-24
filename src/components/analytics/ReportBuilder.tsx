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

import React, { useState, useEffect, useCallback } from 'react';
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
import { DataSourceExplorer } from '@/components/analytics/DataSourceExplorer';
import { FormulaBuilder } from '@/components/analytics/FormulaBuilder';
import { ChartConfigPanel, ChartType, ChartConfig } from '@/components/analytics/ChartConfigPanel';
import {
  ScatterChart,
  BubbleChart,
  TreemapChart,
  FunnelChart,
  GaugeChart,
  WaterfallChart,
  SankeyChart,
  BoxPlotChart,
  CandlestickChart,
  SunburstChart,
  DataTable,
  ChartExporter,
} from '@/components/analytics/charts';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';

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
  
  // New state for enhanced features
  const [showFormulaBuilder, setShowFormulaBuilder] = useState(false);
  const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(true);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar' as ChartType,
    legend: { show: true, position: 'bottom' },
    tooltip: { enabled: true },
  });
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
      
      // Also update live preview
      await fetchPreviewData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute report');
    } finally {
      setIsExecuting(false);
    }
  };

  // Live preview with debounce
  const fetchPreviewData = useCallback(async () => {
    if (!config.dataSourceId || config.fields.length === 0) {
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, limit: 10 }), // Preview with 10 rows
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.results);
      } else {
        console.error('Preview failed:', await response.text());
        setPreviewData(null);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [config]);

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showPreview && config.dataSourceId && config.fields.length > 0) {
        fetchPreviewData();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [config.dataSourceId, config.fields, config.filters, config.groupBy, config.sortBy, showPreview, fetchPreviewData]);

  // Handle formula field creation
  const handleFormulaFieldCreate = (formulaField: { alias?: string; formula: string }) => {
    const newField: SelectedField = {
      fieldId: `formula_${Date.now()}`,
      fieldName: formulaField.alias || 'Formula Field',
      alias: formulaField.alias,
    };

    setConfig({
      ...config,
      fields: [...config.fields, newField],
    });
    setShowFormulaBuilder(false);
  };

  // Handle field selection from explorer
  const handleFieldSelectFromExplorer = (field: any) => {
    handleAddField({
      id: field.fieldId || field.id,
      name: field.fieldName || field.name,
      type: field.type,
      aggregatable: field.aggregatable || false,
      filterable: field.filterable || false,
      sortable: field.sortable || false,
    });
  };

  // Handle chart config change
  const handleChartConfigChange = (newChartConfig: ChartConfig) => {
    setChartConfig(newChartConfig);
    setConfig({
      ...config,
      visualizationType: newChartConfig.type as any,
      chartConfig: {
        xAxis: newChartConfig.xAxis?.field,
        yAxis: newChartConfig.yAxis?.fields,
        colors: newChartConfig.colors,
      },
    });
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
    const field = selectedDataSource.fields.find((f) => f.id === fieldId);
    return field?.name || fieldId;
  };

  // Render chart based on config
  const renderChart = () => {
    if (!previewData || previewData.length === 0) return null;

    const colors = chartConfig.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const chartData = previewData.slice(0, 50); // Limit for preview

    switch (chartConfig.type) {
      case 'table':
        return (
          <DataTable
            data={chartData}
            columns={config.fields.map(f => ({
              key: f.alias || f.fieldId,
              label: f.alias || f.fieldName,
              sortable: true,
              filterable: true,
            }))}
            title={chartConfig.title}
            pageSize={10}
            searchable
            exportable
          />
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis?.field || config.fields[0]?.fieldId} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis?.fields?.map((fieldId, idx) => (
                <Bar key={fieldId} dataKey={fieldId} fill={colors[idx % colors.length]} />
              )) || <Bar dataKey={config.fields[1]?.fieldId} fill={colors[0]} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis?.field || config.fields[0]?.fieldId} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis?.fields?.map((fieldId, idx) => (
                <Line key={fieldId} type="monotone" dataKey={fieldId} stroke={colors[idx % colors.length]} />
              )) || <Line type="monotone" dataKey={config.fields[1]?.fieldId} stroke={colors[0]} />}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId}
                nameKey={chartConfig.xAxis?.field || config.fields[0]?.fieldId}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis?.field || config.fields[0]?.fieldId} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxis?.fields?.map((fieldId, idx) => (
                <Area key={fieldId} type="monotone" dataKey={fieldId} fill={colors[idx % colors.length]} stroke={colors[idx % colors.length]} />
              )) || <Area type="monotone" dataKey={config.fields[1]?.fieldId} fill={colors[0]} stroke={colors[0]} />}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={chartConfig.xAxis?.field || config.fields[0]?.fieldId} />
              <PolarRadiusAxis />
              {chartConfig.yAxis?.fields?.map((fieldId, idx) => (
                <Radar key={fieldId} name={fieldId} dataKey={fieldId} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.6} />
              )) || <Radar dataKey={config.fields[1]?.fieldId} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />}
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const xField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const yField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const scatterData = chartData.map((d: any) => ({
          x: Number(d[xField]) || 0,
          y: Number(d[yField]) || 0,
          name: String(d[xField] || ''),
        }));
        return (
          <ScatterChart
            data={scatterData}
            xAxisLabel={chartConfig.xAxis?.label}
            yAxisLabel={chartConfig.yAxis?.label}
            title={chartConfig.title}
            colors={colors}
            showLegend={chartConfig.legend?.show}
            height={400}
          />
        );

      case 'bubble':
        const bubbleXField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const bubbleYField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const bubbleZField = config.fields[2]?.fieldId;
        const bubbleData = chartData.map((d: any) => ({
          x: Number(d[bubbleXField]) || 0,
          y: Number(d[bubbleYField]) || 0,
          z: bubbleZField ? Number(d[bubbleZField]) || 1 : 1,
          name: String(d[bubbleXField] || ''),
        }));
        return (
          <BubbleChart
            data={bubbleData}
            xAxisLabel={chartConfig.xAxis?.label}
            yAxisLabel={chartConfig.yAxis?.label}
            title={chartConfig.title}
            colors={colors}
            showLegend={chartConfig.legend?.show}
            height={400}
          />
        );

      case 'treemap':
        const treemapNameField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const treemapValueField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const treemapData = chartData.map((d: any) => ({
          name: String(d[treemapNameField] || 'Item'),
          size: Number(d[treemapValueField]) || 0,
        }));
        return (
          <TreemapChart
            data={treemapData}
            title={chartConfig.title}
            colors={colors}
            height={400}
          />
        );

      case 'funnel':
        const funnelStageField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const funnelValueField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const funnelData = chartData.map((d: any) => ({
          stage: String(d[funnelStageField] || 'Stage'),
          value: Number(d[funnelValueField]) || 0,
        }));
        return (
          <FunnelChart
            data={funnelData}
            title={chartConfig.title}
            showValues
            showPercentages
            height={400}
          />
        );

      case 'gauge':
        const gaugeValueField = chartConfig.yAxis?.fields?.[0] || config.fields[0]?.fieldId;
        const gaugeValue = Number(chartData[0]?.[gaugeValueField]) || 0;
        return (
          <GaugeChart
            value={gaugeValue}
            min={chartConfig.yAxis?.min || 0}
            max={chartConfig.yAxis?.max || 100}
            title={chartConfig.title || 'Gauge'}
            height={400}
          />
        );

      case 'waterfall':
        const waterfallNameField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const waterfallValueField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const waterfallData = chartData.map((d: any) => ({
          name: String(d[waterfallNameField] || 'Item'),
          value: Number(d[waterfallValueField]) || 0,
        }));
        return (
          <WaterfallChart
            data={waterfallData}
            title={chartConfig.title}
            showGrid
            height={400}
          />
        );

      case 'sankey':
        // Sankey requires nodes and links - basic implementation with mock data
        const sankeyNodes = chartData.slice(0, 10).map((d: any, i: number) => ({
          name: String(d[config.fields[0]?.fieldId] || `Node ${i}`),
        }));
        return (
          <SankeyChart
            data={{ nodes: sankeyNodes, links: [] }}
            title={chartConfig.title}
            height={400}
          />
        );

      case 'boxplot':
        // BoxPlot requires statistical data - use mock data for now
        const boxPlotCategoryField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const boxPlotData = chartData
          .reduce((acc: any[], d: any) => {
            const category = String(d[boxPlotCategoryField] || 'Category');
            if (!acc.find(item => item.category === category)) {
              acc.push({
                category,
                min: 0,
                q1: 25,
                median: 50,
                q3: 75,
                max: 100,
              });
            }
            return acc;
          }, []);
        return (
          <BoxPlotChart
            data={boxPlotData}
            title={chartConfig.title}
            showGrid
            height={400}
          />
        );

      case 'candlestick':
        // Candlestick requires OHLC data
        const candlestickData = chartData.map((d: any) => ({
          date: String(d[config.fields[0]?.fieldId] || new Date()),
          open: Number(d.open) || 0,
          high: Number(d.high) || 0,
          low: Number(d.low) || 0,
          close: Number(d.close) || 0,
          volume: Number(d.volume) || 0,
        }));
        return (
          <CandlestickChart
            data={candlestickData}
            title={chartConfig.title}
            showGrid
            showVolume
            height={400}
          />
        );

      case 'sunburst':
        // Sunburst requires hierarchical data
        const sunburstNameField = chartConfig.xAxis?.field || config.fields[0]?.fieldId;
        const sunburstValueField = chartConfig.yAxis?.fields?.[0] || config.fields[1]?.fieldId;
        const sunburstData = {
          name: chartConfig.title || 'Root',
          children: chartData.map((d: any) => ({
            name: String(d[sunburstNameField] || 'Item'),
            value: Number(d[sunburstValueField]) || 1,
          })),
        };
        return (
          <SunburstChart
            data={sunburstData}
            title={chartConfig.title}
            colors={colors}
            height={400}
          />
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Chart type &quot;{chartConfig.type}&quot; not yet implemented</p>
          </div>
        );
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Data Source Explorer */}
        {showDataSourceExplorer && (
          <div className="lg:col-span-1">
            <DataSourceExplorer
              dataSources={dataSources.map(ds => ({
                ...ds,
                icon: 'FileText',
                fields: ds.fields.map(f => ({
                  fieldId: f.id,
                  fieldName: f.name,
                  type: f.type,
                  description: '',
                  aggregatable: f.aggregatable,
                  filterable: f.filterable,
                  sortable: f.sortable,
                })),
                joinableWith: [],
              }))}
              selectedSource={config.dataSourceId}
              onSourceSelect={handleDataSourceChange}
              onFieldSelect={handleFieldSelectFromExplorer}
            />
          </div>
        )}

        {/* Main Configuration Panel */}
        <div className={`${showDataSourceExplorer ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
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
              <div className="flex items-center justify-between">
                <Label>Data Source Explorer</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDataSourceExplorer(!showDataSourceExplorer)}
                >
                  {showDataSourceExplorer ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                  {showDataSourceExplorer ? 'Hide' : 'Show'}
                </Button>
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFormulaBuilder(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Formula
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFieldDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>

              {config.fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <Columns className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No fields selected</p>
                  <p className="text-sm">Click &quot;Add Field&quot; or drag fields from the explorer</p>
                </div>
              ) : (
                <div 
                  className="space-y-2 min-h-[100px] border-2 border-dashed border-gray-200 rounded-lg p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const fieldData = JSON.parse(e.dataTransfer.getData('application/json'));
                      handleFieldSelectFromExplorer(fieldData);
                    } catch (error) {
                      console.error('Invalid drag data:', error);
                    }
                  }}
                >
                  {config.fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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

        {/* Right Sidebar - Visualization & Preview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Chart Configuration */}
          {config.fields.length > 0 && (
            <ChartConfigPanel
              config={chartConfig}
              onChange={handleChartConfigChange}
              availableFields={selectedDataSource?.fields.map(f => ({
                id: f.id,
                name: f.name,
                type: f.type,
              })) || []}
            />
          )}

          {/* Options */}
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
              Report &quot;<span className="font-medium">{config.name}</span>&quot; will be saved with {config.fields.length} field(s) and {config.filters.length} filter(s).
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

      {/* Formula Builder Dialog */}
      {showFormulaBuilder && selectedDataSource && (
        <FormulaBuilder
          open={showFormulaBuilder}
          onClose={() => setShowFormulaBuilder(false)}
          onSave={handleFormulaFieldCreate}
          availableFields={selectedDataSource.fields.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
          }))}
        />
      )}

      {/* Preview Dialog */}
      {showPreview && (
        <ReportPreview
          open={showPreview}
          onClose={() => setShowPreview(false)}
          config={config}
        />
      )}

      {/* Live Preview Panel */}
      {config.fields.length > 0 && previewData && (
        <Card className="p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview
              {previewLoading && <span className="text-sm text-gray-500">(Loading...)</span>}
            </h3>
            <div className="flex gap-2">
              <ChartExporter
                chartRef={{ current: null }}
                defaultFilename={config.name || 'chart'}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                Full Preview
              </Button>
            </div>
          </div>

          {previewLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading preview...</p>
            </div>
          ) : previewData && previewData.length > 0 ? (
            <div className="overflow-x-auto">
              {renderChart()}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No preview data available</p>
              <p className="text-sm">Run the report to see results</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
