import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';
import { ReceiptDocument, ReceiptData } from '@/components/pdf/receipt-template';

/**
 * GET: Generate and download receipt PDF for transaction
 * 
 * Query params:
 * - format: 'json' (default) | 'pdf' | 'pdf-url'
 *   - json: Returns receipt data as JSON
 *   - pdf: Returns PDF file for download
 *   - pdf-url: Generates PDF, uploads to blob storage, returns URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

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
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'completed') {
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

      return NextResponse.json({
        receiptNumber,
        pdfUrl: url,
        generatedAt: new Date().toISOString(),
      });
    }

    // Return PDF file directly (format === 'pdf')
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}
