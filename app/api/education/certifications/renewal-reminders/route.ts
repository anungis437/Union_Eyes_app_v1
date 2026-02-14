/**
 * Certificate Renewal Reminders API
 * 
 * Endpoint:
 * - POST /api/education/certifications/renewal-reminders - Send renewal reminder emails
 * 
 * Version: 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { certifications, organizationMembers } from '@/db/schema';
import { inArray, and } from 'drizzle-orm';
import { withRoleAuth } from '@/lib/api-auth-guard';
import { sendEmail } from '@/lib/email-service';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
const renewalSchema = z.object({
  certificationIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  return withRoleAuth('steward', async (request, context) => {
    try {
      const { organizationId } = context;

      if (!organizationId) {
        return standardErrorResponse(ErrorCode.FORBIDDEN, 'Organization context required');
      }

      const body = await request.json();
      const { certificationIds } = renewalSchema.parse(body);

      // Fetch certifications that are expiring soon
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCerts = await db
        .select({
          id: certifications.id,
          memberId: certifications.memberId,
          courseName: certifications.courseName,
          certificateNumber: certifications.certificateNumber,
          issueDate: certifications.issueDate,
          expiryDate: certifications.expiryDate,
          memberEmail: organizationMembers.email,
          memberName: organizationMembers.fullName,
        })
        .from(certifications)
        .innerJoin(organizationMembers, eq(certifications.memberId, organizationMembers.id))
        .where(
          and(
            inArray(certifications.id, certificationIds),
            eq(certifications.organizationId, organizationId),
            lte(certifications.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0])
          )
        );

      if (expiringCerts.length === 0) {
        return standardSuccessResponse(
      {  message: 'No expiring certifications found', sent: 0  },
      undefined,
      200
    );
      }

      // Send renewal reminder emails
      let sentCount = 0;
      const errors: string[] = [];

      await Promise.allSettled(
        expiringCerts.map(async (cert) => {
          if (!cert.memberEmail) {
            errors.push(`No email for member ${cert.memberId}`);
            return;
          }

          const daysUntilExpiry = Math.ceil(
            (new Date(cert.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Certificate Renewal Reminder</h2>
              
              <p>Dear ${cert.memberName || 'Member'},</p>
              
              <p>This is a reminder that your certification is expiring soon:</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Course:</strong> ${cert.courseName}</p>
                <p style="margin: 5px 0;"><strong>Certificate Number:</strong> ${cert.certificateNumber}</p>
                <p style="margin: 5px 0;"><strong>Issue Date:</strong> ${new Date(cert.issueDate).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${new Date(cert.expiryDate).toLocaleDateString()}</p>
                <p style="margin: 5px 0; color: #dc2626;"><strong>Days Until Expiry:</strong> ${daysUntilExpiry}</p>
              </div>
              
              <p>Please renew your certification before it expires to maintain your credentials.</p>
              
              <p>If you have any questions, please contact your union representative.</p>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          `;

          const result = await sendEmail({
            to: [{ email: cert.memberEmail, name: cert.memberName || cert.memberEmail }],
            subject: `Certificate Renewal Reminder - ${cert.courseName}`,
            html: emailContent,
          });

          if (result.success) {
            sentCount++;
          } else {
            errors.push(`Failed to send to ${cert.memberEmail}: ${result.error}`);
          }
        })
      );

      return NextResponse.json({
        success: true,
        sent: sentCount,
        total: expiringCerts.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent ${sentCount} renewal reminder emails`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        );
      }
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to send renewal reminders',
      error
    );
    }
  })(request, {});
}
