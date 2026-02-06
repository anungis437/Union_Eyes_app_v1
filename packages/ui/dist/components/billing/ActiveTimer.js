import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview ActiveTimer - Real-time timer component with world-class UX
 */
import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from '../Button';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Badge } from '../Badge';
import { cn } from '../../utils/cn';
// Utility functions (temporarily inline until billing package is properly imported)
function calculateBillableAmount(minutes, hourlyRate) {
    const hours = minutes / 60;
    return hours * hourlyRate;
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
}
function formatDuration(minutes, format = 'short') {
    if (minutes < 60) {
        return format === 'short' ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        const hourText = format === 'short' ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`;
        return hourText;
    }
    if (format === 'short') {
        return `${hours}h ${remainingMinutes}m`;
    }
    const hourText = `${hours} hour${hours !== 1 ? 's' : ''}`;
    const minuteText = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    return `${hourText} ${minuteText}`;
}
export function ActiveTimer({ timer, onStart, onPause, onResume, onStop, className }) {
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
    const billableAmount = timer ? calculateBillableAmount(currentDuration, timer.billableRate) : 0;
    if (!timer) {
        return (_jsx(Card, { className: cn("w-full", className), children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center text-muted-foreground", children: [_jsx(Clock, { className: "mx-auto h-12 w-12 mb-4 opacity-50" }), _jsx("p", { className: "text-lg font-medium", children: "No Active Timer" }), _jsx("p", { className: "text-sm", children: "Start a new timer to track your time" })] }) }) }));
    }
    return (_jsxs(Card, { className: cn("w-full border-l-4", timer.isRunning ? "border-l-green-500" : "border-l-yellow-500", className), children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(CardTitle, { className: "text-lg font-semibold flex items-center gap-2", children: [_jsx(Clock, { className: cn("h-5 w-5", timer.isRunning ? "text-green-500 animate-pulse" : "text-yellow-500") }), "Active Timer"] }), _jsx(Badge, { variant: timer.isRunning ? "default" : "secondary", className: "capitalize", children: timer.isRunning ? "Running" : "Paused" })] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: cn("text-4xl font-mono font-bold tracking-wider", timer.isRunning ? "text-green-600" : "text-yellow-600"), children: formatDuration(currentDuration, 'long') }), _jsxs("div", { className: "text-sm text-muted-foreground mt-1", children: ["Started at ", new Date(timer.startTime).toLocaleTimeString()] })] }), _jsxs("div", { className: "space-y-3 border-t pt-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx(FileText, { className: "h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium text-sm", children: timer.description }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [timer.matterCode, " \u2022 ", timer.clientName] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(DollarSign, { className: "h-4 w-4 text-muted-foreground flex-shrink-0" }), _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["Rate: ", formatCurrency(timer.billableRate), "/hr"] }), _jsxs("span", { className: "font-medium text-sm", children: ["Amount: ", formatCurrency(billableAmount)] })] })] })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [timer.isRunning ? (_jsxs(Button, { onClick: handlePause, disabled: isLoading, variant: "secondary", size: "sm", className: "flex-1", children: [_jsx(Pause, { className: "h-4 w-4 mr-2" }), "Pause"] })) : (_jsxs(Button, { onClick: handleResume, disabled: isLoading, variant: "primary", size: "sm", className: "flex-1", children: [_jsx(Play, { className: "h-4 w-4 mr-2" }), "Resume"] })), _jsxs(Button, { onClick: handleStop, disabled: isLoading, variant: "danger", size: "sm", className: "flex-1", children: [_jsx(Square, { className: "h-4 w-4 mr-2" }), "Stop"] })] }), _jsxs("div", { className: "flex gap-2 text-xs", children: [_jsx(Button, { variant: "secondary", size: "sm", className: "h-8 text-xs", children: "Add Note" }), _jsx(Button, { variant: "secondary", size: "sm", className: "h-8 text-xs", children: "Change Rate" }), _jsx(Button, { variant: "secondary", size: "sm", className: "h-8 text-xs", children: "Mark Non-Billable" })] })] })] }));
}
//# sourceMappingURL=ActiveTimer.js.map