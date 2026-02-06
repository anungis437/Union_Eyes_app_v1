/**
 * InviteUserModal Component
 * 
 * Modal for inviting new users to an organization
 */

import React, { useState } from 'react';
import { InvitationCreate } from '../services/invitationService';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InvitationCreate, invitedBy: string) => Promise<boolean>;
  organizationId: string;
  currentUserId: string;
  availableRoles?: Array<{ value: string; label: string }>;
  availablePermissions?: Array<{ value: string; label: string; description?: string }>;
}

const DEFAULT_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'org_admin', label: 'Organization Admin' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'client', label: 'Client' },
];

export function InviteUserModal({
  isOpen,
  onClose,
  onInvite,
  organizationId,
  currentUserId,
  availableRoles = DEFAULT_ROLES,
  availablePermissions = [],
}: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(availableRoles[0]?.value || 'lawyer');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const invitationData: InvitationCreate = {
        email: email.trim(),
        organizationId: organizationId,
        role,
        permissions: selectedPermissions,
      };

      const success = await onInvite(invitationData, currentUserId);

      if (success) {
        // Reset form
        setEmail('');
        setRole(availableRoles[0]?.value || 'lawyer');
        setSelectedPermissions([]);
        setMessage('');
        onClose();
      } else {
        setError('Failed to send invitation. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setRole(availableRoles[0]?.value || 'lawyer');
      setSelectedPermissions([]);
      setMessage('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invite User
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Send an invitation to join your organization
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address *
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                placeholder="user@example.com"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label
                htmlFor="invite-role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role *
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isSubmitting}
                aria-label="Select role"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                {availableRoles.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions (if available) */}
            {availablePermissions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Permissions
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  {availablePermissions.map(perm => (
                    <label
                      key={perm.value}
                      className="flex items-start space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.value)}
                        onChange={() => handlePermissionToggle(perm.value)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {perm.label}
                        </span>
                        {perm.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {perm.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Message */}
            <div>
              <label
                htmlFor="invite-message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Personal Message (Optional)
              </label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none"
                placeholder="Add a personal message to the invitation..."
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
