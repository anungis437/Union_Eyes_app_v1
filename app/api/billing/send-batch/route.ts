import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members, billingTemplates } from "@/services/financial-service/src/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { addEmailJob } from "@/lib/job-queue";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const renderTemplate = (template: string, data: Record<string, string>) => {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value ?? "");
  });
  return result;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
    }

    const body = await req.json();
    
    // Validate input
    const sendBatchSchema = z.object({
      templateId: z.string().uuid("Invalid template ID"),
      memberIds: z.array(z.string().uuid("Invalid member ID")).min(1, "At least one member ID required").optional(),
      filters: z.object({
        status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
        department: z.string().max(100).optional(),
        role: z.string().max(50).optional()
      }).optional()
    }).refine(
      (data) => data.memberIds || data.filters,
      { message: "Either memberIds or filters must be provided" }
    );

    const validation = sendBatchSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || "Validation failed"
      );
    }

    const { templateId, memberIds, filters } = validation.data;

    const [template] = await db
      .select()
      .from(billingTemplates)
      .where(
        and(
          eq(billingTemplates.id, templateId),
          eq(billingTemplates.organizationId, currentMember.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found'
    );
    }

    let recipients;
    if (memberIds && memberIds.length > 0) {
      recipients = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.organizationId, currentMember.organizationId),
            inArray(members.id, memberIds)
          )
        );
    } else {
      const whereConditions = [eq(members.organizationId, currentMember.organizationId)];

      if (filters?.status) {
        whereConditions.push(eq(members.status, filters.status));
      }

      recipients = await db.select().from(members).where(and(...whereConditions));
    }

    const validRecipients = recipients.filter((member) => member.email);

    if (validRecipients.length === 0) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'No valid recipients found (all members missing email addresses)'
    );
    }

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const jobIds: string[] = [];

    for (const recipient of validRecipients) {
      const renderData: Record<string, string> = {
        member_name: recipient.name,
        member_id: recipient.membershipNumber || recipient.id,
        first_name: recipient.name?.split(" ")[0] || "",
        last_name: recipient.name?.split(" ").slice(1).join(" ") || "",
        email: recipient.email,
      };

      const renderedHtml = renderTemplate(template.templateHtml || "", renderData);
      const renderedText = renderTemplate(template.templateText || "", renderData);
      const renderedSubject = renderTemplate(template.subject || "Union Update", renderData);

      const job = await addEmailJob({
        to: recipient.email,
        subject: renderedSubject,
        template: "raw-html",
        data: {
          html: renderedHtml,
          text: renderedText,
          userName: recipient.name,
        },
      });

      if (job?.id) {
        jobIds.push(String(job.id));
      }
    }

    return NextResponse.json({
      message: "Batch email job queued",
      batchId,
      jobIds,
      recipientCount: validRecipients.length,
      skippedCount: recipients.length - validRecipients.length,
      templateName: template.name,
      status: "queued",
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to queue batch email',
      error
    );
  }
}
