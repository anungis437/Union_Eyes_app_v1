/**
 * Chart Selector Component
 * 
 * Visual selector for choosing chart types and configuring chart options
 * Part of the visual report builder
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform (Visual Report Builder)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table as TableIcon,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  TrendingUp,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SelectedField {
  fieldId: string;
  fieldName: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  alias?: string;
}

interface ChartConfig {
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
}

type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'area' | 'composed';

interface ChartSelectorProps {
  value: VisualizationType;
  onChange: (type: VisualizationType) => void;
  fields: SelectedField[];
  onChartConfigChange: (config: ChartConfig) => void;
}

// ============================================================================
// Chart Type Options
// ============================================================================

const CHART_TYPES = [
  {
    value: 'table',
    label: 'Table',
    icon: TableIcon,
    description: 'Display data in rows and columns',
    requiresXAxis: false,
    requiresYAxis: false,
  },
  {
    value: 'bar',
    label: 'Bar Chart',
    icon: BarChart3,
    description: 'Compare values across categories',
    requiresXAxis: true,
    requiresYAxis: true,
  },
  {
    value: 'line',
    label: 'Line Chart',
    icon: LineChartIcon,
    description: 'Show trends over time',
    requiresXAxis: true,
    requiresYAxis: true,
  },
  {
    value: 'pie',
    label: 'Pie Chart',
    icon: PieChartIcon,
    description: 'Show proportions of a whole',
    requiresXAxis: true,
    requiresYAxis: true,
  },
  {
    value: 'area',
    label: 'Area Chart',
    icon: AreaChartIcon,
    description: 'Show cumulative values over time',
    requiresXAxis: true,
    requiresYAxis: true,
  },
  {
    value: 'composed',
    label: 'Combo Chart',
    icon: TrendingUp,
    description: 'Combine multiple chart types',
    requiresXAxis: true,
    requiresYAxis: true,
  },
] as const;

const COLOR_PALETTES = [
  ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
];

// ============================================================================
// Component
// ============================================================================

export function ChartSelector({
  value,
  onChange,
  fields,
  onChartConfigChange,
}: ChartSelectorProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    xAxis: undefined,
    yAxis: [],
    colors: COLOR_PALETTES[0],
  });

  const selectedChartType = CHART_TYPES.find(ct => ct.value === value);

  // Update parent when config changes
  useEffect(() => {
    onChartConfigChange(chartConfig);
  }, [chartConfig, onChartConfigChange]);

  // Auto-select first field as X-axis when chart type changes
  useEffect(() => {
    if (selectedChartType?.requiresXAxis && !chartConfig.xAxis && fields.length > 0) {
      setChartConfig(prev => ({ ...prev, xAxis: fields[0].fieldId }));
    }
  }, [value, fields, selectedChartType, chartConfig.xAxis]);

  // Auto-select numeric fields as Y-axis when chart type changes
  useEffect(() => {
    if (selectedChartType?.requiresYAxis && chartConfig.yAxis?.length === 0) {
      const numericFields = fields.filter(f => f.aggregation);
      if (numericFields.length > 0) {
        setChartConfig(prev => ({
          ...prev,
          yAxis: [numericFields[0].fieldId],
        }));
      }
    }
  }, [value, fields, selectedChartType, chartConfig.yAxis]);

  const handleXAxisChange = (fieldId: string) => {
    setChartConfig(prev => ({ ...prev, xAxis: fieldId }));
  };

  const handleYAxisChange = (fieldId: string) => {
    // For pie chart, only one Y-axis is allowed
    if (value === 'pie') {
      setChartConfig(prev => ({ ...prev, yAxis: [fieldId] }));
    } else {
      // Toggle field in Y-axis array
      setChartConfig(prev => {
        const current = prev.yAxis || [];
        if (current.includes(fieldId)) {
          return { ...prev, yAxis: current.filter(f => f !== fieldId) };
        } else {
          return { ...prev, yAxis: [...current, fieldId] };
        }
      });
    }
  };

  const handleColorPaletteChange = (paletteIndex: number) => {
    setChartConfig(prev => ({ ...prev, colors: COLOR_PALETTES[paletteIndex] }));
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Grid */}
      <div className="grid grid-cols-2 gap-3">
        {CHART_TYPES.map((chartType) => {
          const Icon = chartType.icon;
          const isSelected = value === chartType.value;

          return (
            <Card
              key={chartType.value}
              className={`p-4 cursor-pointer transition-all hover:border-blue-500 ${
                isSelected ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onChange(chartType.value)}
            >
              <div className="flex flex-col items-center text-center">
                <Icon
                  className={`w-8 h-8 mb-2 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`}
                />
                <h4 className="font-medium text-sm">{chartType.label}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {chartType.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chart Configuration */}
      {selectedChartType && fields.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-sm">Chart Configuration</h4>

          {/* X-Axis */}
          {selectedChartType.requiresXAxis && (
            <div>
              <Label className="text-xs">X-Axis (Category)</Label>
              <Select value={chartConfig.xAxis} onValueChange={handleXAxisChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select X-axis field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map(field => (
                    <SelectItem key={field.fieldId} value={field.fieldId}>
                      {field.fieldName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Y-Axis */}
          {selectedChartType.requiresYAxis && (
            <div>
              <Label className="text-xs">
                Y-Axis (Values) {value !== 'pie' && '- Select multiple'}
              </Label>
              <div className="mt-2 space-y-2">
                {fields
                  .filter(f => f.aggregation || f.fieldId !== chartConfig.xAxis)
                  .map(field => (
                    <div
                      key={field.fieldId}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                        chartConfig.yAxis?.includes(field.fieldId)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleYAxisChange(field.fieldId)}
                    >
                      <input
                        type={value === 'pie' ? 'radio' : 'checkbox'}
                        checked={chartConfig.yAxis?.includes(field.fieldId)}
                        onChange={() => {}}
                        className="cursor-pointer"
                      />
                      <span className="text-sm flex-1">{field.fieldName}</span>
                      {field.aggregation && (
                        <Badge variant="outline" className="text-xs">
                          {field.aggregation.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Color Palette */}
          {value !== 'table' && (
            <div>
              <Label className="text-xs">Color Palette</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLOR_PALETTES.map((palette, index) => (
                  <div
                    key={index}
                    className={`flex h-8 rounded cursor-pointer border-2 transition-all ${
                      chartConfig.colors === palette
                        ? 'border-blue-500 scale-110'
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleColorPaletteChange(index)}
                  >
                    {palette.map((color, colorIndex) => (
                      <div
                        key={colorIndex}
                        className="flex-1 first:rounded-l last:rounded-r"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Chart Type:</span>
              <span className="font-medium">{selectedChartType.label}</span>
            </div>
            {chartConfig.xAxis && (
              <div className="flex justify-between">
                <span className="text-gray-600">X-Axis:</span>
                <span className="font-medium">
                  {fields.find(f => f.fieldId === chartConfig.xAxis)?.fieldName}
                </span>
              </div>
            )}
            {chartConfig.yAxis && chartConfig.yAxis.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Y-Axis:</span>
                <span className="font-medium">
                  {chartConfig.yAxis.length} field(s)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Fields Warning */}
      {fields.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Add fields to enable chart configuration</p>
        </div>
      )}
    </div>
  );
}
