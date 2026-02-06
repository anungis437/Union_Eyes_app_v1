/**
 * General Ledger Integration Service
 * 
 * Manages GL account mapping, journal entry generation, and double-entry validation.
 */

import { Decimal } from 'decimal.js';
import type { ERPConnector } from './connector-interface';
import type {
  JournalEntry,
  JournalEntryLine,
  ChartOfAccountsMapping,
  AccountType,
} from './types';

export interface GLIntegrationConfig {
  strictValidation: boolean;
  autoBalancing: boolean;
  defaultCurrency: string;
  requireApproval: boolean;
  enableDoubleEntryValidation: boolean;
}

export class GeneralLedgerService {
  private connector: ERPConnector;
  private config: GLIntegrationConfig;
  private accountMappings: Map<string, ChartOfAccountsMapping> = new Map();

  constructor(connector: ERPConnector, config: GLIntegrationConfig) {
    this.connector = connector;
    this.config = config;
  }

  /**
   * Initialize GL service by loading account mappings
   */
  async initialize(): Promise<void> {
    // Load chart of accounts from ERP
    const accounts = await this.connector.importChartOfAccounts();
    
    // TODO: Load mappings from database
    // For now, create empty mappings map
    this.accountMappings.clear();
  }

  /**
   * Create a journal entry for dues payment
   */
  async recordDuesPayment(params: {
    memberId: string;
    memberName: string;
    amount: Decimal;
    paymentDate: Date;
    paymentMethod: string;
    reference: string;
    bargainingUnitId?: string;
  }): Promise<JournalEntry> {
    const { memberId, memberName, amount, paymentDate, paymentMethod, reference, bargainingUnitId } = params;

    // Get account mappings
    const cashAccount = this.getGLAccount('cash_' + paymentMethod.toLowerCase());
    const duesRevenueAccount = this.getGLAccount('dues_revenue');

    const entry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `DUES-${reference}`,
      entryDate: paymentDate,
      postingDate: paymentDate,
      description: `Dues payment from ${memberName}`,
      reference,
      currency: this.config.defaultCurrency,
      totalDebit: amount,
      totalCredit: amount,
      isPosted: false,
      isReversed: false,
      lines: [
        {
          id: '1',
          lineNumber: 1,
          accountId: cashAccount.erpAccount,
          accountNumber: cashAccount.erpAccountNumber,
          accountName: 'Cash - ' + paymentMethod,
          debitAmount: amount,
          creditAmount: new Decimal(0),
          description: `Payment from ${memberName}`,
          memberId,
          bargainingUnitId,
        },
        {
          id: '2',
          lineNumber: 2,
          accountId: duesRevenueAccount.erpAccount,
          accountNumber: duesRevenueAccount.erpAccountNumber,
          accountName: 'Dues Revenue',
          debitAmount: new Decimal(0),
          creditAmount: amount,
          description: `Dues from ${memberName}`,
          memberId,
          bargainingUnitId,
        },
      ],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate entry
    const validation = await this.validateJournalEntry(entry);
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.join(', ')}`);
    }

    // Create in ERP system
    return await this.connector.createJournalEntry(entry);
  }

  /**
   * Record CLC per capita remittance
   */
  async recordCLCRemittance(params: {
    localUnionId: string;
    localUnionName: string;
    amount: Decimal;
    remittanceDate: Date;
    periodStart: Date;
    periodEnd: Date;
    memberCount: number;
    reference: string;
  }): Promise<JournalEntry> {
    const { localUnionId, localUnionName, amount, remittanceDate, periodStart, periodEnd, memberCount, reference } = params;

    // Get account mappings
    const clcPayableAccount = this.getGLAccount('clc_payable');
    const duesRevenueAccount = this.getGLAccount('dues_revenue');

    const entry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `CLC-${reference}`,
      entryDate: remittanceDate,
      postingDate: remittanceDate,
      description: `CLC per capita remittance for ${localUnionName}`,
      reference,
      currency: this.config.defaultCurrency,
      totalDebit: amount,
      totalCredit: amount,
      isPosted: false,
      isReversed: false,
      lines: [
        {
          id: '1',
          lineNumber: 1,
          accountId: duesRevenueAccount.erpAccount,
          accountNumber: duesRevenueAccount.erpAccountNumber,
          accountName: 'Dues Revenue',
          debitAmount: amount,
          creditAmount: new Decimal(0),
          description: `CLC remittance - ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
          metadata: {
            localUnionId,
            memberCount,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
        },
        {
          id: '2',
          lineNumber: 2,
          accountId: clcPayableAccount.erpAccount,
          accountNumber: clcPayableAccount.erpAccountNumber,
          accountName: 'CLC Payable',
          debitAmount: new Decimal(0),
          creditAmount: amount,
          description: `Payable to CLC for ${localUnionName}`,
          metadata: {
            localUnionId,
            memberCount,
          },
        },
      ],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = await this.validateJournalEntry(entry);
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.join(', ')}`);
    }

    return await this.connector.createJournalEntry(entry);
  }

  /**
   * Record strike fund withdrawal
   */
  async recordStrikeFundWithdrawal(params: {
    memberId: string;
    memberName: string;
    amount: Decimal;
    withdrawalDate: Date;
    weekNumber: number;
    reference: string;
  }): Promise<JournalEntry> {
    const { memberId, memberName, amount, withdrawalDate, weekNumber, reference } = params;

    const strikeFundExpenseAccount = this.getGLAccount('strike_fund_expense');
    const cashAccount = this.getGLAccount('cash_bank');

    const entry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `SF-${reference}`,
      entryDate: withdrawalDate,
      postingDate: withdrawalDate,
      description: `Strike fund payment to ${memberName} - Week ${weekNumber}`,
      reference,
      currency: this.config.defaultCurrency,
      totalDebit: amount,
      totalCredit: amount,
      isPosted: false,
      isReversed: false,
      lines: [
        {
          id: '1',
          lineNumber: 1,
          accountId: strikeFundExpenseAccount.erpAccount,
          accountNumber: strikeFundExpenseAccount.erpAccountNumber,
          accountName: 'Strike Fund Expense',
          debitAmount: amount,
          creditAmount: new Decimal(0),
          description: `Week ${weekNumber} payment to ${memberName}`,
          memberId,
          metadata: { weekNumber },
        },
        {
          id: '2',
          lineNumber: 2,
          accountId: cashAccount.erpAccount,
          accountNumber: cashAccount.erpAccountNumber,
          accountName: 'Cash - Bank',
          debitAmount: new Decimal(0),
          creditAmount: amount,
          description: `Payment to ${memberName}`,
          memberId,
          metadata: { weekNumber },
        },
      ],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = await this.validateJournalEntry(entry);
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.join(', ')}`);
    }

    return await this.connector.createJournalEntry(entry);
  }

  /**
   * Record rewards redemption
   */
  async recordRewardsRedemption(params: {
    memberId: string;
    memberName: string;
    pointsRedeemed: number;
    cashValue: Decimal;
    redemptionDate: Date;
    itemDescription: string;
    reference: string;
  }): Promise<JournalEntry> {
    const { memberId, memberName, pointsRedeemed, cashValue, redemptionDate, itemDescription, reference } = params;

    const rewardsExpenseAccount = this.getGLAccount('rewards_expense');
    const rewardsLiabilityAccount = this.getGLAccount('rewards_liability');

    const entry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `RWD-${reference}`,
      entryDate: redemptionDate,
      postingDate: redemptionDate,
      description: `Rewards redemption by ${memberName}`,
      reference,
      currency: this.config.defaultCurrency,
      totalDebit: cashValue,
      totalCredit: cashValue,
      isPosted: false,
      isReversed: false,
      lines: [
        {
          id: '1',
          lineNumber: 1,
          accountId: rewardsLiabilityAccount.erpAccount,
          accountNumber: rewardsLiabilityAccount.erpAccountNumber,
          accountName: 'Rewards Liability',
          debitAmount: cashValue,
          creditAmount: new Decimal(0),
          description: `Redemption of ${pointsRedeemed} points`,
          memberId,
          metadata: { pointsRedeemed, itemDescription },
        },
        {
          id: '2',
          lineNumber: 2,
          accountId: rewardsExpenseAccount.erpAccount,
          accountNumber: rewardsExpenseAccount.erpAccountNumber,
          accountName: 'Rewards Expense',
          debitAmount: new Decimal(0),
          creditAmount: cashValue,
          description: itemDescription,
          memberId,
          metadata: { pointsRedeemed },
        },
      ],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = await this.validateJournalEntry(entry);
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.join(', ')}`);
    }

    return await this.connector.createJournalEntry(entry);
  }

  /**
   * Validate journal entry for double-entry bookkeeping
   */
  async validateJournalEntry(entry: Omit<JournalEntry, 'id' | 'externalId'>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.config.enableDoubleEntryValidation) {
      return { isValid: true, errors: [] };
    }

    // Check debits equal credits
    const totalDebits = entry.lines.reduce((sum, line) => sum.plus(line.debitAmount), new Decimal(0));
    const totalCredits = entry.lines.reduce((sum, line) => sum.plus(line.creditAmount), new Decimal(0));

    if (!totalDebits.equals(totalCredits)) {
      errors.push(`Entry is not balanced. Debits: ${totalDebits.toString()}, Credits: ${totalCredits.toString()}`);
    }

    // Check at least 2 lines
    if (entry.lines.length < 2) {
      errors.push('Journal entry must have at least 2 lines');
    }

    // Check each line has either debit or credit (not both)
    entry.lines.forEach((line, index) => {
      if (line.debitAmount.greaterThan(0) && line.creditAmount.greaterThan(0)) {
        errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
      }
      if (line.debitAmount.isZero() && line.creditAmount.isZero()) {
        errors.push(`Line ${index + 1}: Must have either debit or credit amount`);
      }
    });

    // Check all accounts exist
    for (const line of entry.lines) {
      if (!line.accountId) {
        errors.push(`Line ${line.lineNumber}: Missing account ID`);
      }
    }

    // Check date is not in future
    if (this.config.strictValidation && entry.entryDate > new Date()) {
      errors.push('Entry date cannot be in the future');
    }

    // Use ERP system validation
    if (errors.length === 0) {
      try {
        const erpValidation = await this.connector.validateJournalEntry(entry);
        if (!erpValidation.isValid) {
          errors.push(...erpValidation.errors);
        }
      } catch (error) {
        // ERP validation failed but don't block if not strict
        if (this.config.strictValidation) {
          errors.push(`ERP validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get GL account mapping
   */
  private getGLAccount(unionEyesAccount: string): ChartOfAccountsMapping {
    const mapping = this.accountMappings.get(unionEyesAccount);
    if (!mapping) {
      // Return default mapping - in production, this should throw error
      return {
        unionEyesAccount,
        erpAccount: 'default',
        erpAccountNumber: '0000',
        accountType: AccountType.ASSET,
        description: 'Default account',
        autoSync: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return mapping;
  }

  /**
   * Add or update account mapping
   */
  async mapAccount(unionEyesAccount: string, erpAccountId: string, erpAccountNumber: string): Promise<void> {
    const erpAccount = await this.connector.getAccount(erpAccountId);
    
    const mapping: ChartOfAccountsMapping = {
      unionEyesAccount,
      erpAccount: erpAccountId,
      erpAccountNumber,
      accountType: erpAccount.accountType,
      description: erpAccount.accountName,
      autoSync: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accountMappings.set(unionEyesAccount, mapping);
    // TODO: Save to database
  }

  /**
   * Get all account mappings
   */
  getAllMappings(): ChartOfAccountsMapping[] {
    return Array.from(this.accountMappings.values());
  }

  /**
   * Export journal entries for a date range
   */
  async exportJournalEntries(startDate: Date, endDate: Date): Promise<JournalEntry[]> {
    return this.connector.exportJournalEntries({ startDate, endDate });
  }

  /**
   * Import journal entries from ERP
   */
  async importJournalEntries(startDate: Date, endDate: Date): Promise<JournalEntry[]> {
    return this.connector.importJournalEntries({ startDate, endDate });
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(asOfDate: Date): Promise<TrialBalance> {
    const accounts = await this.connector.importChartOfAccounts();
    
    const lines: TrialBalanceLine[] = accounts
      .filter(account => !account.isHeader && account.isActive)
      .map(account => ({
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        debitBalance: account.balance.greaterThan(0) ? account.balance : new Decimal(0),
        creditBalance: account.balance.lessThan(0) ? account.balance.abs() : new Decimal(0),
      }));

    const totalDebits = lines.reduce((sum, line) => sum.plus(line.debitBalance), new Decimal(0));
    const totalCredits = lines.reduce((sum, line) => sum.plus(line.creditBalance), new Decimal(0));

    return {
      asOfDate,
      currency: this.config.defaultCurrency,
      lines,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits.equals(totalCredits),
      generatedAt: new Date(),
    };
  }
}

/**
 * Trial Balance Types
 */
export interface TrialBalance {
  asOfDate: Date;
  currency: string;
  lines: TrialBalanceLine[];
  totalDebits: Decimal;
  totalCredits: Decimal;
  isBalanced: boolean;
  generatedAt: Date;
}

export interface TrialBalanceLine {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: Decimal;
  creditBalance: Decimal;
}
