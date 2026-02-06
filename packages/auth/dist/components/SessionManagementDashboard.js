import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SessionManagementDashboard Component
 *
 * Full dashboard page for managing user sessions
 */
import { useState, useEffect } from 'react';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { SessionList } from './SessionList';
export function SessionManagementDashboard({ userId, showAllUsers = false, }) {
    const { sessions, currentSession, isLoading, error, terminateSession, terminateOtherSessions, refresh, } = useSessionManagement({ userId });
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh)
            return;
        const interval = setInterval(() => {
            refresh();
            setLastRefresh(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, refresh]);
    const handleRefresh = async () => {
        await refresh();
        setLastRefresh(new Date());
    };
    const handleTerminateSession = async (sessionId) => {
        const success = await terminateSession(sessionId);
        if (success) {
            await refresh();
        }
        return success;
    };
    const handleTerminateOthers = async () => {
        const success = await terminateOtherSessions();
        if (success) {
            await refresh();
        }
        return success;
    };
    // Calculate stats
    const activeSessions = sessions.filter(s => s.isActive);
    const uniqueDevices = new Set(sessions.map(s => s.deviceType)).size;
    const uniqueLocations = new Set(sessions.map(s => s.city && s.country ? `${s.city}, ${s.country}` : 'Unknown')).size;
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Session Management" }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "Manage and monitor your active sessions across all devices" })] }), error && (_jsx("div", { className: "mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-200", children: error.message }) })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8", children: [_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: "Active Sessions" }), _jsx("p", { className: "mt-2 text-3xl font-bold text-gray-900 dark:text-white", children: activeSessions.length })] }), _jsx("div", { className: "h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDFE2" }) })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: "Unique Devices" }), _jsx("p", { className: "mt-2 text-3xl font-bold text-gray-900 dark:text-white", children: uniqueDevices })] }), _jsx("div", { className: "h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCBB" }) })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: "Locations" }), _jsx("p", { className: "mt-2 text-3xl font-bold text-gray-900 dark:text-white", children: uniqueLocations })] }), _jsx("div", { className: "h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83C\uDF0D" }) })] }) })] }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6", children: _jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { onClick: handleRefresh, disabled: isLoading, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [_jsx("span", { className: isLoading ? 'animate-spin' : '', children: "\uD83D\uDD04" }), "Refresh"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "auto-refresh", checked: autoRefresh, onChange: (e) => setAutoRefresh(e.target.checked), className: "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }), _jsx("label", { htmlFor: "auto-refresh", className: "text-sm text-gray-700 dark:text-gray-300 cursor-pointer", children: "Auto-refresh (30s)" })] })] }), _jsxs("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: ["Last updated: ", lastRefresh.toLocaleTimeString()] })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsx(SessionList, { sessions: sessions, currentSessionId: currentSession?.id, onTerminateSession: handleTerminateSession, onTerminateOthers: handleTerminateOthers, isLoading: isLoading, showTerminateButtons: true }) }), _jsxs("div", { className: "mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3", children: "\uD83D\uDD12 Security Tips" }), _jsxs("ul", { className: "space-y-2 text-sm text-blue-800 dark:text-blue-200", children: [_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "mt-1", children: "\u2022" }), _jsx("span", { children: "Regularly review your active sessions and terminate any you don't recognize" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "mt-1", children: "\u2022" }), _jsx("span", { children: "Always sign out when using shared or public computers" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "mt-1", children: "\u2022" }), _jsx("span", { children: "If you see suspicious activity, change your password immediately" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "mt-1", children: "\u2022" }), _jsx("span", { children: "Enable two-factor authentication for additional security (coming soon)" })] })] })] })] }));
}
//# sourceMappingURL=SessionManagementDashboard.js.map