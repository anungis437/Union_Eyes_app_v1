/**
 * InvitationList Component
 * 
 * Display and manage user invitations
 */

import React, { useState } from 'react';
import { Invitation } from '../services/invitationService';

interface InvitationListProps {
  invitations: Invitation[];
  isLoading: boolean;
  onResend: (invitationId: string) => Promise<boolean>;
  onCancel: (invitationId: string, cancelledBy: string) => Promise<boolean>;
  onDelete: (invitationId: string) => Promise<boolean>;
  currentUserId: string;
  showActions?: boolean;
}

export function InvitationList({
  invitations,
  isLoading,
  onResend,
  onCancel,
  onDelete,
  currentUserId,
  showActions = true,
}: InvitationListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'email' | 'created' | 'expires'>('created');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter invitations
  const filteredInvitations = invitations.filter(inv => {
    if (filter === 'all') return true;
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

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId);
    try {
      await onResend(invitationId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    setActionLoading(invitationId);
    try {
      await onCancel(invitationId, currentUserId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) {
      return;
    }
    setActionLoading(invitationId);
    try {
      await onDelete(invitationId);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges] || badges.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter:
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            aria-label="Filter invitations"
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort invitations"
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="created">Recently Created</option>
            <option value="expires">Expiration Date</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      {/* Invitations Table */}
      {sortedInvitations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'No invitations found' : `No ${filter} invitations`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expires
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedInvitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {invitation.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {invitation.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invitation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(invitation.createdAt.toString())}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      isExpired(invitation.expiresAt.toString()) && invitation.status === 'pending'
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatDate(invitation.expiresAt.toString())}
                      {isExpired(invitation.expiresAt.toString()) && invitation.status === 'pending' && (
                        <span className="ml-2">(Expired)</span>
                      )}
                    </div>
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResend(invitation.id)}
                              disabled={actionLoading === invitation.id}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Resend invitation"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancel(invitation.id)}
                              disabled={actionLoading === invitation.id}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Cancel invitation"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(invitation.id)}
                          disabled={actionLoading === invitation.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete invitation"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Showing {sortedInvitations.length} of {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
