/**
 * OrganizationSwitcher Component
 * 
 * Dropdown component for switching between organizations.
 * Displays current organization with logo and allows users to switch.
 * Integrates with useOrganization hook for real-time updates.
 * 
 * @module OrganizationSwitcher
 */

import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import type { Organization } from '../services/organizationService';

export interface OrganizationSwitcherProps {
  /** Supabase client instance */
  supabase: any;
  
  /** Enable real-time updates */
  enableRealtime?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Callback when organization is switched */
  onSwitch?: (organization: Organization) => void;
  
  /** Show create organization option */
  showCreateOption?: boolean;
  
  /** Callback to open create organization modal */
  onCreateClick?: () => void;
}

/**
 * Organization switcher dropdown component
 * 
 * @example
 * ```tsx
 * <OrganizationSwitcher
 *   supabase={supabase}
 *   enableRealtime={true}
 *   onSwitch={(org) => undefined}
 *   showCreateOption={true}
 *   onCreateClick={() => setShowCreateModal(true)}
 * />
 * ```
 */
export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  supabase,
  enableRealtime = true,
  className = '',
  onSwitch,
  showCreateOption = false,
  onCreateClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    currentOrganization,
    organizations,
    switchOrganization,
    isLoading,
  } = useOrganization({
    supabase,
    enableRealtime,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;

    await switchOrganization(orgId);
    setIsOpen(false);
    onSwitch?.(org);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Current Organization Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Organization Logo/Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-semibold"
          style={{
            backgroundColor: currentOrganization.primary_color || '#3B82F6',
          }}
        >
          {currentOrganization.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="w-8 h-8 rounded-md object-cover"
            />
          ) : (
            getInitials(currentOrganization.name)
          )}
        </div>

        {/* Organization Name */}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentOrganization.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Dropdown Icon */}
        <svg
          className={`flex-shrink-0 w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-96 overflow-auto">
          {/* Organization List */}
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 ${
                org.id === currentOrganization.id ? 'bg-blue-50' : ''
              }`}
            >
              {/* Logo/Icon */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  backgroundColor: org.primary_color || '#3B82F6',
                }}
              >
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="w-8 h-8 rounded-md object-cover"
                  />
                ) : (
                  getInitials(org.name)
                )}
              </div>

              {/* Organization Info */}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {org.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {org.current_plan || 'Free'} Plan
                </div>
              </div>

              {/* Current Indicator */}
              {org.id === currentOrganization.id && (
                <svg
                  className="flex-shrink-0 w-5 h-5 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}

          {/* Create Organization Option */}
          {showCreateOption && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateClick?.();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 text-blue-600"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Create Organization</div>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
