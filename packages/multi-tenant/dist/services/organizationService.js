/**
 * Organization Service
 *
 * Comprehensive service for managing organizations (tenants) in the multi-tenant architecture.
 * Handles CRUD operations, member management, settings, and tenant switching.
 *
 * @module organizationService
 * @category Multi-Tenant
 */
// =====================================================
// SERVICE CLASS
// =====================================================
export class OrganizationService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    // =====================================================
    // ORGANIZATION CRUD
    // =====================================================
    /**
     * Create a new organization
     * Automatically adds the current user as owner
     */
    async createOrganization(input) {
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
            return { data: org, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Get organization by ID
     */
    async getOrganization(organizationId) {
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
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Get organization by slug
     */
    async getOrganizationBySlug(slug) {
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
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Update organization
     * Requires owner or admin role
     */
    async updateOrganization(organizationId, input) {
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
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Soft delete organization
     * Requires owner role
     */
    async deleteOrganization(organizationId) {
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
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    /**
     * List all organizations for current user
     */
    async listUserOrganizations() {
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
            const organizations = data
                .map((item) => item.organization)
                .filter(Boolean);
            return { data: organizations, error: null };
        }
        catch (error) {
            return { data: [], error: error };
        }
    }
    // =====================================================
    // MEMBER MANAGEMENT
    // =====================================================
    /**
     * Add member to organization
     * Requires owner or admin role
     */
    async addMember(organizationId, input) {
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
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Update member role and permissions
     * Requires owner or admin role
     */
    async updateMember(organizationId, memberId, input) {
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
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Remove member from organization
     * Requires owner or admin role
     */
    async removeMember(organizationId, memberId) {
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
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    /**
     * List all members of an organization
     */
    async listMembers(organizationId) {
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
            return { data: (data || []), error: null };
        }
        catch (error) {
            return { data: [], error: error };
        }
    }
    // =====================================================
    // PERMISSIONS & VALIDATION
    // =====================================================
    /**
     * Check if user has permission to perform action
     */
    async checkPermission(organizationId, userId, allowedRoles) {
        try {
            const { data } = await this.supabase
                .from('organization_members')
                .select('role')
                .eq('organization_id', organizationId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();
            if (!data)
                return false;
            return allowedRoles.includes(data.role);
        }
        catch {
            return false;
        }
    }
    /**
     * Get user's role in organization
     */
    async getUserRole(organizationId, userId) {
        try {
            const { data } = await this.supabase
                .from('organization_members')
                .select('role')
                .eq('organization_id', organizationId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();
            return data?.role || null;
        }
        catch {
            return null;
        }
    }
    // =====================================================
    // AUDIT LOGGING
    // =====================================================
    /**
     * Log audit event
     */
    async logAuditEvent(organizationId, userId, action, entityType, entityId, oldValues, newValues) {
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
        }
        catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }
}
/**
 * Create organization service instance
 */
export function createOrganizationService(supabase) {
    return new OrganizationService(supabase);
}
//# sourceMappingURL=organizationService.js.map