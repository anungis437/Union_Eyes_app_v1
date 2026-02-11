/**
 * MemberRoleManager Component
 * 
 * Modal for updating organization member roles and custom permissions.
 * Includes validation to prevent removing the last owner.
 * 
 * @module MemberRoleManager
 */

import React, { useState, useEffect } from 'react';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
import type { OrganizationMember, MemberRole, UpdateMemberInput } from '../services/organizationService';

export interface MemberRoleManagerProps {
  /** Supabase client instance */
  supabase: any;
  
  /** Organization ID */
  organizationId: string;
  
  /** Member ID to edit */
  memberId: string;
  
  /** Whether modal is open */
  isOpen: boolean;
  
  /** Callback when modal closes */
  onClose: () => void;
  
  /** Callback after successful update */
  onUpdate?: (member: OrganizationMember) => void;
}

interface RoleOption {
  value: MemberRole;
  label: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'member',
    label: 'Member',
    description: 'Regular access to organization resources',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Can manage members and organization settings',
  },
  {
    value: 'guest',
    label: 'Guest',
    description: 'Read-only access to organization',
  },
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full control over organization (âš ï¸ Cannot be removed)',
  },
];

const availablePermissions = [
  'manage_matters',
  'manage_documents',
  'manage_billing',
  'view_analytics',
  'export_data',
  'manage_integrations',
  'manage_workflows',
  'manage_templates',
];

/**
 * Member role manager component
 * 
 * @example
 * ```tsx
 * const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
 * 
 * <MemberRoleManager
 *   supabase={supabase}
 *   organizationId={orgId}
 *   memberId={selectedMemberId!}
 *   isOpen={!!selectedMemberId}
 *   onClose={() => setSelectedMemberId(null)}
 *   onUpdate={(member) => undefined}
 * />
 * ```
 */
export const MemberRoleManager: React.FC<MemberRoleManagerProps> = ({
  supabase,
  organizationId,
  memberId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { members, updateMember, isOwnerOrAdmin } = useOrganizationMembers({
    supabase,
    organizationId,
    enableRealtime: false,
  });

  const [formData, setFormData] = useState<UpdateMemberInput>({
    role: 'member',
    custom_permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMember = members.find((m) => m.id === memberId);

  useEffect(() => {
    if (currentMember) {
      setFormData({
        role: currentMember.role,
        custom_permissions: currentMember.custom_permissions || [],
      });
      setError(null);
    }
  }, [currentMember]);

  const handleRoleChange = (role: MemberRole) => {
    setFormData((prev) => ({ ...prev, role }));
    setError(null);
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => {
      const current = prev.custom_permissions || [];
      const updated = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];
      return { ...prev, custom_permissions: updated };
    });
  };

  const validateForm = (): boolean => {
    // Check if trying to change owner role (requires special handling)
    if (currentMember?.role === 'owner' && formData.role !== 'owner') {
      // Count total owners in organization
      const ownerCount = members.filter((m) => m.role === 'owner').length;
      if (ownerCount === 1) {
        setError('Cannot change role of the last owner. Assign another owner first.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const updatedMember = await updateMember(memberId, formData);
      
      if (updatedMember) {
        onUpdate?.(updatedMember);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !currentMember) return null;

  // Check if current user has permission to edit roles
  if (!isOwnerOrAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Denied</h2>
          <p className="text-sm text-gray-600 mb-6">
            You don't have permission to edit member roles. Only owners and admins can perform this action.
          </p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Member Role</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update role and permissions for {currentMember.user_id}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Role Warning */}
          {currentMember.role === 'owner' && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">This member is an owner</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Be careful when changing owner roles. At least one owner is required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.role === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={formData.role === option.value}
                    onChange={() => handleRoleChange(option.value)}
                    disabled={isSubmitting}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Permissions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Custom Permissions (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(formData.custom_permissions || []).includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700 capitalize">
                    {permission.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Custom permissions override default role permissions
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Role'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
