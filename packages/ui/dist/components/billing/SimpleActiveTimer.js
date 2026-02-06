import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview SimpleActiveTimer - Streamlined timer component
 */
import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
// Simple utility functions
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
export function SimpleActiveTimer({ timer, onStart, onPause, onResume, onStop, className = '' }) {
    const [currentDuration, setCurrentDuration] = useState(timer?.duration || 0);
    const [isLoading, setIsLoading] = useState(false);
    // Update duration in real-time when timer is running
    useEffect(() => {
        if (!timer?.isRunning)
            return;
        const interval = setInterval(() => {
            const now = new Date();
            const startTime = new Date(timer.startTime);
            const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
            setCurrentDuration(timer.duration + elapsedMinutes);
        }, 1000);
        return () => clearInterval(interval);
    }, [timer?.isRunning, timer?.startTime, timer?.duration]);
    // Update duration when timer prop changes
    useEffect(() => {
        if (timer) {
            setCurrentDuration(timer.duration);
        }
    }, [timer?.duration]);
    const handlePause = useCallback(async () => {
        if (!timer)
            return;
        setIsLoading(true);
        try {
            await onPause(timer.id);
        }
        finally {
            setIsLoading(false);
        }
    }, [timer, onPause]);
    const handleResume = useCallback(async () => {
        if (!timer)
            return;
        setIsLoading(true);
        try {
            await onResume(timer.id);
        }
        finally {
            setIsLoading(false);
        }
    }, [timer, onResume]);
    const handleStop = useCallback(async () => {
        if (!timer)
            return;
        setIsLoading(true);
        try {
            await onStop(timer.id);
        }
        finally {
            setIsLoading(false);
        }
    }, [timer, onStop]);
    const billableAmount = timer ? (currentDuration / 60) * timer.billableRate : 0;
    if (!timer) {
        return (_jsx(Card, { className: `w-full p-6 ${className}`, children: _jsxs("div", { className: "text-center text-gray-500", children: [_jsx(Clock, { className: "mx-auto h-12 w-12 mb-4 opacity-50" }), _jsx("p", { className: "text-lg font-medium", children: "No Active Timer" }), _jsx("p", { className: "text-sm", children: "Start a new timer to track your time" })] }) }));
    }
    const borderColor = timer.isRunning ? 'border-l-green-500' : 'border-l-yellow-500';
    const iconColor = timer.isRunning ? 'text-green-500' : 'text-yellow-500';
    const timerColor = timer.isRunning ? 'text-green-600' : 'text-yellow-600';
    const statusBadgeClass = timer.isRunning ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    return (_jsx(Card, { className: `w-full border-l-4 ${borderColor} ${className}`, children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("h3", { className: "text-lg font-semibold flex items-center gap-2", children: [_jsx(Clock, { className: `h-5 w-5 ${iconColor} ${timer.isRunning ? 'animate-pulse' : ''}` }), "Active Timer"] }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass}`, children: timer.isRunning ? 'Running' : 'Paused' })] }), _jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: `text-4xl font-mono font-bold tracking-wider ${timerColor}`, children: formatDuration(currentDuration) }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: ["Started at ", new Date(timer.startTime).toLocaleTimeString()] })] }), _jsxs("div", { className: "space-y-4 border-t pt-4 mb-6", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx(FileText, { className: "h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium text-sm", children: timer.description }), _jsxs("p", { className: "text-xs text-gray-500", children: [timer.matterCode, " \u2022 ", timer.clientName] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(DollarSign, { className: "h-4 w-4 text-gray-500 flex-shrink-0" }), _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs("span", { className: "text-sm text-gray-500", children: ["Rate: ", formatCurrency(timer.billableRate), "/hr"] }), _jsxs("span", { className: "font-medium text-sm", children: ["Amount: ", formatCurrency(billableAmount)] })] })] })] }), _jsxs("div", { className: "flex gap-2 mb-4", children: [timer.isRunning ? (_jsxs(Button, { onClick: handlePause, disabled: isLoading, variant: "secondary", className: "flex-1 flex items-center justify-center gap-2", children: [_jsx(Pause, { className: "h-4 w-4" }), "Pause"] })) : (_jsxs(Button, { onClick: handleResume, disabled: isLoading, variant: "primary", className: "flex-1 flex items-center justify-center gap-2", children: [_jsx(Play, { className: "h-4 w-4" }), "Resume"] })), _jsxs(Button, { onClick: handleStop, disabled: isLoading, variant: "danger", className: "flex-1 flex items-center justify-center gap-2", children: [_jsx(Square, { className: "h-4 w-4" }), "Stop"] })] }), _jsxs("div", { className: "flex gap-2 text-xs", children: [_jsx("button", { className: "px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors", children: "Add Note" }), _jsx("button", { className: "px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors", children: "Change Rate" }), _jsx("button", { className: "px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors", children: "Mark Non-Billable" })] })] }) }));
}
//# sourceMappingURL=SimpleActiveTimer.js.map