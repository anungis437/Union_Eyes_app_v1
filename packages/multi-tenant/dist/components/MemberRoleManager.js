import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MemberRoleManager Component
 *
 * Modal for updating organization member roles and custom permissions.
 * Includes validation to prevent removing the last owner.
 *
 * @module MemberRoleManager
 */
import { useState, useEffect } from 'react';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
const roleOptions = [
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
        description: 'Full control over organization (⚠️ Cannot be removed)',
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
 *   onUpdate={(member) => console.log('Updated:', member)}
 * />
 * ```
 */
export const MemberRoleManager = ({ supabase, organizationId, memberId, isOpen, onClose, onUpdate, }) => {
    const { members, updateMember, isOwnerOrAdmin } = useOrganizationMembers({
        supabase,
        organizationId,
        enableRealtime: false,
    });
    const [formData, setFormData] = useState({
        role: 'member',
        custom_permissions: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
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
    const handleRoleChange = (role) => {
        setFormData((prev) => ({ ...prev, role }));
        setError(null);
    };
    const handlePermissionToggle = (permission) => {
        setFormData((prev) => {
            const current = prev.custom_permissions || [];
            const updated = current.includes(permission)
                ? current.filter((p) => p !== permission)
                : [...current, permission];
            return { ...prev, custom_permissions: updated };
        });
    };
    const validateForm = () => {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        try {
            setIsSubmitting(true);
            setError(null);
            const updatedMember = await updateMember(memberId, formData);
            if (updatedMember) {
                onUpdate?.(updatedMember);
            }
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update member');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleClose = () => {
        if (!isSubmitting) {
            setError(null);
            onClose();
        }
    };
    if (!isOpen || !currentMember)
        return null;
    // Check if current user has permission to edit roles
    if (!isOwnerOrAdmin) {
        return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Permission Denied" }), _jsx("p", { className: "text-sm text-gray-600 mb-6", children: "You don't have permission to edit member roles. Only owners and admins can perform this action." }), _jsx("button", { onClick: handleClose, className: "w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-150", children: "Close" })] }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Manage Member Role" }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Update role and permissions for ", currentMember.user_id] })] }), _jsx("button", { onClick: handleClose, disabled: isSubmitting, className: "text-gray-400 hover:text-gray-600 disabled:opacity-50", "aria-label": "Close modal", children: _jsx("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6", children: [error && (_jsx("div", { className: "mb-6 bg-red-50 border border-red-200 rounded-md p-4", children: _jsx("p", { className: "text-sm text-red-800", children: error }) })), currentMember.role === 'owner' && (_jsx("div", { className: "mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4", children: _jsxs("div", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-yellow-800", children: "This member is an owner" }), _jsx("p", { className: "mt-1 text-sm text-yellow-700", children: "Be careful when changing owner roles. At least one owner is required." })] })] }) })), _jsxs("div", { className: "mb-6", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: ["Role ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("div", { className: "space-y-3", children: roleOptions.map((option) => (_jsxs("label", { className: `flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${formData.role === option.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'}`, children: [_jsx("input", { type: "radio", name: "role", value: option.value, checked: formData.role === option.value, onChange: () => handleRoleChange(option.value), disabled: isSubmitting, className: "mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500" }), _jsxs("div", { className: "ml-3 flex-1", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: option.label }), _jsx("div", { className: "text-sm text-gray-500 mt-1", children: option.description })] })] }, option.value))) })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Custom Permissions (Optional)" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: availablePermissions.map((permission) => (_jsxs("label", { className: "flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: (formData.custom_permissions || []).includes(permission), onChange: () => handlePermissionToggle(permission), disabled: isSubmitting, className: "h-4 w-4 text-blue-600 focus:ring-blue-500 rounded" }), _jsx("span", { className: "ml-3 text-sm text-gray-700 capitalize", children: permission.replace(/_/g, ' ') })] }, permission))) }), _jsx("p", { className: "mt-2 text-xs text-gray-500", children: "Custom permissions override default role permissions" })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-6 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: handleClose, disabled: isSubmitting, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150", children: "Cancel" }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150", children: isSubmitting ? (_jsxs("span", { className: "flex items-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Updating..."] })) : ('Update Role') })] })] })] }) }));
};
//# sourceMappingURL=MemberRoleManager.js.map