/**
 * CreateOrganizationModal Component
 *
 * Modal dialog for creating a new organization.
 * Includes form validation, slug generation, and availability checking.
 *
 * @module CreateOrganizationModal
 */
import React from 'react';
export interface CreateOrganizationModalProps {
    /** Supabase client instance */
    supabase: any;
    /** Whether modal is open */
    isOpen: boolean;
    /** Callback to close modal */
    onClose: () => void;
    /** Callback when organization is created */
    onCreate?: (organizationId: string) => void;
    /** Additional CSS classes */
    className?: string;
}
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
 *   onCreate={(id) => console.log('Created org:', id)}
 * />
 * ```
 */
export declare const CreateOrganizationModal: React.FC<CreateOrganizationModalProps>;
//# sourceMappingURL=CreateOrganizationModal.d.ts.map