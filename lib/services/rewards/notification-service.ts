/**
 * Notification Triggers for Rewards System
 * Handles automatic email notifications for various reward events
 */

import { db } from '@/db';
import {
  sendAwardReceivedEmail,
  sendApprovalRequestEmail,
  sendCreditExpirationEmail,
  sendRedemptionConfirmationEmail,
} from './email-service';
import type { RecognitionAward, RewardRedemption } from '@/db/schema/recognition-rewards-schema';

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
      awardTypeIcon: undefined,  // icon not in schema
      message: award.reason || 'Great work!',
      creditsAwarded: award.awardType.defaultCreditAmount || 0,
      awardId: award.id,
      orgName: award.organization.name,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error sending award issued notification:', error);
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

    // Fetch organization admins (organizationMembers has direct email/name fields, no user relation)
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
    console.error('[Notifications] Error sending approval notifications:', error);
    return { success: false, error };
  }
}

/**
 * Trigger notification for expiring credits
 * This should be called by a scheduled job (e.g., daily cron)
 */
export async function notifyExpiringCredits(daysBeforeExpiration = 7) {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

    // Find users with expiring credits
    // Note: This requires implementing credit expiration tracking in the database
    // For now, this is a placeholder implementation
    
    // TODO: Implement actual expiring credits query
    // const expiringCredits = await db.query.rewardWalletLedger.findMany({
    //   where: (ledger, { and, eq, lte }) =>
    //     and(
    //       eq(ledger.eventType, 'earn'),
    //       lte(ledger.expiresAt, expirationDate)
    //     ),
    // });

    return { success: true, message: 'Expiration notifications not yet implemented' };
  } catch (error) {
    console.error('[Notifications] Error sending expiration notifications:', error);
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
    console.error('[Notifications] Error sending redemption confirmation:', error);
    return { success: false, error };
  }
}

/**
 * Batch notification for credit expiration warnings
 * Should be run as a scheduled job
 */
export async function sendBatchExpirationWarnings() {
  try {
    // TODO: Implement batch processing
    // This would query for all users with expiring credits
    // and send notifications in batches

    return { success: true, message: 'Batch processing not yet implemented' };
  } catch (error) {
    console.error('[Notifications] Error in batch expiration warnings:', error);
    return { success: false, error };
  }
}
