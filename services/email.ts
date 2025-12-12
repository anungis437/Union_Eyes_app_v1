/**
 * Email Service
 * Simple email wrapper service
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string }> {
  // This is a stub - implement with your email provider
  console.log('Sending email:', options);
  return { success: true, id: 'stub-email-id' };
}
