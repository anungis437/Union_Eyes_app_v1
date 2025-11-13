/**
 * MemberList Component
 * 
 * Table/list of organization members with filtering and management.
 * Real-time updates, role display, and action buttons.
 * 
 * @module MemberList
 */

import React, { useState, useMemo } from 'react';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
import type { OrganizationMember, MemberRole } from '../services/organizationService';

export interface MemberListProps {
  /** Supabase client instance */
  supabase: any;
  
  /** Organization ID */
  organizationId: string;
  
  /** Enable real-time updates */
  enableRealtime?: boolean;
  
  /** Callback when invite button is clicked */
  onInviteClick?: () => void;
  
  /** Callback when member is clicked */
  onMemberClick?: (member: OrganizationMember) => void;
  
  /** Additional CSS classes */
  className?: string;
}

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
export const MemberList: React.FC<MemberListProps> = ({
  supabase,
  organizationId,
  enableRealtime = true,
  onInviteClick,
  onMemberClick,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'all'>('all');

  const {
    members,
    currentUserMember,
    removeMember,
    isOwnerOrAdmin,
    isLoading,
    activeMemberCount,
  } = useOrganizationMembers({
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
      filtered = filtered.filter(
        (m) =>
          m.user_id?.toLowerCase().includes(query) ||
          m.title?.toLowerCase().includes(query) ||
          m.department?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((m) => m.role === roleFilter);
    }

    return filtered;
  }, [members, searchQuery, roleFilter]);

  // Handle remove member
  const handleRemove = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    await removeMember(memberId);
  };

  // Get role badge color
  const getRoleBadgeColor = (role: MemberRole): string => {
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
  const getStatusBadgeColor = (status: string): string => {
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
  const formatLastSeen = (lastSeenAt: string | null | undefined): string => {
    if (!lastSeenAt) return 'Never';

    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeMemberCount} active member{activeMemberCount !== 1 ? 's' : ''}
            </p>
          </div>
          {isOwnerOrAdmin && onInviteClick && (
            <button
              onClick={onInviteClick}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 inline-flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, title, or department..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Role Filter */}
          <div className="w-40">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as MemberRole | 'all')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Member
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Seen
              </th>
              {isOwnerOrAdmin && (
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={isOwnerOrAdmin ? 5 : 4} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <p className="mt-2 text-sm">No members found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-gray-50 transition-colors duration-150 ${
                    onMemberClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onMemberClick?.(member)}
                >
                  {/* Member Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.user_id
                              ?.substring(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.user_id}
                          {currentUserMember?.id === member.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        {(member.title || member.department) && (
                          <div className="text-sm text-gray-500">
                            {member.title}
                            {member.title && member.department && ' • '}
                            {member.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </td>

                  {/* Last Seen */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastSeen(member.last_seen_at)}
                  </td>

                  {/* Actions */}
                  {isOwnerOrAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {member.id !== currentUserMember?.id && member.role !== 'owner' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(member.id);
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors duration-150"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
