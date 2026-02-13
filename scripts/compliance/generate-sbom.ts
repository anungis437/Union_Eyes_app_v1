#!/usr/bin/env node
/**
 * SBOM (Software Bill of Materials) Generator
 * 
 * Generates CycloneDX and SPDX format SBOMs for compliance and security.
 * 
 * Usage:
 *   pnpm generate:sbom
 *   pnpm generate:sbom --output ./sbom
 * 
 * Outputs:
 *   - sbom.cyclonedx.json (CycloneDX format)
 *   - sbom.spdx.json (SPDX format)
 *   - license-compliance.json (License analysis)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface SBOMOptions {
  outputDir?: string;
  format?: 'cyclonedx' | 'spdx' | 'both';
  includeDev?: boolean;
}

interface LicenseInfo {
  package: string;
  version: string;
  license: string;
  isApproved: boolean;
  risk: 'low' | 'medium' | 'high';
}

// Approved licenses (permissive open source)
const APPROVED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
];

// High-risk licenses (copyleft, proprietary)
const HIGH_RISK_LICENSES = [
  'GPL',
  'AGPL',
  'LGPL',
  'SSPL',
  'BUSL',
  'Proprietary',
  'UNLICENSED',
];

class SBOMGenerator {
  private outputDir: string;
  private projectRoot: string;

  constructor(options: SBOMOptions = {}) {
    this.projectRoot = process.cwd();
    this.outputDir = options.outputDir || join(this.projectRoot, 'compliance', 'sbom');
    
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate all SBOM formats
   */
  async generateAll(): Promise<void> {
    console.log('🔍 Generating Software Bill of Materials (SBOM)...\n');

    try {
      // Generate CycloneDX SBOM
      await this.generateCycloneDX();
      
      // Generate SPDX SBOM
      await this.generateSPDX();
      
      // Analyze licenses
      await this.analyzeLicenses();
      
      // Generate summary
      this.generateSummary();
      
      console.log('\n✅ SBOM generation complete!');
      console.log(`📁 Output directory: ${this.outputDir}\n`);
      
    } catch (error) {
      console.error('❌ SBOM generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Generate CycloneDX format SBOM
   */
  private async generateCycloneDX(): Promise<void> {
    console.log('📦 Generating CycloneDX SBOM...');
    
    try {
      // Use npm's built-in SBOM generation (requires npm 9+)
      const output = execSync('npm sbom --sbom-format cyclonedx', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      
      const outputPath = join(this.outputDir, 'sbom.cyclonedx.json');
      writeFileSync(outputPath, output);
      
      console.log(`  ✓ CycloneDX SBOM saved to: ${outputPath}`);
    } catch (error) {
      console.warn('  ⚠ npm sbom command failed, using fallback method...');
      
      // Fallback: Generate from package.json and pnpm-lock.yaml
      const sbom = this.generateCycloneDXFallback();
      const outputPath = join(this.outputDir, 'sbom.cyclonedx.json');
      writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
      
      console.log(`  ✓ CycloneDX SBOM (fallback) saved to: ${outputPath}`);
    }
  }

  /**
   * Generate SPDX format SBOM
   */
  private async generateSPDX(): Promise<void> {
    console.log('📦 Generating SPDX SBOM...');
    
    try {
      // Use pnpm to list dependencies
      const depsOutput = execSync('pnpm list --json --depth Infinity', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      
      const deps = JSON.parse(depsOutput);
      const spdx = this.convertToSPDX(deps);
      
      const outputPath = join(this.outputDir, 'sbom.spdx.json');
      writeFileSync(outputPath, JSON.stringify(spdx, null, 2));
      
      console.log(`  ✓ SPDX SBOM saved to: ${outputPath}`);
    } catch (error) {
      console.error('  ✗ SPDX generation failed:', error);
    }
  }

  /**
   * Analyze license compliance
   */
  private async analyzeLicenses(): Promise<void> {
    console.log('📋 Analyzing license compliance...');
    
    try {
      // Use pnpm to get license info
      const licenseOutput = execSync('pnpm licenses list --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      
      const licenses: LicenseInfo[] = this.parseLicenses(licenseOutput);
      
      const analysis = {
        totalPackages: licenses.length,
        approved: licenses.filter(l => l.isApproved).length,
        highRisk: licenses.filter(l => l.risk === 'high').length,
        mediumRisk: licenses.filter(l => l.risk === 'medium').length,
        lowRisk: licenses.filter(l => l.risk === 'low').length,
        licenses: licenses,
        summary: this.getLicenseSummary(licenses),
        generatedAt: new Date().toISOString(),
      };
      
      const outputPath = join(this.outputDir, 'license-compliance.json');
      writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
      
      console.log(`  ✓ License analysis saved to: ${outputPath}`);
      console.log(`  📊 Total packages: ${analysis.totalPackages}`);
      console.log(`  ✓ Approved: ${analysis.approved}`);
      console.log(`  ⚠ High risk: ${analysis.highRisk}`);
      
      if (analysis.highRisk > 0) {
        console.warn('\n  ⚠️  WARNING: High-risk licenses detected!');
        const highRiskPackages = licenses.filter(l => l.risk === 'high');
        highRiskPackages.forEach(pkg => {
          console.warn(`     - ${pkg.package}@${pkg.version}: ${pkg.license}`);
        });
      }
      
    } catch (error) {
      console.error('  ✗ License analysis failed:', error);
    }
  }

  /**
   * Parse license information from pnpm output
   */
  private parseLicenses(output: string): LicenseInfo[] {
    try {
      const data = JSON.parse(output);
      const licenses: LicenseInfo[] = [];
      
      // Parse pnpm license format
      if (Array.isArray(data)) {
        for (const item of data) {
          const license = item.license || 'UNKNOWN';
          const isApproved = APPROVED_LICENSES.includes(license);
          const isHighRisk = HIGH_RISK_LICENSES.some(hl => license.includes(hl));
          
          licenses.push({
            package: item.name || 'unknown',
            version: item.version || 'unknown',
            license: license,
            isApproved: isApproved,
            risk: isHighRisk ? 'high' : isApproved ? 'low' : 'medium',
          });
        }
      }
      
      return licenses;
    } catch (error) {
      console.error('Error parsing licenses:', error);
      return [];
    }
  }

  /**
   * Get license summary (counts per license type)
   */
  private getLicenseSummary(licenses: LicenseInfo[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const license of licenses) {
      const key = license.license;
      summary[key] = (summary[key] || 0) + 1;
    }
    
    return summary;
  }

  /**
   * Generate CycloneDX SBOM (fallback method)
   */
  private generateCycloneDXFallback(): any {
    const packageJson = require(join(this.projectRoot, 'package.json'));
    
    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'Union Eyes',
            name: 'SBOM Generator',
            version: '1.0.0',
          },
        ],
        component: {
          type: 'application',
          name: packageJson.name || 'union-eyes',
          version: packageJson.version || '0.0.0',
          description: packageJson.description || '',
        },
      },
      components: this.getDependenciesForCycloneDX(),
    };
  }

  /**
   * Get dependencies in CycloneDX format
   */
  private getDependenciesForCycloneDX(): any[] {
    try {
      const depsOutput = execSync('pnpm list --json --depth 1', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      
      const deps = JSON.parse(depsOutput);
      const components: any[] = [];
      
      if (Array.isArray(deps)) {
        for (const dep of deps) {
          if (dep.dependencies) {
            for (const [name, info] of Object.entries(dep.dependencies)) {
              components.push({
                type: 'library',
                name: name,
                version: (info as any).version || 'unknown',
                purl: `pkg:npm/${name}@${(info as any).version || 'unknown'}`,
              });
            }
          }
        }
      }
      
      return components;
    } catch (error) {
      console.error('Error getting dependencies:', error);
      return [];
    }
  }

  /**
   * Convert dependency tree to SPDX format
   */
  private convertToSPDX(deps: any): any {
    const packageJson = require(join(this.projectRoot, 'package.json'));
    
    return {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: packageJson.name || 'union-eyes',
      documentNamespace: `https://sbom.union-eyes.app/${packageJson.version || '0.0.0'}/${Date.now()}`,
      creationInfo: {
        created: new Date().toISOString(),
        creators: ['Tool: Union Eyes SBOM Generator'],
      },
      packages: this.getDependenciesForSPDX(deps),
    };
  }

  /**
   * Get dependencies in SPDX format
   */
  private getDependenciesForSPDX(deps: any): any[] {
    const packages: any[] = [];
    
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        if (dep.dependencies) {
          let index = 0;
          for (const [name, info] of Object.entries(dep.dependencies)) {
            packages.push({
              SPDXID: `SPDXRef-Package-${index++}`,
              name: name,
              versionInfo: (info as any).version || 'unknown',
              downloadLocation: `https://registry.npmjs.org/${name}/-/${name}-${(info as any).version || 'unknown'}.tgz`,
              filesAnalyzed: false,
            });
          }
        }
      }
    }
    
    return packages;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(): void {
    const summary = {
      generatedAt: new Date().toISOString(),
      formats: ['CycloneDX', 'SPDX'],
      outputDirectory: this.outputDir,
      files: [
        'sbom.cyclonedx.json',
        'sbom.spdx.json',
        'license-compliance.json',
      ],
    };
    
    const outputPath = join(this.outputDir, 'README.md');
    const content = `# SBOM Generation Summary

**Generated:** ${summary.generatedAt}

## Files Generated

- \`sbom.cyclonedx.json\` - CycloneDX format SBOM
- \`sbom.spdx.json\` - SPDX format SBOM
- \`license-compliance.json\` - License analysis report

## Standards Compliance

- **CycloneDX:** Industry-standard SBOM format for security and compliance
- **SPDX:** Linux Foundation standard for software package data exchange
- **License Analysis:** Automated risk assessment of package licenses

## Usage

These SBOMs can be:
- Submitted to security scanning tools (Snyk, Dependabot, etc.)
- Included in compliance audit packages
- Used for vulnerability tracking
- Shared with customers for transparency

## Verification

\`\`\`bash
# Verify CycloneDX format
cat sbom.cyclonedx.json | jq '.bomFormat'
# Expected: "CycloneDX"

# Verify SPDX format
cat sbom.spdx.json | jq '.spdxVersion'
# Expected: "SPDX-2.3"

# Check license compliance
cat license-compliance.json | jq '.summary'
\`\`\`

## Regeneration

\`\`\`bash
pnpm generate:sbom
\`\`\`

---

**Generated by:** Union Eyes SBOM Generator v1.0  
**Project:** Union Eyes - Union Management System
`;
    
    writeFileSync(outputPath, content);
    console.log(`  ✓ Summary saved to: ${outputPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  const generator = new SBOMGenerator({ outputDir });
  generator.generateAll().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SBOMGenerator };
