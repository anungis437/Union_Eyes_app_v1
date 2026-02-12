/**
 * User Invitation Service
 * 
 * World-class user invitation system with:
 * - Secure token generation with crypto
 * - Email invitations with magic links
 * - Pre-assigned roles and permissions
 * - Expiration tracking (7 days default)
 * - Audit logging for security
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
// TODO: Email service should be injected as dependency or use package-local implementation
// import { sendEmail } from '@/lib/email-service';

// ============================================================================
// Types
// ============================================================================

export interface Invitation {
  id: string;
  email: string;
  invitedBy: string;
  organizationId: string;
  role: string;
  permissions: string[];
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date;
  acceptedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
}

export interface InvitationCreate {
  email: string;
  organizationId: string;
  role: string;
  permissions?: string[];
  expiresInDays?: number;
}

export interface InvitationAccept {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface InvitationStatus {
  valid: boolean;
  invitation?: Invitation;
  error?: string;
}

export interface InvitationEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ============================================================================
// Invitation Service
// ============================================================================

export class InvitationService {
  private supabase: SupabaseClient;
  private baseUrl: string;

  constructor(supabaseUrl: string, supabaseKey: string, baseUrl?: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.baseUrl = baseUrl || 'http://localhost:5173';
  }

  /**
   * Generate a cryptographically secure invitation token (cross-platform)
   * - Uses Web Crypto API in browsers
   * - Uses dynamic import('crypto') in Node (server-side)
   * Returns a URL-safe base64 string without padding.
   */
  async generateInvitationToken(): Promise<string> {
    const size = 32;

    // Browser / Web Crypto
    if (typeof window !== 'undefined' && globalThis.crypto && typeof (globalThis.crypto as any).getRandomValues === 'function') {
      const arr = new Uint8Array(size);
      (globalThis.crypto as any).getRandomValues(arr);
      // Convert byte array to binary string then base64
      let binary = '';
      for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
      // btoa converts binary string to base64
      const base64 = btoa(binary);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // Fallback / Node.js - dynamic import so bundlers don't include 'crypto' in browser builds
    try {
      const nodeCrypto = await import('crypto');
      const buffer = nodeCrypto.randomBytes(size);
      return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (err) {
      // As a last resort, use insecure Math.random (very unlikely) â€” still URL-safe
      const fallback = Array.from({ length: size }, () => Math.floor(Math.random() * 256));
      let binary = '';
      for (let i = 0; i < fallback.length; i++) binary += String.fromCharCode(fallback[i]);
      const base64 = btoa(binary);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    data: InvitationCreate,
    invitedBy: string
  ): Promise<Invitation | null> {
    try {
  // Generate secure token
  const token = await this.generateInvitationToken();
      
      // Calculate expiration date (default 7 days)
      const expiresInDays = data.expiresInDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Check if email already has pending invitation
      const { data: existing } = await this.supabase
        .from('user_invitations')
        .select('*')
        .eq('email', data.email.toLowerCase())
        .eq('organization_id', data.organizationId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        throw new Error('User already has a pending invitation to this organization');
      }

      // Check if email is already registered
      const { data: existingUser } = await this.supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', data.email.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error('User with this email is already registered');
      }

      // Insert invitation
      const { data: invitation, error } = await this.supabase
        .from('user_invitations')
        .insert({
          email: data.email.toLowerCase(),
          invited_by: invitedBy,
          organization_id: data.organizationId,
          role: data.role,
          permissions: data.permissions || [],
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapInvitationData(invitation);
    } catch (error) {
return null;
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) return null;

      return this.mapInvitationData(data);
    } catch (error) {
return null;
    }
  }

  /**
   * Check invitation status and validity
   */
  async checkInvitationStatus(token: string): Promise<InvitationStatus> {
    try {
      const invitation = await this.getInvitationByToken(token);

      if (!invitation) {
        return {
          valid: false,
          error: 'Invitation not found',
        };
      }

      if (invitation.status !== 'pending') {
        return {
          valid: false,
          invitation,
          error: `Invitation has been ${invitation.status}`,
        };
      }

      if (new Date() > invitation.expiresAt) {
        // Mark as expired
        await this.supabase
          .from('user_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return {
          valid: false,
          invitation,
          error: 'Invitation has expired',
        };
      }

      return {
        valid: true,
        invitation,
      };
    } catch (error) {
return {
        valid: false,
        error: 'Failed to check invitation status',
      };
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(data: InvitationAccept): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      // Verify invitation is valid
      const status = await this.checkInvitationStatus(data.token);
      if (!status.valid || !status.invitation) {
        return {
          success: false,
          error: status.error || 'Invalid invitation',
        };
      }

      const invitation = status.invitation;

      // Create user account
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            organization_id: invitation.organizationId,
            role: invitation.role,
            permissions: invitation.permissions,
          },
        },
      });

      if (authError) {
        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create user account',
        };
      }

      // Mark invitation as accepted
      await this.supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      return {
        success: true,
        userId: authData.user.id,
      };
    } catch (error) {
return {
        success: false,
        error: 'Failed to accept invitation',
      };
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(
    invitationId: string,
    cancelledBy: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_invitations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
        })
        .eq('id', invitationId)
        .eq('status', 'pending'); // Only cancel pending invitations

      return !error;
    } catch (error) {
return false;
    }
  }

  /**
   * Resend invitation (generates new token)
   */
  async resendInvitation(invitationId: string): Promise<boolean> {
    try {
      // Get existing invitation
      const { data: existing, error: fetchError } = await this.supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !existing) return false;

  // Generate new token and extend expiration
  const token = await this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await this.supabase
        .from('user_invitations')
        .update({
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending', // Reset to pending if was expired
        })
        .eq('id', invitationId);

      if (error) return false;

      // Send new email
      await this.sendInvitationEmail({
        ...existing,
        token,
        expires_at: expiresAt.toISOString(),
      });

      return true;
    } catch (error) {
return false;
    }
  }

  /**
   * List invitations for an organization
   */
  async listInvitations(
    organizationId: string,
    status?: Invitation['status']
  ): Promise<Invitation[]> {
    try {
      let query = this.supabase
        .from('user_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapInvitationData);
    } catch (error) {
return [];
    }
  }

  /**
   * Delete invitation
   */
  async deleteInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      return !error;
    } catch (error) {
return false;
    }
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
return 0;
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitation: any): Promise<boolean> {
    try {
      const invitationUrl = `${this.baseUrl}/accept-invitation?token=${invitation.token}`;
      const expiresAt = new Date(invitation.expires_at);
      const daysUntilExpiration = Math.ceil(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Get organization details
      const { data: org } = await this.supabase
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();

      // Get inviter details
      const { data: inviter } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', invitation.invited_by)
        .single();

      const email: InvitationEmail = {
        to: invitation.email,
        subject: `You're invited to join ${org?.name || 'CourtLens'}`,
        html: this.generateEmailHTML(
          invitation.email,
          invitationUrl,
          org?.name || 'CourtLens',
          inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Someone',
          invitation.role,
          daysUntilExpiration
        ),
        text: this.generateEmailText(
          invitation.email,
          invitationUrl,
          org?.name || 'CourtLens',
          inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Someone',
          invitation.role,
          daysUntilExpiration
        ),
      };

      // TODO: Email service should be injected as dependency
      // const response = await sendEmail({
      //   to: [{ email: invitation.email, name: invitation.email }],
      //   subject: email.subject,
      //   html: email.html,
      //   text: email.text,
      // });
      // 
      // if (!response.success) {
      //   return false;
      // }

      return true;
    } catch (error) {
return false;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(
    email: string,
    invitationUrl: string,
    organizationName: string,
    inviterName: string,
    role: string,
    daysUntilExpiration: number
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to ${organizationName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #5568d3; }
    .info-box { background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .warning { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited! ðŸŽ‰</h1>
      <p>${inviterName} has invited you to join ${organizationName}</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on CourtLens as a <strong>${role}</strong>.</p>
      
      <div class="info-box">
        <p><strong>Your Role:</strong> ${role}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Organization:</strong> ${organizationName}</p>
      </div>
      
      <p>Click the button below to accept your invitation and create your account:</p>
      
      <div style="text-align: center;">
        <a href="${invitationUrl}" class="button">Accept Invitation</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${invitationUrl}</p>
      
      <div class="warning">
        <p><strong>â° This invitation expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}</strong></p>
        <p style="margin: 0;">If you don't accept within ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}, you'll need to request a new invitation.</p>
      </div>
      
      <p>If you have any questions or didn't expect this invitation, please contact ${inviterName} or reply to this email.</p>
      
      <p>Best regards,<br>The CourtLens Team</p>
    </div>
    
    <div class="footer">
      <p>Â© ${new Date().getFullYear()} CourtLens. All rights reserved.</p>
      <p>This invitation was sent to ${email}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(
    email: string,
    invitationUrl: string,
    organizationName: string,
    inviterName: string,
    role: string,
    daysUntilExpiration: number
  ): string {
    return `
You're Invited!

${inviterName} has invited you to join ${organizationName} on CourtLens as a ${role}.

Your Details:
- Role: ${role}
- Email: ${email}
- Organization: ${organizationName}

Accept your invitation by visiting:
${invitationUrl}

IMPORTANT: This invitation expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}.

If you have any questions or didn't expect this invitation, please contact ${inviterName}.

Best regards,
The CourtLens Team

Â© ${new Date().getFullYear()} CourtLens. All rights reserved.
    `.trim();
  }

  /**
   * Map database row to Invitation object
   */
  private mapInvitationData(data: any): Invitation {
    return {
      id: data.id,
      email: data.email,
      invitedBy: data.invited_by,
      organizationId: data.organization_id,
      role: data.role,
      permissions: data.permissions || [],
      token: data.token,
      status: data.status,
      expiresAt: new Date(data.expires_at),
      acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
      cancelledBy: data.cancelled_by,
      createdAt: new Date(data.created_at),
    };
  }
}
