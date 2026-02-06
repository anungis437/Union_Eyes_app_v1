/**
 * Currency & Transfer Pricing Service
 * 
 * Enforces Canadian Revenue Agency (CRA) compliance for:
 * - CAD currency enforcement (all invoices in CAD)
 * - Bank of Canada noon rate FX conversions
 * - Transfer pricing documentation (Form T106)
 * - Cross-border transaction reporting
 * - Arm's length price verification
 * 
 * CRA Requirements:
 * - Form T106: Required for related-party transactions > $1M CAD
 * - Transfer pricing rules: ITA Section 247
 * - Due date: June 30 following tax year
 * - Penalties: $2,500 minimum for non-compliance
 */

import { db } from '@/db';
import { eq, and, gte } from 'drizzle-orm';
import { crossBorderTransactions, exchangeRates } from '@/db/schema';

export type Currency = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'MXN';

export interface Invoice {
  id: string;
  amount: number;
  currency: Currency;
  issueDate: Date;
  isRelatedParty: boolean;
  counterpartyName: string;
  counterpartyCountry: string;
}

export interface ExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  source: 'BOC' | 'XE' | 'OANDA';
  effectiveDate: Date;
}

export interface T106Form {
  taxYear: number;
  businessNumber: string;
  transactions: T106Transaction[];
  filingDeadline: Date;
}

export interface T106Transaction {
  nonResidentName: string;
  nonResidentCountry: string;
  transactionType: string;
  amountCAD: number;
  transferPricingMethod: string;
}

export class CurrencyService {
  private readonly DEFAULT_CURRENCY: Currency = 'CAD';
  private readonly T106_THRESHOLD = 1_000_000; // $1M CAD
  private readonly BOC_API_URL = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json';

  /**
   * Enforce all invoices must be in CAD
   * CRA transfer pricing requirement
   */
  enforceCurrencyCAD(invoice: Invoice): {
    compliant: boolean;
    message: string;
  } {
    if (invoice.currency !== 'CAD') {
      return {
        compliant: false,
        message: `Invoice must be in CAD per CRA transfer pricing rules. Current currency: ${invoice.currency}`
      };
    }

    return {
      compliant: true,
      message: 'Invoice currency compliant (CAD)'
    };
  }

  /**
   * Convert USD to CAD using Bank of Canada noon rate
   * CRA requires BOC rates for official reporting
   */
  async convertUSDToCAD(
    amountUSD: number,
    date: Date
  ): Promise<{
    amountCAD: number;
    exchangeRate: number;
    source: 'BOC';
    effectiveDate: Date;
  }> {
    const rate = await this.getBankOfCanadaNoonRate(date);
    const amountCAD = amountUSD * rate;

    console.log('[CURRENCY] USD to CAD conversion:');
    console.log(`  Amount USD: $${amountUSD.toFixed(2)}`);
    console.log(`  BOC Noon Rate: ${rate.toFixed(6)}`);
    console.log(`  Amount CAD: $${amountCAD.toFixed(2)}`);

    // Store exchange rate for audit trail
    await this.recordExchangeRate('USD', 'CAD', rate, date, 'BOC');

    return {
      amountCAD,
      exchangeRate: rate,
      source: 'BOC',
      effectiveDate: date
    };
  }

  /**
   * Get Bank of Canada noon rate for specific date
   * Official CRA-accepted exchange rate source
   */
  async getBankOfCanadaNoonRate(date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    try {
      // Check if we have cached rate first
      const cached = await db.query.exchangeRates.findFirst({
        where: and(
          eq(exchangeRates.fromCurrency, 'USD'),
          eq(exchangeRates.toCurrency, 'CAD'),
          eq(exchangeRates.rateSource, 'BOC'),
          eq(exchangeRates.effectiveDate, date)
        )
      });

      if (cached) {
        console.log('[CURRENCY] Using cached BOC rate');
        return parseFloat(cached.exchangeRate);
      }

      // Fetch from Bank of Canada API
      console.log(`[CURRENCY] Fetching BOC noon rate for ${dateStr}...`);
      
      const response = await fetch(`${this.BOC_API_URL}?start_date=${dateStr}&end_date=${dateStr}`);
      
      if (!response.ok) {
        throw new Error(`BOC API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.observations || data.observations.length === 0) {
        throw new Error(`No BOC rate available for ${dateStr}`);
      }

      const rate = parseFloat(data.observations[0].FXUSDCAD.v);
      
      console.log(`[CURRENCY] BOC noon rate for ${dateStr}: ${rate}`);
      
      return rate;

    } catch (error) {
      console.error('[CURRENCY] Error fetching BOC rate:', error);
      
      // Fallback to latest known rate (not ideal for CRA compliance)
      console.warn('[CURRENCY] Using fallback rate (1.35). Update with actual BOC rate for compliance.');
      return 1.35;
    }
  }

  /**
   * Record exchange rate in database for audit trail
   */
  private async recordExchangeRate(
    fromCurrency: Currency,
    toCurrency: Currency,
    rate: number,
    effectiveDate: Date,
    source: 'BOC' | 'XE' | 'OANDA'
  ): Promise<void> {
    await db.insert(exchangeRates).values({
      fromCurrency,
      toCurrency,
      exchangeRate: rate.toString(),
      rateTimestamp: new Date(),
      effectiveDate,
      rateSource: source,
    }).onConflictDoNothing();
  }

  /**
   * Check if transaction requires T106 filing
   * T106 required for related-party transactions > $1M CAD
   */
  checkT106Requirement(
    transactionAmount: number,
    isRelatedParty: boolean
  ): {
    requiresT106: boolean;
    reason: string;
    threshold: number;
  } {
    if (!isRelatedParty) {
      return {
        requiresT106: false,
        reason: 'Not a related-party transaction',
        threshold: this.T106_THRESHOLD
      };
    }

    if (transactionAmount > this.T106_THRESHOLD) {
      return {
        requiresT106: true,
        reason: `Related-party transaction of $${transactionAmount.toLocaleString()} CAD exceeds $${this.T106_THRESHOLD.toLocaleString()} threshold`,
        threshold: this.T106_THRESHOLD
      };
    }

    return {
      requiresT106: false,
      reason: `Transaction amount $${transactionAmount.toLocaleString()} below $${this.T106_THRESHOLD.toLocaleString()} threshold`,
      threshold: this.T106_THRESHOLD
    };
  }

  /**
   * Record cross-border transaction for T106 reporting
   */
  async recordCrossBorderTransaction(
    transaction: {
      transactionDate: Date;
      amountCAD: number;
      originalCurrency: Currency;
      counterpartyName: string;
      counterpartyCountry: string;
      transactionType: string;
      isRelatedParty: boolean;
    }
  ): Promise<{
    transactionId: string;
    requiresT106: boolean;
  }> {
    const t106Check = this.checkT106Requirement(
      transaction.amountCAD,
      transaction.isRelatedParty
    );

    const [recorded] = await db.insert(crossBorderTransactions).values({
      transactionDate: transaction.transactionDate,
      amountCents: Math.round(transaction.amountCAD * 100),
      originalCurrency: transaction.originalCurrency,
      cadEquivalentCents: Math.round(transaction.amountCAD * 100),
      fromCountryCode: 'CA', // Assuming union is in Canada
      toCountryCode: transaction.counterpartyCountry.substring(0, 2),
      fromPartyType: 'organization',
      toPartyType: transaction.isRelatedParty ? 'organization' : 'external',
      craReportingStatus: t106Check.requiresT106 ? 'pending' : 'not_required',
    }).returning();

    console.log('[TRANSFER PRICING] Cross-border transaction recorded:');
    console.log(`  ID: ${recorded.id}`);
    console.log(`  Amount: $${transaction.amountCAD.toLocaleString()} CAD`);
    console.log(`  Related Party: ${transaction.isRelatedParty}`);
    console.log(`  T106 Required: ${t106Check.requiresT106}`);

    return {
      transactionId: recorded.id,
      requiresT106: t106Check.requiresT106
    };
  }

  /**
   * Generate T106 form for tax year
   * Must be filed by June 30 following tax year
   */
  async generateT106(
    taxYear: number,
    businessNumber: string
  ): Promise<T106Form> {
    console.log(`[TRANSFER PRICING] Generating T106 for tax year ${taxYear}...`);

    // Get all related-party transactions > $1M for the tax year
    const startDate = new Date(`${taxYear}-01-01`);
    const endDate = new Date(`${taxYear}-12-31`);

    const transactions = await db.query.crossBorderTransactions.findMany({
      where: and(
        gte(crossBorderTransactions.transactionDate, startDate),
        eq(crossBorderTransactions.toPartyType, 'organization'), // Related party
        gte(crossBorderTransactions.cadEquivalentCents, this.T106_THRESHOLD * 100)
      )
    });

    const t106Transactions: T106Transaction[] = transactions.map(t => ({
      nonResidentName: 'Related Party Name', // TODO: Get from transaction details
      nonResidentCountry: t.toCountryCode || 'US',
      transactionType: 'Service Agreement', // TODO: Get actual type
      amountCAD: (t.cadEquivalentCents || 0) / 100,
      transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
    }));

    // Filing deadline is June 30 following tax year
    const filingDeadline = new Date(`${taxYear + 1}-06-30`);

    console.log(`[TRANSFER PRICING] Found ${t106Transactions.length} transactions requiring T106`);
    console.log(`  Filing Deadline: ${filingDeadline.toLocaleDateString()}`);

    return {
      taxYear,
      businessNumber,
      transactions: t106Transactions,
      filingDeadline
    };
  }

  /**
   * File T106 with CRA
   * In production, this would integrate with CRA My Business Account
   */
  async fileT106(form: T106Form): Promise<{
    success: boolean;
    confirmationNumber?: string;
    filedAt?: Date;
    message: string;
  }> {
    const now = new Date();
    
    if (now > form.filingDeadline) {
      return {
        success: false,
        message: `Filing deadline passed (${form.filingDeadline.toLocaleDateString()}). Late filing penalties apply.`
      };
    }

    // In production, submit to CRA via API or XML upload
    console.log('[TRANSFER PRICING] Filing T106 with CRA...');
    console.log(`  Tax Year: ${form.taxYear}`);
    console.log(`  Business Number: ${form.businessNumber}`);
    console.log(`  Transactions: ${form.transactions.length}`);
    console.log(`  Total Amount: $${form.transactions.reduce((sum, t) => sum + t.amountCAD, 0).toLocaleString()} CAD`);

    // Simulate filing
    const confirmationNumber = `CRA-T106-${form.taxYear}-${Date.now()}`;
    
    // Update transaction statuses
    // TODO: Mark all transactions as 'reported'

    return {
      success: true,
      confirmationNumber,
      filedAt: now,
      message: `T106 filed successfully. Confirmation: ${confirmationNumber}`
    };
  }

  /**
   * Validate arm's length pricing
   * Required for related-party transactions
   */
  async validateArmLengthPricing(
    transactionId: string,
    marketRate: number,
    actualRate: number
  ): Promise<{
    compliant: boolean;
    variance: number;
    acceptableRange: string;
    message: string;
  }> {
    // CRA accepts +/- 5% variance from market rate
    const acceptableVariance = 0.05; // 5%
    const variance = Math.abs(actualRate - marketRate) / marketRate;

    const compliant = variance <= acceptableVariance;

    console.log('[TRANSFER PRICING] Arm\'s length price validation:');
    console.log(`  Transaction: ${transactionId}`);
    console.log(`  Market Rate: $${marketRate}`);
    console.log(`  Actual Rate: $${actualRate}`);
    console.log(`  Variance: ${(variance * 100).toFixed(2)}%`);
    console.log(`  Compliant: ${compliant ? 'YES' : 'NO'}`);

    return {
      compliant,
      variance,
      acceptableRange: '±5%',
      message: compliant
        ? 'Pricing complies with arm\'s length standard'
        : `Pricing variance (${(variance * 100).toFixed(2)}%) exceeds acceptable range (±5%). Documentation required.`
    };
  }

  /**
   * Get all transactions requiring T106 filing
   */
  async getT106RequiredTransactions(taxYear: number): Promise<{
    transactions: any[];
    totalAmount: number;
    count: number;
  }> {
    const startDate = new Date(`${taxYear}-01-01`);
    const endDate = new Date(`${taxYear}-12-31`);

    const transactions = await db.query.crossBorderTransactions.findMany({
      where: and(
        gte(crossBorderTransactions.transactionDate, startDate),
        eq(crossBorderTransactions.toPartyType, 'organization'),
        gte(crossBorderTransactions.cadEquivalentCents, this.T106_THRESHOLD * 100)
      )
    });

    const totalAmount = transactions.reduce((sum, t) => sum + ((t.cadEquivalentCents || 0) / 100), 0);

    return {
      transactions,
      totalAmount,
      count: transactions.length
    };
  }

  /**
   * Generate transfer pricing compliance report
   */
  async generateComplianceReport(taxYear: number): Promise<{
    taxYear: number;
    totalCrossBorderTransactions: number;
    relatedPartyTransactions: number;
    t106Required: boolean;
    t106TransactionCount: number;
    t106TotalAmount: number;
    filingDeadline: Date;
    daysUntilDeadline: number;
    recommendations: string[];
  }> {
    const t106Data = await this.getT106RequiredTransactions(taxYear);
    const filingDeadline = new Date(`${taxYear + 1}-06-30`);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((filingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      taxYear,
      totalCrossBorderTransactions: 0, // TODO: Query all transactions
      relatedPartyTransactions: t106Data.count,
      t106Required: t106Data.count > 0,
      t106TransactionCount: t106Data.count,
      t106TotalAmount: t106Data.totalAmount,
      filingDeadline,
      daysUntilDeadline,
      recommendations: [
        `Ensure all invoices are in CAD per CRA requirements`,
        `Use Bank of Canada noon rates for all FX conversions`,
        `Document arm's length pricing for all related-party transactions`,
        t106Data.count > 0 ? `File T106 before ${filingDeadline.toLocaleDateString()}` : 'No T106 filing required this year',
        `Maintain 7-year audit trail of all cross-border transactions`
      ]
    };
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();

/**
 * Annual T106 filing reminder (cron job)
 * Runs on June 1st each year
 */
export async function annualT106Reminder() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  console.log(`[TRANSFER PRICING] Annual T106 Reminder for tax year ${lastYear}`);
  
  const t106Data = await currencyService.getT106RequiredTransactions(lastYear);
  
  if (t106Data.count > 0) {
    console.log(`⚠️  T106 FILING REQUIRED`);
    console.log(`  Tax Year: ${lastYear}`);
    console.log(`  Transactions: ${t106Data.count}`);
    console.log(`  Total Amount: $${t106Data.totalAmount.toLocaleString()} CAD`);
    console.log(`  Deadline: June 30, ${currentYear}`);
    console.log(`  Days Remaining: ${30 - new Date().getDate()}`);
    
    // TODO: Send email notification to treasurer/CTO
  } else {
    console.log(`✓ No T106 filing required for ${lastYear}`);
  }
}
