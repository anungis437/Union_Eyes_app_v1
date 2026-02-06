import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, billingTemplates, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReceiptDocument, ReceiptData } from '@/components/pdf/receipt-template';

// Lazy initialize Resend client
let resend: Resend | null = null;
function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return resend;
}

// Send invoice email to a member
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
    const { templateId, memberId, transactionId, data, attachments, includePdf } = body;

    // Validate required fields
    if (!templateId || !memberId) {
      return NextResponse.json(
        { error: 'templateId and memberId are required' },
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

    // Get recipient member
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
      return NextResponse.json({ error: 'Recipient member not found' }, { status: 404 });
    }

    if (!recipientMember.email) {
      return NextResponse.json({ error: 'Recipient has no email address' }, { status: 400 });
    }

    // Prepare data for rendering
    let renderData = {
      // Member variables - financial-service schema uses 'name' not firstName/lastName
      member_name: recipientMember.name,
      member_id: recipientMember.membershipNumber || recipientMember.id,
      first_name: recipientMember.name?.split(' ')[0] || '',
      last_name: recipientMember.name?.split(' ').slice(1).join(' ') || '',
      email: recipientMember.email,
      phone: recipientMember.phone || '',
      address: '', // Not in financial-service schema
      city: '', // Not in financial-service schema
      state: '', // Not in financial-service schema
      zip: '', // Not in financial-service schema
      
      // Union variables - TODO: Get from tenant settings
      union_name: 'Union Local',
      union_address: '',
      contact_email: process.env.RESEND_FROM_EMAIL || 'billing@unioneyes.com',
      contact_phone: '',
      website: '',
      
      // Dynamic variables
      current_date: new Date().toLocaleDateString(),
      
      ...data, // Override with provided data
    };

    // If transactionId provided, get transaction details
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
          due_date: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : '',
          period_start: transaction.periodStart ? new Date(transaction.periodStart).toLocaleDateString() : '',
          period_end: transaction.periodEnd ? new Date(transaction.periodEnd).toLocaleDateString() : '',
          balance: transaction.balance || transaction.totalAmount || transaction.amount,
          invoice_number: transaction.id,
        };
      }
    }

    // Render template
    let renderedHtml = template.templateHtml;
    let renderedText = template.templateText;
    let renderedSubject = template.subject || 'Invoice';

    // Replace all {variable} with actual values
    Object.keys(renderData).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      const value = renderData[key] || '';
      renderedHtml = renderedHtml.replace(regex, value);
      renderedText = renderedText.replace(regex, value);
      renderedSubject = renderedSubject.replace(regex, value);
    });

    // Generate PDF receipt if requested and transaction exists
    let pdfAttachment = null;
    if (includePdf && transactionId) {
      const [transaction] = await db
        .select()
        .from(duesTransactions)
        .where(eq(duesTransactions.id, transactionId))
        .limit(1);

      if (transaction && transaction.status === 'completed') {
        const receiptNumber = `REC-${transaction.id.substring(0, 8).toUpperCase()}`;
        const paymentDate = transaction.paymentDate || transaction.createdAt || new Date();
        
        const receiptData: ReceiptData = {
          receiptNumber,
          paymentDate: new Date(paymentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          generatedAt: new Date().toLocaleString('en-US'),
          
          // Union info (TODO: Get from tenant settings)
          unionName: renderData.union_name,
          unionAddress: renderData.union_address,
          unionPhone: renderData.contact_phone,
          unionEmail: renderData.contact_email,
          unionLogo: undefined,
          
          // Member info
          memberName: renderData.member_name,
          memberNumber: renderData.member_id,
          memberEmail: recipientMember.email,
          
          // Payment details
          duesAmount: parseFloat(transaction.amount.toString()).toFixed(2),
          lateFee: transaction.lateFeeAmount && parseFloat(transaction.lateFeeAmount.toString()) > 0 
            ? parseFloat(transaction.lateFeeAmount.toString()).toFixed(2)
            : undefined,
          processingFee: transaction.processingFee 
            ? parseFloat(transaction.processingFee.toString()).toFixed(2)
            : undefined,
          totalAmount: parseFloat((transaction.totalAmount || transaction.amount).toString()).toFixed(2),
          
          // Payment method
          paymentMethod: transaction.paymentMethod || 'Online Payment',
          paymentReference: transaction.paymentReference || transaction.stripePaymentIntentId || transaction.id,
          
          // Period info
          billingPeriod: transaction.periodStart && transaction.periodEnd
            ? `${new Date(transaction.periodStart).toLocaleDateString()} - ${new Date(transaction.periodEnd).toLocaleDateString()}`
            : undefined,
          dueDate: transaction.dueDate 
            ? new Date(transaction.dueDate).toLocaleDateString()
            : undefined,
          
          notes: undefined,
        };

        const pdfBuffer = await renderToBuffer(
          React.createElement(ReceiptDocument, { data: receiptData }) as any
        );

        pdfAttachment = {
          filename: `receipt-${receiptNumber}.pdf`,
          content: pdfBuffer,
        };
      }
    }

    // Send email via Resend
    const emailData: any = {
      from: process.env.RESEND_FROM_EMAIL || 'billing@unioneyes.com',
      to: recipientMember.email,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
    };

    // Add attachments
    const allAttachments = [
      ...(attachments || []),
      ...(pdfAttachment ? [pdfAttachment] : []),
    ];
    
    if (allAttachments.length > 0) {
      emailData.attachments = allAttachments;
    }

    const emailResult = await getResendClient().emails.send(emailData);

    // TODO: Log email in notification_log table
    // await db.insert(notificationLog).values({
    //   tenantId: currentMember.tenantId,
    //   memberId,
    //   type: 'email',
    //   category: template.category,
    //   status: 'sent',
    //   sentAt: new Date(),
    //   emailId: emailResult.data?.id,
    // });

    return NextResponse.json({
      message: 'Invoice sent successfully',
      emailId: emailResult.data?.id,
      recipient: recipientMember.email,
    });

  } catch (error) {
    console.error('Send invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
