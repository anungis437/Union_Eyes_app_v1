import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MemberList Component
 *
 * Table/list of organization members with filtering and management.
 * Real-time updates, role display, and action buttons.
 *
 * @module MemberList
 */
import { useState, useMemo } from 'react';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
/**
 * Organization member list component
 *
 * @example
 * ```tsx
 * <MemberList
 *   supabase={supabase}
 *   organizationId={orgId}
 *   enableRealtime={true}
 *   onInviteClick={() => setShowInviteModal(true)}
 *   onMemberClick={(member) => setSelectedMember(member)}
 * />
 * ```
 */
export const MemberList = ({ supabase, organizationId, enableRealtime = true, onInviteClick, onMemberClick, className = '', }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const { members, currentUserMember, removeMember, isOwnerOrAdmin, isLoading, activeMemberCount, } = useOrganizationMembers({
        supabase,
        organizationId,
        enableRealtime,
    });
    // Filtered members
    const filteredMembers = useMemo(() => {
        let filtered = members;
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((m) => m.user_id?.toLowerCase().includes(query) ||
                m.title?.toLowerCase().includes(query) ||
                m.department?.toLowerCase().includes(query));
        }
        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter((m) => m.role === roleFilter);
        }
        return filtered;
    }, [members, searchQuery, roleFilter]);
    // Handle remove member
    const handleRemove = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?'))
            return;
        await removeMember(memberId);
    };
    // Get role badge color
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'owner':
                return 'bg-purple-100 text-purple-800';
            case 'admin':
                return 'bg-blue-100 text-blue-800';
            case 'member':
                return 'bg-green-100 text-green-800';
            case 'guest':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    // Get status badge color
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'invited':
                return 'bg-yellow-100 text-yellow-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    // Format last seen
    const formatLastSeen = (lastSeenAt) => {
        if (!lastSeenAt)
            return 'Never';
        const now = new Date();
        const lastSeen = new Date(lastSeenAt);
        const diffMs = now.getTime() - lastSeen.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return lastSeen.toLocaleDateString();
    };
    if (isLoading) {
        return (_jsx("div", { className: `animate-pulse ${className}`, children: _jsx("div", { className: "h-64 bg-gray-200 rounded-lg" }) }));
    }
    return (_jsxs("div", { className: `bg-white rounded-lg shadow-md ${className}`, children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Team Members" }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: [activeMemberCount, " active member", activeMemberCount !== 1 ? 's' : ''] })] }), isOwnerOrAdmin && onInviteClick && (_jsxs("button", { onClick: onInviteClick, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 inline-flex items-center", children: [_jsx("svg", { className: "w-4 h-4 mr-2", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { d: "M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" }) }), "Invite Member"] }))] }), _jsxs("div", { className: "flex space-x-4", children: [_jsx("div", { className: "flex-1", children: _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search by email, title, or department...", className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" }) }), _jsx("div", { className: "w-40", children: _jsxs("select", { value: roleFilter, onChange: (e) => setRoleFilter(e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", "aria-label": "Filter by role", children: [_jsx("option", { value: "all", children: "All Roles" }), _jsx("option", { value: "owner", children: "Owner" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "guest", children: "Guest" })] }) })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Member" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Role" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Last Seen" }), isOwnerOrAdmin && (_jsx("th", { scope: "col", className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" }))] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: filteredMembers.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: isOwnerOrAdmin ? 5 : 4, className: "px-6 py-12 text-center", children: _jsxs("div", { className: "text-gray-500", children: [_jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" }) }), _jsx("p", { className: "mt-2 text-sm", children: "No members found" })] }) }) })) : (filteredMembers.map((member) => (_jsxs("tr", { className: `hover:bg-gray-50 transition-colors duration-150 ${onMemberClick ? 'cursor-pointer' : ''}`, onClick: () => onMemberClick?.(member), children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "flex-shrink-0 h-10 w-10", children: _jsx("div", { className: "h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center", children: _jsx("span", { className: "text-sm font-medium text-blue-600", children: member.user_id
                                                                ?.substring(0, 2)
                                                                .toUpperCase() }) }) }), _jsxs("div", { className: "ml-4", children: [_jsxs("div", { className: "text-sm font-medium text-gray-900", children: [member.user_id, currentUserMember?.id === member.id && (_jsx("span", { className: "ml-2 text-xs text-gray-500", children: "(You)" }))] }), (member.title || member.department) && (_jsxs("div", { className: "text-sm text-gray-500", children: [member.title, member.title && member.department && ' • ', member.department] }))] })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(member.role)}`, children: member.role }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(member.status)}`, children: member.status }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatLastSeen(member.last_seen_at) }), isOwnerOrAdmin && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: member.id !== currentUserMember?.id && member.role !== 'owner' && (_jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                handleRemove(member.id);
                                            }, className: "text-red-600 hover:text-red-900 transition-colors duration-150", children: "Remove" })) }))] }, member.id)))) })] }) })] }));
};
//# sourceMappingURL=MemberList.js.map