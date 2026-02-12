/**
 * Organization Service
 *
 * Comprehensive service for managing organizations (tenants) in the multi-tenant architecture.
 * Handles CRUD operations, member management, settings, and tenant switching.
 *
 * @module organizationService
 * @category Multi-Tenant
 */
import { SupabaseClient } from '@supabase/supabase-js';
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled' | 'trial';
export type OrganizationPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type MemberStatus = 'active' | 'suspended' | 'pending';
export interface Organization {
    id: string;
    name: string;
    slug: string;
    display_name?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    status: OrganizationStatus;
    trial_ends_at?: string;
    suspended_at?: string;
    suspended_reason?: string;
    billing_email?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    current_plan: OrganizationPlan;
    max_users: number;
    max_matters: number;
    max_storage_gb: number;
    max_api_calls_per_day: number;
    features?: Record<string, boolean>;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}
export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: MemberRole;
    custom_permissions?: string[];
    status: MemberStatus;
    invited_by?: string;
    invited_at: string;
    joined_at?: string;
    last_seen_at?: string;
    last_ip_address?: string;
    title?: string;
    department?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        email: string;
        full_name?: string;
        avatar_url?: string;
    };
    organization?: Organization;
}
export interface CreateOrganizationInput {
    name: string;
    slug: string;
    display_name?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    primary_color?: string;
    accent_color?: string;
}
export interface UpdateOrganizationInput {
    name?: string;
    slug?: string;
    display_name?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    billing_email?: string;
}
export interface AddMemberInput {
    user_id: string;
    role: MemberRole;
    custom_permissions?: string[];
    title?: string;
    department?: string;
}
export interface UpdateMemberInput {
    role?: MemberRole;
    custom_permissions?: string[];
    status?: MemberStatus;
    title?: string;
    department?: string;
}
export interface OrganizationWithMembers extends Organization {
    members?: OrganizationMember[];
    member_count?: number;
    owner?: OrganizationMember;
}
export declare class OrganizationService {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient);
    /**
     * Create a new organization
     * Automatically adds the current user as owner
     */
    createOrganization(input: CreateOrganizationInput): Promise<{
        data: Organization | null;
        error: Error | null;
    }>;
    /**
     * Get organization by ID
     */
    getOrganization(organizationId: string): Promise<{
        data: Organization | null;
        error: Error | null;
    }>;
    /**
     * Get organization by slug
     */
    getOrganizationBySlug(slug: string): Promise<{
        data: Organization | null;
        error: Error | null;
    }>;
    /**
     * Update organization
     * Requires owner or admin role
     */
    updateOrganization(organizationId: string, input: UpdateOrganizationInput): Promise<{
        data: Organization | null;
        error: Error | null;
    }>;
    /**
     * Soft delete organization
     * Requires owner role
     */
    deleteOrganization(organizationId: string): Promise<{
        success: boolean;
        error: Error | null;
    }>;
    /**
     * List all organizations for current user
     */
    listUserOrganizations(): Promise<{
        data: Organization[];
        error: Error | null;
    }>;
    /**
     * Add member to organization
     * Requires owner or admin role
     */
    addMember(organizationId: string, input: AddMemberInput): Promise<{
        data: OrganizationMember | null;
        error: Error | null;
    }>;
    /**
     * Update member role and permissions
     * Requires owner or admin role
     */
    updateMember(organizationId: string, memberId: string, input: UpdateMemberInput): Promise<{
        data: OrganizationMember | null;
        error: Error | null;
    }>;
    /**
     * Remove member from organization
     * Requires owner or admin role
     */
    removeMember(organizationId: string, memberId: string): Promise<{
        success: boolean;
        error: Error | null;
    }>;
    /**
     * List all members of an organization
     */
    listMembers(organizationId: string): Promise<{
        data: OrganizationMember[];
        error: Error | null;
    }>;
    /**
     * Check if user has permission to perform action
     */
    checkPermission(organizationId: string, userId: string, allowedRoles: MemberRole[]): Promise<boolean>;
    /**
     * Get user's role in organization
     */
    getUserRole(organizationId: string, userId: string): Promise<MemberRole | null>;
    /**
     * Log audit event
     */
    private logAuditEvent;
}
/**
 * Create organization service instance
 */
export declare function createOrganizationService(supabase: SupabaseClient): OrganizationService;
//# sourceMappingURL=organizationService.d.ts.map