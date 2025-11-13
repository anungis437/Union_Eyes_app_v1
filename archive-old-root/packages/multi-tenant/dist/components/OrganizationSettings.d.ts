/**
 * OrganizationSettings Component
 *
 * Form for managing organization settings and details.
 * Includes general info, contact details, address, and branding.
 * Owner/admin only access with permission checking.
 *
 * @module OrganizationSettings
 */
import React from 'react';
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
export declare const OrganizationSettings: React.FC<OrganizationSettingsProps>;
//# sourceMappingURL=OrganizationSettings.d.ts.map