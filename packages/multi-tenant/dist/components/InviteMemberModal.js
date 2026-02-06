import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * InviteMemberModal Component
 *
 * Modal dialog for inviting new members to an organization.
 * Includes email validation, role selection, and optional profile fields.
 *
 * @module InviteMemberModal
 */
import { useState } from 'react';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
/**
 * Modal for inviting new members
 *
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false);
 *
 * <InviteMemberModal
 *   supabase={supabase}
 *   organizationId={orgId}
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onInvite={(id) => toast.success('Member invited')}
 * />
 * ```
 */
export const InviteMemberModal = ({ supabase, organizationId, isOpen, onClose, onInvite, className = '', }) => {
    const [formData, setFormData] = useState({
        user_id: '',
        role: 'member',
        title: '',
        department: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addMember } = useOrganizationMembers({
        supabase,
        organizationId,
    });
    // Handle input change
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
    };
    // Validate form
    const validateForm = () => {
        const newErrors = {};
        // User ID validation (would typically be email)
        if (!formData.user_id.trim()) {
            newErrors.user_id = 'User ID/Email is required';
        }
        else if (formData.user_id.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user_id)) {
            newErrors.user_id = 'Invalid email format';
        }
        // Role validation
        if (!formData.role) {
            newErrors.role = 'Role is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting)
            return;
        if (!validateForm())
            return;
        setIsSubmitting(true);
        try {
            const member = await addMember(formData);
            if (member) {
                onInvite?.(member.id);
                handleClose();
            }
            else {
                setErrors({ submit: 'Failed to invite member. Please try again.' });
            }
        }
        catch (error) {
            setErrors({ submit: error.message || 'An unexpected error occurred' });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Handle close
    const handleClose = () => {
        setFormData({
            user_id: '',
            role: 'member',
            title: '',
            department: '',
        });
        setErrors({});
        setIsSubmitting(false);
        onClose();
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: `fixed inset-0 z-50 overflow-y-auto ${className}`, children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: handleClose }), _jsx("div", { className: "flex min-h-full items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl w-full max-w-md p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Invite Team Member" }), _jsx("button", { onClick: handleClose, className: "text-gray-400 hover:text-gray-600 transition-colors duration-150", "aria-label": "Close modal", children: _jsx("svg", { className: "w-6 h-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "user_id", className: "block text-sm font-medium text-gray-700 mb-1", children: "Email Address *" }), _jsx("input", { id: "user_id", type: "text", value: formData.user_id, onChange: (e) => handleChange('user_id', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.user_id
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "colleague@example.com", disabled: isSubmitting, autoFocus: true }), errors.user_id && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.user_id })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "role", className: "block text-sm font-medium text-gray-700 mb-1", children: "Role *" }), _jsxs("select", { id: "role", value: formData.role, onChange: (e) => handleChange('role', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.role
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, disabled: isSubmitting, children: [_jsx("option", { value: "member", children: "Member - Regular access" }), _jsx("option", { value: "admin", children: "Admin - Can manage members and settings" }), _jsx("option", { value: "guest", children: "Guest - Limited read-only access" }), _jsx("option", { value: "owner", children: "Owner - Full control (use with caution)" })] }), errors.role && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.role })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "title", className: "block text-sm font-medium text-gray-700 mb-1", children: "Job Title" }), _jsx("input", { id: "title", type: "text", value: formData.title || '', onChange: (e) => handleChange('title', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Senior Associate", disabled: isSubmitting })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "department", className: "block text-sm font-medium text-gray-700 mb-1", children: "Department" }), _jsx("input", { id: "department", type: "text", value: formData.department || '', onChange: (e) => handleChange('department', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Litigation", disabled: isSubmitting })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-3", children: _jsxs("p", { className: "text-xs text-blue-800", children: [_jsx("strong", { children: "Note:" }), " An invitation email will be sent to the member. They'll need to accept the invitation to join your organization."] }) }), errors.submit && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("p", { className: "text-sm text-red-800", children: errors.submit }) })), _jsxs("div", { className: "flex justify-end space-x-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: handleClose, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150", disabled: isSubmitting, children: "Cancel" }), _jsxs("button", { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center", disabled: isSubmitting, children: [isSubmitting && (_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), isSubmitting ? 'Sending...' : 'Send Invitation'] })] })] })] }) })] }));
};
//# sourceMappingURL=InviteMemberModal.js.map