import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * InviteUserModal Component
 *
 * Modal for inviting new users to an organization
 */
import { useState } from 'react';
const DEFAULT_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'org_admin', label: 'Organization Admin' },
    { value: 'lawyer', label: 'Lawyer' },
    { value: 'paralegal', label: 'Paralegal' },
    { value: 'support_staff', label: 'Support Staff' },
    { value: 'client', label: 'Client' },
];
export function InviteUserModal({ isOpen, onClose, onInvite, organizationId, currentUserId, availableRoles = DEFAULT_ROLES, availablePermissions = [], }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState(availableRoles[0]?.value || 'lawyer');
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Validate email
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        setIsSubmitting(true);
        try {
            const invitationData = {
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
            }
            else {
                setError('Failed to send invitation. Please try again.');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handlePermissionToggle = (permission) => {
        setSelectedPermissions(prev => prev.includes(permission)
            ? prev.filter(p => p !== permission)
            : [...prev, permission]);
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
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: handleClose }), _jsx("div", { className: "flex min-h-full items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Invite User" }), _jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Send an invitation to join your organization" })] }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-200", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "invite-email", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Email Address *" }), _jsx("input", { id: "invite-email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, disabled: isSubmitting, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed", placeholder: "user@example.com" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "invite-role", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Role *" }), _jsx("select", { id: "invite-role", value: role, onChange: (e) => setRole(e.target.value), disabled: isSubmitting, "aria-label": "Select role", className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed", children: availableRoles.map(r => (_jsx("option", { value: r.value, children: r.label }, r.value))) })] }), availablePermissions.length > 0 && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Additional Permissions" }), _jsx("div", { className: "space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3", children: availablePermissions.map(perm => (_jsxs("label", { className: "flex items-start space-x-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selectedPermissions.includes(perm.value), onChange: () => handlePermissionToggle(perm.value), disabled: isSubmitting, className: "mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed" }), _jsxs("div", { className: "flex-1", children: [_jsx("span", { className: "text-sm text-gray-900 dark:text-white", children: perm.label }), perm.description && (_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: perm.description }))] })] }, perm.value))) })] })), _jsxs("div", { children: [_jsx("label", { htmlFor: "invite-message", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Personal Message (Optional)" }), _jsx("textarea", { id: "invite-message", value: message, onChange: (e) => setMessage(e.target.value), disabled: isSubmitting, rows: 3, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none", placeholder: "Add a personal message to the invitation..." })] }), _jsxs("div", { className: "flex space-x-3 pt-4", children: [_jsx("button", { type: "button", onClick: handleClose, disabled: isSubmitting, className: "flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Cancel" }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: isSubmitting ? 'Sending...' : 'Send Invitation' })] })] })] }) })] }));
}
//# sourceMappingURL=InviteUserModal.js.map