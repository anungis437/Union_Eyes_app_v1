/**
 * Chart Components Library
 * 
 * Reusable chart components for analytics dashboards
 * Built with Recharts for world-class data visualization
 * 
 * Created: November 14, 2025
 * Part of: Area 5 - Analytics & Reporting System
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';

// ============================================================================
// Color Palettes
// ============================================================================

export const CHART_COLORS = {
  primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
  danger: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe'],
  multi: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'],
};

// ============================================================================
// Utility Functions
// ============================================================================

const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// ============================================================================
// Line Chart Component
// ============================================================================

interface LineChartData {
  name: string;
  [key: string]: string | number;
}

interface LineChartProps {
  title: string;
  data: LineChartData[];
  lines: Array<{ dataKey: string; stroke?: string; name?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function TrendLineChart({
  title,
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
}: LineChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              name={line.name || line.dataKey}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// Bar Chart Component
// ============================================================================

interface BarChartProps {
  title: string;
  data: LineChartData[];
  bars: Array<{ dataKey: string; fill?: string; name?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
}

export function BarChartComponent({
  title,
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
}: BarChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.fill || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              name={bar.name || bar.dataKey}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// Pie Chart Component
// ============================================================================

interface PieChartData {
  name: string;
  value: number;
  fill?: string;
}

interface PieChartProps {
  title: string;
  data: PieChartData[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number; // For donut charts
}

export function PieChartComponent({
  title,
  data,
  height = 300,
  showLegend = true,
  innerRadius = 0,
}: PieChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={innerRadius}
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              />
            ))}
          </Pie>
          {showLegend && <Legend />}
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// Area Chart Component
// ============================================================================

interface AreaChartProps {
  title: string;
  data: LineChartData[];
  areas: Array<{ dataKey: string; fill?: string; stroke?: string; name?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
}

export function AreaChartComponent({
  title,
  data,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
}: AreaChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          {showLegend && <Legend />}
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              fill={area.fill || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              stroke={area.stroke || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              name={area.name || area.dataKey}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// Composed Chart Component (Combo of Line + Bar)
// ============================================================================

interface ComposedChartProps {
  title: string;
  data: LineChartData[];
  bars?: Array<{ dataKey: string; fill?: string; name?: string }>;
  lines?: Array<{ dataKey: string; stroke?: string; name?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function ComposedChartComponent({
  title,
  data,
  bars = [],
  lines = [],
  height = 300,
  showGrid = true,
  showLegend = true,
}: ComposedChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.fill || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              name={bar.name || bar.dataKey}
            />
          ))}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke || CHART_COLORS.multi[(bars.length + index) % CHART_COLORS.multi.length]}
              name={line.name || line.dataKey}
              strokeWidth={2}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// Radar Chart Component
// ============================================================================

interface RadarChartData {
  subject: string;
  [key: string]: string | number;
}

interface RadarChartProps {
  title: string;
  data: RadarChartData[];
  metrics: Array<{ dataKey: string; stroke?: string; fill?: string; name?: string }>;
  height?: number;
  showLegend?: boolean;
}

export function RadarChartComponent({
  title,
  data,
  metrics,
  height = 400,
  showLegend = true,
}: RadarChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" stroke="#6b7280" />
          <PolarRadiusAxis stroke="#6b7280" />
          {metrics.map((metric, index) => (
            <Radar
              key={metric.dataKey}
              name={metric.name || metric.dataKey}
              dataKey={metric.dataKey}
              stroke={metric.stroke || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              fill={metric.fill || CHART_COLORS.multi[index % CHART_COLORS.multi.length]}
              fillOpacity={0.6}
            />
          ))}
          {showLegend && <Legend />}
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// KPI Card Component
// ============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percent';
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  format = 'number',
}: KPICardProps) {
  const formattedValue =
    format === 'currency'
      ? formatNumber(Number(value))
      : format === 'percent'
      ? formatPercent(Number(value))
      : value;

  const trendColor =
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
      ? 'text-red-600'
      : 'text-gray-600';

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{formattedValue}</p>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${trendColor}`}>
              {change > 0 ? '+' : ''}
              {change}% {changeLabel || 'vs previous period'}
            </p>
          )}
        </div>
        {icon && <div className="text-2xl text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
}

// ============================================================================
// Heatmap Component (Activity Pattern)
// ============================================================================

interface HeatmapData {
  dayOfWeek: number;
  hourOfDay: number;
  value: number;
}

interface HeatmapProps {
  title: string;
  data: HeatmapData[];
  height?: number;
}

export function ActivityHeatmap({ title, data, height = 400 }: HeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create matrix
  const matrix = days.map((day, dayIndex) => {
    return hours.map((hour) => {
      const cell = data.find((d) => d.dayOfWeek === dayIndex + 1 && d.hourOfDay === hour);
      return cell?.value || 0;
    });
  });

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs"></th>
              {hours.map((hour) => (
                <th key={hour} className="p-1 text-xs">
                  {hour}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, dayIndex) => (
              <tr key={dayIndex}>
                <td className="p-2 text-xs font-medium">{days[dayIndex]}</td>
                {row.map((value, hourIndex) => {
                  const intensity = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  const bgColor =
                    intensity > 75
                      ? 'bg-blue-600'
                      : intensity > 50
                      ? 'bg-blue-400'
                      : intensity > 25
                      ? 'bg-blue-200'
                      : 'bg-gray-100';
                  return (
                    <td key={hourIndex} className="p-1">
                      <div
                        className={`w-8 h-8 ${bgColor} rounded hover:opacity-75 cursor-pointer`}
                        title={`${days[dayIndex]} ${hourIndex}:00 - ${value} claims`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================================
// Export All Components
// ============================================================================

export {
  formatNumber,
  formatPercent,
};
