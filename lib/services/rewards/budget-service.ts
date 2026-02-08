/**
 * Budget Service
 * Handles budget envelope management and usage tracking
 */

import { type PgTransaction } from 'drizzle-orm/pg-core';
import { type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { db } from '@/db';
import {
  rewardBudgetEnvelopes,
  type NewRewardBudgetEnvelope,
  type RewardBudgetEnvelope,
} from '@/db/schema';
import { eq, and, sql, lte, gte, desc } from 'drizzle-orm';

type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  any
>;

/**
 * Create a budget envelope
 */
export async function createBudgetEnvelope(
  data: NewRewardBudgetEnvelope
): Promise<RewardBudgetEnvelope> {
  const [envelope] = await db
    .insert(rewardBudgetEnvelopes)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return envelope;
}

/**
 * Get budget envelope by ID
 */
export async function getBudgetEnvelopeById(
  envelopeId: string,
  orgId: string
): Promise<RewardBudgetEnvelope | null> {
  const envelope = await db.query.rewardBudgetEnvelopes.findFirst({
    where: and(
      eq(rewardBudgetEnvelopes.id, envelopeId),
      eq(rewardBudgetEnvelopes.orgId, orgId)
    ),
  });

  return envelope || null;
}

/**
 * List budget envelopes for a program
 */
export async function listBudgetEnvelopes(
  programId: string,
  orgId: string,
  activeOnly = false
): Promise<RewardBudgetEnvelope[]> {
  const now = new Date();
  
  let conditions = and(
    eq(rewardBudgetEnvelopes.programId, programId),
    eq(rewardBudgetEnvelopes.orgId, orgId)
  );

  if (activeOnly) {
    conditions = and(
      conditions,
      lte(rewardBudgetEnvelopes.startsAt, now),
      gte(rewardBudgetEnvelopes.endsAt, now)
    ) as any;
  }

  const envelopes = await db.query.rewardBudgetEnvelopes.findMany({
    where: conditions,
    orderBy: [desc(rewardBudgetEnvelopes.startsAt)],
  });

  return envelopes;
}

/**
 * Update budget envelope
 */
export async function updateBudgetEnvelope(
  envelopeId: string,
  orgId: string,
  data: Partial<NewRewardBudgetEnvelope>
): Promise<RewardBudgetEnvelope> {
  const [updated] = await db
    .update(rewardBudgetEnvelopes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(rewardBudgetEnvelopes.id, envelopeId),
        eq(rewardBudgetEnvelopes.orgId, orgId)
      )
    )
    .returning();

  return updated;
}

/**
 * Check budget availability for a program
 * Returns true if there is an active envelope with sufficient credits
 * 
 * This is used before issuing awards to ensure budget constraints
 */
export async function checkBudgetAvailability(
  tx: DbTransaction | typeof db,
  programId: string,
  creditsNeeded: number
): Promise<boolean> {
  const now = new Date();

  // Get active envelope with org scope (MVP: only org-level budgets)
  const envelope = await tx.query.rewardBudgetEnvelopes.findFirst({
    where: and(
      eq(rewardBudgetEnvelopes.programId, programId),
      eq(rewardBudgetEnvelopes.scopeType, 'org'),
      lte(rewardBudgetEnvelopes.startsAt, now),
      gte(rewardBudgetEnvelopes.endsAt, now)
    ),
    orderBy: [desc(rewardBudgetEnvelopes.createdAt)],
  });

  if (!envelope) {
    // No active budget envelope = unlimited (allow for MVP flexibility)
    return true;
  }

  const available = envelope.amountLimit - envelope.amountUsed;
  return available >= creditsNeeded;
}

/**
 * Apply budget usage (transactional)
 * Increments or decrements the amount_used field
 * 
 * IMPORTANT: This should be called within a transaction
 * 
 * @param amount Can be positive (usage) or negative (refund/revoke)
 */
export async function applyBudgetUsage(
  tx: DbTransaction | typeof db,
  programId: string,
  amount: number
): Promise<void> {
  const now = new Date();

  // Get active envelope
  const envelope = await tx.query.rewardBudgetEnvelopes.findFirst({
    where: and(
      eq(rewardBudgetEnvelopes.programId, programId),
      eq(rewardBudgetEnvelopes.scopeType, 'org'),
      lte(rewardBudgetEnvelopes.startsAt, now),
      gte(rewardBudgetEnvelopes.endsAt, now)
    ),
    orderBy: [desc(rewardBudgetEnvelopes.createdAt)],
  });

  if (!envelope) {
    // No budget envelope = no tracking needed (unlimited for MVP)
    return;
  }

  // Update amount_used
  await tx
    .update(rewardBudgetEnvelopes)
    .set({
      amountUsed: sql`${rewardBudgetEnvelopes.amountUsed} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(rewardBudgetEnvelopes.id, envelope.id));
}

/**
 * Apply budget usage with limit enforcement (transactional)
 * Returns false if the update would exceed the envelope limit.
 */
export async function applyBudgetUsageChecked(
  tx: DbTransaction | typeof db,
  programId: string,
  amount: number
): Promise<boolean> {
  if (amount <= 0) {
    await applyBudgetUsage(tx, programId, amount);
    return true;
  }

  const now = new Date();

  const envelope = await tx.query.rewardBudgetEnvelopes.findFirst({
    where: and(
      eq(rewardBudgetEnvelopes.programId, programId),
      eq(rewardBudgetEnvelopes.scopeType, 'org'),
      lte(rewardBudgetEnvelopes.startsAt, now),
      gte(rewardBudgetEnvelopes.endsAt, now)
    ),
    orderBy: [desc(rewardBudgetEnvelopes.createdAt)],
  });

  if (!envelope) {
    return true;
  }

  const [updated] = await tx
    .update(rewardBudgetEnvelopes)
    .set({
      amountUsed: sql`${rewardBudgetEnvelopes.amountUsed} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(rewardBudgetEnvelopes.id, envelope.id),
        sql`${rewardBudgetEnvelopes.amountUsed} + ${amount} <= ${rewardBudgetEnvelopes.amountLimit}`
      )
    )
    .returning();

  return !!updated;
}

/**
 * Get budget usage summary
 * Returns aggregated usage stats for reporting
 */
export async function getBudgetUsageSummary(
  orgId: string,
  programId?: string
): Promise<
  Array<{
    envelopeId: string;
    envelopeName: string;
    used: number;
    limit: number;
    percentage: number;
    isActive: boolean;
  }>
> {
  const now = new Date();

  let whereClause = eq(rewardBudgetEnvelopes.orgId, orgId);
  if (programId) {
    whereClause = and(whereClause, eq(rewardBudgetEnvelopes.programId, programId)) as any;
  }

  const envelopes = await db.query.rewardBudgetEnvelopes.findMany({
    where: whereClause,
    orderBy: [desc(rewardBudgetEnvelopes.startsAt)],
  });

  return envelopes.map((envelope) => ({
    envelopeId: envelope.id,
    envelopeName: envelope.name,
    used: envelope.amountUsed,
    limit: envelope.amountLimit,
    percentage: Math.round((envelope.amountUsed / envelope.amountLimit) * 100),
    isActive: now >= envelope.startsAt && now <= envelope.endsAt,
  }));
}

/**
 * Reserve budget (optional MVP feature)
 * Temporarily locks budget for pending awards
 * 
 * Note: Not implemented in MVP - awards check budget at issuance time
 * This is a placeholder for future enhancement
 */
export async function reserveBudget(
  tx: DbTransaction,
  programId: string,
  amount: number,
  reservationId: string
): Promise<void> {
  // TODO: Implement budget reservation logic
  // For now, we check budget at issuance time instead of approval time
  throw new Error('Budget reservation not implemented in MVP');
}

/**
 * Release reserved budget
 * Companion to reserveBudget (not implemented in MVP)
 */
export async function releaseReservedBudget(
  tx: DbTransaction,
  reservationId: string
): Promise<void> {
  // TODO: Implement budget release logic
  throw new Error('Budget reservation not implemented in MVP');
}
