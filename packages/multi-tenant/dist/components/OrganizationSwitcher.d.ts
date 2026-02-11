/**
 * OrganizationSwitcher Component
 *
 * Dropdown component for switching between organizations.
 * Displays current organization with logo and allows users to switch.
 * Integrates with useOrganization hook for real-time updates.
 *
 * @module OrganizationSwitcher
 */
import React from 'react';
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
export declare const OrganizationSwitcher: React.FC<OrganizationSwitcherProps>;
//# sourceMappingURL=OrganizationSwitcher.d.ts.map