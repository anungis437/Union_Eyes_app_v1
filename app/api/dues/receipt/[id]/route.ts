import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';
import { ReceiptDocument, ReceiptData } from '@/components/pdf/receipt-template';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * GET: Generate and download receipt PDF for transaction
 * 
 * Query params:
 * - format: 'json' (default) | 'pdf' | 'pdf-url'
 *   - json: Returns receipt data as JSON
 *   - pdf: Returns PDF file for download
 *   - pdf-url: Generates PDF, uploads to blob storage, returns URL
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  const transactionId = params.id;

      // Find member
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id))
        .limit(1);

      if (!member) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/dues/receipt/[id]',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Member not found' },
        });
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      try {

      try {
        // Get transaction
        const [transaction] = await db
          .select()
          .from(duesTransactions)
          .where(
            and(
              eq(duesTransactions.id, transactionId),
              eq(duesTransactions.memberId, member.id)
            )
          )
          .limit(1);

        if (!transaction) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/dues/receipt/[id]',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'Transaction not found', transactionId },
          });
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          );
        }

        if (transaction.status !== 'completed') {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/dues/receipt/[id]',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Receipt only for completed payments', transactionId, status: transaction.status },
          });
          return NextResponse.json(
            { error: 'Receipt only available for completed payments' },
            { status: 400 }
          );
        }

        // Get format from query params
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'json'; // json, pdf, pdf-url

        // Generate receipt data
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
          unionName: 'Your Union Name',
          unionAddress: '123 Union Street, Suite 100, City, ST 12345',
          unionPhone: '(555) 123-4567',
          unionEmail: 'info@union.org',
          unionLogo: undefined, // TODO: Add union logo URL from tenant settings
          
          // Member info
          memberName: member.name,
          memberNumber: member.membershipNumber || member.id,
          memberEmail: member.email,
          
          // Payment details
          duesAmount: parseFloat(transaction.amount.toString()).toFixed(2),
          lateFee: transaction.lateFeeAmount && parseFloat(transaction.lateFeeAmount.toString()) > 0 
            ? parseFloat(transaction.lateFeeAmount.toString()).toFixed(2)
            : undefined,
          processingFee: transaction.processingFee 
            ? parseFloat(transaction.processingFee.toString()).toFixed(2)
            : undefined,
          totalAmount: parseFloat(transaction.totalAmount?.toString() || transaction.amount.toString()).toFixed(2),
          
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
          
          // Notes
          notes: undefined,
        };

        // Handle different format options
        if (format === 'json') {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/dues/receipt/[id]',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: {
              dataType: 'FINANCIAL',
              transactionId,
              format: 'json',
              receiptNumber,
            },
          });
          // Return JSON data for client-side use
          return NextResponse.json({
            ...receiptData,
            transaction: {
              id: transaction.id,
              periodStart: transaction.periodStart,
              periodEnd: transaction.periodEnd,
              amount: parseFloat(transaction.amount.toString()),
              lateFee: parseFloat(transaction.lateFeeAmount?.toString() || '0'),
              total: parseFloat(transaction.totalAmount?.toString() || transaction.amount.toString()),
              paymentMethod: transaction.paymentMethod,
              paymentReference: transaction.paymentReference,
              stripePaymentIntentId: transaction.stripePaymentIntentId,
            },
          });
        }

        // Generate PDF
        const pdfBuffer = await renderToBuffer(
          React.createElement(ReceiptDocument, { data: receiptData }) as any
        );

        if (format === 'pdf-url') {
          // Upload to blob storage and return URL
          const filename = `receipts/${member.tenantId}/${receiptNumber}.pdf`;
          const { url } = await put(filename, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
          });

          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/dues/receipt/[id]',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: {
              dataType: 'FINANCIAL',
              transactionId,
              format: 'pdf-url',
              receiptNumber,
              pdfUrl: url,
            },
          });

          return NextResponse.json({
            receiptNumber,
            pdfUrl: url,
            generatedAt: new Date().toISOString(),
          });
        }

        // Return PDF file directly (format === 'pdf')
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/dues/receipt/[id]',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: {
            dataType: 'FINANCIAL',
            transactionId,
            format: 'pdf',
            receiptNumber,
          },
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
          },
        });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/dues/receipt/[id]',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error', transactionId },
        });
        console.error('Error generating receipt:', error);
        return NextResponse.json(
          { error: 'Failed to generate receipt' },
          { status: 500 }
        );
      }
  })(req, { params });
};
