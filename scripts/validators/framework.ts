/**
 * Union-OS Blind-Spot Validator Framework
 * 
 * Runs compliance checks for union-specific requirements
 * that traditional SaaS audits miss.
 */

export interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  findings?: ValidationFinding[];
  fix?: string;
}

export interface ValidationFinding {
  file: string;
  line?: number;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export abstract class BlindSpotValidator {
  abstract name: string;
  abstract description: string;
  abstract category: string;

  abstract validate(): Promise<ValidationResult>;

  protected createResult(
    status: ValidationResult['status'],
    message: string,
    findings?: ValidationFinding[],
    fix?: string
  ): ValidationResult {
    return {
      check: this.name,
      status,
      message,
      findings,
      fix,
    };
  }

  protected pass(message: string): ValidationResult {
    return this.createResult('PASS', message);
  }

  protected fail(
    message: string,
    findings: ValidationFinding[],
    fix?: string
  ): ValidationResult {
    return this.createResult('FAIL', message, findings, fix);
  }

  protected warn(
    message: string,
    findings?: ValidationFinding[],
    fix?: string
  ): ValidationResult {
    return this.createResult('WARN', message, findings, fix);
  }
}

export class ValidatorRunner {
  private validators: BlindSpotValidator[] = [];

  register(validator: BlindSpotValidator) {
    this.validators.push(validator);
  }

  async runAll(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validator of this.validators) {
      console.log(`\nRunning: ${validator.name}...`);
      try {
        const result = await validator.validate();
        results.push(result);
        this.printResult(result);
      } catch (error: unknown) {
        results.push({
          check: validator.name,
          status: 'FAIL',
          message: `Validator error: ${error.message}`,
        });
      }
    }

    return results;
  }

  async runByCategory(category: string): Promise<ValidationResult[]> {
    const filtered = this.validators.filter((v) => v.category === category);
    const results: ValidationResult[] = [];

    for (const validator of filtered) {
      const result = await validator.validate();
      results.push(result);
      this.printResult(result);
    }

    return results;
  }

  private printResult(result: ValidationResult) {
    const icon =
      result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}: ${result.status}`);
    console.log(`   ${result.message}`);

    if (result.findings && result.findings.length > 0) {
      console.log(`   Findings:`);
      result.findings.forEach((f) => {
        console.log(
          `     - ${f.file}${f.line ? `:${f.line}` : ''} [${f.severity}] ${f.issue}`
        );
      });
    }

    if (result.fix) {
      console.log(`   Fix: ${result.fix}`);
    }
  }

  generateReport(): string {
    const results = this.validators.map((v) => v.validate());
    // TODO: Generate markdown report
    return '';
  }
}
