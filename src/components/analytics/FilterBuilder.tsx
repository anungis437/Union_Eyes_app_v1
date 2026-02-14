/**
 * Filter Builder Component
 * 
 * Visual interface for building query filters without SQL
 * Supports multiple operators and data types
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform (Visual Report Builder)
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

interface DataField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  aggregatable: boolean;
  filterable: boolean;
  sortable: boolean;
}

interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: string | number | boolean | { from: string | number; to: string | number } | Array<string | number>;
  logicalOperator?: 'AND' | 'OR';
}

interface FilterBuilderProps {
  open: boolean;
  onClose: () => void;
  fields: DataField[];
  onAddFilter: (filter: ReportFilter) => void;
}

// ============================================================================
// Operator Options by Field Type
// ============================================================================

const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In List' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'greater_than', label: 'After Date' },
    { value: 'less_than', label: 'Before Date' },
    { value: 'between', label: 'Between Dates' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
};

// ============================================================================
// Component
// ============================================================================

export function FilterBuilder({
  open,
  onClose,
  fields,
  onAddFilter,
}: FilterBuilderProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [operator, setOperator] = useState<string>('equals');
  const [value, setValue] = useState<string | number>('');
  const [valueTo, setValueTo] = useState<string | number>(''); // For "between" operator
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND');
  const [dateValue, setDateValue] = useState<Date | undefined>();
  const [dateValueTo, setDateValueTo] = useState<Date | undefined>();

  const selectedField = fields.find(f => f.id === selectedFieldId);
  const availableOperators = selectedField ? OPERATORS_BY_TYPE[selectedField.type] : [];

  const handleFieldChange = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    setOperator('equals');
    setValue('');
    setValueTo('');
    setDateValue(undefined);
    setDateValueTo(undefined);
  };

  const handleAddFilter = () => {
    if (!selectedField) return;

    let finalValue: string | number | boolean | { from: string | number; to: string | number } | Array<string | number> = value;

    // Handle date values
    if (selectedField.type === 'date') {
      if (operator === 'between') {
        finalValue = {
          from: dateValue ? format(dateValue, 'yyyy-MM-dd') : '',
          to: dateValueTo ? format(dateValueTo, 'yyyy-MM-dd') : '',
        };
      } else {
        finalValue = dateValue ? format(dateValue, 'yyyy-MM-dd') : '';
      }
    }

    // Handle "between" operator for numbers
    if (selectedField.type === 'number' && operator === 'between') {
      finalValue = {
        from: value,
        to: valueTo,
      };
    }

    // Handle "in" operator (comma-separated list)
    if (operator === 'in') {
      finalValue = String(value).split(',').map((v: string) => v.trim());
    }

    const filter: ReportFilter = {
      id: `filter_${Date.now()}`,
      fieldId: selectedFieldId,
      operator: operator as 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in',
      value: finalValue,
      logicalOperator,
    };

    onAddFilter(filter);
    handleReset();
  };

  const handleReset = () => {
    setSelectedFieldId('');
    setOperator('equals');
    setValue('');
    setValueTo('');
    setDateValue(undefined);
    setDateValueTo(undefined);
    setLogicalOperator('AND');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const renderValueInput = () => {
    if (!selectedField) return null;

    // Boolean type
    if (selectedField.type === 'boolean') {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Date type
    if (selectedField.type === 'date') {
      if (operator === 'between') {
        return (
          <div className="space-y-4">
            <div>
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? format(dateValue, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={setDateValue}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValueTo ? format(dateValueTo, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateValueTo}
                    onSelect={setDateValueTo}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={setDateValue}
            />
          </PopoverContent>
        </Popover>
      );
    }

    // Number type with "between" operator
    if (selectedField.type === 'number' && operator === 'between') {
      return (
        <div className="space-y-4">
          <div>
            <Label>From Value</Label>
            <Input
              type="number"
              placeholder="Min value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <Label>To Value</Label>
            <Input
              type="number"
              placeholder="Max value"
              value={valueTo}
              onChange={(e) => setValueTo(e.target.value)}
            />
          </div>
        </div>
      );
    }

    // Number type
    if (selectedField.type === 'number') {
      return (
        <Input
          type="number"
          placeholder="Enter number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    }

    // String type with "in" operator
    if (selectedField.type === 'string' && operator === 'in') {
      return (
        <div>
          <Input
            placeholder="Value1, Value2, Value3"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter comma-separated values
          </p>
        </div>
      );
    }

    // Default: string input
    return (
      <Input
        placeholder="Enter value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };

  const isValid = () => {
    if (!selectedFieldId || !operator) return false;

    if (selectedField?.type === 'date') {
      if (operator === 'between') {
        return dateValue && dateValueTo;
      }
      return !!dateValue;
    }

    if (selectedField?.type === 'number' && operator === 'between') {
      return value !== '' && valueTo !== '';
    }

    return value !== '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Filter</DialogTitle>
          <DialogDescription>
            Create a filter to narrow down your report results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logical Operator */}
          <div>
            <Label>Combine With</Label>
            <Select value={logicalOperator} onValueChange={(v) => setLogicalOperator(v as 'AND' | 'OR')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND (all conditions must match)</SelectItem>
                <SelectItem value="OR">OR (any condition can match)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          <div>
            <Label>Field</Label>
            <Select value={selectedFieldId} onValueChange={handleFieldChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {fields.filter(f => f.filterable).map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name} ({field.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Selection */}
          {selectedField && (
            <div>
              <Label>Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map(op => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value Input */}
          {selectedField && (
            <div>
              <Label>Value</Label>
              {renderValueInput()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAddFilter} disabled={!isValid()}>
            Add Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
