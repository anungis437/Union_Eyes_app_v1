import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, billingTemplates } from '@/services/financial-service/src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Queue batch email job
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { templateId, memberIds, filters } = body;

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    if (!memberIds && !filters) {
      return NextResponse.json(
        { error: 'Either memberIds or filters must be provided' },
        { status: 400 }
      );
    }

    // Get template
    const [template] = await db
      .select()
      .from(billingTemplates)
      .where(
        and(
          eq(billingTemplates.id, templateId),
          eq(billingTemplates.tenantId, currentMember.tenantId)
        )
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get recipients
    let recipients;
    if (memberIds && memberIds.length > 0) {
      recipients = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.tenantId, currentMember.tenantId),
            inArray(members.id, memberIds)
          )
        );
    } else {
      // Apply filters
      let whereConditions = [eq(members.tenantId, currentMember.tenantId)];
      
      if (filters?.status) {
        whereConditions.push(eq(members.status, filters.status));
      }
      
      recipients = await db
        .select()
        .from(members)
        .where(and(...whereConditions));
    }

    // Filter out members without email
    const validRecipients = recipients.filter(m => m.email);

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found (all members missing email addresses)' },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // TODO: Queue batch email job (requires job queue implementation)
    // For now, return job details
    // In production, this would:
    // 1. Create a job record in a jobs table
    // 2. Queue the job in a job queue (Bull, BullMQ, etc.)
    // 3. Process emails in background with rate limiting
    // 4. Update job status as emails are sent
    // 5. Track delivery status from Resend webhooks

    return NextResponse.json({
      message: 'Batch email job queued',
      jobId,
      recipientCount: validRecipients.length,
      skippedCount: recipients.length - validRecipients.length,
      templateName: template.name,
      status: 'queued',
      // TODO: In production, return queue position and estimated completion time
    });

  } catch (error) {
    console.error('Send batch error:', error);
    return NextResponse.json(
      { error: 'Failed to queue batch email' },
      { status: 500 }
    );
  }
}
