import { createClient } from '@supabase/supabase-js';
// Default email templates (configure these in your environment)
export const EMAIL_TEMPLATES = {
    WELCOME: process.env.NEXT_PUBLIC_SENDGRID_WELCOME_TEMPLATE_ID || '',
    PASSWORD_RESET: process.env.NEXT_PUBLIC_SENDGRID_PASSWORD_RESET_TEMPLATE_ID || '',
    NOTIFICATION: process.env.NEXT_PUBLIC_SENDGRID_NOTIFICATION_TEMPLATE_ID || '',
    CASE_UPDATE: process.env.NEXT_PUBLIC_SENDGRID_CASE_UPDATE_TEMPLATE_ID || '',
    DOCUMENT_READY: process.env.NEXT_PUBLIC_SENDGRID_DOCUMENT_READY_TEMPLATE_ID || '',
    BILLING_REMINDER: process.env.NEXT_PUBLIC_SENDGRID_BILLING_REMINDER_TEMPLATE_ID || '',
};
export class EmailService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    /**
     * Send a simple text/HTML email
     */
    async sendEmail(emailData) {
        try {
            const { data, error } = await this.supabase.functions.invoke('send-email', {
                body: emailData,
            });
            if (error) {
                console.error('Email send error:', error);
                return { success: false, error: error.message };
            }
            return { success: true, message: data?.message };
        }
        catch (error) {
            console.error('Email service error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Send welcome email to new users
     */
    async sendWelcomeEmail(userEmail, userData) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.WELCOME,
            dynamic_template_data: {
                first_name: userData.first_name,
                organization_name: userData.organization_name || 'CourtLens',
                login_url: `${window.location.origin}/login`,
                support_email: 'support@courtlens.com',
            },
        });
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(userEmail, resetToken) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.PASSWORD_RESET,
            dynamic_template_data: {
                reset_url: `${window.location.origin}/reset-password?token=${resetToken}`,
                expires_in: '24 hours',
                support_email: 'support@courtlens.com',
            },
        });
    }
    /**
     * Send case update notification
     */
    async sendCaseUpdateEmail(userEmail, caseData) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.CASE_UPDATE,
            dynamic_template_data: {
                case_number: caseData.case_number,
                case_title: caseData.case_title,
                update_message: caseData.update_message,
                updated_by: caseData.updated_by,
                case_url: `${window.location.origin}/cases/${caseData.case_number}`,
                notification_settings_url: `${window.location.origin}/settings/notifications`,
            },
        });
    }
    /**
     * Send document ready notification
     */
    async sendDocumentReadyEmail(userEmail, documentData) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.DOCUMENT_READY,
            dynamic_template_data: {
                document_name: documentData.document_name,
                document_type: documentData.document_type,
                case_number: documentData.case_number,
                download_url: `${window.location.origin}/documents`,
                notification_settings_url: `${window.location.origin}/settings/notifications`,
            },
        });
    }
    /**
     * Send billing reminder
     */
    async sendBillingReminderEmail(userEmail, billingData) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.BILLING_REMINDER,
            dynamic_template_data: {
                invoice_number: billingData.invoice_number,
                amount_due: billingData.amount_due,
                due_date: billingData.due_date,
                organization_name: billingData.organization_name,
                payment_url: `${window.location.origin}/billing/payment`,
                support_email: 'billing@courtlens.com',
            },
        });
    }
    /**
     * Send custom notification email
     */
    async sendNotificationEmail(userEmail, notificationData) {
        return this.sendEmail({
            to: userEmail,
            template_id: EMAIL_TEMPLATES.NOTIFICATION,
            dynamic_template_data: {
                notification_title: notificationData.title,
                notification_message: notificationData.message,
                action_url: notificationData.action_url,
                action_text: notificationData.action_text || 'View Details',
                notification_settings_url: `${window.location.origin}/settings/notifications`,
            },
        });
    }
}
// Export a default instance for easy use
export const emailService = new EmailService(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
// Helper function for one-off email sending
export async function sendEmail(emailData) {
    return emailService.sendEmail(emailData);
}
// Type exports for TypeScript users
// export type { SendEmailRequest }; // Already exported above
/**
 * Usage Examples:
 *
 * // Send a simple email
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome to CourtLens',
 *   text: 'Welcome to our platform!',
 *   html: '<h1>Welcome to our platform!</h1>'
 * });
 *
 * // Send using a template
 * await emailService.sendWelcomeEmail('user@example.com', {
 *   first_name: 'John',
 *   organization_name: 'Law Firm Inc.'
 * });
 *
 * // Send case update
 * await emailService.sendCaseUpdateEmail('lawyer@firm.com', {
 *   case_number: 'CASE-2024-001',
 *   case_title: 'Smith vs. Johnson',
 *   update_message: 'New evidence has been submitted',
 *   updated_by: 'Jane Doe'
 * });
 */ 
//# sourceMappingURL=email-service.js.map