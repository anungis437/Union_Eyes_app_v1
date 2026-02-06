/**
 * Transfer Pricing & Currency Validator
 * 
 * Validates CRA transfer pricing compliance:
 * - All invoices in CAD (not USD)
 * - Bank of Canada noon rate for FX conversions
 * - T106 filing for >$1M cross-border transactions
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class TransferPricingValidator extends BlindSpotValidator {
  name = '12. Transfer Pricing & Currency';
  description = 'Validates CAD invoicing and CRA T106 compliance';
  category = 'taxation';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasCADEnforcement = await this.checkCADEnforcement();
    const hasT106Process = await this.checkT106Filing();
    const hasBoCRateLogic = await this.checkBankOfCanadaRate();

    if (!hasCADEnforcement) {
      findings.push({
        file: 'lib/services/billing',
        issue: 'No CAD currency enforcement found',
        severity: 'high',
      });
    }

    if (!hasT106Process) {
      findings.push({
        file: 'lib/services/tax',
        issue: 'No T106 filing process for cross-border transactions',
        severity: 'high',
      });
    }

    if (!hasBoCRateLogic) {
      findings.push({
        file: 'lib/services/currency',
        issue: 'No Bank of Canada noon rate FX logic found',
        severity: 'medium',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} transfer pricing compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Transfer pricing compliance checks passed');
  }

  private async checkCADEnforcement(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{billing,invoice,payment}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/currency.*CAD|CAD.*only|canadian.*dollar/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkT106Filing(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{tax,t106,transfer.pricing}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkBankOfCanadaRate(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{currency,exchange,fx}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/bank.*canada|boc.*rate|noon.*rate/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// lib/services/currency-service.ts
export class CurrencyService {
  private readonly DEFAULT_CURRENCY = 'CAD';
  private readonly T106_THRESHOLD = 1000000; // $1M CAD

  async enforceCurrencyCAD(invoice: Invoice): Promise<void> {
    if (invoice.currency !== 'CAD') {
      throw new Error(
        'All invoices must be in CAD per CRA transfer pricing rules'
      );
    }
  }

  async convertUSDToCAD(amountUSD: number, date: Date): Promise<number> {
    // Use Bank of Canada noon rate
    const rate = await this.getBankOfCanadaNoonRate(date);
    return amountUSD * rate;
  }

  async getBankOfCanadaNoonRate(date: Date): Promise<number> {
    // Bank of Canada publishes daily noon rates
    // https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json
    const response = await fetch(
      \`https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date=\${date.toISOString().split('T')[0]}\`
    );
    const data = await response.json();
    return parseFloat(data.observations[0].FXUSDCAD.v);
  }

  async checkT106Requirement(
    transactionAmount: number,
    isRelatedParty: boolean
  ): Promise<{ requiresT106: boolean; reason: string }> {
    if (!isRelatedParty) {
      return {
        requiresT106: false,
        reason: 'Not a related-party transaction'
      };
    }

    if (transactionAmount > this.T106_THRESHOLD) {
      return {
        requiresT106: true,
        reason: \`Transaction of $\${transactionAmount} CAD exceeds $1M threshold\`
      };
    }

    return {
      requiresT106: false,
      reason: 'Below $1M threshold'
    };
  }

  async fileT106(
    taxYear: number,
    transactions: RelatedPartyTransaction[]
  ): Promise<void> {
    // T106 - Information Return of Non-Arm's Length Transactions with Non-Residents
    const eligibleTransactions = transactions.filter(
      t => t.amount > this.T106_THRESHOLD
    );

    if (eligibleTransactions.length === 0) {
      return;
    }

    // Generate T106 form
    const t106Form = {
      taxYear,
      businessNumber: process.env.UNION_BN,
      transactions: eligibleTransactions.map(t => ({
        nonResidentName: t.counterpartyName,
        nonResidentCountry: t.counterpartyCountry,
        transactionType: t.type,
        amountCAD: t.amount,
        transferPricingMethod: 'Comparable Uncontrolled Price',
      })),
    };

    // File with CRA by June 30 following tax year
    await this.submitToCRA(t106Form);
  }
}

// db/schema/currency-schema.ts
export const crossBorderTransactions = pgTable('cross_border_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionDate: timestamp('transaction_date').notNull(),
  amountCAD: numeric('amount_cad', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('CAD'),
  counterpartyName: text('counterparty_name').notNull(),
  counterpartyCountry: text('counterparty_country').notNull(),
  isRelatedParty: boolean('is_related_party').default(false),
  requiresT106: boolean('requires_t106').default(false),
  bocNoonRate: numeric('boc_noon_rate', { precision: 8, scale: 6 }),
  transactionType: text('transaction_type'), // service, goods, royalty
  t106Filed: boolean('t106_filed').default(false),
  t106FilingDate: timestamp('t106_filing_date'),
});

// Environment variable:
BANK_OF_CANADA_API_KEY=<your-key> # If using authenticated endpoint
`;
  }
}
