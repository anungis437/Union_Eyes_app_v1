/**
 * Newsletter Campaign Send Test API
 * 
 * Endpoint:
 * - POST /api/communications/campaigns/[id]/send-test - Send test emails
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterCampaigns } from '@/db/schema';
import { and } from 'drizzle-orm';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
const sendTestSchema = z.object({
  emails: z.array(z.string().email()).min(1, 'At least one email required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRoleAuth('member', async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Organization context required'
    );
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-test:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
      }

    const body = await request.json();
    const { emails } = sendTestSchema.parse(body);

      // Get campaign
      const [campaign] = await db
        .select()
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.id, params.id),
            eq(newsletterCampaigns.organizationId, organizationId)
          )
        );

    if (!campaign) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
    }

    // Send test emails using Resend
    const { sendEmail } = await import('@/lib/email-service');
    
    const emailResults = await Promise.allSettled(
      emails.map(email =>
        sendEmail({
          to: [{ email, name: 'Test Recipient' }],
          subject: `[TEST] ${campaign.subject}`,
          html: campaign.content || '<p>Test email content</p>',
          replyTo: process.env.EMAIL_REPLY_TO,
        })
      )
    );

    const successCount = emailResults.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    ).length;
    const failureCount = emails.length - successCount;
// Audit log
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'SEND_TEST_CAMPAIGN',
      dataType: 'CAMPAIGNS',
      recordId: params.id,
      success: true,
      metadata: { 
        emailCount: emails.length,
        successCount,
        failureCount,
      },
    });

    return NextResponse.json({ 
      success: true,
      sentTo: emails,
      successCount,
      failureCount,
      message: `Test emails sent: ${successCount} success, ${failureCount} failed`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to send test emails',
      error
    );
  }
  })(request);
}
