/**
 * Notification Triggers for Rewards System
 * Handles automatic email notifications for various reward events
 * Includes batch processing for credit expiration warnings
 */

import { db } from '@/db';
import { 
  rewardWalletLedger, 
  recognitionAwards, 
  rewardRedemptions,
  organizations,
  users,
  organizationMembers 
} from '@/db/schema';
import { 
  sendAwardReceivedEmail, 
  sendApprovalRequestEmail, 
  sendCreditExpirationEmail, 
  sendRedemptionConfirmationEmail 
} from './email-service';
import { eq, and, lte, gte, desc, asc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

// Batch configuration
const BATCH_SIZE = 100;
const EMAIL_RATE_LIMIT_MS = 100; // Rate limit for sending emails

interface ExpiringCreditsNotification {
  userId: string;
  userEmail: string;
  userName: string;
  organizationName: string;
  expiringAmount: number;
  expirationDate: Date;
  daysRemaining: number;
}

interface NotificationResult {
  success: boolean;
  userId: string;
  emailSent: boolean;
  error?: string;
}

/**
 * Trigger notification when an award is issued
 */
export async function notifyAwardIssued(awardId: string) {
  try {
    // Fetch award details with relationships
    const award = await db.query.recognitionAwards.findFirst({
      where: (awards, { eq }) => eq(awards.id, awardId),
      with: {
        awardType: true,
        organization: true,
      },
    });

    if (!award || award.status !== 'issued') {
      return { success: false, error: 'Award not found or not issued' };
    }

    // Fetch recipient user details
    const recipient = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.userId, award.recipientUserId),
    });

    // Fetch issuer user details (issuerUserId can be null for system awards)
    const issuerUserId = award.issuerUserId;
    const issuer = issuerUserId
      ? await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.userId, issuerUserId),
        })
      : null;

    if (!recipient?.email) {
      return { success: false, error: 'Recipient email not found' };
    }

    // Send notification email
    await sendAwardReceivedEmail({
      recipientName: recipient.email.split('@')[0] || 'Member',
      recipientEmail: recipient.email,
      issuerName: issuer?.email.split('@')[0] || 'A colleague',
      awardTypeName: award.awardType?.name || 'Award',
      awardTypeIcon: undefined,
      message: award.reason || 'Great work!',
      creditsAwarded: award.awardType?.defaultCreditAmount || 0,
      awardId: award.id,
      orgName: award.organization.name,
    });

    return { success: true };
  } catch (error) {
    logger.error('[Notifications] Error sending award issued notification', { error, awardId });
    return { success: false, error };
  }
}

/**
 * Trigger notification when an award requires approval
 */
export async function notifyAwardPendingApproval(awardId: string) {
  try {
    // Fetch award details
    const award = await db.query.recognitionAwards.findFirst({
      where: (awards, { eq }) => eq(awards.id, awardId),
      with: {
        awardType: true,
        organization: true,
      },
    });

    if (!award || award.status !== 'pending') {
      return { success: false, error: 'Award not found or not pending' };
    }

    // Fetch recipient and issuer details
    const recipient = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.userId, award.recipientUserId),
    });
    const issuerUserId = award.issuerUserId;
    const issuer = issuerUserId
      ? await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.userId, issuerUserId),
        })
      : null;

    // Fetch organization admins
    const admins = await db.query.organizationMembers.findMany({
      where: (members, { eq, and, inArray }) =>
        and(
          eq(members.organizationId, award.orgId),
          inArray(members.role, ['admin', 'owner'])
        ),
    });

    // Send notification to all admins
    const results = await Promise.allSettled(
      admins.map(async (admin) => {
        if (!admin.email) return Promise.resolve();
        
        // Fetch admin user details
        const adminUser = await db.query.users.findFirst({
          where: eq(users.id, admin.userId),
        });

        if (!adminUser) return Promise.resolve();
        
        return sendApprovalRequestEmail({
          adminName: adminUser.displayName || adminUser.email.split('@')[0] || 'Admin',
          adminEmail: adminUser.email,
          awardTypeName: award.awardType?.name || 'Award',
          recipientName: recipient?.email.split('@')[0] || 'Unknown',
          issuerName: issuer?.email.split('@')[0] || 'Unknown',
          message: award.reason || '',
          creditsToAward: award.awardType?.defaultCreditAmount || 0,
          awardId: award.id,
          orgName: award.organization.name,
        });
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    return { success: true, notifiedAdmins: successCount };
  } catch (error) {
    logger.error('[Notifications] Error sending approval notifications', { error, awardId });
    return { success: false, error };
  }
}

/**
 * Get users with expiring credits within the specified timeframe
 * Uses batched queries for performance
 * 
 * NOTE: Credit expiration is not currently implemented in the schema.
 * This function returns an empty array until expiration tracking is added.
 */
export async function getExpiringCreditsUsers(daysBeforeExpiration: number, batchSize = BATCH_SIZE) {
  // TODO: Implement credit expiration tracking in rewardWalletLedger schema
  // When implemented, add expiresAt timestamp field and expirationProcessed boolean
  
  // For now, return empty array since expiration is not tracked
  return [];
}

/**
 * Send credit expiration notification to a single user
 * 
 * NOTE: Credit expiration is not currently implemented.
 * This function logs a warning and returns success without sending emails.
 */
async function sendExpirationNotificationToUser(
  userId: string,
  daysRemaining: number
): Promise<NotificationResult> {
  try {
    // TODO: Implement when credit expiration tracking is added to schema
    logger.info('[Notifications] Credit expiration not yet implemented', {
      userId,
      daysRemaining,
    });
    
    return { success: true, userId, emailSent: false };
  } catch (error) {
    logger.error('[Notifications] Error in expiration notification placeholder', { error, userId });
    return { 
      success: false, 
      userId, 
      emailSent: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Trigger notification for expiring credits
 * Processes in batches with rate limiting
 */
export async function notifyExpiringCredits(daysBeforeExpiration = 7) {
  try {
    const now = Date.now();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

    logger.info('[Notifications] Checking for credits expiring', {
      daysBeforeExpiration,
      expiresBefore: expirationDate.toISOString(),
    });

    // Get all users with expiring credits (paginated)
    const usersWithExpiringCredits = await getExpiringCreditsUsers(daysBeforeExpiration, 10000);
    
    logger.info('[Notifications] Found users with expiring credits', {
      count: usersWithExpiringCredits.length,
    });

    const results: NotificationResult[] = [];
    
    // Process in batches with rate limiting
    for (let i = 0; i < usersWithExpiringCredits.length; i += BATCH_SIZE) {
      const batch = usersWithExpiringCredits.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (userEntry) => {
          // Rate limit between emails
          await new Promise((resolve) => setTimeout(resolve, EMAIL_RATE_LIMIT_MS));
          
          return sendExpirationNotificationToUser(
            userEntry.userId, 
            daysBeforeExpiration
          );
        })
      );
      
      results.push(...batchResults);

      // Log progress
      const progress = Math.min(i + BATCH_SIZE, usersWithExpiringCredits.length);
      logger.info('[Notifications] Processed expiring credit batch', {
        processed: progress,
        total: usersWithExpiringCredits.length,
      });
    }

    const successCount = results.filter((r) => r.emailSent).length;
    const failedCount = results.filter((r) => !r.emailSent).length;
    const duration = Date.now() - now;

    logger.info('[Notifications] Completed expiration notifications', {
      sent: successCount,
      failed: failedCount,
      durationMs: duration,
    });

    return {
      success: true,
      totalUsers: usersWithExpiringCredits.length,
      sent: successCount,
      failed: failedCount,
      duration: `${duration}ms`,
    };
  } catch (error) {
    logger.error('[Notifications] Error sending expiration notifications', { error });
    return { success: false, error };
  }
}

/**
 * Trigger notification when redemption is confirmed
 */
export async function notifyRedemptionConfirmed(redemptionId: string) {
  try {
    // Fetch redemption details
    const redemption = await db.query.rewardRedemptions.findFirst({
      where: (redemptions, { eq }) => eq(redemptions.id, redemptionId),
      with: {
        organization: true,
      },
    });

    if (!redemption) {
      return { success: false, error: 'Redemption not found' };
    }

    // Fetch user details
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, redemption.userId),
    });

    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    // Send notification email
    await sendRedemptionConfirmationEmail({
      recipientName: user.email.split('@')[0] || 'Member',
      recipientEmail: user.email,
      creditsRedeemed: redemption.creditsSpent || 0,
      checkoutUrl: redemption.providerCheckoutId || (redemption.providerPayloadJson as any)?.checkout_url,
      redemptionId: redemption.id,
      orgName: redemption.organization?.name || 'Organization',
    });

    return { success: true };
  } catch (error) {
    logger.error('[Notifications] Error sending redemption confirmation', {
      error,
      redemptionId,
    });
    return { success: false, error };
  }
}

/**
 * Batch notification for credit expiration warnings
 * Should be run as a scheduled job (daily)
 */
export async function sendBatchExpirationWarnings() {
  try {
    const now = Date.now();
    const results = {
      usersNotified7Days: 0,
      usersNotified14Days: 0,
      usersNotified30Days: 0,
      errors: [] as string[],
    };

    // Send notifications at multiple intervals
    const intervals = [
      { days: 7, counter: 'usersNotified7Days' },
      { days: 14, counter: 'usersNotified14Days' },
      { days: 30, counter: 'usersNotified30Days' },
    ];

    for (const interval of intervals) {
      const result = await notifyExpiringCredits(interval.days);
      
      if (result.success) {
        (results as any)[interval.counter] = result.sent;
      } else {
        results.errors.push(`Failed for ${interval.days} days: ${result.error}`);
      }
    }

    const duration = Date.now() - now;

    logger.info('[Notifications] Batch expiration warnings completed', {
      durationMs: duration,
      results,
    });

    return {
      success: true,
      ...results,
      duration: `${duration}ms`,
    };
  } catch (error) {
    logger.error('[Notifications] Error in batch expiration warnings', { error });
    return { success: false, error };
  }
}

/**
 * Get notification statistics for monitoring
 */
export async function getNotificationStats(organizationId?: string) {
  try {
    // Get recent notification counts (simplified - would need notification log table)
    const stats = {
      totalExpiringNotifications7Days: 0,
      totalExpiringNotifications14Days: 0,
      totalExpiringNotifications30Days: 0,
      pendingAwards: 0,
      recentRedemptions: 0,
    };

    // Credit expiration not yet implemented
    stats.totalExpiringNotifications7Days = 0;

    // Count pending awards
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recognitionAwards)
      .where(eq(recognitionAwards.status, 'pending'));
    
    stats.pendingAwards = pendingResult?.count || 0;

    // Count recent redemptions
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const [redemptionResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rewardRedemptions)
      .where(gte(rewardRedemptions.createdAt, oneDayAgo));
    
    stats.recentRedemptions = redemptionResult?.count || 0;

    return { success: true, data: stats };
  } catch (error) {
    logger.error('[Notifications] Error getting stats', { error, organizationId });
    return { success: false, error };
  }
}

/**
 * Schedule future expiration notifications
 * This would be called after credits are earned
 * 
 * NOTE: Credit expiration is not currently implemented.
 * This function is a placeholder for future functionality.
 */
export async function scheduleExpirationNotifications(
  userId: string,
  creditsEarned: number,
  expiresAt: Date
) {
  try {
    // TODO: Implement when credit expiration tracking is added to schema
    logger.info('[Notifications] Credit expiration scheduling not yet implemented', {
      userId,
      creditsEarned,
      proposedExpiresAt: expiresAt.toISOString(),
    });

    return { 
      success: true, 
      scheduled: 0,
      message: 'Credit expiration not yet implemented'
    };
  } catch (error) {
    logger.error('[Notifications] Error in expiration scheduling placeholder', { error, userId });
    return { success: false, error };
  }
}

