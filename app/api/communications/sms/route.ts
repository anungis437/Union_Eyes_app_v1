import { z } from 'zod';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * SMS API Routes (Phase 5 - Week 1)
 * RESTful API for SMS management
 * 
 * Routes handled via action parameter:
 * - POST action=send - Send single SMS
 * - POST action=bulk - Send bulk SMS
 * - POST action=create-template - Create template
 * - POST action=create-campaign - Create campaign
 * - POST action=send-campaign - Send campaign
 * - GET action=templates - List templates
 * - GET action=campaigns - List campaigns
 * - GET action=campaign-details - Get campaign details
 * 
 * @see services/twilio-sms-service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import {
  sendSms,
  sendBulkSms,
  handleTwilioWebhook,
  handleInboundSms,
  validatePhoneNumber,
  renderSmsTemplate,
  type SendSmsOptions,
  type SendBulkSmsOptions,
} from '@/services/twilio-sms-service';
import {
  smsTemplates,
  smsCampaigns,
  smsMessages,
  smsCampaignRecipients,
  type NewSmsTemplate,
  type NewSmsCampaign,
} from '@/db/schema/domains/communications';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// ============================================================================
// GET HANDLER - Routes based on action parameter
// ============================================================================

export const GET = async (req: NextRequest) => {
  return withRoleAuth('member', async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      const { searchParams } = new URL(req.url);
      const action = searchParams.get('action');
      const organizationId = (searchParams.get('organizationId') ?? searchParams.get('tenantId') ?? contextOrganizationId);
      const tenantId = organizationId;
      const campaignId = searchParams.get('campaignId');

      if (!tenantId) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing organizationId parameter'
    );
      }

      switch (action) {
        case 'templates':
          return getTemplates(tenantId);
        case 'campaigns':
          return getCampaigns(tenantId);
        case 'campaign-details':
          if (!campaignId) {
            return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing campaignId parameter'
    );
          }
          return getCampaignDetails(campaignId);
        default:
          return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action. Valid actions: templates, campaigns, campaign-details'
      // TODO: Migrate additional details: campaigns, campaign-details'
    );
      }
    } catch (error: any) {
return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

// ============================================================================
// POST HANDLER - Routes based on action in body
// ============================================================================


const communicationsSmsSchema = z.object({
  action: z.unknown().optional(),
  organizationId: z.string().uuid('Invalid organizationId'),
  tenantId: z.string().uuid('Invalid tenantId'),
  phoneNumber: z.string().min(10, 'Invalid phone number'),
  message: z.unknown().optional(),
  templateId: z.string().uuid('Invalid templateId'),
  variables: z.unknown().optional(),
  recipients: z.unknown().optional(),
  campaignId: z.string().uuid('Invalid campaignId'),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  messageTemplate: z.unknown().optional(),
  category: z.unknown().optional(),
  recipientFilter: z.unknown().optional(),
  scheduledFor: z.unknown().optional(),
  MessageSid: z.string().uuid('Invalid MessageSid'),
  MessageStatus: z.unknown().optional(),
  From: z.unknown().optional(),
  Body: z.unknown().optional(),
});


export const POST = async (req: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'send':
          return sendSingleSms(userId, body);
        case 'bulk':
          return sendBulkSmsAction(userId, body);
        case 'create-template':
          return createTemplate(userId, organizationId, body);
        case 'create-campaign':
          return createCampaign(userId, organizationId, body);
        case 'send-campaign':
          return sendCampaignAction(userId, body);
        case 'webhook':
          return handleWebhook(body);
        default:
          return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action. Valid actions: send, bulk, create-template, create-campaign, send-campaign, webhook'
      // TODO: Migrate additional details: bulk, create-template, create-campaign, send-campaign, webhook'
    );
      }
    } catch (error: any) {
return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

// ============================================================================
// INTERNAL HANDLERS
// ============================================================================

async function getTemplates(tenantId: string) {
  const templates = await db
    .select()
    .from(smsTemplates)
    .where(and(eq(smsTemplates.organizationId, tenantId), eq(smsTemplates.isActive, true)))
    .orderBy(desc(smsTemplates.createdAt));

  return NextResponse.json({ templates });
}

async function getCampaigns(tenantId: string) {
  const campaigns = await db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.organizationId, tenantId))
    .orderBy(desc(smsCampaigns.createdAt));

  return NextResponse.json({ campaigns });
}

async function getCampaignDetails(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
  }

  const messages = await db
    .select()
    .from(smsMessages)
    .where(eq(smsMessages.campaignId, campaignId))
    .orderBy(desc(smsMessages.createdAt));

  return NextResponse.json({
    campaign,
    messages,
    statistics: {
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      failed: campaign.failedCount,
      totalCost: campaign.totalCost,
    },
  });
}

async function sendSingleSms(userId: string, body: any) {
  const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, phoneNumber, message, templateId, variables } = body;
  const organizationId = organizationIdFromBody ?? tenantIdFromBody;
  const tenantId = organizationId;

  if (!tenantId || !phoneNumber || !message) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, phoneNumber, message'
      // TODO: Migrate additional details: phoneNumber, message'
    );
  }

  if (!validatePhoneNumber(phoneNumber)) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid phone number. Must be E.164 format (e.g., +14155552671)'
      // TODO: Migrate additional details: +14155552671)'
    );
  }

  let finalMessage = message;
  if (templateId && variables) {
    finalMessage = renderSmsTemplate(message, variables);
  }

  const options: SendSmsOptions = {
    organizationId,
    userId,
    phoneNumber,
    message: finalMessage,
    templateId,
  };

  const result = await sendSms(options);

  if (!result.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      result.error
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    twilioSid: result.twilioSid,
    segments: result.segments,
    cost: result.cost,
  });
}

async function sendBulkSmsAction(userId: string, body: any) {
  const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, recipients, message, templateId, campaignId } = body;
  const organizationId = organizationIdFromBody ?? tenantIdFromBody;
  const tenantId = organizationId;

  if (!tenantId || !recipients || !Array.isArray(recipients) || !message) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, recipients (array), message'
      // TODO: Migrate additional details: recipients (array), message'
    );
  }

  const options: SendBulkSmsOptions = {
    organizationId,
    userId,
    recipients,
    message,
    templateId,
    campaignId,
  };

  const result = await sendBulkSms(options);

  return NextResponse.json({
    success: true,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors,
  });
}

async function createTemplate(userId: string, contextOrganizationId: string, body: any) {
  const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, name, description, messageTemplate, variables, category } = body;
  const organizationId = organizationIdFromBody ?? tenantIdFromBody ?? contextOrganizationId;
  const tenantId = organizationId;

  if (!tenantId || !name || !messageTemplate) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, name, messageTemplate'
      // TODO: Migrate additional details: name, messageTemplate'
    );
  }

  if (messageTemplate.length > 1600) {
    return NextResponse.json(
      { error: 'Message template too long. Maximum 1600 characters.' },
      { status: 400 }
    );
  }

  const newTemplate: NewSmsTemplate = {
    organizationId: tenantId,
    name,
    description,
    messageTemplate,
    variables: variables || [],
    category: category || 'custom',
    isActive: true,
    createdBy: userId,
  };

  const [template] = await withRLSContext({ organizationId: tenantId }, async (db) => {
    return await db.insert(smsTemplates).values(newTemplate).returning();
  });

  return standardSuccessResponse(
      {  template  },
      undefined,
      201
    );
}

async function createCampaign(userId: string, contextOrganizationId: string, body: any) {
  const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, name, description, message, templateId, recipientFilter, scheduledFor } = body;
  const organizationId = organizationIdFromBody ?? tenantIdFromBody ?? contextOrganizationId;
  const tenantId = organizationId;

  if (!tenantId || !name || !message) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, name, message'
      // TODO: Migrate additional details: name, message'
    );
  }

  const newCampaign: NewSmsCampaign = {
    organizationId: tenantId,
    name,
    description,
    message,
    templateId,
    recipientFilter,
    status: scheduledFor ? 'scheduled' : 'draft',
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    createdBy: userId,
  };

  const [campaign] = await withRLSContext({ organizationId: tenantId }, async (db) => {
    return await db.insert(smsCampaigns).values(newCampaign).returning();
  });

  return standardSuccessResponse(
      {  campaign  },
      undefined,
      201
    );
}

async function sendCampaignAction(userId: string, body: any) {
  const { campaignId, recipients } = body;

  if (!campaignId) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing campaignId'
    );
  }

  const [campaign] = await db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Campaign cannot be sent. Current status: ${campaign.status}` },
      { status: 400 }
    );
  }

  await db
    .update(smsCampaigns)
    .set({
      status: 'sending',
      startedAt: new Date(),
    })
    .where(eq(smsCampaigns.id, campaignId));

  if (!recipients || !Array.isArray(recipients)) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing recipients array in request body'
    );
  }

  try {
    const result = await sendBulkSms({
      organizationId: campaign.organizationId,
      userId,
      recipients,
      message: campaign.message,
      templateId: campaign.templateId || undefined,
      campaignId: campaign.id,
    });

    await db
      .update(smsCampaigns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        recipientCount: recipients.length,
      })
      .where(eq(smsCampaigns.id, campaignId));

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error: any) {
    await db
      .update(smsCampaigns)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(smsCampaigns.id, campaignId));

    throw error;
  }
}

async function handleWebhook(body: any) {
  if (body.MessageSid && body.MessageStatus) {
    await handleTwilioWebhook(body);
    return NextResponse.json({ success: true });
  } else if (body.From && body.Body) {
    await handleInboundSms(body);
    return NextResponse.json({ success: true });
  }

  return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid webhook data'
    );
}

