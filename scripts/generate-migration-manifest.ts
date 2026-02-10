/**
 * Migration Manifest Generator
 * 
 * Generates a cryptographically verifiable manifest of all database migrations
 * 
 * Output includes:
 * - Repository commit hash
 * - List of migrations in order
 * - SHA-256 hash of each migration file
 * - Metadata (description, applied status)
 * 
 * Usage:
 *   pnpm tsx scripts/generate-migration-manifest.ts
 *   pnpm tsx scripts/generate-migration-manifest.ts --output=manifest.json
 *   pnpm tsx scripts/generate-migration-manifest.ts --markdown > MANIFEST.md
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIGRATIONS_DIR = 'db/migrations';
const OUTPUT_FORMATS = ['json', 'markdown', 'console'] as const;
type OutputFormat = typeof OUTPUT_FORMATS[number];

// ============================================================================
// TYPES
// ============================================================================

interface MigrationEntry {
  id: string;
  filename: string;
  sha256: string;
  size: number;
  description: string;
  applied: boolean | 'unknown';
}

interface MigrationManifest {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  timestamp: string;
  migrationsDir: string;
  totalMigrations: number;
  migrations: MigrationEntry[];
}

// ============================================================================
// UTILITIES
// ============================================================================

function getGitInfo(): { commit: string; branch: string; commitShort: string } {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { commit, branch, commitShort };
  } catch (error) {
    return { 
      commit: process.env.GITHUB_SHA || 'unknown',
      commitShort: process.env.GITHUB_SHA?.substring(0, 7) || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
    };
  }
}

function calculateSHA256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractDescription(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Look for description in comments at top of file
  for (const line of lines.slice(0, 10)) {
    const match = line.match(/--\s*(.+)/);
    if (match && !match[1].includes('Migration')) {
      return match[1].trim();
    }
  }
  
  // Derive from filename
  const basename = path.basename(filePath, '.sql');
  const parts = basename.split('_').slice(1); // Remove number prefix
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// ============================================================================
// MANIFEST GENERATION
// ============================================================================

function generateManifest(): MigrationManifest {
  const gitInfo = getGitInfo();
  const migrationsPath = path.join(process.cwd(), MIGRATIONS_DIR);
  
  // Read all .sql files in migrations directory
  const files = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  const migrations: MigrationEntry[] = files.map(filename => {
    const filePath = path.join(migrationsPath, filename);
    const stats = fs.statSync(filePath);
    const id = filename.match(/^(\d+)_/)?.[1] || '0000';
    
    return {
      id,
      filename,
      sha256: calculateSHA256(filePath),
      size: stats.size,
      description: extractDescription(filePath),
      applied: 'unknown' as const, // Would need DB connection to verify
    };
  });
  
  return {
    repository: 'anungis437/Union_Eyes_app_v1',
    branch: gitInfo.branch,
    commit: gitInfo.commit,
    commitShort: gitInfo.commitShort,
    timestamp: new Date().toISOString(),
    migrationsDir: MIGRATIONS_DIR,
    totalMigrations: migrations.length,
    migrations,
  };
}

// ============================================================================
// OUTPUT FORMATTERS
// ============================================================================

function formatJSON(manifest: MigrationManifest): string {
  return JSON.stringify(manifest, null, 2);
}

function formatMarkdown(manifest: MigrationManifest): string {
  const lines: string[] = [
    '# Migration Manifest',
    '',
    '**Auto-generated cryptographic verification for database migrations**',
    '',
    '## Repository State',
    '',
    `- **Repository:** \`${manifest.repository}\``,
    `- **Branch:** \`${manifest.branch}\``,
    `- **Commit:** \`${manifest.commit}\``,
    `- **Short Commit:** \`${manifest.commitShort}\``,
    `- **Generated:** ${manifest.timestamp}`,
    `- **Migrations Directory:** \`${manifest.migrationsDir}\``,
    `- **Total Migrations:** ${manifest.totalMigrations}`,
    '',
    '## Migration Files',
    '',
    '| ID | Filename | SHA-256 Hash | Size | Description |',
    '|----|----------|--------------|------|-------------|',
  ];
  
  manifest.migrations.forEach(m => {
    const shortHash = `${m.sha256.substring(0, 8)}...${m.sha256.substring(56)}`;
    const sizeKB = (m.size / 1024).toFixed(2);
    lines.push(`| ${m.id} | ${m.filename} | \`${shortHash}\` | ${sizeKB} KB | ${m.description} |`);
  });
  
  lines.push('');
  lines.push('## Verification');
  lines.push('');
  lines.push('To verify a migration file integrity:');
  lines.push('');
  lines.push('```bash');
  lines.push('# Linux/macOS');
  lines.push(`shasum -a 256 ${manifest.migrationsDir}/<filename>.sql`);
  lines.push('');
  lines.push('# Windows (PowerShell)');
  lines.push(`Get-FileHash -Algorithm SHA256 ${manifest.migrationsDir}\\<filename>.sql`);
  lines.push('```');
  lines.push('');
  lines.push('Compare the output with the SHA-256 hash in this manifest.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Generated by `scripts/generate-migration-manifest.ts`*');
  lines.push('');
  
  return lines.join('\n');
}

function formatConsole(manifest: MigrationManifest): string {
  const lines: string[] = [
    '━'.repeat(80),
    '📋 MIGRATION MANIFEST',
    '━'.repeat(80),
    '',
    `Repository:  ${manifest.repository}`,
    `Branch:      ${manifest.branch}`,
    `Commit:      ${manifest.commitShort} (${manifest.commit})`,
    `Generated:   ${manifest.timestamp}`,
    `Directory:   ${manifest.migrationsDir}`,
    `Total:       ${manifest.totalMigrations} migrations`,
    '',
    '━'.repeat(80),
    'MIGRATION FILES',
    '━'.repeat(80),
    '',
  ];
  
  manifest.migrations.forEach(m => {
    lines.push(`[${m.id}] ${m.filename}`);
    lines.push(`  SHA-256: ${m.sha256}`);
    lines.push(`  Size:    ${(m.size / 1024).toFixed(2)} KB`);
    lines.push(`  Desc:    ${m.description}`);
    lines.push('');
  });
  
  lines.push('━'.repeat(80));
  lines.push('✅ Manifest generated successfully');
  lines.push('━'.repeat(80));
  lines.push('');
  
  return lines.join('\n');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  let outputFormat: OutputFormat = 'console';
  let outputFile: string | null = null;
  
  // Parse arguments
  args.forEach(arg => {
    if (arg === '--json') outputFormat = 'json';
    if (arg === '--markdown') outputFormat = 'markdown';
    if (arg.startsWith('--output=')) {
      outputFile = arg.split('=')[1];
      if (outputFile.endsWith('.json')) outputFormat = 'json';
      if (outputFile.endsWith('.md')) outputFormat = 'markdown';
    }
  });
  
  try {
    const manifest = generateManifest();
    
    let output: string;
    switch (outputFormat) {
      case 'json':
        output = formatJSON(manifest);
        break;
      case 'markdown':
        output = formatMarkdown(manifest);
        break;
      case 'console':
      default:
        output = formatConsole(manifest);
        break;
    }
    
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(`✅ Manifest written to ${outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error('❌ Failed to generate manifest:', error);
    process.exit(1);
  }
}

main();
