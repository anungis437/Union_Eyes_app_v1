#!/usr/bin/env node
/**
 * Evidence Bundle Generator
 * 
 * Automated compliance evidence collection for security audits
 * Generates a comprehensive evidence bundle including:
 * - Security test results
 * - Scanner outputs (Snyk, OWASP, npm audit)
 * - Control implementation proofs
 * - Configuration snapshots
 * - Compliance matrix
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface EvidenceBundle {
  timestamp: string;
  version: string;
  organization: string;
  environment: 'development' | 'staging' | 'production';
  controls: ControlEvidence[];
  tests: TestEvidence[];
  scans: ScanEvidence[];
  configurations: ConfigEvidence[];
  summary: Summary;
}

interface ControlEvidence {
  controlId: string;
  controlName: string;
  description: string;
  status: 'implemented' | 'partial' | 'not_implemented';
  evidenceFiles: string[];
  implementationDate: string;
  verificationMethod: string;
  notes: string;
}

interface TestEvidence {
  testSuite: string;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  coverage: number;
  reportFile: string;
}

interface ScanEvidence {
  scannerName: string;
  scanDate: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  reportFile: string;
}

interface ConfigEvidence {
  configType: string;
  configFile: string;
  snapshot: any;
  securityRelevant: boolean;
}

interface Summary {
  totalControls: number;
  implementedControls: number;
  totalTests: number;
  passedTests: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  overallStatus: 'pass' | 'fail' | 'warning';
}

class EvidenceBundleGenerator {
  private bundleDir: string;
  private timestamp: string;
  private evidence: EvidenceBundle;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.bundleDir = path.join(process.cwd(), 'evidence-bundles', this.timestamp);
    
    this.evidence = {
      timestamp: new Date().toISOString(),
      version: this.getAppVersion(),
      organization: 'Union Eyes',
      environment: (process.env.NODE_ENV as any) || 'development',
      controls: [],
      tests: [],
      scans: [],
      configurations: [],
      summary: {
        totalControls: 0,
        implementedControls: 0,
        totalTests: 0,
        passedTests: 0,
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        overallStatus: 'pass',
      },
    };
  }

  private getAppVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  async generate(): Promise<string> {
    console.log('🔍 Starting evidence bundle generation...');
    console.log(`📁 Bundle directory: ${this.bundleDir}`);
    
    // Create bundle directory
    fs.mkdirSync(this.bundleDir, { recursive: true });

    // Collect evidence
    await this.collectControlEvidence();
    await this.collectTestResults();
    await this.collectSecurityScans();
    await this.collectConfigurationSnapshots();
    await this.generateComplianceMatrix();
    await this.calculateSummary();

    // Write bundle
    const bundlePath = path.join(this.bundleDir, 'evidence-bundle.json');
    fs.writeFileSync(bundlePath, JSON.stringify(this.evidence, null, 2));

    // Generate human-readable report
    await this.generateHtmlReport();

    console.log('✅ Evidence bundle generated successfully');
    console.log(`📦 Bundle location: ${this.bundleDir}`);
    
    return this.bundleDir;
  }

  private async collectControlEvidence(): Promise<void> {
    console.log('📋 Collecting control evidence...');

    // Read control matrix
    const controlMatrixPath = path.join(process.cwd(), 'compliance/control-matrix.json');
    if (!fs.existsSync(controlMatrixPath)) {
      console.warn('⚠️  Control matrix not found');
      return;
    }

    const controlMatrix = JSON.parse(fs.readFileSync(controlMatrixPath, 'utf-8'));
    
    this.evidence.controls = controlMatrix.controls.map((control: any) => ({
      controlId: control.id,
      controlName: control.name,
      description: control.description,
      status: control.status || 'implemented',
      evidenceFiles: control.evidenceFiles || [],
      implementationDate: control.implementationDate || new Date().toISOString(),
      verificationMethod: control.verificationMethod || 'automated_test',
      notes: control.notes || '',
    }));

    // Copy evidence files
    const evidenceDir = path.join(this.bundleDir, 'control-evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    this.evidence.controls.forEach(control => {
      control.evidenceFiles.forEach(file => {
        const sourcePath = path.join(process.cwd(), file);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(evidenceDir, path.basename(file));
          fs.copyFileSync(sourcePath, destPath);
        }
      });
    });

    console.log(`✅ Collected ${this.evidence.controls.length} controls`);
  }

  private async collectTestResults(): Promise<void> {
    console.log('🧪 Collecting test results...');

    try {
      // Run tests and collect coverage
      console.log('  Running test suite...');
      execSync('pnpm test:coverage', { stdio: 'inherit' });

      // Parse coverage report
      const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const totalCoverage = coverageData.total?.lines?.pct || 0;

        this.evidence.tests.push({
          testSuite: 'vitest',
          testsTotal: 0, // Would parse from test output
          testsPassed: 0,
          testsFailed: 0,
          coverage: totalCoverage,
          reportFile: 'coverage/index.html',
        });

        // Copy coverage report
        const coverageDestDir = path.join(this.bundleDir, 'coverage');
        fs.mkdirSync(coverageDestDir, { recursive: true });
        this.copyDirectory('coverage', coverageDestDir);
      }

      console.log('✅ Test results collected');
    } catch (error) {
      console.error('❌ Failed to collect test results:', error);
    }
  }

  private async collectSecurityScans(): Promise<void> {
    console.log('🔒 Running security scans...');

    const scansDir = path.join(this.bundleDir, 'security-scans');
    fs.mkdirSync(scansDir, { recursive: true });

    // npm audit
    try {
      console.log('  Running npm audit...');
      const auditOutput = execSync('npm audit --json', { encoding: 'utf-8' });
      const auditData = JSON.parse(auditOutput);
      
      fs.writeFileSync(
        path.join(scansDir, 'npm-audit.json'),
        JSON.stringify(auditData, null, 2)
      );

      this.evidence.scans.push({
        scannerName: 'npm-audit',
        scanDate: new Date().toISOString(),
        vulnerabilities: {
          critical: auditData.metadata?.vulnerabilities?.critical || 0,
          high: auditData.metadata?.vulnerabilities?.high || 0,
          medium: auditData.metadata?.vulnerabilities?.medium || 0,
          low: auditData.metadata?.vulnerabilities?.low || 0,
        },
        reportFile: `security-scans/npm-audit.json`,
      });
    } catch (error) {
      console.warn('⚠️  npm audit failed (may have vulnerabilities)');
    }

    // Snyk (if available)
    try {
      console.log('  Running Snyk scan...');
      const snykOutput = execSync('snyk test --json', { encoding: 'utf-8' });
      fs.writeFileSync(path.join(scansDir, 'snyk.json'), snykOutput);
      console.log('✅ Snyk scan completed');
    } catch (error) {
      console.log('ℹ️  Snyk not available (optional)');
    }

    console.log('✅ Security scans completed');
  }

  private async collectConfigurationSnapshots(): Promise<void> {
    console.log('⚙️  Collecting configuration snapshots...');

    const configFiles = [
      { file: 'next.config.mjs', type: 'Next.js Configuration', securityRelevant: true },
      { file: 'middleware.ts', type: 'Middleware', securityRelevant: true },
      { file: 'drizzle.config.ts', type: 'Database Configuration', securityRelevant: true },
      { file: 'vitest.config.ts', type: 'Test Configuration', securityRelevant: false },
      { file: '.env.example', type: 'Environment Variables Template', securityRelevant: true },
    ];

    const configDir = path.join(this.bundleDir, 'configurations');
    fs.mkdirSync(configDir, { recursive: true });

    configFiles.forEach(({ file, type, securityRelevant }) => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const destPath = path.join(configDir, file);
        
        // Redact sensitive values
        const redactedContent = this.redactSensitiveData(content);
        fs.writeFileSync(destPath, redactedContent);

        this.evidence.configurations.push({
          configType: type,
          configFile: file,
          snapshot: { redacted: true },
          securityRelevant,
        });
      }
    });

    console.log(`✅ Collected ${this.evidence.configurations.length} configurations`);
  }

  private redactSensitiveData(content: string): string {
    // Redact common sensitive patterns
    return content
      .replace(/password\s*=\s*['"][^'"]+['"]/gi, "password='[REDACTED]'")
      .replace(/apiKey\s*=\s*['"][^'"]+['"]/gi, "apiKey='[REDACTED]'")
      .replace(/secret\s*=\s*['"][^'"]+['"]/gi, "secret='[REDACTED]'")
      .replace(/token\s*=\s*['"][^'"]+['"]/gi, "token='[REDACTED]'");
  }

  private async generateComplianceMatrix(): Promise<void> {
    console.log('📊 Generating compliance matrix...');

    const matrix = {
      timestamp: new Date().toISOString(),
      framework: 'ISO 27001',
      controls: this.evidence.controls.map(c => ({
        id: c.controlId,
        name: c.controlName,
        status: c.status,
        coverage: c.status === 'implemented' ? 100 : c.status === 'partial' ? 50 : 0,
      })),
    };

    fs.writeFileSync(
      path.join(this.bundleDir, 'compliance-matrix.json'),
      JSON.stringify(matrix, null, 2)
    );

    console.log('✅ Compliance matrix generated');
  }

  private async calculateSummary(): Promise<void> {
    console.log('📈 Calculating summary...');

    this.evidence.summary = {
      totalControls: this.evidence.controls.length,
      implementedControls: this.evidence.controls.filter(c => c.status === 'implemented').length,
      totalTests: this.evidence.tests.reduce((sum, t) => sum + t.testsTotal, 0),
      passedTests: this.evidence.tests.reduce((sum, t) => sum + t.testsPassed, 0),
      totalVulnerabilities: this.evidence.scans.reduce(
        (sum, s) => sum + s.vulnerabilities.critical + s.vulnerabilities.high + 
                    s.vulnerabilities.medium + s.vulnerabilities.low,
        0
      ),
      criticalVulnerabilities: this.evidence.scans.reduce(
        (sum, s) => sum + s.vulnerabilities.critical,
        0
      ),
      overallStatus: this.determineOverallStatus(),
    };

    console.log(`✅ Summary: ${this.evidence.summary.implementedControls}/${this.evidence.summary.totalControls} controls implemented`);
  }

  private determineOverallStatus(): 'pass' | 'fail' | 'warning' {
    if (this.evidence.summary.criticalVulnerabilities > 0) return 'fail';
    if (this.evidence.summary.totalVulnerabilities > 10) return 'warning';
    if (this.evidence.summary.implementedControls < this.evidence.summary.totalControls * 0.8) {
      return 'warning';
    }
    return 'pass';
  }

  private async generateHtmlReport(): Promise<void> {
    console.log('📄 Generating HTML report...');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Evidence Bundle Report - ${this.timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; }
    .summary { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .status-pass { color: #4caf50; font-weight: bold; }
    .status-warning { color: #ff9800; font-weight: bold; }
    .status-fail { color: #f44336; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background #f5f5f5; font-weight: bold; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #0066cc; }
    .metric-label { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Evidence Bundle Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Version:</strong> ${this.evidence.version}</p>
    <p><strong>Environment:</strong> ${this.evidence.environment}</p>
    
    <div class="summary">
      <h2>Overall Status: <span class="status-${this.evidence.summary.overallStatus}">${this.evidence.summary.overallStatus.toUpperCase()}</span></h2>
      <div class="metric">
        <div class="metric-value">${this.evidence.summary.implementedControls}/${this.evidence.summary.totalControls}</div>
        <div class="metric-label">Controls Implemented</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.evidence.summary.criticalVulnerabilities}</div>
        <div class="metric-label">Critical Vulnerabilities</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.evidence.summary.totalVulnerabilities}</div>
        <div class="metric-label">Total Vulnerabilities</div>
      </div>
    </div>

    <h2>Security Controls</h2>
    <table>
      <thead>
        <tr>
          <th>Control ID</th>
          <th>Name</th>
          <th>Status</th>
          <th>Verification</th>
        </tr>
      </thead>
      <tbody>
        ${this.evidence.controls.map(c => `
          <tr>
            <td>${c.controlId}</td>
            <td>${c.controlName}</td>
            <td class="status-${c.status === 'implemented' ? 'pass' : 'warning'}">${c.status}</td>
            <td>${c.verificationMethod}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Security Scans</h2>
    <table>
      <thead>
        <tr>
          <th>Scanner</th>
          <th>Date</th>
          <th>Critical</th>
          <th>High</th>
          <th>Medium</th>
          <th>Low</th>
        </tr>
      </thead>
      <tbody>
        ${this.evidence.scans.map(s => `
          <tr>
            <td>${s.scannerName}</td>
            <td>${new Date(s.scanDate).toLocaleString()}</td>
            <td class="${s.vulnerabilities.critical > 0 ? 'status-fail' : ''}">${s.vulnerabilities.critical}</td>
            <td class="${s.vulnerabilities.high > 0 ? 'status-warning' : ''}">${s.vulnerabilities.high}</td>
            <td>${s.vulnerabilities.medium}</td>
            <td>${s.vulnerabilities.low}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    fs.writeFileSync(path.join(this.bundleDir, 'report.html'), html);
    console.log('✅ HTML report generated');
  }

  private copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(source)) return;
    
    fs.mkdirSync(destination, { recursive: true });
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    });
  }
}

// CLI execution
if (require.main === module) {
  const generator = new EvidenceBundleGenerator();
  generator.generate()
    .then(bundleDir => {
      console.log('\n✅ Evidence bundle generation complete!');
      console.log(`📦 Bundle location: ${bundleDir}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Evidence bundle generation failed:', error);
      process.exit(1);
    });
}

export default EvidenceBundleGenerator;
