import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members, billingTemplates } from "@/services/financial-service/src/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { addEmailJob } from "@/lib/job-queue";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await req.json();
    const { templateId, memberIds, filters } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    if (!memberIds && !filters) {
      return NextResponse.json(
        { error: "Either memberIds or filters must be provided" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

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
      const whereConditions = [eq(members.tenantId, currentMember.tenantId)];

      if (filters?.status) {
        whereConditions.push(eq(members.status, filters.status));
      }

      recipients = await db.select().from(members).where(and(...whereConditions));
    }

    const validRecipients = recipients.filter((member) => member.email);

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients found (all members missing email addresses)" },
        { status: 400 }
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
return NextResponse.json(
      { error: "Failed to queue batch email" },
      { status: 500 }
    );
  }
}
