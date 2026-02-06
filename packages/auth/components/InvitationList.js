import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * InvitationList Component
 *
 * Display and manage user invitations
 */
import { useState } from 'react';
export function InvitationList({ invitations, isLoading, onResend, onCancel, onDelete, currentUserId, showActions = true, }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('created');
    const [actionLoading, setActionLoading] = useState(null);
    // Filter invitations
    const filteredInvitations = invitations.filter(inv => {
        if (filter === 'all')
            return true;
        return inv.status === filter;
    });
    // Sort invitations
    const sortedInvitations = [...filteredInvitations].sort((a, b) => {
        switch (sortBy) {
            case 'email':
                return a.email.localeCompare(b.email);
            case 'created':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'expires':
                return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
            default:
                return 0;
        }
    });
    const handleResend = async (invitationId) => {
        setActionLoading(invitationId);
        try {
            await onResend(invitationId);
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleCancel = async (invitationId) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) {
            return;
        }
        setActionLoading(invitationId);
        try {
            await onCancel(invitationId, currentUserId);
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleDelete = async (invitationId) => {
        if (!confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) {
            return;
        }
        setActionLoading(invitationId);
        try {
            await onDelete(invitationId);
        }
        finally {
            setActionLoading(null);
        }
    };
    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return (_jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || badges.pending}`, children: status.charAt(0).toUpperCase() + status.slice(1) }));
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const isExpired = (expiresAt) => {
        return new Date(expiresAt) < new Date();
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Filter:" }), _jsxs("select", { value: filter, onChange: (e) => setFilter(e.target.value), "aria-label": "Filter invitations", className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white", children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "accepted", children: "Accepted" }), _jsx("option", { value: "expired", children: "Expired" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Sort by:" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), "aria-label": "Sort invitations", className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white", children: [_jsx("option", { value: "created", children: "Recently Created" }), _jsx("option", { value: "expires", children: "Expiration Date" }), _jsx("option", { value: "email", children: "Email" })] })] })] }), sortedInvitations.length === 0 ? (_jsx("div", { className: "text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: filter === 'all' ? 'No invitations found' : `No ${filter} invitations` }) })) : (_jsx("div", { className: "overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Role" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Created" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Expires" }), showActions && (_jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Actions" }))] }) }), _jsx("tbody", { className: "divide-y divide-gray-200 dark:divide-gray-700", children: sortedInvitations.map((invitation) => (_jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-700/50", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: invitation.email }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm text-gray-900 dark:text-white", children: invitation.role }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: getStatusBadge(invitation.status) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: formatDate(invitation.createdAt.toString()) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: `text-sm ${isExpired(invitation.expiresAt.toString()) && invitation.status === 'pending'
                                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                                : 'text-gray-500 dark:text-gray-400'}`, children: [formatDate(invitation.expiresAt.toString()), isExpired(invitation.expiresAt.toString()) && invitation.status === 'pending' && (_jsx("span", { className: "ml-2", children: "(Expired)" }))] }) }), showActions && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsxs("div", { className: "flex justify-end gap-2", children: [invitation.status === 'pending' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleResend(invitation.id), disabled: actionLoading === invitation.id, className: "text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed", title: "Resend invitation", children: "Resend" }), _jsx("button", { onClick: () => handleCancel(invitation.id), disabled: actionLoading === invitation.id, className: "text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed", title: "Cancel invitation", children: "Cancel" })] })), _jsx("button", { onClick: () => handleDelete(invitation.id), disabled: actionLoading === invitation.id, className: "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed", title: "Delete invitation", children: "Delete" })] }) }))] }, invitation.id))) })] }) })), _jsx("div", { className: "flex items-center justify-between text-sm text-gray-500 dark:text-gray-400", children: _jsxs("span", { children: ["Showing ", sortedInvitations.length, " of ", invitations.length, " invitation", invitations.length !== 1 ? 's' : ''] }) })] }));
}
//# sourceMappingURL=InvitationList.js.map