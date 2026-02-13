#!/usr/bin/env node
/**
 * SBOM (Software Bill of Materials) Generator
 * 
 * Generates comprehensive SBOM in CycloneDX and SPDX formats
 * for supply chain security and compliance
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

interface Package {
  name: string;
  version: string;
  license: string;
  author?: string;
  description?: string;
  repository?: string;
  dependencies?: string[];
  hash?: string;
}

interface SBOM {
  format: 'CycloneDX' | 'SPDX';
  version: string;
  timestamp: string;
  application: ApplicationMetadata;
  components: Component[];
  dependencies: Dependency[];
  vulnerabilities?: Vulnerability[];
}

interface ApplicationMetadata {
  name: string;
  version: string;
  description: string;
  supplier: string;
  authors: string[];
  license: string;
  cpe?: string;
  purl?: string;
}

interface Component {
  bomRef: string;
  type: 'library' | 'application' | 'framework' | 'operating-system';
  name: string;
  version: string;
  description?: string;
  licenses?: License[];
  hashes?: Hash[];
  purl?: string;
  externalReferences?: ExternalReference[];
  properties?: Property[];
}

interface License {
  id?: string;
  name?: string;
  url?: string;
}

interface Hash {
  alg: string;
  content: string;
}

interface ExternalReference {
  type: 'website' | 'issue-tracker' | 'vcs' | 'documentation';
  url: string;
}

interface Property {
  name: string;
  value: string;
}

interface Dependency {
  ref: string;
  dependsOn: string[];
}

interface Vulnerability {
  id: string;
  source: string;
  ratings?: VulnerabilityRating[];
  description?: string;
  references?: string[];
  affects?: string[];
}

interface VulnerabilityRating {
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  score?: number;
}

class SBOMGenerator {
  private outputDir: string;
  private packageJson: any;
  private lockFile: any;
  private timestamp: string;

  constructor(outputDir?: string) {
    this.timestamp = new Date().toISOString();
    this.outputDir = outputDir || path.join(process.cwd(), 'sbom');
    
    // Load package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    this.packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    // Load lock file (pnpm-lock.yaml or package-lock.json)
    try {
      const lockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
      if (fs.existsSync(lockPath)) {
        // For pnpm, we'll parse dependencies from package.json
        // Full pnpm-lock.yaml parsing would require yaml parser
        this.lockFile = null;
      }
    } catch {
      this.lockFile = null;
    }

    // Create output directory
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async generate(): Promise<void> {
    console.log('📦 Starting SBOM generation...');
    console.log(`📁 Output directory: ${this.outputDir}`);

    // Generate CycloneDX format
    await this.generateCycloneDX();

    // Generate SPDX format
    await this.generateSPDX();

    // Generate lightweight JSON format
    await this.generateLightweightJson();

    // Run vulnerability scan and integrate
    await this.addVulnerabilityData();

    console.log('✅ SBOM generation complete!');
  }

  private async generateCycloneDX(): Promise<void> {
    console.log('🔄 Generating CycloneDX SBOM...');

    const components: Component[] = [];
    const dependencies: Dependency[] = [];

    // Parse dependencies
    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    for (const [name, versionSpec] of Object.entries(allDeps)) {
      const version = await this.resolveVersion(name, versionSpec as string);
      const pkg = await this.getPackageInfo(name, version);

      components.push({
        bomRef: `pkg:npm/${name}@${version}`,
        type: 'library',
        name,
        version,
        description: pkg.description,
        licenses: pkg.license ? [{ id: pkg.license }] : undefined,
        purl: `pkg:npm/${name}@${version}`,
        externalReferences: pkg.repository ? [{
          type: 'vcs',
          url: pkg.repository,
        }] : undefined,
      });

      // Add dependencies
      if (pkg.dependencies) {
        dependencies.push({
          ref: `pkg:npm/${name}@${version}`,
          dependsOn: Object.keys(pkg.dependencies).map(
            dep => `pkg:npm/${dep}@${pkg.dependencies![dep]}`
          ),
        });
      }
    }

    const cycloneDX: any = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: this.timestamp,
        tools: [{
          vendor: 'Union Eyes',
          name: 'SBOM Generator',
          version: '1.0.0',
        }],
        component: {
          bomRef: `pkg:npm/${this.packageJson.name}@${this.packageJson.version}`,
          type: 'application',
          name: this.packageJson.name,
          version: this.packageJson.version,
          description: this.packageJson.description,
          licenses: this.packageJson.license ? [{
            id: this.packageJson.license,
          }] : undefined,
        },
      },
      components,
      dependencies,
    };

    const outputPath = path.join(this.outputDir, 'sbom-cyclonedx.json');
    fs.writeFileSync(outputPath, JSON.stringify(cycloneDX, null, 2));
    console.log(`✅ CycloneDX SBOM: ${outputPath}`);
  }

  private async generateSPDX(): Promise<void> {
    console.log('🔄 Generating SPDX SBOM...');

    const packages: any[] = [];
    const relationships: any[] = [];

    // Root package
    const rootId = `SPDXRef-Package-${this.packageJson.name}`;
    packages.push({
      SPDXID: rootId,
      name: this.packageJson.name,
      versionInfo: this.packageJson.version,
      downloadLocation: this.packageJson.repository?.url || 'NOASSERTION',
      licenseConcluded: this.packageJson.license || 'NOASSERTION',
      copyrightText: `Copyright ${new Date().getFullYear()} ${this.packageJson.author || 'NOASSERTION'}`,
    });

    // Dependencies
    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    let pkgIndex = 1;
    for (const [name, versionSpec] of Object.entries(allDeps)) {
      const version = await this.resolveVersion(name, versionSpec as string);
      const pkg = await this.getPackageInfo(name, version);
      const pkgId = `SPDXRef-Package-${pkgIndex++}`;

      packages.push({
        SPDXID: pkgId,
        name,
        versionInfo: version,
        downloadLocation: pkg.repository || 'NOASSERTION',
        licenseConcluded: pkg.license || 'NOASSERTION',
        copyrightText: `Copyright ${pkg.author || 'NOASSERTION'}`,
      });

      relationships.push({
        spdxElementId: rootId,
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: pkgId,
      });
    }

    const spdx: any = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: `${this.packageJson.name}-${this.packageJson.version}`,
      documentNamespace: `https://union-eyes.app/sbom/${this.packageJson.version}/${crypto.randomUUID()}`,
      creationInfo: {
        created: this.timestamp,
        creators: ['Tool: Union Eyes SBOM Generator'],
        licenseListVersion: '3.21',
      },
      packages,
      relationships,
    };

    const outputPath = path.join(this.outputDir, 'sbom-spdx.json');
    fs.writeFileSync(outputPath, JSON.stringify(spdx, null, 2));
    console.log(`✅ SPDX SBOM: ${outputPath}`);
  }

  private async generateLightweightJson(): Promise<void> {
    console.log('🔄 Generating lightweight JSON SBOM...');

    const components: any[] = [];
    
    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    for (const [name, versionSpec] of Object.entries(allDeps)) {
      const version = await this.resolveVersion(name, versionSpec as string);
      const pkg = await this.getPackageInfo(name, version);

      components.push({
        name,
        version,
        license: pkg.license,
        type: this.packageJson.dependencies?.[name] ? 'production' : 'development',
        description: pkg.description?.substring(0, 200),
      });
    }

    const lightweightSBOM = {
      application: {
        name: this.packageJson.name,
        version: this.packageJson.version,
        description: this.packageJson.description,
      },
      generated: this.timestamp,
      format: 'lightweight-json',
      totalDependencies: components.length,
      productionDependencies: components.filter(c => c.type === 'production').length,
      devDependencies: components.filter(c => c.type === 'development').length,
      components: components.sort((a, b) => a.name.localeCompare(b.name)),
    };

    const outputPath = path.join(this.outputDir, 'sbom-lightweight.json');
    fs.writeFileSync(outputPath, JSON.stringify(lightweightSBOM, null, 2));
    console.log(`✅ Lightweight SBOM: ${outputPath}`);
  }

  private async addVulnerabilityData(): Promise<void> {
    console.log('🔒 Adding vulnerability data...');

    try {
      // Run npm audit to get vulnerability data
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      });
      
      const auditData = JSON.parse(auditOutput);
      
      const vulnerabilities: Vulnerability[] = [];
      
      if (auditData.vulnerabilities) {
        for (const [pkgName, vuln] of Object.entries(auditData.vulnerabilities as any)) {
          vulnerabilities.push({
            id: vuln.via?.[0]?.source?.toString() || 'UNKNOWN',
            source: 'npm-audit',
            ratings: [{
              source: 'npm',
              severity: vuln.severity,
            }],
            description: vuln.via?.[0]?.title,
            affects: [pkgName],
          });
        }
      }

      // Add vulnerability report to CycloneDX
      const cycloneDXPath = path.join(this.outputDir, 'sbom-cyclonedx.json');
      const cycloneDX = JSON.parse(fs.readFileSync(cycloneDXPath, 'utf-8'));
      cycloneDX.vulnerabilities = vulnerabilities;
      fs.writeFileSync(cycloneDXPath, JSON.stringify(cycloneDX, null, 2));

      // Generate vulnerability summary
      const summary = {
        timestamp: this.timestamp,
        totalVulnerabilities: vulnerabilities.length,
        bySeverity: {
          critical: vulnerabilities.filter(v => v.ratings?.[0]?.severity === 'critical').length,
          high: vulnerabilities.filter(v => v.ratings?.[0]?.severity === 'high').length,
          medium: vulnerabilities.filter(v => v.ratings?.[0]?.severity === 'medium').length,
          low: vulnerabilities.filter(v => v.ratings?.[0]?.severity === 'low').length,
        },
        vulnerabilities,
      };

      fs.writeFileSync(
        path.join(this.outputDir, 'vulnerabilities.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log(`✅ Found ${vulnerabilities.length} vulnerabilities`);
    } catch (error) {
      console.log('ℹ️  Vulnerability scan skipped (no vulnerabilities or audit unavailable)');
    }
  }

  private async resolveVersion(name: string, versionSpec: string): Promise<string> {
    // Remove version specifiers (^, ~, >=, etc.)
    return versionSpec.replace(/^[\^~>=<]+/, '');
  }

  private async getPackageInfo(name: string, version: string): Promise<any> {
    try {
      // Try to read from node_modules
      const pkgPath = path.join(process.cwd(), 'node_modules', name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      }
    } catch {}

    // Return minimal info
    return {
      name,
      version,
      description: '',
      license: 'UNKNOWN',
    };
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args[0];

  const generator = new SBOMGenerator(outputDir);
  generator.generate()
    .then(() => {
      console.log('\n✅ SBOM generation complete!');
      console.log(`📦 Output directory: ${generator['outputDir']}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ SBOM generation failed:', error);
      process.exit(1);
    });
}

export default SBOMGenerator;
