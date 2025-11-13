export interface SendEmailRequest {
    to: string;
    subject?: string;
    text?: string;
    html?: string;
    from?: string;
    template_id?: string;
    dynamic_template_data?: Record<string, any>;
}
export interface EmailTemplate {
    WELCOME: string;
    PASSWORD_RESET: string;
    NOTIFICATION: string;
    CASE_UPDATE: string;
    DOCUMENT_READY: string;
    BILLING_REMINDER: string;
}
export declare const EMAIL_TEMPLATES: EmailTemplate;
export declare class EmailService {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Send a simple text/HTML email
     */
    sendEmail(emailData: SendEmailRequest): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send welcome email to new users
     */
    sendWelcomeEmail(userEmail: string, userData: {
        first_name: string;
        organization_name?: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send case update notification
     */
    sendCaseUpdateEmail(userEmail: string, caseData: {
        case_number: string;
        case_title: string;
        update_message: string;
        updated_by: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send document ready notification
     */
    sendDocumentReadyEmail(userEmail: string, documentData: {
        document_name: string;
        case_number?: string;
        document_type: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send billing reminder
     */
    sendBillingReminderEmail(userEmail: string, billingData: {
        invoice_number: string;
        amount_due: number;
        due_date: string;
        organization_name: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    /**
     * Send custom notification email
     */
    sendNotificationEmail(userEmail: string, notificationData: {
        title: string;
        message: string;
        action_url?: string;
        action_text?: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
}
export declare const emailService: EmailService;
export declare function sendEmail(emailData: SendEmailRequest): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}>;
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
//# sourceMappingURL=email-service.d.ts.map