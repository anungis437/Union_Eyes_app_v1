import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CreateOrganizationModal Component
 *
 * Modal dialog for creating a new organization.
 * Includes form validation, slug generation, and availability checking.
 *
 * @module CreateOrganizationModal
 */
import { useState, useCallback, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
/**
 * Modal for creating new organizations
 *
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false);
 *
 * <CreateOrganizationModal
 *   supabase={supabase}
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCreate={(id) => undefined}
 * />
 * ```
 */
export const CreateOrganizationModal = ({ supabase, isOpen, onClose, onCreate, className = '', }) => {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        email: '',
        phone: '',
        website: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slugChecking, setSlugChecking] = useState(false);
    const { createOrganization, service } = useOrganization({ supabase });
    // Generate slug from name
    useEffect(() => {
        if (formData.name && !formData.slug) {
            const generatedSlug = formData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            setFormData((prev) => ({ ...prev, slug: generatedSlug }));
        }
    }, [formData.name, formData.slug]);
    // Validate slug format
    const validateSlug = (slug) => {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        return slugRegex.test(slug);
    };
    // Check slug availability
    const checkSlugAvailability = useCallback(async (slug) => {
        if (!slug || !validateSlug(slug))
            return false;
        setSlugChecking(true);
        try {
            const { data } = await service.getOrganizationBySlug(slug);
            return !data; // Available if no organization found
        }
        catch {
            return false;
        }
        finally {
            setSlugChecking(false);
        }
    }, [service]);
    // Validate form
    const validateForm = async () => {
        const newErrors = {};
        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Organization name is required';
        }
        else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        else if (formData.name.length > 100) {
            newErrors.name = 'Name must be less than 100 characters';
        }
        // Slug validation
        if (!formData.slug.trim()) {
            newErrors.slug = 'Slug is required';
        }
        else if (!validateSlug(formData.slug)) {
            newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
        }
        else {
            const isAvailable = await checkSlugAvailability(formData.slug);
            if (!isAvailable) {
                newErrors.slug = 'This slug is already taken';
            }
        }
        // Email validation (optional)
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        // Website validation (optional)
        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
            newErrors.website = 'Website must start with http:// or https://';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting)
            return;
        const isValid = await validateForm();
        if (!isValid)
            return;
        setIsSubmitting(true);
        try {
            const organization = await createOrganization(formData);
            if (organization) {
                onCreate?.(organization.id);
                handleClose();
            }
            else {
                setErrors({ submit: 'Failed to create organization. Please try again.' });
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
            name: '',
            slug: '',
            description: '',
            email: '',
            phone: '',
            website: '',
        });
        setErrors({});
        setIsSubmitting(false);
        onClose();
    };
    // Handle input change
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: `fixed inset-0 z-50 overflow-y-auto ${className}`, children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: handleClose }), _jsx("div", { className: "flex min-h-full items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Create Organization" }), _jsx("button", { onClick: handleClose, className: "text-gray-400 hover:text-gray-600 transition-colors duration-150", "aria-label": "Close modal", children: _jsx("svg", { className: "w-6 h-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "org-name", className: "block text-sm font-medium text-gray-700 mb-1", children: "Organization Name *" }), _jsx("input", { id: "org-name", type: "text", value: formData.name, onChange: (e) => handleChange('name', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.name
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "Acme Legal Services", disabled: isSubmitting }), errors.name && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.name })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "org-slug", className: "block text-sm font-medium text-gray-700 mb-1", children: "URL Slug *" }), _jsx("input", { id: "org-slug", type: "text", value: formData.slug, onChange: (e) => handleChange('slug', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.slug
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "acme-legal-services", disabled: isSubmitting }), slugChecking && (_jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Checking availability..." })), errors.slug && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.slug }), !errors.slug && formData.slug && (_jsxs("p", { className: "mt-1 text-sm text-gray-500", children: ["Your organization will be accessible at: app.courtlens.com/", formData.slug] }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "org-description", className: "block text-sm font-medium text-gray-700 mb-1", children: "Description" }), _jsx("textarea", { id: "org-description", value: formData.description || '', onChange: (e) => handleChange('description', e.target.value), rows: 3, className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Brief description of your organization", disabled: isSubmitting })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "org-email", className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { id: "org-email", type: "email", value: formData.email || '', onChange: (e) => handleChange('email', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.email
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "contact@acmelegal.com", disabled: isSubmitting }), errors.email && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "org-phone", className: "block text-sm font-medium text-gray-700 mb-1", children: "Phone" }), _jsx("input", { id: "org-phone", type: "tel", value: formData.phone || '', onChange: (e) => handleChange('phone', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "+1 (555) 123-4567", disabled: isSubmitting })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "org-website", className: "block text-sm font-medium text-gray-700 mb-1", children: "Website" }), _jsx("input", { id: "org-website", type: "url", value: formData.website || '', onChange: (e) => handleChange('website', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.website
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "https://acmelegal.com", disabled: isSubmitting }), errors.website && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.website })] }), errors.submit && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("p", { className: "text-sm text-red-800", children: errors.submit }) })), _jsxs("div", { className: "flex justify-end space-x-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: handleClose, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150", disabled: isSubmitting, children: "Cancel" }), _jsxs("button", { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center", disabled: isSubmitting, children: [isSubmitting && (_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), isSubmitting ? 'Creating...' : 'Create Organization'] })] })] })] }) })] }));
};
//# sourceMappingURL=CreateOrganizationModal.js.map