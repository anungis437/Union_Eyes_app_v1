import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview TimerDashboard - Complete time tracking dashboard
 */
import { useState, useEffect } from 'react';
import { Clock, Plus, BarChart3, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { SimpleActiveTimer } from './SimpleActiveTimer';
import { SimpleTimeEntryForm } from './SimpleTimeEntryForm';
// Utility functions
const formatDuration = (minutes) => {
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
};
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
};
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
};
export function TimerDashboard({ activeTimer, recentEntries = [], matters = [], onStartTimer, onPauseTimer, onResumeTimer, onStopTimer, onAddTimeEntry }) {
    const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
    const [todayStats, setTodayStats] = useState({
        totalMinutes: 0,
        billableMinutes: 0,
        totalAmount: 0
    });
    // Calculate today's stats
    useEffect(() => {
        const today = new Date();
        const todayEntries = recentEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.toDateString() === today.toDateString();
        });
        const stats = todayEntries.reduce((acc, entry) => {
            acc.totalMinutes += entry.duration;
            if (entry.isBillable) {
                acc.billableMinutes += entry.duration;
                acc.totalAmount += entry.billableAmount;
            }
            return acc;
        }, { totalMinutes: 0, billableMinutes: 0, totalAmount: 0 });
        // Add active timer to today's stats
        if (activeTimer) {
            stats.totalMinutes += activeTimer.duration;
            if (activeTimer.isRunning) {
                // Estimate current duration
                const now = new Date();
                const startTime = new Date(activeTimer.startTime);
                const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                stats.totalMinutes += elapsedMinutes;
            }
        }
        setTodayStats(stats);
    }, [recentEntries, activeTimer]);
    const handleAddTimeEntry = async (data) => {
        await onAddTimeEntry(data);
        setShowTimeEntryForm(false);
    };
    return (_jsxs("div", { className: "max-w-7xl mx-auto p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold flex items-center gap-3", children: [_jsx(Clock, { className: "h-8 w-8 text-blue-600" }), "Time Tracking"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Track your time and manage billing efficiently" })] }), _jsxs(Button, { onClick: () => setShowTimeEntryForm(!showTimeEntryForm), variant: "primary", className: "flex items-center gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), showTimeEntryForm ? 'Hide Form' : 'Add Time Entry'] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total Time" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: formatDuration(todayStats.totalMinutes) })] }), _jsx(Clock, { className: "h-8 w-8 text-blue-500" })] }) }), _jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Billable Time" }), _jsx("p", { className: "text-2xl font-bold text-green-600", children: formatDuration(todayStats.billableMinutes) })] }), _jsx(BarChart3, { className: "h-8 w-8 text-green-500" })] }) }), _jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Today's Revenue" }), _jsx("p", { className: "text-2xl font-bold text-green-600", children: formatCurrency(todayStats.totalAmount) })] }), _jsx(DollarSign, { className: "h-8 w-8 text-green-500" })] }) }), _jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Utilization" }), _jsxs("p", { className: "text-2xl font-bold text-blue-600", children: [todayStats.totalMinutes > 0
                                                    ? Math.round((todayStats.billableMinutes / todayStats.totalMinutes) * 100)
                                                    : 0, "%"] })] }), _jsx(Calendar, { className: "h-8 w-8 text-blue-500" })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-6", children: [_jsx(SimpleActiveTimer, { timer: activeTimer, onStart: onStartTimer, onPause: onPauseTimer, onResume: onResumeTimer, onStop: onStopTimer }), showTimeEntryForm && (_jsx(SimpleTimeEntryForm, { onSubmit: handleAddTimeEntry, matters: matters }))] }), _jsx("div", { children: _jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Recent Time Entries" }), recentEntries.length === 0 ? (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx(Clock, { className: "mx-auto h-12 w-12 mb-4 opacity-50" }), _jsx("p", { children: "No time entries yet" }), _jsx("p", { className: "text-sm", children: "Start tracking your time to see entries here" })] })) : (_jsx("div", { className: "space-y-3 max-h-96 overflow-y-auto", children: recentEntries.slice(0, 10).map((entry) => (_jsxs("div", { className: "flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-sm text-gray-900 truncate", children: entry.description }), _jsxs("div", { className: "flex items-center gap-4 mt-1 text-xs text-gray-500", children: [_jsx("span", { children: entry.matterCode }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: entry.clientName }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: formatDate(entry.date) })] })] }), _jsxs("div", { className: "text-right ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: formatDuration(entry.duration) }), _jsx("p", { className: `text-xs ${entry.isBillable ? 'text-green-600' : 'text-gray-500'}`, children: entry.isBillable ? formatCurrency(entry.billableAmount) : 'Non-billable' })] })] }, entry.id))) })), recentEntries.length > 10 && (_jsx("div", { className: "mt-4 text-center", children: _jsx(Button, { variant: "secondary", className: "text-sm", children: "View All Entries" }) }))] }) })] })] }));
}
//# sourceMappingURL=TimerDashboard.js.map