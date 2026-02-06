'use server';

/**
 * Recognition & Rewards Server Actions
 * Server-side actions for recognition and reward operations
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as rewardsService from '@/lib/services/rewards';
import {
  createProgramSchema,
  updateProgramSchema,
  createAwardTypeSchema,
  updateAwardTypeSchema,
  createAwardSchema,
  approveAwardSchema,
  issueAwardSchema,
  revokeAwardSchema,
  rejectAwardSchema,
  createBudgetEnvelopeSchema,
  updateBudgetEnvelopeSchema,
  initiateRedemptionSchema,
  cancelRedemptionSchema,
  paginationSchema,
  awardStatusQuerySchema,
  reportQuerySchema,
} from '@/lib/validation/rewards-schemas';
import { revalidatePath } from 'next/cache';

// =====================================================
// Helper: Get Current User's Organization ID
// =====================================================

async function getCurrentUserOrgId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const result = await db.query.organizationMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, userId),
  });

  if (!result) throw new Error('User not associated with any organization');

  return result.organizationId;
}

async function checkAdminRole(): Promise<{ userId: string; orgId: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const member = await db.query.organizationMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, userId),
  });

  if (!member) throw new Error('User not associated with any organization');
  if (!['admin', 'owner'].includes(member.role)) {
    throw new Error('Insufficient permissions');
  }

  return { userId, orgId: member.organizationId };
}

// =====================================================
// Program Actions
// =====================================================

export async function createRecognitionProgram(input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = createProgramSchema.parse(input);

    const program = await rewardsService.createProgram({
      orgId,
      ...validated,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: program };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRecognitionProgram(programId: string, input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = updateProgramSchema.parse(input);

    const program = await rewardsService.updateProgram(programId, orgId, validated);

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: program };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listRecognitionPrograms() {
  try {
    const orgId = await getCurrentUserOrgId();
    const programs = await rewardsService.listPrograms(orgId);

    return { success: true, data: programs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Award Type Actions
// =====================================================

export async function createRecognitionAwardType(input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = createAwardTypeSchema.parse(input);

    const awardType = await rewardsService.createAwardType({
      orgId,
      ...validated,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: awardType };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listAwardTypes(programId: string) {
  try {
    const orgId = await getCurrentUserOrgId();
    const awardTypes = await rewardsService.listAwardTypes(programId, orgId);

    return { success: true, data: awardTypes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Award Actions
// =====================================================

export async function createAward(input: unknown) {
  try {
    const { userId, orgId } = await checkAdminRole();
    const validated = createAwardSchema.parse(input);

    const award = await rewardsService.createAwardRequest({
      orgId,
      issuerUserId: userId,
      ...validated,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: award };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveAward(input: unknown) {
  try {
    const { userId, orgId } = await checkAdminRole();
    const validated = approveAwardSchema.parse(input);

    const award = await rewardsService.approveAward({
      ...validated,
      orgId,
      approvedByUserId: userId,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: award };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function issueAward(input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = issueAwardSchema.parse(input);

    const result = await rewardsService.issueAward({
      ...validated,
      orgId,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    revalidatePath('/[locale]/dashboard/rewards'); // Member wallet view
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function revokeAward(input: unknown) {
  try {
    const { userId, orgId } = await checkAdminRole();
    const validated = revokeAwardSchema.parse(input);

    const result = await rewardsService.revokeAward({
      ...validated,
      orgId,
      revokedByUserId: userId,
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    revalidatePath('/[locale]/dashboard/rewards');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listAwardsByStatus(input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = awardStatusQuerySchema.parse(input);

    const awards = await rewardsService.listAwardsByStatus(
      orgId,
      validated.statuses,
      validated.limit,
      validated.offset
    );

    return { success: true, data: awards };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listMyAwards(input?: unknown) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const orgId = await getCurrentUserOrgId();
    const validated = paginationSchema.parse(input || {});

    const awards = await rewardsService.listUserAwards(
      orgId,
      userId,
      validated.limit,
      validated.offset
    );

    return { success: true, data: awards };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Budget Actions
// =====================================================

export async function createBudgetEnvelope(input: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = createBudgetEnvelopeSchema.parse(input);

    const envelope = await rewardsService.createBudgetEnvelope({
      orgId,
      ...validated,
      startsAt: new Date(validated.startsAt),
      endsAt: new Date(validated.endsAt),
    });

    revalidatePath('/[locale]/dashboard/admin/rewards');
    return { success: true, data: envelope };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listBudgetEnvelopes(programId: string, activeOnly = false) {
  try {
    const { orgId } = await checkAdminRole();
    const envelopes = await rewardsService.listBudgetEnvelopes(programId, orgId, activeOnly);

    return { success: true, data: envelopes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBudgetUsageSummary(programId?: string) {
  try {
    const { orgId } = await checkAdminRole();
    const summary = await rewardsService.getBudgetUsageSummary(orgId, programId);

    return { success: true, data: summary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Wallet Actions
// =====================================================

export async function getMyWalletBalance() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const orgId = await getCurrentUserOrgId();
    const balance = await rewardsService.getBalance(orgId, userId);

    return { success: true, data: { balance } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMyWalletLedger(input?: unknown) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const orgId = await getCurrentUserOrgId();
    const validated = paginationSchema.parse(input || {});

    const result = await rewardsService.listLedger(
      orgId,
      userId,
      validated.limit,
      validated.offset
    );

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Redemption Actions
// =====================================================

export async function initiateRedemption(input: unknown) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const orgId = await getCurrentUserOrgId();
    const validated = initiateRedemptionSchema.parse(input);

    const redemption = await rewardsService.initiateRedemption({
      orgId,
      userId,
      ...validated,
      provider: 'shopify',
    });

    revalidatePath('/[locale]/dashboard/rewards');
    return { success: true, data: redemption };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelRedemption(input: unknown) {
  try {
    const orgId = await getCurrentUserOrgId();
    const validated = cancelRedemptionSchema.parse(input);

    const result = await rewardsService.cancelRedemption(
      validated.redemptionId,
      orgId,
      validated.reason
    );

    revalidatePath('/[locale]/dashboard/rewards');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listMyRedemptions(input?: unknown) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const orgId = await getCurrentUserOrgId();
    const validated = paginationSchema.parse(input || {});

    const result = await rewardsService.listUserRedemptions(
      orgId,
      userId,
      validated.limit,
      validated.offset
    );

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Reporting Actions (Admin)
// =====================================================

export async function getRewardsSummary(input?: unknown) {
  try {
    const { orgId } = await checkAdminRole();
    const validated = reportQuerySchema.parse(input || {});

    const startDate = validated.startDate ? new Date(validated.startDate) : undefined;
    const endDate = validated.endDate ? new Date(validated.endDate) : undefined;

    const ledgerSummary = await rewardsService.getLedgerSummary(orgId, startDate, endDate);
    const budgetSummary = await rewardsService.getBudgetUsageSummary(orgId, validated.programId);

    return {
      success: true,
      data: {
        ...ledgerSummary,
        budgetUsage: budgetSummary,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
