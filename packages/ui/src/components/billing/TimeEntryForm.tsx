/**
 * @fileoverview TimeEntryForm - World-class time entry form with smart input parsing
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, User, FileText, Calculator } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../Button';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Input } from '../Input';
import { Badge } from '../Badge';
import { Separator } from '../Separator';
import { Textarea } from '../Textarea';
import { Switch } from '../Switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../Form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../Select';
import { cn } from '../../utils/cn';
import {
  parseTimeEntry,
  calculateBillableAmount,
  formatCurrency,
  formatDuration,
} from '../../utils/timeUtils';

const timeEntrySchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  timeInput: z.string().min(1, 'Time is required'),
  date: z.string(),
  matterCode: z.string().min(1, 'Matter is required'),
  clientId: z.string().min(1, 'Client is required'),
  billableRate: z.string().min(1, 'Rate is required'),
  isBillable: z.boolean().default(true),
  taskCategory: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeEntryFormProps {
  onSubmit: (data: {
    description: string;
    minutes: number;
    date: Date;
    matterCode: string;
    clientId: string;
    billableRate: number;
    isBillable: boolean;
    taskCategory?: string;
    notes?: string;
  }) => Promise<void>;
  defaultValues?: Partial<TimeEntryFormData>;
  matters?: Array<{ code: string; description: string; clientName: string; clientId: string }>;
  taskCategories?: Array<{ value: string; label: string }>;
  className?: string;
}

export function TimeEntryForm({
  onSubmit,
  defaultValues,
  matters = [],
  taskCategories = [],
  className
}: TimeEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [parsedMinutes, setParsedMinutes] = useState<number>(0);
  const [billableAmount, setBillableAmount] = useState<number>(0);
  const [timeInputError, setTimeInputError] = useState<string>('');

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema as any),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isBillable: true,
      ...defaultValues,
    },
  });

  const watchedValues = form.watch(['timeInput', 'billableRate', 'isBillable']);

  // Parse time input and calculate billable amount
  useEffect(() => {
    const [timeInput, billableRate, isBillable] = watchedValues;
    
    if (!timeInput) {
      setParsedMinutes(0);
      setBillableAmount(0);
      setTimeInputError('');
      return;
    }

    try {
      const minutes = parseTimeEntry(timeInput);
      setParsedMinutes(minutes);
      setTimeInputError('');
      
      if (billableRate && isBillable) {
        const rate = parseFloat(billableRate);
        if (!isNaN(rate)) {
          const amount = calculateBillableAmount(minutes, rate);
          setBillableAmount(amount);
        }
      } else {
        setBillableAmount(0);
      }
    } catch (error) {
      setTimeInputError(error instanceof Error ? error.message : 'Invalid time format');
      setParsedMinutes(0);
      setBillableAmount(0);
    }
  }, [watchedValues]);

  const handleSubmit = async (data: TimeEntryFormData) => {
    setIsLoading(true);
    try {
      const minutes = parseTimeEntry(data.timeInput);
      const billableRate = parseFloat(data.billableRate);
      
      await onSubmit({
        description: data.description,
        minutes,
        date: new Date(data.date),
        matterCode: data.matterCode,
        clientId: data.clientId,
        billableRate,
        isBillable: data.isBillable,
        taskCategory: data.taskCategory,
        notes: data.notes,
      });
      
      form.reset();
      setParsedMinutes(0);
      setBillableAmount(0);
    } catch (error) {
      console.error('Error submitting time entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMatter = matters.find(m => m.code === form.watch('matterCode'));

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Add Time Entry
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Research case law for motion to dismiss"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time and Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="e.g., 1.5h, 90m, 1:30"
                          {...field}
                          className={timeInputError ? 'border-destructive' : ''}
                        />
                        {parsedMinutes > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            Parsed: {formatDuration(parsedMinutes)}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {timeInputError ? (
                      <p className="text-sm font-medium text-destructive">{timeInputError}</p>
                    ) : (
                      <FormDescription>
                        Enter time as: 1.5h, 90m, 1:30, or decimal hours
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Matter Selection */}
            <FormField
              control={form.control}
              name="matterCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Matter
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a matter" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {matters.map((matter) => (
                        <SelectItem key={matter.code} value={matter.code}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{matter.code}</span>
                            <span className="text-sm text-muted-foreground">
                              {matter.clientName} • {matter.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMatter && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedMatter.clientName}</p>
                <p className="text-sm text-muted-foreground">{selectedMatter.description}</p>
              </div>
            )}

            {/* Rate and Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billableRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Hourly Rate
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="450.00"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taskCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Billable Toggle */}
            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Billable Time</FormLabel>
                    <FormDescription>
                      Include this time entry in client invoices
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Amount Preview */}
            {(parsedMinutes > 0 || billableAmount > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Entry Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <Badge variant="outline">{formatDuration(parsedMinutes)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <Badge variant={form.watch('isBillable') ? 'default' : 'secondary'}>
                        {form.watch('isBillable') ? formatCurrency(billableAmount) : 'Non-billable'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details, research notes, or context..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || timeInputError !== '' || parsedMinutes === 0}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Adding Entry...' : 'Add Time Entry'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
