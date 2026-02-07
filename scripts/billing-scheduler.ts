/**
 * Automated Billing Scheduler
 * 
 * This script should be run as a scheduled job (e.g., via cron or GitHub Actions)
 * to automatically generate dues transactions and process AutoPay payments.
 * 
 * Recommended schedule:
 * - Run daily at 2:00 AM to check for new billing periods
 * - Run daily at 3:00 AM to process AutoPay payments
 * - Run daily at 4:00 AM to calculate late fees
 */

import { db } from '@/db';
import { 
  duesRules, 
  memberDuesAssignments, 
  duesTransactions,
  members,
  autopaySettings,
  paymentMethods,
} from '@/services/financial-service/src/db/schema';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';
import { eq, and, sql, gt, lte } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface BillingPeriod {
  start: Date;
  end: Date;
  frequency: string;
}

/**
 * Calculate billing period based on frequency
 */
function calculateBillingPeriod(frequency: string, referenceDate: Date = new Date()): BillingPeriod {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  let start: Date;
  let end: Date;

  switch (frequency) {
    case 'weekly':
      // Start from last Monday
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + 1);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;

    case 'biweekly':
      // Start from first day of current biweekly period (assume Jan 1 is period start)
      const daysSinceYearStart = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
      const biweeklyPeriod = Math.floor(daysSinceYearStart / 14);
      start = new Date(today.getFullYear(), 0, 1 + (biweeklyPeriod * 14));
      end = new Date(start);
      end.setDate(start.getDate() + 13);
      break;

    case 'monthly':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;

    case 'quarterly':
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
      end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
      break;

    case 'annually':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;

    default:
      throw new Error(`Unknown billing frequency: ${frequency}`);
  }

  return { start, end, frequency };
}

/**
 * Generate billing cycle for all tenants and frequencies
 */
async function generateBillingCycles() {
  console.log('Starting billing cycle generation...');

  try {
    // Get all unique billing frequencies from active rules
    const activeRules = await db
      .select({
        frequency: duesRules.billingFrequency,
        tenantId: duesRules.tenantId,
      })
      .from(duesRules)
      .where(eq(duesRules.isActive, true))
      .groupBy(duesRules.billingFrequency, duesRules.tenantId);

    for (const rule of activeRules) {
      const period = calculateBillingPeriod(rule.frequency);
      
      console.log(`Generating ${rule.frequency} billing cycle for tenant ${rule.tenantId}: ${period.start.toISOString()} to ${period.end.toISOString()}`);

      const result = await DuesCalculationEngine.generateBillingCycle(
        rule.tenantId,
        period.start,
        period.end
      );

      console.log(`Created ${result.transactionsCreated} transactions`);
    }

    console.log('Billing cycle generation completed');
  } catch (error) {
    console.error('Error generating billing cycles:', error);
    throw error;
  }
}

/**
 * Process AutoPay payments for members with enabled AutoPay
 */
async function processAutoPayPayments() {
  console.log('Starting AutoPay payment processing...');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all active AutoPay settings with pending transactions
    const activeAutoPay = await db
      .select({
        autopayId: autopaySettings.id,
        memberId: autopaySettings.memberId,
        stripePaymentMethodId: autopaySettings.stripePaymentMethodId,
        transactionId: duesTransactions.id,
        transactionAmount: duesTransactions.totalAmount,
        organizationId: duesTransactions.organizationId,
        memberEmail: members.email,
        memberName: members.name,
      })
      .from(autopaySettings)
      .innerJoin(
        duesTransactions,
        and(
          eq(duesTransactions.memberId, autopaySettings.memberId),
          eq(duesTransactions.status, 'pending' as any),
          lte(duesTransactions.dueDate, new Date(today))
        )
      )
      .innerJoin(members, eq(members.id, autopaySettings.memberId))
      .where(eq(autopaySettings.enabled, true));

    console.log(`Found ${activeAutoPay.length} members with pending AutoPay charges`);

    let successCount = 0;
    let failureCount = 0;

    // Process each AutoPay transaction
    for (const autopay of activeAutoPay) {
      try {
        console.log(`Processing AutoPay for member ${autopay.memberId}...`);

        // Create PaymentIntent with saved payment method
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round((autopay.transactionAmount?.toNumber?.() || 0) * 100), // Convert to cents
          currency: 'usd',
          payment_method: autopay.stripePaymentMethodId,
          confirm: true,
          customer: autopay.memberId, // Use member ID as Stripe customer ID (should be linked)
          metadata: {
            memberId: autopay.memberId,
            transactionId: autopay.transactionId,
            organizationId: autopay.organizationId,
            sourceType: 'autopay',
          },
        });

        // Update transaction status based on payment result
        if (paymentIntent.status === 'succeeded') {
          await db
            .update(duesTransactions)
            .set({
              status: 'completed' as any,
              paymentDate: new Date() as any,
              paymentMethod: 'card' as any,
              paymentReference: paymentIntent.id as any,
              updatedAt: new Date() as any,
            })
            .where(eq(duesTransactions.id, autopay.transactionId));

          // Reset AutoPay failure count on success
          await db
            .update(autopaySettings)
            .set({
              lastChargeDate: today as any,
              lastChargeAmount: autopay.transactionAmount as any,
              lastChargeStatus: 'completed' as any,
              failureCount: '0' as any,
              updatedAt: new Date() as any,
            })
            .where(eq(autopaySettings.id, autopay.autopayId));

          console.log(`✅ AutoPay succeeded for member ${autopay.memberId}: ${paymentIntent.id}`);
          successCount++;
        } else {
          throw new Error(`Payment incomplete: ${paymentIntent.status}`);
        }
      } catch (error) {
        failureCount++;
        console.error(`❌ AutoPay failed for member ${autopay.memberId}:`, error);

        // Update failure count
        const currentSettings = activeAutoPay.find(a => a.autopayId === autopay.autopayId);
        if (currentSettings) {
          const failureCount_ = parseInt(currentSettings.autopayId || '0', 10) + 1;

          await db
            .update(autopaySettings)
            .set({
              lastChargeDate: today as any,
              lastChargeStatus: 'failed' as any,
              lastFailureDate: today as any,
              failureCount: failureCount_.toString() as any,
              lastErrorMessage: error instanceof Error ? error.message : 'Unknown error' as any,
              updatedAt: new Date() as any,
            })
            .where(eq(autopaySettings.id, autopay.autopayId));

          // Disable AutoPay after 3 consecutive failures
          if (failureCount_ >= 3) {
            await db
              .update(autopaySettings)
              .set({
                enabled: false as any,
              })
              .where(eq(autopaySettings.id, autopay.autopayId));

            console.log(`🚫 AutoPay disabled for member ${autopay.memberId} after 3 failures`);
          }
        }

        // Update transaction status to failed
        await db
          .update(duesTransactions)
          .set({
            status: 'failed' as any,
            updatedAt: new Date() as any,
          })
          .where(eq(duesTransactions.id, autopay.transactionId));
      }
    }

    console.log(`AutoPay processing completed: ${successCount} succeeded, ${failureCount} failed`);
  } catch (error) {
    console.error('Error processing AutoPay payments:', error);
    throw error;
  }
}

/**
 * Calculate and apply late fees to overdue transactions
 */
async function processLateFees() {
  console.log('Starting late fee calculation...');

  try {
    // Get all tenants
    const tenants = await db
      .select({ tenantId: duesRules.tenantId })
      .from(duesRules)
      .groupBy(duesRules.tenantId);

    for (const { tenantId } of tenants) {
      console.log(`Processing late fees for tenant ${tenantId}`);
      
      const result = await DuesCalculationEngine.calculateLateFees(tenantId, 0.02);
      
      console.log(`Applied late fees to ${result.transactionsUpdated} transactions`);
    }

    console.log('Late fee calculation completed');
  } catch (error) {
    console.error('Error calculating late fees:', error);
    throw error;
  }
}

/**
 * Send payment reminders to members with upcoming due dates
 */
async function sendPaymentReminders() {
  console.log('Starting payment reminder process...');

  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Get transactions due in 7 days (first reminder)
    const sevenDayReminders = await db
      .select({
        transaction: duesTransactions,
        member: members,
      })
      .from(duesTransactions)
      .leftJoin(members, eq(duesTransactions.memberId, members.id))
      .where(
        and(
          eq(duesTransactions.status, 'pending'),
          sql`${duesTransactions.dueDate} = ${sevenDaysFromNow.toISOString().split('T')[0]}`
        )
      );

    // Get transactions due in 3 days (second reminder)
    const threeDayReminders = await db
      .select({
        transaction: duesTransactions,
        member: members,
      })
      .from(duesTransactions)
      .leftJoin(members, eq(duesTransactions.memberId, members.id))
      .where(
        and(
          eq(duesTransactions.status, 'pending'),
          sql`${duesTransactions.dueDate} = ${threeDaysFromNow.toISOString().split('T')[0]}`
        )
      );

    console.log(`Sending ${sevenDayReminders.length} 7-day reminders`);
    console.log(`Sending ${threeDayReminders.length} 3-day reminders`);

    // Send 7-day payment reminder emails
    for (const { transaction, member } of sevenDayReminders) {
      try {
        if (member?.email && transaction) {
          const dueDate = new Date(transaction.dueDate as any).toLocaleDateString();
          const amount = transaction.totalAmount?.toNumber?.() || 0;

          // Send email notification
          const { FinancialEmailService } = await import('@/lib/services/financial-email-service');
          await FinancialEmailService.sendPaymentReminder({
            to: member.email,
            memberName: member.name || 'Member',
            invoiceNumber: transaction.id,
            amountDue: parseFloat(amount.toFixed(2)),
            dueDate: dueDate,
            paymentPortalLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unioneyes.com'}/billing/payment`,
            autoPay: true,
          });

          console.log(`Sent 7-day reminder to ${member.email}: $${amount} due on ${dueDate}`);
        }
      } catch (error) {
        console.error(`Failed to send 7-day reminder for transaction ${transaction?.id}:`, error);
      }
    }

    // Send 3-day payment reminder emails (urgent)
    for (const { transaction, member } of threeDayReminders) {
      try {
        if (member?.email && transaction) {
          const dueDate = new Date(transaction.dueDate as any).toLocaleDateString();
          const amount = transaction.totalAmount?.toNumber?.() || 0;

          // Send urgent email notification
          const { FinancialEmailService } = await import('@/lib/services/financial-email-service');
          await FinancialEmailService.sendPaymentReminder({
            to: member.email,
            memberName: member.name || 'Member',
            invoiceNumber: transaction.id,
            amountDue: parseFloat(amount.toFixed(2)),
            dueDate: dueDate,
            paymentPortalLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unioneyes.com'}/billing/payment?urgent=true`,
            autoPay: true,
          });

          console.log(`Sent URGENT 3-day reminder to ${member.email}: $${amount} due on ${dueDate}`);
        }
      } catch (error) {
        console.error(`Failed to send 3-day reminder for transaction ${transaction?.id}:`, error);
      }
    }

    console.log('Payment reminders completed');
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    throw error;
  }
}

/**
 * Main scheduler function
 */
async function runScheduler() {
  const args = process.argv.slice(2);
  const task = args[0] || 'all';

  console.log(`Running scheduler task: ${task}`);
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    switch (task) {
      case 'billing':
        await generateBillingCycles();
        break;
      
      case 'autopay':
        await processAutoPayPayments();
        break;
      
      case 'late-fees':
        await processLateFees();
        break;
      
      case 'reminders':
        await sendPaymentReminders();
        break;
      
      case 'all':
        await generateBillingCycles();
        await processAutoPayPayments();
        await processLateFees();
        await sendPaymentReminders();
        break;
      
      default:
        console.error(`Unknown task: ${task}`);
        console.log('Available tasks: billing, autopay, late-fees, reminders, all');
        process.exit(1);
    }

    console.log(`Completed at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error('Scheduler failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduler();
}

export {
  generateBillingCycles,
  processAutoPayPayments,
  processLateFees,
  sendPaymentReminders,
};
