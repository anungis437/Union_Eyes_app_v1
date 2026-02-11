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
import { SimpleLogger } from '../utils/logger';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

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
  
  // Contact
  email?: string;
  phone?: string;
  website?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  
  // Branding
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  
  // Status
  status: OrganizationStatus;
  trial_ends_at?: string;
  suspended_at?: string;
  suspended_reason?: string;
  
  // Billing
  billing_email?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_plan: OrganizationPlan;
  
  // Limits
  max_users: number;
  max_matters: number;
  max_storage_gb: number;
  max_api_calls_per_day: number;
  
  // Features
  features?: Record<string, boolean>;
  metadata?: Record<string, any>;
  
  // Timestamps
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
  
  // Invitation
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  
  // Activity
  last_seen_at?: string;
  last_ip_address?: string;
  
  // Profile
  title?: string;
  department?: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated fields
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

// =====================================================
// SERVICE CLASS
// =====================================================

export class OrganizationService {
  private logger = new SimpleLogger('OrganizationService');

  constructor(private supabase: SupabaseClient) {}

  // =====================================================
  // ORGANIZATION CRUD
  // =====================================================

  /**
   * Create a new organization
   * Automatically adds the current user as owner
   */
  async createOrganization(input: CreateOrganizationInput): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(input.slug)) {
        return { data: null, error: new Error('Slug must contain only lowercase letters, numbers, and hyphens') };
      }

      // Check if slug is already taken
      const { data: existing } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('slug', input.slug)
        .single();

      if (existing) {
        return { data: null, error: new Error('Organization slug already exists') };
      }

      // Create organization
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: input.name,
          slug: input.slug,
          display_name: input.display_name || input.name,
          description: input.description,
          email: input.email,
          phone: input.phone,
          website: input.website,
          primary_color: input.primary_color || '#3B82F6',
          accent_color: input.accent_color || '#10B981',
          status: 'active',
          current_plan: 'free',
          max_users: 1,
          max_matters: 10,
          max_storage_gb: 0.1, // 100MB
          max_api_calls_per_day: 1000,
        })
        .select()
        .single();

      if (orgError) {
        return { data: null, error: orgError };
      }

      // Add current user as owner
      const { error: memberError } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        // Rollback: delete organization if member creation fails
        await this.supabase.from('organizations').delete().eq('id', org.id);
        return { data: null, error: memberError };
      }

      // Log audit event
      await this.logAuditEvent(org.id, user.id, 'organization.created', 'organization', org.id, null, org);

      return { data: org as Organization, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as Organization, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as Organization, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update organization
   * Requires owner or admin role
   */
  async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput
  ): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check permissions
      const hasPermission = await this.checkPermission(organizationId, user.id, ['owner', 'admin']);
      if (!hasPermission) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Get old values for audit
      const { data: oldOrg } = await this.getOrganization(organizationId);

      // Update organization
      const { data, error } = await this.supabase
        .from('organizations')
        .update(input)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Log audit event
      await this.logAuditEvent(organizationId, user.id, 'organization.updated', 'organization', organizationId, oldOrg, data);

      return { data: data as Organization, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Soft delete organization
   * Requires owner role
   */
  async deleteOrganization(organizationId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('User not authenticated') };
      }

      // Check permissions (only owner can delete)
      const hasPermission = await this.checkPermission(organizationId, user.id, ['owner']);
      if (!hasPermission) {
        return { success: false, error: new Error('Only organization owner can delete') };
      }

      // Soft delete (set deleted_at)
      const { error } = await this.supabase
        .from('organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', organizationId);

      if (error) {
        return { success: false, error };
      }

      // Log audit event
      await this.logAuditEvent(organizationId, user.id, 'organization.deleted', 'organization', organizationId, null, null);

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * List all organizations for current user
   */
  async listUserOrganizations(): Promise<{ data: Organization[]; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: [], error: new Error('User not authenticated') };
      }

      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          organization:organizations (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('organizations.deleted_at', null);

      if (error) {
        return { data: [], error };
      }

      const organizations = (data as any[])
        .map((item: any) => item.organization)
        .filter(Boolean) as Organization[];

      return { data: organizations, error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  // =====================================================
  // MEMBER MANAGEMENT
  // =====================================================

  /**
   * Add member to organization
   * Requires owner or admin role
   */
  async addMember(
    organizationId: string,
    input: AddMemberInput
  ): Promise<{ data: OrganizationMember | null; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check permissions
      const hasPermission = await this.checkPermission(organizationId, user.id, ['owner', 'admin']);
      if (!hasPermission) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Check if user is already a member
      const { data: existing } = await this.supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', input.user_id)
        .single();

      if (existing) {
        return { data: null, error: new Error('User is already a member') };
      }

      // Check organization member limit
      const { data: org } = await this.getOrganization(organizationId);
      if (!org) {
        return { data: null, error: new Error('Organization not found') };
      }

      const { data: currentMembers } = await this.supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (currentMembers && currentMembers.length >= org.max_users) {
        return { data: null, error: new Error('Organization member limit reached') };
      }

      // Add member
      const { data, error } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: input.user_id,
          role: input.role,
          custom_permissions: input.custom_permissions || [],
          status: 'active',
          invited_by: user.id,
          joined_at: new Date().toISOString(),
          title: input.title,
          department: input.department,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Log audit event
      await this.logAuditEvent(organizationId, user.id, 'member.added', 'member', data.id, null, data);

      return { data: data as OrganizationMember, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update member role and permissions
   * Requires owner or admin role
   */
  async updateMember(
    organizationId: string,
    memberId: string,
    input: UpdateMemberInput
  ): Promise<{ data: OrganizationMember | null; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check permissions
      const hasPermission = await this.checkPermission(organizationId, user.id, ['owner', 'admin']);
      if (!hasPermission) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Get old values for audit
      const { data: oldMember } = await this.supabase
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .single();

      // Prevent removing last owner
      if (oldMember?.role === 'owner' && input.role && input.role !== 'owner') {
        const { data: owners } = await this.supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('role', 'owner')
          .eq('status', 'active');

        if (owners && owners.length <= 1) {
          return { data: null, error: new Error('Cannot remove last owner') };
        }
      }

      // Update member
      const { data, error } = await this.supabase
        .from('organization_members')
        .update(input)
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Log audit event
      await this.logAuditEvent(organizationId, user.id, 'member.updated', 'member', memberId, oldMember, data);

      return { data: data as OrganizationMember, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove member from organization
   * Requires owner or admin role
   */
  async removeMember(organizationId: string, memberId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('User not authenticated') };
      }

      // Check permissions
      const hasPermission = await this.checkPermission(organizationId, user.id, ['owner', 'admin']);
      if (!hasPermission) {
        return { success: false, error: new Error('Insufficient permissions') };
      }

      // Get member info
      const { data: member } = await this.supabase
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .single();

      // Prevent removing last owner
      if (member?.role === 'owner') {
        const { data: owners } = await this.supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('role', 'owner')
          .eq('status', 'active');

        if (owners && owners.length <= 1) {
          return { success: false, error: new Error('Cannot remove last owner') };
        }
      }

      // Remove member
      const { error } = await this.supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organizationId);

      if (error) {
        return { success: false, error };
      }

      // Log audit event
      await this.logAuditEvent(organizationId, user.id, 'member.removed', 'member', memberId, member, null);

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * List all members of an organization
   */
  async listMembers(organizationId: string): Promise<{ data: OrganizationMember[]; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error };
      }

      return { data: (data || []) as OrganizationMember[], error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  // =====================================================
  // PERMISSIONS & VALIDATION
  // =====================================================

  /**
   * Check if user has permission to perform action
   */
  async checkPermission(
    organizationId: string,
    userId: string,
    allowedRoles: MemberRole[]
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!data) return false;

      return allowedRoles.includes(data.role as MemberRole);
    } catch {
      return false;
    }
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<MemberRole | null> {
    try {
      const { data } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return data?.role as MemberRole || null;
    } catch {
      return null;
    }
  }

  // =====================================================
  // AUDIT LOGGING
  // =====================================================

  /**
   * Log audit event
   */
  private async logAuditEvent(
    organizationId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    try {
      await this.supabase.from('organization_audit_log').insert({
        organization_id: organizationId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        status: 'success',
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', { error });
    }
  }
}

/**
 * Create organization service instance
 */
export function createOrganizationService(supabase: SupabaseClient): OrganizationService {
  return new OrganizationService(supabase);
}
