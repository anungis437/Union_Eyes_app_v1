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
} from '@/db/schema/sms-communications-schema';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

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
        return NextResponse.json({ error: 'Missing organizationId parameter' }, { status: 400 });
      }

      switch (action) {
        case 'templates':
          return getTemplates(tenantId);
        case 'campaigns':
          return getCampaigns(tenantId);
        case 'campaign-details':
          if (!campaignId) {
            return NextResponse.json({ error: 'Missing campaignId parameter' }, { status: 400 });
          }
          return getCampaignDetails(campaignId);
        default:
          return NextResponse.json(
            { error: 'Invalid action. Valid actions: templates, campaigns, campaign-details' },
            { status: 400 }
          );
      }
    } catch (error: any) {
      console.error('❌ SMS GET error:', error);
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
          return NextResponse.json(
            { error: 'Invalid action. Valid actions: send, bulk, create-template, create-campaign, send-campaign, webhook' },
            { status: 400 }
          );
      }
    } catch (error: any) {
      console.error('❌ SMS POST error:', error);
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
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
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
    return NextResponse.json(
      { error: 'Missing required fields: organizationId, phoneNumber, message' },
      { status: 400 }
    );
  }

  if (!validatePhoneNumber(phoneNumber)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Must be E.164 format (e.g., +14155552671)' },
      { status: 400 }
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
    return NextResponse.json({ error: result.error }, { status: 400 });
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
    return NextResponse.json(
      { error: 'Missing required fields: organizationId, recipients (array), message' },
      { status: 400 }
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
    return NextResponse.json(
      { error: 'Missing required fields: organizationId, name, messageTemplate' },
      { status: 400 }
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

  return NextResponse.json({ template }, { status: 201 });
}

async function createCampaign(userId: string, contextOrganizationId: string, body: any) {
  const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, name, description, message, templateId, recipientFilter, scheduledFor } = body;
  const organizationId = organizationIdFromBody ?? tenantIdFromBody ?? contextOrganizationId;
  const tenantId = organizationId;

  if (!tenantId || !name || !message) {
    return NextResponse.json(
      { error: 'Missing required fields: organizationId, name, message' },
      { status: 400 }
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

  return NextResponse.json({ campaign }, { status: 201 });
}

async function sendCampaignAction(userId: string, body: any) {
  const { campaignId, recipients } = body;

  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
  }

  const [campaign] = await db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
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
    return NextResponse.json(
      { error: 'Missing recipients array in request body' },
      { status: 400 }
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

  return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
}
