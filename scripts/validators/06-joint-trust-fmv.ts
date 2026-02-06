/**
 * Joint-Trust Fair Market Value Validator
 * 
 * Validates union joint-trust FMV compliance:
 * - Fair market value benchmarks
 * - CPI escalator for multi-year contracts
 * - 3-bid process for transparency
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class JointTrustFMVValidator extends BlindSpotValidator {
  name = '6. Joint-Trust FMV';
  description = 'Validates fair market value benchmarks for union joint trusts';
  category = 'financial';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasFMVService = await this.checkFMVService();
    const hasCPIEscalator = await this.checkCPIEscalator();
    const hasBidProcess = await this.checkBidProcess();

    if (!hasFMVService) {
      findings.push({
        file: 'lib/services/trust',
        issue: 'No fair market value service found',
        severity: 'high',
      });
    }

    if (!hasCPIEscalator) {
      findings.push({
        file: 'lib/services/trust',
        issue: 'No CPI escalator logic for multi-year contracts',
        severity: 'medium',
      });
    }

    if (!hasBidProcess) {
      findings.push({
        file: 'lib/services/procurement',
        issue: 'No 3-bid process validation found',
        severity: 'medium',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} joint-trust FMV compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Joint-trust FMV compliance checks passed');
  }

  private async checkFMVService(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{fmv,fair-market,valuation}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkCPIEscalator(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/cpi|consumer.price.index|escalator/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkBidProcess(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{bid,procurement,rfp}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/3.*bid|three.*bid|competitive.*bid/i)) {
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
// lib/services/joint-trust-fmv-service.ts
export class JointTrustFMVService {
  async validateFairMarketValue(
    serviceName: string,
    proposedPrice: number,
    benchmarks: FMVBenchmark[]
  ): Promise<{ isValid: boolean; reason: string }> {
    const avgMarketPrice = benchmarks.reduce((sum, b) => sum + b.price, 0) / benchmarks.length;
    const variance = Math.abs(proposedPrice - avgMarketPrice) / avgMarketPrice;

    if (variance > 0.15) { // 15% variance threshold
      return {
        isValid: false,
        reason: \`Price \${proposedPrice} exceeds 15% variance from FMV \${avgMarketPrice}\`
      };
    }

    return { isValid: true, reason: 'Within acceptable FMV range' };
  }

  async applyCPIEscalator(
    basePrice: number,
    startYear: number,
    currentYear: number
  ): Promise<number> {
    // Use Statistics Canada CPI data
    const cpiData = await this.getCPIData(startYear, currentYear);
    const escalationRate = cpiData.cumulativeRate;
    
    return basePrice * (1 + escalationRate);
  }

  async conductThreeBidProcess(
    rfpId: string
  ): Promise<{ winner: Bid; isCompliant: boolean }> {
    const bids = await db.query.bids.findMany({
      where: eq(bids.rfpId, rfpId)
    });

    if (bids.length < 3) {
      throw new Error('Minimum 3 bids required for joint-trust contracts');
    }

    // Evaluate bids based on price and qualifications
    const qualifiedBids = bids.filter(b => b.meetsMinimumQualifications);
    
    if (qualifiedBids.length < 3) {
      throw new Error('Need at least 3 qualified bidders');
    }

    const sortedBids = qualifiedBids.sort((a, b) => a.price - b.price);
    const winner = sortedBids[0];

    return {
      winner,
      isCompliant: true
    };
  }

  private async getCPIData(startYear: number, endYear: number): Promise<CPIData> {
    // Statistics Canada Table: 18-10-0004-01
    // Consumer Price Index, annual average
    const response = await fetch(
      \`https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401\`
    );
    
    // Calculate cumulative CPI change
    // Example: 2020 CPI = 136.0, 2025 CPI = 152.3
    // Escalation = (152.3 - 136.0) / 136.0 = 0.120 (12%)
    
    return {
      startCPI: 136.0,
      endCPI: 152.3,
      cumulativeRate: 0.120
    };
  }
}

// db/schema/joint-trust-schema.ts
export const jointTrustContracts = pgTable('joint_trust_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  trustName: text('trust_name').notNull(),
  serviceName: text('service_name').notNull(),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  hasCPIEscalator: boolean('has_cpi_escalator').default(true),
  lastEscalation: timestamp('last_escalation'),
  fmvBenchmarks: jsonb('fmv_benchmarks'), // Array of comparable prices
  bidCount: integer('bid_count'),
  selectedBidReason: text('selected_bid_reason'),
});
`;
  }
}
