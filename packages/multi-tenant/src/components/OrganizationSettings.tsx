/**
 * OrganizationSettings Component
 * 
 * Form for managing organization settings and details.
 * Includes general info, contact details, address, and branding.
 * Owner/admin only access with permission checking.
 * 
 * @module OrganizationSettings
 */

import React, { useState, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
import type { UpdateOrganizationInput } from '../services/organizationService';

export interface OrganizationSettingsProps {
  /** Supabase client instance */
  supabase: any;
  
  /** Organization ID to edit */
  organizationId: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Callback when settings are saved */
  onSave?: () => void;
}

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
export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  supabase,
  organizationId,
  className = '',
  onSave,
}) => {
  const [formData, setFormData] = useState<UpdateOrganizationInput>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'address' | 'branding'>('general');

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
  const handleChange = (field: keyof UpdateOrganizationInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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
    if (!validateForm()) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const updated = await updateOrganization(organizationId, formData);

      if (updated) {
        onSave?.();
      } else {
        setErrors({ submit: 'Failed to save settings. Please try again.' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className={`p-6 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-sm text-yellow-800">
          You don't have permission to edit organization settings. Only owners and admins can make changes.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { id: 'general', label: 'General' },
            { id: 'contact', label: 'Contact' },
            { id: 'address', label: 'Address' },
            { id: 'branding', label: 'Branding' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${
                  errors.name
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={isSaving}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => handleChange('display_name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSaving}
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional friendly name shown to users
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSaving}
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Organization Slug:</span>
                  <span className="ml-2 font-medium text-gray-900">{currentOrganization.slug}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Plan:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">
                    {currentOrganization.current_plan}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      currentOrganization.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : currentOrganization.status === 'trial'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentOrganization.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(currentOrganization.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={isSaving}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${
                  errors.website
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={isSaving}
              />
              {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
            </div>
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="address_line1"
                type="text"
                value={formData.address_line1 || ''}
                onChange={(e) => handleChange('address_line1', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                id="address_line2"
                type="text"
                value={formData.address_line2 || ''}
                onChange={(e) => handleChange('address_line2', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="state_province" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  id="state_province"
                  type="text"
                  value={formData.state_province || ''}
                  onChange={(e) => handleChange('state_province', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  id="postal_code"
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                id="logo_url"
                type="url"
                value={formData.logo_url || ''}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="https://example.com/logo.png"
                disabled={isSaving}
              />
              <p className="mt-1 text-sm text-gray-500">
                URL to your organization's logo image
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex space-x-2">
                  <input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color || '#3B82F6'}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    value={formData.primary_color || '#3B82F6'}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${
                      errors.primary_color
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="#3B82F6"
                    disabled={isSaving}
                  />
                </div>
                {errors.primary_color && (
                  <p className="mt-1 text-sm text-red-600">{errors.primary_color}</p>
                )}
              </div>

              <div>
                <label htmlFor="accent_color" className="block text-sm font-medium text-gray-700 mb-1">
                  Accent Color
                </label>
                <div className="flex space-x-2">
                  <input
                    id="accent_color"
                    type="color"
                    value={formData.accent_color || '#10B981'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    value={formData.accent_color || '#10B981'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm ${
                      errors.accent_color
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="#10B981"
                    disabled={isSaving}
                  />
                </div>
                {errors.accent_color && (
                  <p className="mt-1 text-sm text-red-600">{errors.accent_color}</p>
                )}
              </div>
            </div>

            {/* Color Preview */}
            <div className="mt-6 p-4 border border-gray-200 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Color Preview</h4>
              <div className="flex space-x-4">
                <div
                  className="flex-1 h-20 rounded-md flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: formData.primary_color || '#3B82F6' }}
                >
                  Primary
                </div>
                <div
                  className="flex-1 h-20 rounded-md flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: formData.accent_color || '#10B981' }}
                >
                  Accent
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            disabled={isSaving}
          >
            {isSaving && (
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
