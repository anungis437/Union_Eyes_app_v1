import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import {
  members,
  billingTemplates,
  duesTransactions,
  tenants,
} from "@/services/financial-service/src/db/schema";
import { eq, and } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument, ReceiptData } from "@/components/pdf/receipt-template";
import { addEmailJob } from "@/lib/job-queue";
import { notificationLog } from "@/db/schema";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const sendInvoiceSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  memberId: z.string().uuid('Invalid member ID'),
  transactionId: z.string().uuid('Invalid transaction ID').optional(),
  data: z.record(z.any()).optional(),
  attachments: z.array(z.string()).optional(),
  includePdf: z.boolean().optional(),
});

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
    
    // Validate request body
    const validation = sendInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { templateId, memberId, transactionId, data, attachments, includePdf } = validation.data;

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
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found'
    );
    }

    const [recipientMember] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.tenantId, currentMember.tenantId)
        )
      )
      .limit(1);

    if (!recipientMember) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Recipient member not found'
    );
    }

    if (!recipientMember.email) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Recipient has no email address'
    );
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, currentMember.tenantId))
      .limit(1);

    let renderData = {
      member_name: recipientMember.name,
      member_id: recipientMember.membershipNumber || recipientMember.id,
      first_name: recipientMember.name?.split(" ")[0] || "",
      last_name: recipientMember.name?.split(" ").slice(1).join(" ") || "",
      email: recipientMember.email,
      phone: recipientMember.phone || "",
      address: "",
      city: "",
      state: "",
      zip: "",
      union_name: tenant?.name || "Union Local",
      union_address: "",
      contact_email: process.env.RESEND_FROM_EMAIL || "billing@unioneyes.com",
      contact_phone: "",
      website: "",
      current_date: new Date().toLocaleDateString(),
      ...data,
    };

    if (transactionId) {
      const [transaction] = await db
        .select()
        .from(duesTransactions)
        .where(eq(duesTransactions.id, transactionId))
        .limit(1);

      if (transaction) {
        renderData = {
          ...renderData,
          amount: parseFloat(transaction.totalAmount || transaction.amount).toFixed(2),
          due_date: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : "",
          period_start: transaction.periodStart ? new Date(transaction.periodStart).toLocaleDateString() : "",
          period_end: transaction.periodEnd ? new Date(transaction.periodEnd).toLocaleDateString() : "",
          balance: transaction.balance || transaction.totalAmount || transaction.amount,
          invoice_number: transaction.id,
        };
      }
    }

    let renderedHtml = template.templateHtml || "";
    let renderedText = template.templateText || "";
    let renderedSubject = template.subject || "Invoice";

    Object.keys(renderData).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      const value = (renderData as Record<string, string>)[key] || "";
      renderedHtml = renderedHtml.replace(regex, value);
      renderedText = renderedText.replace(regex, value);
      renderedSubject = renderedSubject.replace(regex, value);
    });

    let pdfAttachment: { filename: string; content: string; encoding: "base64" } | null = null;
    if (includePdf && transactionId) {
      const [transaction] = await db
        .select()
        .from(duesTransactions)
        .where(eq(duesTransactions.id, transactionId))
        .limit(1);

      if (transaction && transaction.status === "completed") {
        const receiptNumber = `REC-${transaction.id.substring(0, 8).toUpperCase()}`;
        const paymentDate = transaction.paymentDate || transaction.createdAt || new Date();

        const receiptData: ReceiptData = {
          receiptNumber,
          paymentDate: new Date(paymentDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          generatedAt: new Date().toLocaleString("en-US"),
          unionName: renderData.union_name,
          unionAddress: renderData.union_address,
          unionPhone: renderData.contact_phone,
          unionEmail: renderData.contact_email,
          unionLogo: undefined,
          memberName: renderData.member_name,
          memberNumber: renderData.member_id,
          memberEmail: recipientMember.email,
          duesAmount: parseFloat(transaction.amount.toString()).toFixed(2),
          lateFee: transaction.lateFeeAmount && parseFloat(transaction.lateFeeAmount.toString()) > 0
            ? parseFloat(transaction.lateFeeAmount.toString()).toFixed(2)
            : undefined,
          processingFee: transaction.processingFee
            ? parseFloat(transaction.processingFee.toString()).toFixed(2)
            : undefined,
          totalAmount: parseFloat((transaction.totalAmount || transaction.amount).toString()).toFixed(2),
          paymentMethod: transaction.paymentMethod || "Online Payment",
          paymentReference: transaction.paymentReference || transaction.stripePaymentIntentId || transaction.id,
          billingPeriod: transaction.periodStart && transaction.periodEnd
            ? `${new Date(transaction.periodStart).toLocaleDateString()} - ${new Date(transaction.periodEnd).toLocaleDateString()}`
            : undefined,
          dueDate: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : undefined,
          notes: undefined,
        };

        const pdfBuffer = await renderToBuffer(
          React.createElement(ReceiptDocument, { data: receiptData })
        );

        pdfAttachment = {
          filename: `receipt-${receiptNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
          encoding: "base64",
        };
      }
    }

    const allAttachments = [
      ...(attachments || []),
      ...(pdfAttachment ? [pdfAttachment] : []),
    ];

    const job = await addEmailJob({
      to: recipientMember.email,
      subject: renderedSubject,
      template: "raw-html",
      data: {
        html: renderedHtml,
        text: renderedText,
        userName: recipientMember.name,
        attachments: allAttachments,
      },
    });

    if (job?.id) {
      await db.insert(notificationLog).values({
        organizationId: currentMember.tenantId,
        type: "billing",
        priority: "normal",
        channel: "email",
        recipients: recipientMember.email,
        successCount: 1,
        failureCount: 0,
        messageIds: String(job.id),
        sentAt: new Date(),
      });
    }

    return NextResponse.json({
      message: "Invoice queued successfully",
      jobId: job?.id ? String(job.id) : null,
      recipient: recipientMember.email,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to queue invoice',
      error
    );
  }
}
