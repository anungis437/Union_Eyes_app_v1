import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * OrganizationSettings Component
 *
 * Form for managing organization settings and details.
 * Includes general info, contact details, address, and branding.
 * Owner/admin only access with permission checking.
 *
 * @module OrganizationSettings
 */
import { useState, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
/**
 * Organization settings form component
 *
 * @example
 * ```tsx
 * <OrganizationSettings
 *   supabase={supabase}
 *   organizationId={currentOrg.id}
 *   onSave={() => toast.success('Settings saved')}
 * />
 * ```
 */
export const OrganizationSettings = ({ supabase, organizationId, className = '', onSave, }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const { currentOrganization, updateOrganization } = useOrganization({
        supabase,
        organizationId,
    });
    const { isOwnerOrAdmin } = useOrganizationMembers({
        supabase,
        organizationId,
    });
    // Load organization data
    useEffect(() => {
        if (currentOrganization) {
            setFormData({
                name: currentOrganization.name,
                display_name: currentOrganization.display_name || '',
                description: currentOrganization.description || '',
                email: currentOrganization.email || '',
                phone: currentOrganization.phone || '',
                website: currentOrganization.website || '',
                address_line1: currentOrganization.address_line1 || '',
                address_line2: currentOrganization.address_line2 || '',
                city: currentOrganization.city || '',
                state_province: currentOrganization.state_province || '',
                postal_code: currentOrganization.postal_code || '',
                country: currentOrganization.country || '',
                logo_url: currentOrganization.logo_url || '',
                primary_color: currentOrganization.primary_color || '#3B82F6',
                accent_color: currentOrganization.accent_color || '#10B981',
            });
        }
    }, [currentOrganization]);
    // Handle input change
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
    };
    // Validate form
    const validateForm = () => {
        const newErrors = {};
        // Name validation
        if (formData.name && formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        // Email validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        // Website validation
        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
            newErrors.website = 'Website must start with http:// or https://';
        }
        // Color validation
        if (formData.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.primary_color)) {
            newErrors.primary_color = 'Invalid color format (use #RRGGBB)';
        }
        if (formData.accent_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.accent_color)) {
            newErrors.accent_color = 'Invalid color format (use #RRGGBB)';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    // Handle save
    const handleSave = async () => {
        if (!validateForm())
            return;
        if (isSaving)
            return;
        setIsSaving(true);
        try {
            const updated = await updateOrganization(organizationId, formData);
            if (updated) {
                onSave?.();
            }
            else {
                setErrors({ submit: 'Failed to save settings. Please try again.' });
            }
        }
        catch (error) {
            setErrors({ submit: error.message || 'An unexpected error occurred' });
        }
        finally {
            setIsSaving(false);
        }
    };
    if (!currentOrganization) {
        return (_jsx("div", { className: `animate-pulse ${className}`, children: _jsx("div", { className: "h-64 bg-gray-200 rounded-lg" }) }));
    }
    if (!isOwnerOrAdmin) {
        return (_jsx("div", { className: `p-6 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`, children: _jsx("p", { className: "text-sm text-yellow-800", children: "You don't have permission to edit organization settings. Only owners and admins can make changes." }) }));
    }
    return (_jsxs("div", { className: `bg-white rounded-lg shadow-md ${className}`, children: [_jsx("div", { className: "border-b border-gray-200", children: _jsx("nav", { className: "flex -mb-px", children: [
                        { id: 'general', label: 'General' },
                        { id: 'contact', label: 'Contact' },
                        { id: 'address', label: 'Address' },
                        { id: 'branding', label: 'Branding' },
                    ].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), className: `px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: tab.label }, tab.id))) }) }), _jsxs("div", { className: "p-6", children: [activeTab === 'general' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700 mb-1", children: "Organization Name *" }), _jsx("input", { id: "name", type: "text", value: formData.name || '', onChange: (e) => handleChange('name', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.name
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, disabled: isSaving }), errors.name && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.name })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "display_name", className: "block text-sm font-medium text-gray-700 mb-1", children: "Display Name" }), _jsx("input", { id: "display_name", type: "text", value: formData.display_name || '', onChange: (e) => handleChange('display_name', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Optional friendly name shown to users" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "description", className: "block text-sm font-medium text-gray-700 mb-1", children: "Description" }), _jsx("textarea", { id: "description", value: formData.description || '', onChange: (e) => handleChange('description', e.target.value), rows: 4, className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsx("div", { className: "pt-4 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Organization Slug:" }), _jsx("span", { className: "ml-2 font-medium text-gray-900", children: currentOrganization.slug })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Current Plan:" }), _jsx("span", { className: "ml-2 font-medium text-gray-900 capitalize", children: currentOrganization.current_plan })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Status:" }), _jsx("span", { className: `ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${currentOrganization.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : currentOrganization.status === 'trial'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'}`, children: currentOrganization.status })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Created:" }), _jsx("span", { className: "ml-2 font-medium text-gray-900", children: new Date(currentOrganization.created_at).toLocaleDateString() })] })] }) })] })), activeTab === 'contact' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { id: "email", type: "email", value: formData.email || '', onChange: (e) => handleChange('email', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.email
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, disabled: isSaving }), errors.email && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "phone", className: "block text-sm font-medium text-gray-700 mb-1", children: "Phone" }), _jsx("input", { id: "phone", type: "tel", value: formData.phone || '', onChange: (e) => handleChange('phone', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "website", className: "block text-sm font-medium text-gray-700 mb-1", children: "Website" }), _jsx("input", { id: "website", type: "url", value: formData.website || '', onChange: (e) => handleChange('website', e.target.value), className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.website
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, disabled: isSaving }), errors.website && _jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.website })] })] })), activeTab === 'address' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "address_line1", className: "block text-sm font-medium text-gray-700 mb-1", children: "Address Line 1" }), _jsx("input", { id: "address_line1", type: "text", value: formData.address_line1 || '', onChange: (e) => handleChange('address_line1', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "address_line2", className: "block text-sm font-medium text-gray-700 mb-1", children: "Address Line 2" }), _jsx("input", { id: "address_line2", type: "text", value: formData.address_line2 || '', onChange: (e) => handleChange('address_line2', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "city", className: "block text-sm font-medium text-gray-700 mb-1", children: "City" }), _jsx("input", { id: "city", type: "text", value: formData.city || '', onChange: (e) => handleChange('city', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "state_province", className: "block text-sm font-medium text-gray-700 mb-1", children: "State/Province" }), _jsx("input", { id: "state_province", type: "text", value: formData.state_province || '', onChange: (e) => handleChange('state_province', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "postal_code", className: "block text-sm font-medium text-gray-700 mb-1", children: "Postal Code" }), _jsx("input", { id: "postal_code", type: "text", value: formData.postal_code || '', onChange: (e) => handleChange('postal_code', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "country", className: "block text-sm font-medium text-gray-700 mb-1", children: "Country" }), _jsx("input", { id: "country", type: "text", value: formData.country || '', onChange: (e) => handleChange('country', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", disabled: isSaving })] })] })] })), activeTab === 'branding' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "logo_url", className: "block text-sm font-medium text-gray-700 mb-1", children: "Logo URL" }), _jsx("input", { id: "logo_url", type: "url", value: formData.logo_url || '', onChange: (e) => handleChange('logo_url', e.target.value), className: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "https://example.com/logo.png", disabled: isSaving }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "URL to your organization's logo image" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "primary_color", className: "block text-sm font-medium text-gray-700 mb-1", children: "Primary Color" }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("input", { id: "primary_color", type: "color", value: formData.primary_color || '#3B82F6', onChange: (e) => handleChange('primary_color', e.target.value), className: "h-10 w-20 border border-gray-300 rounded-md cursor-pointer", disabled: isSaving }), _jsx("input", { type: "text", value: formData.primary_color || '#3B82F6', onChange: (e) => handleChange('primary_color', e.target.value), className: `flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.primary_color
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "#3B82F6", disabled: isSaving })] }), errors.primary_color && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.primary_color }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "accent_color", className: "block text-sm font-medium text-gray-700 mb-1", children: "Accent Color" }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("input", { id: "accent_color", type: "color", value: formData.accent_color || '#10B981', onChange: (e) => handleChange('accent_color', e.target.value), className: "h-10 w-20 border border-gray-300 rounded-md cursor-pointer", disabled: isSaving }), _jsx("input", { type: "text", value: formData.accent_color || '#10B981', onChange: (e) => handleChange('accent_color', e.target.value), className: `flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${errors.accent_color
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`, placeholder: "#10B981", disabled: isSaving })] }), errors.accent_color && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.accent_color }))] })] }), _jsxs("div", { className: "mt-6 p-4 border border-gray-200 rounded-md", children: [_jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Color Preview" }), _jsxs("div", { className: "flex space-x-4", children: [_jsx("div", { className: "flex-1 h-20 rounded-md flex items-center justify-center text-white font-medium", style: { backgroundColor: formData.primary_color || '#3B82F6' }, children: "Primary" }), _jsx("div", { className: "flex-1 h-20 rounded-md flex items-center justify-center text-white font-medium", style: { backgroundColor: formData.accent_color || '#10B981' }, children: "Accent" })] })] })] })), errors.submit && (_jsx("div", { className: "mt-4 rounded-md bg-red-50 p-4", children: _jsx("p", { className: "text-sm text-red-800", children: errors.submit }) })), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200 flex justify-end", children: _jsxs("button", { onClick: handleSave, className: "px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center", disabled: isSaving, children: [isSaving && (_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), isSaving ? 'Saving...' : 'Save Settings'] }) })] })] }));
};
//# sourceMappingURL=OrganizationSettings.js.map