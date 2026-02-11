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
      awardTypeName: award.awardType.name,
      awardTypeIcon: undefined,
      message: award.reason || 'Great work!',
      creditsAwarded: award.awardType.defaultCreditAmount || 0,
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
      admins.map((admin) => {
        if (!admin.email) return Promise.resolve();
        
        return sendApprovalRequestEmail({
          adminName: admin.name || admin.email.split('@')[0] || 'Admin',
          adminEmail: admin.email,
          awardTypeName: award.awardType.name,
          recipientName: recipient?.email.split('@')[0] || 'Unknown',
          issuerName: issuer?.email.split('@')[0] || 'Unknown',
          message: award.reason || '',
          creditsToAward: award.awardType.defaultCreditAmount || 0,
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
 */
export async function getExpiringCreditsUsers(daysBeforeExpiration: number, batchSize = BATCH_SIZE) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

  const now = new Date();
  
  // Query for expiring credits with proper indexing
  const expiringEntries = await db.query.rewardWalletLedger.findMany({
    where: and(
      eq(rewardWalletLedger.transactionType, 'earn'),
      lte(rewardWalletLedger.expiresAt, expirationDate),
      gte(rewardWalletLedger.expiresAt, now)
    ),
    orderBy: [asc(rewardWalletLedger.expiresAt)],
    limit: batchSize,
  });

  // Aggregate by user
  const userExpirations = new Map<string, {
    userId: string;
    totalExpiring: number;
    earliestExpiration: Date;
  }>();

  for (const entry of expiringEntries) {
    const existing = userExpirations.get(entry.userId);
    if (existing) {
      existing.totalExpiring += Math.abs(entry.pointsChange);
      if (entry.expiresAt! < existing.earliestExpiration) {
        existing.earliestExpiration = entry.expiresAt!;
      }
    } else {
      userExpirations.set(entry.userId, {
        userId: entry.userId,
        totalExpiring: Math.abs(entry.pointsChange),
        earliestExpiration: entry.expiresAt!,
      });
    }
  }

  return Array.from(userExpirations.values());
}

/**
 * Send credit expiration notification to a single user
 */
async function sendExpirationNotificationToUser(
  userId: string,
  daysRemaining: number
): Promise<NotificationResult> {
  try {
    // Fetch user details with organization
    const user = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });

    if (!user?.email) {
      return { success: false, userId, emailSent: false, error: 'No email found' };
    }

    // Get expiring credits details
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysRemaining);

    const expiringCredits = await db.query.rewardWalletLedger.findMany({
      where: and(
        eq(rewardWalletLedger.userId, userId),
        eq(rewardWalletLedger.transactionType, 'earn'),
        lte(rewardWalletLedger.expiresAt, expirationDate),
        gte(rewardWalletLedger.expiresAt, new Date())
      ),
      orderBy: [asc(rewardWalletLedger.expiresAt)],
    });

    const totalExpiring = expiringCredits.reduce(
      (sum, entry) => sum + Math.abs(entry.pointsChange),
      0
    );

    // Get organization name (simplified - would need proper relation)
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, user.organizationId || 'default'),
    });

    await sendCreditExpirationEmail({
      recipientName: user.email.split('@')[0] || 'Member',
      recipientEmail: user.email,
      expiringCredits: totalExpiring,
      expirationDate: expirationDate,
      daysRemaining,
      organizationName: org?.name || 'Your Organization',
      expiringEntries: expiringCredits.map((e) => ({
        amount: Math.abs(e.pointsChange),
        expiresAt: e.expiresAt!,
        description: e.description || 'Credit earned',
      })),
    });

    logger.info('[Notifications] Sent expiration warning', {
      userId,
      email: user.email,
      totalExpiring,
      daysRemaining,
    });
    
    return { success: true, userId, emailSent: true };
  } catch (error) {
    logger.error('[Notifications] Error sending expiration', { error, userId });
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
      where: (users, { eq }) => eq(users.userId, redemption.userId),
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
      orgName: redemption.organization.name,
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

    // Count expiring entries
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    
    const expiringCount = await db.$count(
      rewardWalletLedger,
      and(
        eq(rewardWalletLedger.transactionType, 'earn'),
        lte(rewardWalletLedger.expiresAt, sevenDays)
      )
    );
    
    stats.totalExpiringNotifications7Days = expiringCount;

    // Count pending awards
    stats.pendingAwards = await db.$count(
      recognitionAwards,
      eq(recognitionAwards.status, 'pending')
    );

    // Count recent redemptions
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    stats.recentRedemptions = await db.$count(
      rewardRedemptions,
      gte(rewardRedemptions.createdAt, oneDayAgo)
    );

    return { success: true, data: stats };
  } catch (error) {
    logger.error('[Notifications] Error getting stats', { error, organizationId });
    return { success: false, error };
  }
}

/**
 * Schedule future expiration notifications
 * This would be called after credits are earned
 */
export async function scheduleExpirationNotifications(
  userId: string,
  creditsEarned: number,
  expiresAt: Date
) {
  try {
    const now = new Date();
    
    // Calculate notification dates
    const notificationDates = [
      new Date(expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
      new Date(expiresAt.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
      new Date(expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000),  // 7 days before
    ];

    // Filter out past dates
    const futureNotifications = notificationDates.filter((d) => d > now);

    if (futureNotifications.length === 0) {
      logger.info('[Notifications] No future notifications needed for user', { userId });
      return { scheduled: 0 };
    }

    // In production, this would create scheduled job entries
    // For now, just log
    logger.info('[Notifications] Scheduled expiration reminders', {
      userId,
      count: futureNotifications.length,
      dates: futureNotifications.map((d) => d.toISOString()),
    });

    return { 
      success: true, 
      scheduled: futureNotifications.length,
      notificationDates: futureNotifications 
    };
  } catch (error) {
    logger.error('[Notifications] Error scheduling notifications', { error, userId });
    return { success: false, error };
  }
}

