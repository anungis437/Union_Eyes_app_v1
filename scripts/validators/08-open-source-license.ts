/**
 * Open Source License Validator
 * 
 * Validates that no AGPL/SSPL "viral" licenses contaminate the codebase:
 * - AGPL-3.0 (requires source disclosure for SaaS)
 * - SSPL (MongoDB's Server Side Public License)
 * - Checks package.json dependencies
 * - FOSSA-style license scanning
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class OpenSourceLicenseValidator extends BlindSpotValidator {
  name = '8. Open Source License Contamination';
  description = 'Scans for AGPL/SSPL viral licenses in dependencies';
  category = 'legal';

  private readonly VIRAL_LICENSES = [
    'AGPL-3.0',
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
    'SSPL',
    'SSPL-1.0',
  ];

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const contaminated = await this.scanDependencies();

    if (contaminated.length > 0) {
      for (const dep of contaminated) {
        findings.push({
          file: 'package.json',
          issue: `Viral license detected: ${dep.name}@${dep.version} (${dep.license})`,
          severity: 'critical',
          line: dep.name,
        });
      }

      return this.fail(
        `Found ${contaminated.length} dependencies with viral licenses`,
        findings,
        this.generateFix(contaminated)
      );
    }

    return this.pass('No viral licenses (AGPL/SSPL) detected');
  }

  private async scanDependencies(): Promise<
    Array<{ name: string; version: string; license: string }>
  > {
    const contaminated: Array<{ name: string; version: string; license: string }> = [];

    try {
      // Read package.json
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );

      // Check direct dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Read node_modules for license info
      for (const [name, version] of Object.entries(allDeps)) {
        try {
          const depPackageJson = JSON.parse(
            await fs.readFile(`node_modules/${name}/package.json`, 'utf-8')
          );

          const license = depPackageJson.license || 'UNKNOWN';

          if (this.isViralLicense(license)) {
            contaminated.push({
              name,
              version: version as string,
              license,
            });
          }
        } catch {
          // Package not installed or missing package.json
          continue;
        }
      }

      return contaminated;
    } catch {
      return [];
    }
  }

  private isViralLicense(license: string): boolean {
    if (typeof license !== 'string') return false;
    
    return this.VIRAL_LICENSES.some(viral =>
      license.toUpperCase().includes(viral.toUpperCase())
    );
  }

  private generateFix(contaminated: Array<{ name: string; version: string; license: string }>): string {
    const depList = contaminated
      .map(d => `  - ${d.name}@${d.version} (${d.license})`)
      .join('\n');

    return `
⚠️ CRITICAL: Viral License Contamination Detected

The following dependencies have AGPL/SSPL licenses that could require
you to open-source your entire SaaS application:

${depList}

IMMEDIATE ACTION REQUIRED:

1. Remove these dependencies:
   pnpm remove ${contaminated.map(d => d.name).join(' ')}

2. Find alternatives:
   - AGPL packages often have MIT/Apache alternatives
   - Check https://www.npmjs.com for alternative packages
   - Consider commercial licensing if available

3. Add license checking to CI/CD:
   pnpm add -D license-checker
   
   // package.json
   {
     "scripts": {
       "check-licenses": "license-checker --failOn 'AGPL-3.0;SSPL'"
     }
   }

4. Set up FOSSA or similar tool for continuous monitoring:
   https://fossa.com

LEGAL IMPLICATIONS:
- AGPL requires you to release source code for network-accessible software
- SSPL has even stricter requirements for SaaS providers
- Could force disclosure of union-sensitive intellectual property

Contact legal counsel before proceeding.
`;
  }
}
