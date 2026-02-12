import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview TimeEntryForm - World-class time entry form with smart input parsing
 */
import { useState, useEffect } from 'react';
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from '../Form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../Select';
import { cn } from '../../utils/cn';
import { parseTimeEntry, calculateBillableAmount, formatCurrency, formatDuration, } from '../../utils/timeUtils';
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
export function TimeEntryForm({ onSubmit, defaultValues, matters = [], taskCategories = [], className }) {
    const [isLoading, setIsLoading] = useState(false);
    const [parsedMinutes, setParsedMinutes] = useState(0);
    const [billableAmount, setBillableAmount] = useState(0);
    const [timeInputError, setTimeInputError] = useState('');
    const form = useForm({
        resolver: zodResolver(timeEntrySchema),
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
            }
            else {
                setBillableAmount(0);
            }
        }
        catch (error) {
            setTimeInputError(error instanceof Error ? error.message : 'Invalid time format');
            setParsedMinutes(0);
            setBillableAmount(0);
        }
    }, [watchedValues]);
    const handleSubmit = async (data) => {
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
        }
        catch (error) {
        }
        finally {
            setIsLoading(false);
        }
    };
    const selectedMatter = matters.find(m => m.code === form.watch('matterCode'));
    return (_jsxs(Card, { className: cn("w-full", className), children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "h-5 w-5" }), "Add Time Entry"] }) }), _jsx(CardContent, { children: _jsx(Form, { ...form, children: _jsxs("form", { onSubmit: form.handleSubmit(handleSubmit), className: "space-y-6", children: [_jsx(FormField, { control: form.control, name: "description", render: ({ field }) => (_jsxs(FormItem, { children: [_jsxs(FormLabel, { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "h-4 w-4" }), "Description"] }), _jsx(FormControl, { children: _jsx(Input, { placeholder: "e.g., Research case law for motion to dismiss", ...field }) }), _jsx(FormMessage, {})] })) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(FormField, { control: form.control, name: "timeInput", render: ({ field }) => (_jsxs(FormItem, { children: [_jsxs(FormLabel, { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "h-4 w-4" }), "Time"] }), _jsx(FormControl, { children: _jsxs("div", { className: "space-y-2", children: [_jsx(Input, { placeholder: "e.g., 1.5h, 90m, 1:30", ...field, className: timeInputError ? 'border-destructive' : '' }), parsedMinutes > 0 && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(Calculator, { className: "h-3 w-3" }), "Parsed: ", formatDuration(parsedMinutes)] }))] }) }), timeInputError ? (_jsx("p", { className: "text-sm font-medium text-destructive", children: timeInputError })) : (_jsx(FormDescription, { children: "Enter time as: 1.5h, 90m, 1:30, or decimal hours" })), _jsx(FormMessage, {})] })) }), _jsx(FormField, { control: form.control, name: "date", render: ({ field }) => (_jsxs(FormItem, { children: [_jsxs(FormLabel, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-4 w-4" }), "Date"] }), _jsx(FormControl, { children: _jsx(Input, { type: "date", ...field }) }), _jsx(FormMessage, {})] })) })] }), _jsx(FormField, { control: form.control, name: "matterCode", render: ({ field }) => (_jsxs(FormItem, { children: [_jsxs(FormLabel, { className: "flex items-center gap-2", children: [_jsx(User, { className: "h-4 w-4" }), "Matter"] }), _jsxs(Select, { onValueChange: field.onChange, value: field.value, children: [_jsx(FormControl, { children: _jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select a matter" }) }) }), _jsx(SelectContent, { children: matters.map((matter) => (_jsx(SelectItem, { value: matter.code, children: _jsxs("div", { className: "flex flex-col items-start", children: [_jsx("span", { className: "font-medium", children: matter.code }), _jsxs("span", { className: "text-sm text-muted-foreground", children: [matter.clientName, " \u2022 ", matter.description] })] }) }, matter.code))) })] }), _jsx(FormMessage, {})] })) }), selectedMatter && (_jsxs("div", { className: "p-3 bg-muted rounded-lg", children: [_jsx("p", { className: "font-medium text-sm", children: selectedMatter.clientName }), _jsx("p", { className: "text-sm text-muted-foreground", children: selectedMatter.description })] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(FormField, { control: form.control, name: "billableRate", render: ({ field }) => (_jsxs(FormItem, { children: [_jsxs(FormLabel, { className: "flex items-center gap-2", children: [_jsx(DollarSign, { className: "h-4 w-4" }), "Hourly Rate"] }), _jsx(FormControl, { children: _jsxs("div", { className: "relative", children: [_jsx(DollarSign, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), _jsx(Input, { type: "number", step: "0.01", placeholder: "450.00", className: "pl-9", ...field })] }) }), _jsx(FormMessage, {})] })) }), _jsx(FormField, { control: form.control, name: "taskCategory", render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Task Category" }), _jsxs(Select, { onValueChange: field.onChange, value: field.value, children: [_jsx(FormControl, { children: _jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select category" }) }) }), _jsx(SelectContent, { children: taskCategories.map((category) => (_jsx(SelectItem, { value: category.value, children: category.label }, category.value))) })] }), _jsx(FormMessage, {})] })) })] }), _jsx(FormField, { control: form.control, name: "isBillable", render: ({ field }) => (_jsxs(FormItem, { className: "flex flex-row items-center justify-between rounded-lg border p-3", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx(FormLabel, { className: "text-base", children: "Billable Time" }), _jsx(FormDescription, { children: "Include this time entry in client invoices" })] }), _jsx(FormControl, { children: _jsx(Switch, { checked: field.value, onCheckedChange: field.onChange }) })] })) }), (parsedMinutes > 0 || billableAmount > 0) && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "font-medium text-sm", children: "Entry Summary" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Duration:" }), _jsx(Badge, { variant: "outline", children: formatDuration(parsedMinutes) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Amount:" }), _jsx(Badge, { variant: form.watch('isBillable') ? 'default' : 'secondary', children: form.watch('isBillable') ? formatCurrency(billableAmount) : 'Non-billable' })] })] })] })] })), _jsx(FormField, { control: form.control, name: "notes", render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Notes (Optional)" }), _jsx(FormControl, { children: _jsx(Textarea, { placeholder: "Additional details, research notes, or context...", className: "min-h-[80px]", ...field }) }), _jsx(FormMessage, {})] })) }), _jsx(Button, { type: "submit", disabled: isLoading || timeInputError !== '' || parsedMinutes === 0, className: "w-full", size: "lg", children: isLoading ? 'Adding Entry...' : 'Add Time Entry' })] }) }) })] }));
}
//# sourceMappingURL=TimeEntryForm.js.map