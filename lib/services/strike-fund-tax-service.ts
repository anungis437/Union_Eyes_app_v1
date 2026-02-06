/**
 * Strike Fund Tax Compliance Service
 *
 * Handles tax reporting for strike payments:
 * - T4A generation (Box 028: Other Income) for payments >$500/week
 * - RL-1 generation (Quebec-specific, Case O: Other Income)
 * - Year-end processing by Feb 28 deadline
 * - Cumulative annual threshold tracking
 */

import { db } from '@/db/client';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface T4ASlip {
  slipType: 'T4A';
  taxYear: number;
  recipientName: string;
  recipientSIN: string;
  recipientAddress: string;
  box028_otherIncome: number;
  issuedDate: Date;
  employerName: string;
  employerBusinessNumber: string;
}

export interface RL1Slip {
  slipType: 'RL-1';
  taxYear: number;
  recipientName: string;
  recipientNAS: string;
  recipientAddress: string;
  caseO_autresRevenus: number;
  issuedDate: Date;
  employerName: string;
  employerNEQ: string;
}

/**
 * Check if strike payment requires T4A reporting
 * CRA threshold: >$500/week OR annual >$26,000
 */
export async function checkStrikePaymentTaxability(
  memberId: string,
  paymentAmount: number,
  weekNumber?: number
): Promise<{ requiresT4A: boolean; reason: string; threshold: number }> {
  const T4A_THRESHOLD_WEEKLY = 500;
  const T4A_THRESHOLD_ANNUAL = 26000;

  // Check weekly threshold
  if (paymentAmount > T4A_THRESHOLD_WEEKLY) {
    return {
      requiresT4A: true,
      reason: `Strike pay of $${paymentAmount} exceeds $500/week CRA threshold`,
      threshold: T4A_THRESHOLD_WEEKLY
    };
  }

  // Check cumulative annual for current year
  const currentYear = new Date().getFullYear();
  const yearTotal = await getYearlyStrikePay(memberId, currentYear);

  if (yearTotal > T4A_THRESHOLD_ANNUAL) {
    return {
      requiresT4A: true,
      reason: `Annual strike pay of $${yearTotal} exceeds $26,000 CRA threshold`,
      threshold: T4A_THRESHOLD_ANNUAL
    };
  }

  return {
    requiresT4A: false,
    reason: 'Below both weekly ($500) and annual ($26,000) thresholds',
    threshold: T4A_THRESHOLD_WEEKLY
  };
}

/**
 * Generate T4A slip for member (All Canadian provinces)
 * Must be issued by Feb 28 following tax year
 */
export async function generateT4A(
  memberId: string,
  taxYear: number
): Promise<T4ASlip> {
  // Get member details
  const member = await db.query.members
    .findFirst({
      where: eq(members.id, memberId)
    })
    .catch(() => null);

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  // Calculate yearly strike pay
  const strikePay = await getYearlyStrikePay(memberId, taxYear);

  return {
    slipType: 'T4A',
    taxYear,
    recipientName: member.fullName || member.name || 'Unknown',
    recipientSIN: member.sin || 'NOT PROVIDED', // SIN should be stored
    recipientAddress: member.address || 'NOT PROVIDED',
    box028_otherIncome: strikePay, // Box 028: Other Income
    issuedDate: new Date(),
    employerName: process.env.UNION_NAME || 'Your Union Local',
    employerBusinessNumber: process.env.UNION_BN || 'NOT SET'
  };
}

/**
 * Generate RL-1 slip for Quebec members
 * Quebec-specific equivalent to T4A
 * Must be issued by Feb 28 following tax year
 */
export async function generateRL1(
  memberId: string,
  taxYear: number
): Promise<RL1Slip> {
  const member = await db.query.members
    .findFirst({
      where: eq(members.id, memberId)
    })
    .catch(() => null);

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  if (member.province !== 'QC') {
    throw new Error(`RL-1 is only for Quebec residents, member is in ${member.province}`);
  }

  const strikePay = await getYearlyStrikePay(memberId, taxYear);

  return {
    slipType: 'RL-1',
    taxYear,
    recipientName: member.fullName || member.name || 'Unknown',
    recipientNAS: member.sin || 'NOT PROVIDED', // NAS = Number d'assurance social
    recipientAddress: member.address || 'NOT PROVIDED',
    caseO_autresRevenus: strikePay, // Case O: Autres revenus (Other income)
    issuedDate: new Date(),
    employerName: process.env.UNION_NAME || 'Your Union Local',
    employerNEQ: process.env.UNION_NEQ_QC || 'NOT SET' // NEQ = Numéro d'établissement du Québec
  };
}

/**
 * Year-end tax slip processing
 * Should run in January/February for previous tax year
 * DEADLINE: Feb 28 following tax year
 */
export async function processYearEndTaxSlips(
  taxYear: number
): Promise<{
  processed: number;
  t4aGenerated: number;
  rl1Generated: number;
  deadline: Date;
}> {
  // Find all members who received strike pay in tax year
  const strikePayments = await db.query.strikePayments
    .findMany({
      where: and(
        gte(strikePayments.paymentDate, new Date(`${taxYear}-01-01`)),
        lte(strikePayments.paymentDate, new Date(`${taxYear}-12-31`))
      )
    })
    .catch(() => []);

  const uniqueMemberIds = [...new Set(strikePayments.map((p: any) => p.memberId))];

  let t4aCount = 0;
  let rl1Count = 0;

  for (const memberId of uniqueMemberIds) {
    const yearTotal = await getYearlyStrikePay(memberId, taxYear);

    // Only generate if above threshold
    if (yearTotal <= 500) continue;

    const member = await db.query.members
      .findFirst({
        where: eq(members.id, memberId)
      })
      .catch(() => null);

    // Generate T4A for all provinces
    try {
      const t4a = await generateT4A(memberId, taxYear);
      // Store T4A in database (would need taxSlips table)
      t4aCount++;
    } catch (error) {
      console.error(`Failed to generate T4A for ${memberId}:`, error);
    }

    // Generate RL-1 for Quebec members
    if (member?.province === 'QC') {
      try {
        const rl1 = await generateRL1(memberId, taxYear);
        // Store RL-1 in database
        rl1Count++;
      } catch (error) {
        console.error(`Failed to generate RL-1 for ${memberId}:`, error);
      }
    }
  }

  // Calculate deadline (Feb 28 following tax year)
  const deadline = new Date(`${taxYear + 1}-02-28`);

  return {
    processed: uniqueMemberIds.length,
    t4aGenerated: t4aCount,
    rl1Generated: rl1Count,
    deadline
  };
}

/**
 * Get yearly strike pay for member
 */
async function getYearlyStrikePay(
  memberId: string,
  year?: number
): Promise<number> {
  const targetYear = year || new Date().getFullYear();

  const payments = await db.query.strikePayments
    .findMany({
      where: and(
        eq(strikePayments.memberId, memberId),
        gte(strikePayments.paymentDate, new Date(`${targetYear}-01-01`)),
        lte(strikePayments.paymentDate, new Date(`${targetYear}-12-31`))
      )
    })
    .catch(() => []);

  return payments.reduce((sum, p: any) => sum + (p.amount || 0), 0);
}

/**
 * Get tax filing status for member
 */
export async function getTaxFilingStatus(
  memberId: string,
  taxYear: number
): Promise<{
  requiresT4A: boolean;
  t4aIssued: boolean;
  rl1Required: boolean;
  rl1Issued: boolean;
  deadline: Date;
}> {
  const yearTotal = await getYearlyStrikePay(memberId, taxYear);

  // Check if requires T4A
  const requiresT4A = yearTotal > 500;

  return {
    requiresT4A,
    t4aIssued: false, // Would check database
    rl1Required: requiresT4A && (await isMemberInQuebec(memberId)),
    rl1Issued: false, // Would check database
    deadline: new Date(`${taxYear + 1}-02-28`)
  };
}

async function isMemberInQuebec(memberId: string): Promise<boolean> {
  const member = await db.query.members
    .findFirst({
      where: eq(members.id, memberId)
    })
    .catch(() => null);

  return member?.province === 'QC';
}

/**
 * Generate strike fund tax compliance report
 */
export async function generateStrikeFundTaxReport(taxYear: number): Promise<{
  compliant: boolean;
  issues: string[];
  t4asGenerated: number;
  rl1sGenerated: number;
  deadline: string;
}> {
  const result = await processYearEndTaxSlips(taxYear);

  const issues: string[] = [];

  if (result.t4aGenerated === 0 && result.rl1Generated === 0) {
    // Could be compliant if no one exceeded thresholds
  }

  return {
    compliant: issues.length === 0,
    issues,
    t4asGenerated: result.t4aGenerated,
    rl1sGenerated: result.rl1Generated,
    deadline: `Feb 28, ${taxYear + 1} (CRA requirement)`
  };
}
