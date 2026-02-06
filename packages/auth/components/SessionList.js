import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Session List Component
 *
 * List of all sessions with filtering and sorting
 */
import { useState } from 'react';
import { SessionCard } from './SessionCard';
export const SessionList = ({ sessions, currentSessionId, onTerminateSession, onTerminateOthers, isLoading = false, showTerminateButtons = true, }) => {
    const [filter, setFilter] = useState('active');
    const [sortBy, setSortBy] = useState('lastActive');
    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        if (filter === 'active')
            return session.isActive;
        if (filter === 'terminated')
            return !session.isActive;
        return true;
    });
    // Sort sessions
    const sortedSessions = [...filteredSessions].sort((a, b) => {
        if (sortBy === 'lastActive') {
            const aTime = a.lastActivityAt?.getTime() || 0;
            const bTime = b.lastActivityAt?.getTime() || 0;
            return bTime - aTime;
        }
        else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
    // Separate current session
    const currentSession = sortedSessions.find(s => s.id === currentSessionId);
    const otherSessions = sortedSessions.filter(s => s.id !== currentSessionId);
    const activeCount = sessions.filter(s => s.isActive).length;
    const otherActiveCount = otherSessions.filter(s => s.isActive).length;
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: activeCount }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: ["Active Session", activeCount !== 1 ? 's' : ''] })] }), _jsx("div", { className: "h-12 w-px bg-gray-200 dark:bg-gray-700" }), _jsxs("div", { children: [_jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: sessions.length }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: ["Total Session", sessions.length !== 1 ? 's' : ''] })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsxs("select", { value: filter, onChange: (e) => setFilter(e.target.value), className: "px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", "aria-label": "Filter sessions", children: [_jsx("option", { value: "active", children: "Active Only" }), _jsx("option", { value: "all", children: "All Sessions" }), _jsx("option", { value: "terminated", children: "Terminated Only" })] }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", "aria-label": "Sort sessions", children: [_jsx("option", { value: "lastActive", children: "Last Active" }), _jsx("option", { value: "created", children: "Recently Created" })] }), showTerminateButtons && otherActiveCount > 0 && onTerminateOthers && (_jsxs("button", { onClick: () => {
                                        if (window.confirm(`Sign out ${otherActiveCount} other session${otherActiveCount !== 1 ? 's' : ''}?`)) {
                                            onTerminateOthers();
                                        }
                                    }, className: "px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors whitespace-nowrap", children: ["Sign Out Other Devices (", otherActiveCount, ")"] }))] })] }) }), sortedSessions.length === 0 && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center", children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83D\uDD12" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-1", children: "No Sessions Found" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: [filter === 'active' && 'No active sessions to display.', filter === 'terminated' && 'No terminated sessions found.', filter === 'all' && 'No sessions found.'] })] })), currentSession && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide", children: "Current Session" }), _jsx(SessionCard, { session: currentSession, isCurrent: true, showTerminateButton: false })] })), otherSessions.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide", children: "Other Sessions" }), _jsx("div", { className: "space-y-3", children: otherSessions.map(session => (_jsx(SessionCard, { session: session, isCurrent: false, onTerminate: onTerminateSession, showTerminateButton: showTerminateButtons }, session.id))) })] }))] }));
};
//# sourceMappingURL=SessionList.js.map