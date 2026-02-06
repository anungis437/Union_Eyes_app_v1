/**
 * Strike Fund Tax Compliance Validator
 * 
 * Validates CRA compliance for strike fund payments:
 * - T4A generation for >$500/week strike pay
 * - RL-1 for Quebec members
 * - Proper categorization (Box 028 "Other income")
 * - Year-end tax slips issued by Feb 28
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class StrikeFundTaxValidator extends BlindSpotValidator {
  name = '4. Strike Fund Tax Compliance';
  description = 'Validates CRA T4A/RL-1 compliance for strike payments';
  category = 'taxation';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    // Check for tax slip generation service
    const hasTaxSlipService = await this.checkTaxSlipService();
    
    // Check for $500/week threshold logic
    const hasThresholdCheck = await this.checkThresholdLogic();
    
    // Check for Quebec RL-1 handling
    const hasRL1Support = await this.checkRL1Support();
    
    // Check for year-end tax processing
    const hasYearEndProcess = await this.checkYearEndProcess();

    if (!hasTaxSlipService) {
      findings.push({
        file: 'lib/services/tax',
        issue: 'No T4A/RL-1 generation service found',
        severity: 'critical',
      });
    }

    if (!hasThresholdCheck) {
      findings.push({
        file: 'lib/services/strike-fund',
        issue: 'No $500/week threshold check for tax reporting',
        severity: 'critical',
      });
    }

    if (!hasRL1Support) {
      findings.push({
        file: 'lib/services/tax',
        issue: 'No Quebec RL-1 slip generation found',
        severity: 'high',
      });
    }

    if (!hasYearEndProcess) {
      findings.push({
        file: 'lib/services/tax',
        issue: 'No year-end tax slip processing (Feb 28 deadline)',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} strike fund tax compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass(
      'Strike fund tax compliance checks passed'
    );
  }

  private async checkTaxSlipService(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{tax,t4a,rl1,slip}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkThresholdLogic(): Promise<boolean> {
    try {
      const strikeFiles = await glob('lib/services/**/*strike*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of strikeFiles) {
        const content = await fs.readFile(file, 'utf-8');
        // Check for $500 or 500 threshold mentions
        if (content.match(/500|threshold.*tax|tax.*threshold/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkRL1Support(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/rl-?1|relevé.?1|quebec.*tax.*slip/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkYearEndProcess(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/year.?end|feb.*28|tax.*deadline|annual.*tax/i)) {
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
// 1. Create tax slip service:
// lib/services/tax-slip-service.ts
export class TaxSlipService {
  private readonly T4A_THRESHOLD_WEEKLY = 500; // CRA threshold
  private readonly YEAR_END_DEADLINE = new Date('YYYY-02-28');

  async checkStrikePaymentTaxability(
    memberId: string,
    paymentAmount: number,
    weekNumber: number
  ): Promise<{ requiresT4A: boolean; reason: string }> {
    // Check if payment exceeds $500/week
    if (paymentAmount > this.T4A_THRESHOLD_WEEKLY) {
      return {
        requiresT4A: true,
        reason: \`Strike pay of $\${paymentAmount} exceeds $500/week threshold\`
      };
    }

    // Check cumulative for the year
    const yearTotal = await this.getYearlyStrikePay(memberId);
    if (yearTotal > this.T4A_THRESHOLD_WEEKLY * 52) {
      return {
        requiresT4A: true,
        reason: 'Annual strike pay exceeds reportable threshold'
      };
    }

    return { requiresT4A: false, reason: 'Below reporting threshold' };
  }

  async generateT4A(
    memberId: string,
    taxYear: number
  ): Promise<T4ASlip> {
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId)
    });

    const strikePay = await this.getYearlyStrikePay(memberId, taxYear);

    return {
      slipType: 'T4A',
      taxYear,
      recipientName: member.fullName,
      recipientSIN: member.sin,
      recipientAddress: member.address,
      box028_otherIncome: strikePay, // Strike pay goes in Box 028
      issuedDate: new Date(),
      employerName: 'Your Union Local',
      employerBusinessNumber: process.env.UNION_BN,
    };
  }

  async generateRL1(
    memberId: string,
    taxYear: number
  ): Promise<RL1Slip> {
    // Quebec-specific RL-1 (Relevé 1)
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId)
    });

    if (member.province !== 'QC') {
      throw new Error('RL-1 only for Quebec residents');
    }

    const strikePay = await this.getYearlyStrikePay(memberId, taxYear);

    return {
      slipType: 'RL-1',
      taxYear,
      recipientName: member.fullName,
      recipientNAS: member.sin,
      recipientAddress: member.address,
      caseO_autresRevenus: strikePay, // Strike pay in Case O
      issuedDate: new Date(),
      employerName: 'Your Union Local',
      employerNEQ: process.env.UNION_NEQ_QC,
    };
  }

  async processYearEndTaxSlips(taxYear: number): Promise<void> {
    // Run this job in January/February for previous year
    const eligibleMembers = await db.query.strikePayments.findMany({
      where: and(
        gte(strikePayments.paymentDate, new Date(\`\${taxYear}-01-01\`)),
        lte(strikePayments.paymentDate, new Date(\`\${taxYear}-12-31\`))
      ),
      columns: { memberId: true },
    });

    const uniqueMembers = [...new Set(eligibleMembers.map(p => p.memberId))];

    for (const memberId of uniqueMembers) {
      const totalPay = await this.getYearlyStrikePay(memberId, taxYear);
      
      if (totalPay > this.T4A_THRESHOLD_WEEKLY) {
        const member = await db.query.members.findFirst({
          where: eq(members.id, memberId)
        });

        // Generate T4A for all provinces
        await this.generateT4A(memberId, taxYear);

        // Generate RL-1 for Quebec
        if (member?.province === 'QC') {
          await this.generateRL1(memberId, taxYear);
        }

        // Queue for mailing/email by Feb 28
        await this.queueTaxSlipDelivery(memberId, taxYear);
      }
    }
  }

  private async getYearlyStrikePay(
    memberId: string,
    year?: number
  ): Promise<number> {
    const targetYear = year || new Date().getFullYear();
    const payments = await db.query.strikePayments.findMany({
      where: and(
        eq(strikePayments.memberId, memberId),
        gte(strikePayments.paymentDate, new Date(\`\${targetYear}-01-01\`)),
        lte(strikePayments.paymentDate, new Date(\`\${targetYear}-12-31\`))
      ),
    });

    return payments.reduce((sum, p) => sum + p.amount, 0);
  }
}

// 2. Add database schema:
// db/schema/tax-schema.ts
export const taxSlips = pgTable('tax_slips', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  slipType: text('slip_type').notNull(), // T4A, RL-1
  taxYear: integer('tax_year').notNull(),
  box028Amount: numeric('box028_amount', { precision: 10, scale: 2 }), // T4A Box 028
  caseOAmount: numeric('case_o_amount', { precision: 10, scale: 2 }), // RL-1 Case O
  issuedAt: timestamp('issued_at').notNull(),
  deliveredAt: timestamp('delivered_at'),
  deliveryMethod: text('delivery_method'), // email, mail, pickup
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const strikePayments = pgTable('strike_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  weekNumber: integer('week_number'),
  requiresTaxSlip: boolean('requires_tax_slip').default(false),
  taxYear: integer('tax_year'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Scheduled job for year-end processing:
// lib/jobs/year-end-tax-processing.ts
import { TaxSlipService } from '@/lib/services/tax-slip-service';

export async function runYearEndTaxProcessing() {
  const taxSlipService = new TaxSlipService();
  const previousYear = new Date().getFullYear() - 1;
  
  console.log(\`Processing year-end tax slips for \${previousYear}...\`);
  await taxSlipService.processYearEndTaxSlips(previousYear);
  console.log('Year-end tax processing complete. Deadline: Feb 28.');
}

// 4. Add to cron jobs:
// Run annually on January 15 (gives 6 weeks before Feb 28 deadline)
// 0 0 15 1 * /usr/bin/node /app/scripts/year-end-tax.js
`;
  }
}
