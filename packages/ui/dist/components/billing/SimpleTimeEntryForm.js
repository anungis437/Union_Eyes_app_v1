import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview SimpleTimeEntryForm - Streamlined time entry form with smart parsing
 */
import { useState, useCallback } from 'react';
import { Clock, DollarSign, FileText, Calculator, Plus } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
// Simple time parsing function
const parseTimeInput = (input) => {
    const str = input.trim().toLowerCase();
    // Hours format (1.5h, 2h)
    if (str.endsWith('h')) {
        const hours = parseFloat(str.slice(0, -1));
        return Math.round(hours * 60);
    }
    // Minutes format (90m, 120m)
    if (str.endsWith('m')) {
        return parseInt(str.slice(0, -1), 10);
    }
    // Time format (1:30, 2:15)
    if (str.includes(':')) {
        const [hours = 0, minutes = 0] = str.split(':').map(Number);
        return (hours * 60) + minutes;
    }
    // Decimal hours (1.5, 2.25)
    const decimal = parseFloat(str);
    if (!isNaN(decimal)) {
        return Math.round(decimal * 60);
    }
    throw new Error(`Invalid time format: ${input}`);
};
const formatDuration = (minutes) => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
};
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
};
export function SimpleTimeEntryForm({ onSubmit, matters = [], defaultRate = 450, className = '' }) {
    const [description, setDescription] = useState('');
    const [timeInput, setTimeInput] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [matterCode, setMatterCode] = useState('');
    const [billableRate, setBillableRate] = useState(defaultRate.toString());
    const [isBillable, setIsBillable] = useState(true);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timeError, setTimeError] = useState('');
    const [parsedMinutes, setParsedMinutes] = useState(0);
    const handleTimeInputChange = useCallback((value) => {
        setTimeInput(value);
        if (!value.trim()) {
            setParsedMinutes(0);
            setTimeError('');
            return;
        }
        try {
            const minutes = parseTimeInput(value);
            setParsedMinutes(minutes);
            setTimeError('');
        }
        catch (error) {
            setTimeError(error instanceof Error ? error.message : 'Invalid format');
            setParsedMinutes(0);
        }
    }, []);
    const billableAmount = isBillable && parsedMinutes > 0 && billableRate
        ? (parsedMinutes / 60) * parseFloat(billableRate)
        : 0;
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim() || !timeInput.trim() || !matterCode || parsedMinutes === 0) {
            return;
        }
        setIsLoading(true);
        try {
            await onSubmit({
                description: description.trim(),
                minutes: parsedMinutes,
                date: new Date(date),
                matterCode,
                billableRate: parseFloat(billableRate),
                isBillable,
                notes: notes.trim() || undefined,
            });
            // Reset form
            setDescription('');
            setTimeInput('');
            setParsedMinutes(0);
            setNotes('');
            setTimeError('');
        }
        catch (error) {
        }
        finally {
            setIsLoading(false);
        }
    };
    const selectedMatter = matters.find(m => m.code === matterCode);
    return (_jsxs(Card, { className: `w-full p-6 ${className}`, children: [_jsx("div", { className: "mb-6", children: _jsxs("h3", { className: "text-lg font-semibold flex items-center gap-2", children: [_jsx(Clock, { className: "h-5 w-5" }), "Add Time Entry"] }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("label", { className: "flex items-center gap-2 text-sm font-medium mb-2", children: [_jsx(FileText, { className: "h-4 w-4" }), "Description"] }), _jsx(Input, { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "e.g., Research case law for motion to dismiss", className: "w-full", required: true })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "flex items-center gap-2 text-sm font-medium mb-2", children: [_jsx(Clock, { className: "h-4 w-4" }), "Time"] }), _jsx(Input, { value: timeInput, onChange: (e) => handleTimeInputChange(e.target.value), placeholder: "e.g., 1.5h, 90m, 1:30", className: `w-full ${timeError ? 'border-red-500' : ''}`, required: true }), timeError && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: timeError })), parsedMinutes > 0 && !timeError && (_jsxs("div", { className: "mt-1 flex items-center gap-2 text-sm text-gray-600", children: [_jsx(Calculator, { className: "h-3 w-3" }), "Parsed: ", formatDuration(parsedMinutes)] })), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Format: 1.5h, 90m, 1:30, or decimal hours" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Date" }), _jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-full", required: true })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Matter" }), _jsxs("select", { value: matterCode, onChange: (e) => setMatterCode(e.target.value), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500", title: "Select matter for time entry", required: true, children: [_jsx("option", { value: "", children: "Select a matter" }), matters.map((matter) => (_jsxs("option", { value: matter.code, children: [matter.code, " - ", matter.clientName, ": ", matter.description] }, matter.code)))] }), selectedMatter && (_jsxs("div", { className: "mt-2 p-3 bg-gray-50 rounded-lg", children: [_jsx("p", { className: "font-medium text-sm", children: selectedMatter.clientName }), _jsx("p", { className: "text-sm text-gray-600", children: selectedMatter.description })] }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "flex items-center gap-2 text-sm font-medium mb-2", children: [_jsx(DollarSign, { className: "h-4 w-4" }), "Hourly Rate"] }), _jsxs("div", { className: "relative", children: [_jsx(Input, { type: "number", step: "0.01", value: billableRate, onChange: (e) => setBillableRate(e.target.value), placeholder: "450.00", className: "w-full pl-8", required: true }), _jsx(DollarSign, { className: "absolute left-2 top-2.5 h-4 w-4 text-gray-500" })] })] }), _jsx("div", { className: "flex items-center", children: _jsxs("label", { className: "flex items-center space-x-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isBillable, onChange: (e) => setIsBillable(e.target.checked), className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }), _jsx("span", { className: "text-sm font-medium", children: "Billable Time" })] }) })] }), parsedMinutes > 0 && (_jsxs("div", { className: "p-4 bg-blue-50 rounded-lg border border-blue-200", children: [_jsx("h4", { className: "font-medium text-sm mb-2", children: "Entry Summary" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Duration:" }), _jsx("span", { className: "font-medium", children: formatDuration(parsedMinutes) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Amount:" }), _jsx("span", { className: `font-medium ${isBillable ? 'text-green-600' : 'text-gray-500'}`, children: isBillable ? formatCurrency(billableAmount) : 'Non-billable' })] })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Notes (Optional)" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Additional details, research notes, or context...", rows: 3, className: "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs(Button, { type: "submit", disabled: isLoading || timeError !== '' || parsedMinutes === 0 || !description.trim() || !matterCode, className: "w-full flex items-center justify-center gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), isLoading ? 'Adding Entry...' : 'Add Time Entry'] })] })] }));
}
//# sourceMappingURL=SimpleTimeEntryForm.js.map