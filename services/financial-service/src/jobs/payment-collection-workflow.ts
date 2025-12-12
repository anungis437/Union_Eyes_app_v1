/**
 * Payment Collection Workflow
 * 
 * Automated workflow for processing incoming payments:
 * - Match payments to outstanding dues transactions
 * - Update transaction status to 'paid'
 * - Send payment receipts to members
 * - Update arrears records when overdue payments are settled
 * - Escalate failed payments to arrears management
 * 
 * Schedule: Daily at 4:00 AM (after arrears management completes)
 */

import cron from 'node-cron';
import winston from 'winston';
import { db } from '../db';
import { 
  duesTransactions, 
  arrears, 
  members
} from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Process payment collection for a tenant
 * Matches incoming payments to dues transactions and updates statuses
 */
export async function processPaymentCollection(params: {
  tenantId: string;
  processingDate?: Date;
}): Promise<{
  success: boolean;
  paymentsProcessed: number;
  transactionsUpdated: number;
  receiptsIssued: number;
  arrearsUpdated: number;
  errors: Array<{ paymentId: string; error: string }>;
}> {
  const { tenantId, processingDate = new Date() } = params;
  
  logger.info('Starting payment collection workflow', { 
    tenantId, 
    processingDate: processingDate.toISOString() 
  });

  const errors: Array<{ paymentId: string; error: string }> = [];
  let paymentsProcessed = 0;
  let transactionsUpdated = 0;
  let receiptsIssued = 0;
  let arrearsUpdated = 0;

  try {
    // Find all unprocessed payments (status='pending' or 'processing')
    // Note: payments table not yet in schema - workflow placeholder
    // const pendingPayments = await db...
    const pendingPayments: any[] = [];

    logger.info(`Found ${pendingPayments.length} pending payments to process`);

    // Process each payment
    for (const payment of pendingPayments) {
      try {
        // Find matching dues transactions for this member
        // Priority: overdue > pending, oldest first
        const matchingTransactions = await db
          .select()
          .from(duesTransactions)
          .where(
            and(
              eq(duesTransactions.tenantId, tenantId),
              eq(duesTransactions.memberId, payment.memberId),
              inArray(duesTransactions.status, ['pending', 'overdue'])
            )
          )
          .orderBy(duesTransactions.dueDate);

        if (matchingTransactions.length === 0) {
          // No outstanding transactions for this member
          errors.push({
            paymentId: payment.paymentId,
            error: 'No outstanding dues transactions found for member',
          });
          
          // TODO: Mark payment as 'unmatched' for manual review (payments table not yet implemented)
          // await db.update(payments).set({ status: 'unmatched', ... });
          
          continue;
        }

        // Allocate payment amount across transactions (FIFO - oldest first)
        let remainingAmount = parseFloat(payment.amount);
        const updatedTransactionIds: string[] = [];

        for (const transaction of matchingTransactions) {
          if (remainingAmount <= 0) break;

          const transactionAmount = parseFloat(transaction.amount);
          const amountToApply = Math.min(remainingAmount, transactionAmount);

          // Update transaction status
          await db
            .update(duesTransactions)
            .set({
              status: 'paid',
              notes: `Paid ${amountToApply} via ${payment.paymentMethod}`,
            })
            .where(eq(duesTransactions.id, transaction.id));

          updatedTransactionIds.push(transaction.id);
          remainingAmount -= amountToApply;
          transactionsUpdated++;

          // If this transaction was in arrears, update arrears record
          if (transaction.status === 'overdue') {
            const arrearsRecord = await db
              .select()
              .from(arrears)
              .where(
                and(
                  eq(arrears.tenantId, tenantId),
                  eq(arrears.memberId, payment.memberId),
                  eq(arrears.transactionId, transaction.id)
                )
              )
              .limit(1);

            if (arrearsRecord.length > 0) {
              // Mark arrears as resolved
              await db
                .update(arrears)
                .set({
                  status: 'resolved',
                  notes: `Paid via ${payment.paymentMethod} - Ref: ${payment.referenceNumber}`,
                })
                .where(eq(arrears.id, arrearsRecord[0].id));

              arrearsUpdated++;
            }
          }
        }

        // TODO: Update payment status (payments table not yet implemented)
        // const finalPaymentStatus = remainingAmount > 0 ? 'partial' : 'completed';
        // await db.update(payments).set({ status: finalPaymentStatus, ... });

        paymentsProcessed++;

        // Send payment receipt notification
        try {
          await sendPaymentReceipt({
            memberId: payment.memberId,
            memberName: `${payment.memberFirstName} ${payment.memberLastName}`,
            memberEmail: payment.memberEmail,
            memberPhone: payment.memberPhone,
            userId: payment.userId,
            amount: parseFloat(payment.amount),
            paymentMethod: payment.paymentMethod,
            referenceNumber: payment.referenceNumber,
            paymentDate: payment.paymentDate,
            transactionsUpdated: updatedTransactionIds.length,
          });
          receiptsIssued++;
        } catch (receiptError) {
          logger.error('Failed to send payment receipt', {
            paymentId: payment.paymentId,
            memberId: payment.memberId,
            error: receiptError,
          });
          // Don't fail the entire payment process if receipt fails
        }

      } catch (paymentError) {
        logger.error('Error processing payment', {
          paymentId: payment.paymentId,
          error: paymentError,
        });
        errors.push({
          paymentId: payment.paymentId,
          error: paymentError instanceof Error ? paymentError.message : String(paymentError),
        });

        // TODO: Mark payment as 'failed' for retry (payments table not yet implemented)
        // await db.update(payments).set({ status: 'failed', ... });
      }
    }

    const success = errors.length === 0;
    logger.info('Payment collection workflow completed', {
      success,
      paymentsProcessed,
      transactionsUpdated,
      receiptsIssued,
      arrearsUpdated,
      errors: errors.length,
    });

    return {
      success,
      paymentsProcessed,
      transactionsUpdated,
      receiptsIssued,
      arrearsUpdated,
      errors,
    };

  } catch (error) {
    logger.error('Payment collection workflow failed', { error });
    throw error;
  }
}

/**
 * Send payment receipt to member
 */
async function sendPaymentReceipt(params: {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  memberPhone: string | null;
  userId: string | null;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  paymentDate: Date;
  transactionsUpdated: number;
}): Promise<void> {
  const {
    memberName,
    memberEmail,
    memberPhone,
    amount,
    paymentMethod,
    referenceNumber,
    paymentDate,
    transactionsUpdated,
  } = params;

  const receiptMessage = `
Thank you for your payment!

Payment Receipt
---------------
Member: ${memberName}
Amount: $${amount.toFixed(2)}
Payment Method: ${paymentMethod}
Reference: ${referenceNumber || 'N/A'}
Date: ${paymentDate.toLocaleDateString()}
Transactions Applied: ${transactionsUpdated}

Your dues account has been updated. If you have any questions, please contact your union representative.
  `.trim();

  // Send notification via available channels
  // TODO: Integrate with notification service when available
  logger.info('Payment receipt generated', {
    memberName,
    amount,
    method: paymentMethod,
    reference: referenceNumber,
  });

  // For now, log receipt content (will be replaced with actual notification service)
  if (memberEmail) {
    logger.info('Would send email receipt', { 
      to: memberEmail, 
      subject: 'Payment Receipt - Union Dues',
      body: receiptMessage 
    });
  }

  if (memberPhone) {
    logger.info('Would send SMS receipt', { 
      to: memberPhone, 
      message: `Payment received: $${amount.toFixed(2)} via ${paymentMethod}. Receipt sent to email.` 
    });
  }
}

/**
 * Scheduled job: Daily payment collection at 4:00 AM
 */
export const dailyPaymentCollectionJob = cron.schedule(
  '0 4 * * *',
  async () => {
    logger.info('Running daily payment collection job');
    
    try {
      // TODO: In multi-tenant setup, iterate through all tenants
      const tenantId = process.env.DEFAULT_TENANT_ID || 'default-tenant';
      
      const result = await processPaymentCollection({ tenantId });
      
      logger.info('Daily payment collection job completed', {
        paymentsProcessed: result.paymentsProcessed,
        transactionsUpdated: result.transactionsUpdated,
        receiptsIssued: result.receiptsIssued,
        arrearsUpdated: result.arrearsUpdated,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        logger.warn('Payment collection had errors', { 
          errorCount: result.errors.length,
          errors: result.errors.slice(0, 5), // Log first 5 errors
        });
      }

    } catch (error) {
      logger.error('Daily payment collection job failed', { error });
    }
  },
  {
    scheduled: false,
    timezone: 'America/Toronto',
  }
);

/**
 * Start the payment collection workflow
 */
export function startPaymentCollectionWorkflow(): void {
  dailyPaymentCollectionJob.start();
  logger.info('✓ Payment collection workflow started (daily, 4:00 AM)');
}

/**
 * Stop the payment collection workflow
 */
export function stopPaymentCollectionWorkflow(): void {
  dailyPaymentCollectionJob.stop();
  logger.info('Payment collection workflow stopped');
}

/**
 * Get workflow status
 */
export function getPaymentCollectionWorkflowStatus(): {
  running: boolean;
  nextExecution: string | null;
} {
  return {
    running: true, // node-cron doesn't expose status - assume scheduled
    nextExecution: null, // node-cron doesn't expose next run time
  };
}
