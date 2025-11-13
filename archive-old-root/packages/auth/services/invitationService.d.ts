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
export declare class InvitationService {
    private supabase;
    private baseUrl;
    constructor(supabaseUrl: string, supabaseKey: string, baseUrl?: string);
    /**
     * Generate a cryptographically secure invitation token (cross-platform)
     * - Uses Web Crypto API in browsers
     * - Uses dynamic import('crypto') in Node (server-side)
     * Returns a URL-safe base64 string without padding.
     */
    generateInvitationToken(): Promise<string>;
    /**
     * Create a new invitation
     */
    createInvitation(data: InvitationCreate, invitedBy: string): Promise<Invitation | null>;
    /**
     * Get invitation by token
     */
    getInvitationByToken(token: string): Promise<Invitation | null>;
    /**
     * Check invitation status and validity
     */
    checkInvitationStatus(token: string): Promise<InvitationStatus>;
    /**
     * Accept invitation and create user account
     */
    acceptInvitation(data: InvitationAccept): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    /**
     * Cancel invitation
     */
    cancelInvitation(invitationId: string, cancelledBy: string): Promise<boolean>;
    /**
     * Resend invitation (generates new token)
     */
    resendInvitation(invitationId: string): Promise<boolean>;
    /**
     * List invitations for an organization
     */
    listInvitations(organizationId: string, status?: Invitation['status']): Promise<Invitation[]>;
    /**
     * Delete invitation
     */
    deleteInvitation(invitationId: string): Promise<boolean>;
    /**
     * Cleanup expired invitations
     */
    cleanupExpiredInvitations(): Promise<number>;
    /**
     * Send invitation email
     */
    sendInvitationEmail(invitation: any): Promise<boolean>;
    /**
     * Generate HTML email content
     */
    private generateEmailHTML;
    /**
     * Generate plain text email content
     */
    private generateEmailText;
    /**
     * Map database row to Invitation object
     */
    private mapInvitationData;
}
//# sourceMappingURL=invitationService.d.ts.map