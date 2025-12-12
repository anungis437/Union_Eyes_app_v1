import { db } from '@/db';
import {
  duesRules,
  memberDuesAssignments,
  duesTransactions,
  members,
  type DuesRule,
  type MemberDuesAssignment,
} from '@/services/financial-service/src/db/schema';
import { eq, and, sql, lte, gte, or, isNull } from 'drizzle-orm';

interface DuesCalculationParams {
  tenantId: string;
  memberId: string;
  periodStart: Date;
  periodEnd: Date;
  memberData?: {
    grossWages?: number;
    baseSalary?: number;
    hourlyRate?: number;
    hoursWorked?: number;
  };
}

interface DuesCalculationResult {
  amount: number;
  calculationType: string;
  ruleId: string;
  ruleName: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  breakdown: {
    baseAmount: number;
    rate?: number;
    hours?: number;
    tier?: string;
  };
}

export class DuesCalculationEngine {
  /**
   * Calculate dues for a member for a given period
   */
  static async calculateMemberDues(
    params: DuesCalculationParams
  ): Promise<DuesCalculationResult | null> {
    const { tenantId, memberId, periodStart, periodEnd, memberData } = params;

    // Get active dues assignment for member
    const [assignment] = await db
      .select({
        assignment: memberDuesAssignments,
        rule: duesRules,
      })
      .from(memberDuesAssignments)
      .leftJoin(duesRules, eq(memberDuesAssignments.ruleId, duesRules.id))
      .where(
        and(
          eq(memberDuesAssignments.memberId, memberId),
          eq(memberDuesAssignments.tenantId, tenantId),
          eq(memberDuesAssignments.isActive, true),
          lte(memberDuesAssignments.effectiveDate, periodStart.toISOString().split('T')[0]),
          or(
            isNull(memberDuesAssignments.endDate),
            gte(memberDuesAssignments.endDate, periodStart.toISOString().split('T')[0])
          )
        )
      )
      .limit(1);

    if (!assignment || !assignment.rule) {
      console.warn(`No active dues rule found for member ${memberId}`);
      return null;
    }

    const { assignment: assignmentData, rule } = assignment;

    // Check for override amount
    if (assignmentData.overrideAmount) {
      return {
        amount: parseFloat(assignmentData.overrideAmount.toString()),
        calculationType: 'override',
        ruleId: rule.id,
        ruleName: rule.ruleName,
        periodStart,
        periodEnd,
        dueDate: this.calculateDueDate(periodEnd, rule.billingFrequency),
        breakdown: {
          baseAmount: parseFloat(assignmentData.overrideAmount.toString()),
        },
      };
    }

    // Calculate based on rule type
    let amount: number;
    let breakdown: any = {};

    switch (rule.calculationType) {
      case 'flat_rate':
        amount = parseFloat(rule.flatAmount?.toString() || '0');
        breakdown = { baseAmount: amount };
        break;

      case 'percentage':
        amount = this.calculatePercentageDues(rule, memberData);
        breakdown = {
          baseAmount: memberData?.[rule.baseField as keyof typeof memberData] || 0,
          rate: parseFloat(rule.percentageRate?.toString() || '0'),
        };
        break;

      case 'hourly':
        amount = this.calculateHourlyDues(rule, memberData);
        breakdown = {
          hours: memberData?.hoursWorked || parseFloat(rule.hoursPerPeriod?.toString() || '0'),
          rate: parseFloat(rule.hourlyRate?.toString() || '0'),
          baseAmount: amount,
        };
        break;

      case 'tiered':
        const tierResult = this.calculateTieredDues(rule, memberData);
        amount = tierResult.amount;
        breakdown = tierResult.breakdown;
        break;

      case 'formula':
        amount = this.calculateFormulaDues(rule, memberData);
        breakdown = { baseAmount: amount, formula: rule.customFormula };
        break;

      default:
        console.warn(`Unknown calculation type: ${rule.calculationType}`);
        return null;
    }

    return {
      amount: Math.round(amount * 100) / 100, // Round to 2 decimals
      calculationType: rule.calculationType,
      ruleId: rule.id,
      ruleName: rule.ruleName,
      periodStart,
      periodEnd,
      dueDate: this.calculateDueDate(periodEnd, rule.billingFrequency),
      breakdown,
    };
  }

  /**
   * Calculate percentage-based dues
   */
  private static calculatePercentageDues(
    rule: typeof duesRules.$inferSelect,
    memberData?: DuesCalculationParams['memberData']
  ): number {
    if (!rule.percentageRate || !rule.baseField) {
      return 0;
    }

    const baseAmount = memberData?.[rule.baseField as keyof typeof memberData] || 0;
    const rate = parseFloat(rule.percentageRate.toString()) / 100;
    
    return baseAmount * rate;
  }

  /**
   * Calculate hourly-based dues
   */
  private static calculateHourlyDues(
    rule: typeof duesRules.$inferSelect,
    memberData?: DuesCalculationParams['memberData']
  ): number {
    if (!rule.hourlyRate) {
      return 0;
    }

    const hours = memberData?.hoursWorked || parseFloat(rule.hoursPerPeriod?.toString() || '0');
    const rate = parseFloat(rule.hourlyRate.toString());
    
    return hours * rate;
  }

  /**
   * Calculate tiered dues
   */
  private static calculateTieredDues(
    rule: typeof duesRules.$inferSelect,
    memberData?: DuesCalculationParams['memberData']
  ): { amount: number; breakdown: any } {
    if (!rule.tierStructure || !Array.isArray(rule.tierStructure)) {
      return { amount: 0, breakdown: {} };
    }

    const baseAmount = memberData?.grossWages || memberData?.baseSalary || 0;
    
    // Find applicable tier
    for (const tier of rule.tierStructure) {
      const minAmount = tier.minAmount || 0;
      const maxAmount = tier.maxAmount || Infinity;
      
      if (baseAmount >= minAmount && baseAmount <= maxAmount) {
        let tierAmount = 0;
        
        if (tier.flatAmount) {
          tierAmount = tier.flatAmount;
        } else if (tier.rate) {
          tierAmount = baseAmount * (tier.rate / 100);
        }
        
        return {
          amount: tierAmount,
          breakdown: {
            baseAmount,
            tier: `$${minAmount}-$${maxAmount === Infinity ? '∞' : maxAmount}`,
            rate: tier.rate,
            flatAmount: tier.flatAmount,
          },
        };
      }
    }

    return { amount: 0, breakdown: { baseAmount, tier: 'none' } };
  }

  /**
   * Calculate formula-based dues
   */
  private static calculateFormulaDues(
    rule: typeof duesRules.$inferSelect,
    memberData?: DuesCalculationParams['memberData']
  ): number {
    if (!rule.customFormula) {
      return 0;
    }

    // TODO: Implement safe formula evaluation
    // For now, return 0 as this requires a formula parser
    console.warn('Formula-based dues calculation not yet implemented');
    return 0;
  }

  /**
   * Calculate due date based on billing frequency
   */
  private static calculateDueDate(periodEnd: Date, frequency: string): Date {
    const dueDate = new Date(periodEnd);
    
    // Due date is typically 15 days after period end
    dueDate.setDate(dueDate.getDate() + 15);
    
    return dueDate;
  }

  /**
   * Generate dues transactions for all members for a billing period
   */
  static async generateBillingCycle(tenantId: string, periodStart: Date, periodEnd: Date) {
    try {
      // Get all active members with dues assignments
      const activeMembers = await db
        .select({
          member: members,
          assignment: memberDuesAssignments,
        })
        .from(members)
        .leftJoin(
          memberDuesAssignments,
          and(
            eq(members.id, memberDuesAssignments.memberId),
            eq(memberDuesAssignments.isActive, true)
          )
        )
        .where(
          and(
            eq(members.tenantId, tenantId),
            eq(members.status, 'active')
          )
        );

      const transactionsToCreate: (typeof duesTransactions.$inferInsert)[] = [];

      for (const { member, assignment } of activeMembers) {
        if (!assignment) continue;

        // Check if transaction already exists for this period
        const [existing] = await db
          .select()
          .from(duesTransactions)
          .where(
            and(
              eq(duesTransactions.memberId, member.id),
              eq(duesTransactions.periodStart, periodStart.toISOString().split('T')[0]),
              eq(duesTransactions.periodEnd, periodEnd.toISOString().split('T')[0])
            )
          )
          .limit(1);

        if (existing) {
          console.log(`Transaction already exists for member ${member.id}, period ${periodStart.toISOString()}`);
          continue;
        }

        // Calculate dues
        const calculation = await this.calculateMemberDues({
          tenantId,
          memberId: member.id,
          periodStart,
          periodEnd,
          // TODO: Get actual member wage data from payroll integration
        });

        if (!calculation) {
          console.warn(`Could not calculate dues for member ${member.id}`);
          continue;
        }

        transactionsToCreate.push({
          tenantId,
          memberId: member.id,
          assignmentId: assignment.id,
          ruleId: calculation.ruleId,
          transactionType: 'payment',
          amount: calculation.amount.toString(),
          lateFeeAmount: '0.00',
          totalAmount: calculation.amount.toString(),
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          dueDate: calculation.dueDate.toISOString().split('T')[0],
          status: 'pending',
          metadata: JSON.stringify({
            calculationType: calculation.calculationType,
            breakdown: calculation.breakdown,
          }),
        });
      }

      // Bulk insert transactions
      if (transactionsToCreate.length > 0) {
        await db.insert(duesTransactions).values(transactionsToCreate);
        console.log(`Created ${transactionsToCreate.length} dues transactions for period ${periodStart.toISOString()}`);
      }

      return {
        success: true,
        transactionsCreated: transactionsToCreate.length,
      };
    } catch (error) {
      console.error('Error generating billing cycle:', error);
      throw error;
    }
  }

  /**
   * Calculate late fees for overdue transactions
   */
  static async calculateLateFees(tenantId: string, lateFeeRate: number = 0.02) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all overdue transactions without late fees
      const overdueTransactions = await db
        .select()
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.tenantId, tenantId),
            eq(duesTransactions.status, 'pending'),
            sql`${duesTransactions.dueDate} < ${today}`,
            sql`CAST(${duesTransactions.lateFeeAmount} AS DECIMAL) = 0`
          )
        );

      for (const transaction of overdueTransactions) {
        const amount = parseFloat(transaction.amount.toString());
        const lateFee = Math.round(amount * lateFeeRate * 100) / 100;
        const newTotal = amount + lateFee;

        await db
          .update(duesTransactions)
          .set({
            lateFeeAmount: lateFee.toString(),
            totalAmount: newTotal.toString(),
            updatedAt: new Date(),
          })
          .where(eq(duesTransactions.id, transaction.id));
      }

      console.log(`Applied late fees to ${overdueTransactions.length} transactions`);

      return {
        success: true,
        transactionsUpdated: overdueTransactions.length,
      };
    } catch (error) {
      console.error('Error calculating late fees:', error);
      throw error;
    }
  }
}
