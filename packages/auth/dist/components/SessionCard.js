import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export const SessionCard = ({ session, isCurrent = false, onTerminate, showTerminateButton = true, }) => {
    const getDeviceIcon = (deviceType) => {
        switch (deviceType) {
            case 'mobile':
                return '📱';
            case 'tablet':
                return '📱';
            case 'desktop':
                return '💻';
            default:
                return '🖥️';
        }
    };
    const getBrowserIcon = (browser) => {
        switch (browser?.toLowerCase()) {
            case 'chrome':
                return '🌐';
            case 'firefox':
                return '🦊';
            case 'safari':
                return '🧭';
            case 'edge':
                return '🌊';
            default:
                return '🌐';
        }
    };
    const formatLastActive = (date) => {
        if (!date)
            return 'Unknown';
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        if (hours < 24)
            return `${hours}h ago`;
        return `${days}d ago`;
    };
    const handleTerminate = () => {
        if (onTerminate && window.confirm('Are you sure you want to sign out this session?')) {
            onTerminate(session.id);
        }
    };
    return (_jsxs("div", { className: `
      bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm
      ${isCurrent ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
      ${!session.isActive ? 'opacity-60' : ''}
    `, children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "text-3xl", children: getDeviceIcon(session.deviceType) }), _jsxs("div", { children: [_jsxs("h3", { className: "font-semibold text-gray-900 dark:text-white flex items-center gap-2", children: [session.deviceName || `${session.deviceType || 'Unknown'} Device`, isCurrent && (_jsx("span", { className: "text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full", children: "Current" }))] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: getBrowserIcon(session.browser) }), _jsx("span", { children: session.browser || 'Unknown Browser' }), session.os && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: session.os })] }))] })] })] }), _jsx("div", { children: session.isActive ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-green-500 rounded-full" }), "Active"] })) : (_jsx("span", { className: "inline-flex items-center text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full", children: "Terminated" })) })] }), _jsxs("div", { className: "space-y-2 text-sm", children: [(session.city || session.country) && (_jsxs("div", { className: "flex items-center gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: "\uD83D\uDCCD" }), _jsx("span", { children: [session.city, session.country].filter(Boolean).join(', ') })] })), session.ipAddress && (_jsxs("div", { className: "flex items-center gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: "\uD83C\uDF10" }), _jsx("span", { className: "font-mono text-xs", children: session.ipAddress })] })), _jsxs("div", { className: "flex items-center gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: "\u23F1\uFE0F" }), _jsxs("span", { children: ["Last active ", formatLastActive(session.lastActivityAt)] })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: "\uD83D\uDCC5" }), _jsxs("span", { children: ["Signed in ", new Date(session.createdAt).toLocaleDateString(), " at", ' ', new Date(session.createdAt).toLocaleTimeString()] })] })] }), showTerminateButton && session.isActive && !isCurrent && onTerminate && (_jsx("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700", children: _jsx("button", { onClick: handleTerminate, className: "w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors", children: "Sign Out This Session" }) }))] }));
};
//# sourceMappingURL=SessionCard.js.map