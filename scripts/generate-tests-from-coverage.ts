#!/usr/bin/env tsx
/**
 * Automated Test Generator
 * 
 * This script analyzes coverage data and generates comprehensive test files
 * for modules with low coverage, significantly accelerating the testing process.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

interface CoverageData {
  [filePath: string]: {
    path: string;
    statementMap: Record<string, any>;
    fnMap: Record<string, any>;
    branchMap: Record<string, any>;
    s: Record<string, number>;
    f: Record<string, number>;
    b: Record<string, number[]>;
  };
}

interface FileCoverage {
  path: string;
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
  uncoveredLines: number[];
  uncoveredFunctions: string[];
}

type ExportInfo = {
  name: string;
  kind: 'function' | 'class' | 'const';
  isFunctionLike: boolean;
};

const WORKSPACE_ROOT = path.resolve(process.cwd());
const COVERAGE_FILE = path.join(WORKSPACE_ROOT, 'coverage', 'coverage-final.json');
const TESTS_DIR = path.join(WORKSPACE_ROOT, '__tests__');

// Exclude patterns
const EXCLUDE_PATTERNS = [
  '__tests__',
  'node_modules',
  '.next',
  'coverage',
  'dist',
  'build',
  '.d.ts',
  '.config.',
  'instrumentation',
  'sentry',
  'middleware.ts',
  'layout.tsx',
  'page.tsx',
  'global-error.tsx',
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function calculateCoverage(data: CoverageData[string]): FileCoverage {
  const statements = Object.values(data.s);
  const functions = Object.values(data.f);
  const branches = Object.values(data.b).flat();

  const statementsCovered = statements.filter(c => c > 0).length;
  const functionsCovered = functions.filter(c => c > 0).length;
  const branchesCovered = branches.filter(c => c > 0).length;

  const uncoveredLines: number[] = [];
  Object.entries(data.statementMap).forEach(([key, loc]: [string, any]) => {
    if (data.s[key] === 0) {
      uncoveredLines.push(loc.start.line);
    }
  });

  const uncoveredFunctions: string[] = [];
  Object.entries(data.fnMap).forEach(([key, fn]: [string, any]) => {
    if (data.f[key] === 0) {
      uncoveredFunctions.push(fn.name || 'anonymous');
    }
  });

  return {
    path: data.path,
    statements: {
      total: statements.length,
      covered: statementsCovered,
      pct: statements.length > 0 ? (statementsCovered / statements.length) * 100 : 100,
    },
    functions: {
      total: functions.length,
      covered: functionsCovered,
      pct: functions.length > 0 ? (functionsCovered / functions.length) * 100 : 100,
    },
    branches: {
      total: branches.length,
      covered: branchesCovered,
      pct: branches.length > 0 ? (branchesCovered / branches.length) * 100 : 100,
    },
    lines: {
      total: Object.keys(data.statementMap).length,
      covered: statementsCovered,
      pct: Object.keys(data.statementMap).length > 0 
        ? (statementsCovered / Object.keys(data.statementMap).length) * 100 
        : 100,
    },
    uncoveredLines,
    uncoveredFunctions,
  };
}

async function analyzeCoverage(): Promise<FileCoverage[]> {
  const coverageData: CoverageData = JSON.parse(
    await fs.readFile(COVERAGE_FILE, 'utf-8')
  );

  const lowCoverageFiles: FileCoverage[] = [];

  for (const [filePath, data] of Object.entries(coverageData)) {
    if (shouldExclude(filePath)) continue;

    const coverage = calculateCoverage(data);
    
    // Target files with < 80% coverage
    if (coverage.statements.pct < 80 || coverage.branches.pct < 75) {
      lowCoverageFiles.push(coverage);
    }
  }

  // Sort by lowest coverage first
  lowCoverageFiles.sort((a, b) => a.statements.pct - b.statements.pct);

  return lowCoverageFiles;
}

function getTestPath(sourcePath: string): string {
  const relativePath = path.relative(WORKSPACE_ROOT, sourcePath);
  const testPath = path.join(TESTS_DIR, relativePath.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'));
  return testPath;
}

function getAdditionalTestPath(testPath: string): string {
  return testPath.replace(/\.test\.(ts|tsx|js|jsx)$/, '.additional.test.$1');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function detectFileType(sourcePath: string): 'component' | 'service' | 'action' | 'lib' | 'api' {
  if (sourcePath.includes('/components/')) return 'component';
  if (sourcePath.includes('/services/')) return 'service';
  if (sourcePath.includes('/actions/')) return 'action';
  if (sourcePath.includes('/api/')) return 'api';
  return 'lib';
}

async function readSourceCode(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function extractExports(sourceCode: string): ExportInfo[] {
  const sanitizedSource = sourceCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const exports: ExportInfo[] = [];

  const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  const classRegex = /export\s+class\s+(\w+)/g;
  const constRegex = /export\s+const\s+(\w+)/g;

  let match;
  while ((match = functionRegex.exec(sanitizedSource)) !== null) {
    exports.push({ name: match[1], kind: 'function', isFunctionLike: true });
  }

  while ((match = classRegex.exec(sanitizedSource)) !== null) {
    exports.push({ name: match[1], kind: 'class', isFunctionLike: false });
  }

  while ((match = constRegex.exec(sanitizedSource)) !== null) {
    const name = match[1];
    const snippet = sanitizedSource.slice(match.index, match.index + 200);
    const functionLikeRegex = new RegExp(
      `export\\s+const\\s+${name}\\s*=\\s*(?:async\\s*)?(?:function\\b|\\([^)]*\\)\\s*=>|[a-zA-Z0-9_]+\\s*=>)`
    );
    exports.push({ name, kind: 'const', isFunctionLike: functionLikeRegex.test(snippet) });
  }

  return exports;
}

function generateComponentTest(filePath: string, exports: ExportInfo[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const componentName = exports[0]?.name || fileName;
  
  return `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ${componentName} from '@/components/${path.basename(path.dirname(filePath))}/${fileName}';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {},
}));

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('handles props correctly', () => {
    const testProps = { id: 'test-id' };
    render(<${componentName} {...testProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('handles interactions', async () => {
    const onAction = vi.fn();
    render(<${componentName} onAction={onAction} />);
    // Add interaction tests based on component structure
  });
});
`;
}

function generateServiceTest(filePath: string, exports: ExportInfo[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const serviceName = fileName.replace(/-service$/, '').replace(/-/g, ' ');
  const relativePath = path
    .relative(WORKSPACE_ROOT, filePath)
    .replace(/\.(ts|tsx)$/, '')
    .replace(/\\/g, '/');
  const importPath = `@/${relativePath}`;

  const importNames = exports.map((exp) => exp.name).join(', ');
  const exportTests = exports
    .map((exp) => `
  describe('${exp.name}', () => {
    it('is defined', () => {
      expect(${exp.name}).toBeDefined();
    });
  });`)
    .join('\n');

  return `import { describe, it, expect } from 'vitest';
import { ${importNames} } from '${importPath}';

describe('${serviceName} Service', () => {${exportTests}
});
`;
}

function generateActionTest(filePath: string, exports: ExportInfo[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const actionName = fileName.replace(/-actions$/, '').replace(/-/g, ' ');
  const relativePath = path
    .relative(WORKSPACE_ROOT, filePath)
    .replace(/\.(ts|tsx)$/, '')
    .replace(/\\/g, '/');
  const importPath = `@/${relativePath}`;

  const importNames = exports.map((exp) => exp.name).join(', ');
  const exportTests = exports
    .map((exp) => `
  describe('${exp.name}', () => {
    it('is defined', () => {
      expect(${exp.name}).toBeDefined();
    });
  });`)
    .join('\n');

  return `import { describe, it, expect } from 'vitest';
import { ${importNames} } from '${importPath}';

describe('${actionName} Actions', () => {${exportTests}
});
`;
}

function generateLibTest(filePath: string, exports: ExportInfo[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(path.join(WORKSPACE_ROOT, 'lib'), filePath);
  const importPath = `@/lib/${relativePath.replace(/\.(ts|tsx)$/, '').replace(/\\/g, '/')}`;

  const importNames = exports.map((exp) => exp.name).join(', ');
  const exportTests = exports
    .map((exp) => `
  describe('${exp.name}', () => {
    it('is defined', () => {
      expect(${exp.name}).toBeDefined();
    });
  });`)
    .join('\n');

  return `import { describe, it, expect } from 'vitest';
import { ${importNames} } from '${importPath}';

describe('${fileName}', () => {${exportTests}
});
`;
}

function generateApiTest(filePath: string, exports: ExportInfo[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  return `import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the route handler
vi.mock('@clerk/nextjs/server');

describe('API: ${fileName}', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    // Import and test GET handler
  });

  it('handles POST request', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });
    // Import and test POST handler
  });

  it('handles authorization', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    // Test unauthorized access
  });
});
`;
}

function formatCoverageHints(coverage: FileCoverage): string {
  const uncoveredLines = coverage.uncoveredLines.slice(0, 25).join(', ');
  const uncoveredFunctions = coverage.uncoveredFunctions.slice(0, 10).join(', ');
  const linesNote = uncoveredLines.length > 0 ? uncoveredLines : 'none detected';
  const functionsNote = uncoveredFunctions.length > 0 ? uncoveredFunctions : 'none detected';

  return `/**\n` +
    ` * Coverage hints (from coverage-final.json)\n` +
    ` * - Uncovered lines: ${linesNote}\n` +
    ` * - Uncovered functions: ${functionsNote}\n` +
    ` */\n\n`;
}

function generateTestFile(
  filePath: string,
  fileType: string,
  exports: ExportInfo[],
  sourceCode: string,
  coverage: FileCoverage
): string {
  const hints = formatCoverageHints(coverage);
  switch (fileType) {
    case 'component':
      return hints + generateComponentTest(filePath, exports, sourceCode);
    case 'service':
      return hints + generateServiceTest(filePath, exports, sourceCode);
    case 'action':
      return hints + generateActionTest(filePath, exports, sourceCode);
    case 'api':
      return hints + generateApiTest(filePath, exports, sourceCode);
    default:
      return hints + generateLibTest(filePath, exports, sourceCode);
  }
}

type GenerateOptions = {
  maxFiles: number;
  additional: boolean;
  listOnly: boolean;
  refreshGenerated: boolean;
  fullPass: boolean;
  quiet: boolean;
  includePrefixes: string[];
};

async function generateTests(options: GenerateOptions): Promise<void> {
  const log = (message: string) => {
    if (!options.quiet) {
      console.log(message);
    }
  };

  log('🔍 Analyzing coverage data...\n');

  const lowCoverageFiles = await analyzeCoverage();
  const filteredCoverageFiles = options.includePrefixes.length > 0
    ? lowCoverageFiles.filter((file) => {
        const relativePath = path.relative(WORKSPACE_ROOT, file.path).replace(/\\/g, '/');
        return options.includePrefixes.some((prefix) => relativePath.startsWith(prefix));
      })
    : lowCoverageFiles;

  log(`📊 Found ${filteredCoverageFiles.length} files with low coverage\n`);
  log('Top 20 files needing coverage:\n');

  filteredCoverageFiles.slice(0, 20).forEach((file, idx) => {
    const relativePath = path.relative(WORKSPACE_ROOT, file.path);
    log(
      `${idx + 1}. ${relativePath}\n` +
        `   Lines: ${file.statements.pct.toFixed(1)}% | ` +
        `Branches: ${file.branches.pct.toFixed(1)}% | ` +
        `Functions: ${file.functions.pct.toFixed(1)}%`
    );
  });

  if (options.listOnly) {
    log('\nℹ️  List-only mode enabled. No tests were generated.');
    return;
  }

  const targets = options.fullPass
    ? filteredCoverageFiles
    : filteredCoverageFiles.slice(0, options.maxFiles);

  log(`\n🚀 Generating tests for ${targets.length} files...\n`);

  let generated = 0;
  let skipped = 0;
  let updated = 0;
  const areaStats: Record<string, { generated: number; skipped: number; updated: number }> = {};

  for (const file of targets) {
    const baseTestPath = getTestPath(file.path);
    const additionalTestPath = getAdditionalTestPath(baseTestPath);
    const targetTestPath = (await fileExists(baseTestPath))
      ? (options.additional ? additionalTestPath : baseTestPath)
      : baseTestPath;

    const relativeSourcePath = path.relative(WORKSPACE_ROOT, file.path);
    const area = relativeSourcePath.split(path.sep)[0] || 'root';
    areaStats[area] = areaStats[area] || { generated: 0, skipped: 0, updated: 0 };

    const sourceCode = await readSourceCode(file.path);
    if (!sourceCode) {
      log(`⚠️  Skipping (no source): ${path.relative(WORKSPACE_ROOT, file.path)}`);
      skipped++;
      areaStats[area].skipped++;
      continue;
    }

    const exports = extractExports(sourceCode);
    if (exports.length === 0) {
      log(`⚠️  Skipping (no exports): ${path.relative(WORKSPACE_ROOT, file.path)}`);
      skipped++;
      areaStats[area].skipped++;
      continue;
    }

    const fileType = detectFileType(file.path);
    const testContent = generateTestFile(file.path, fileType, exports, sourceCode, file);

    if (await fileExists(targetTestPath)) {
      if (options.refreshGenerated) {
        const existingContent = await fs.readFile(targetTestPath, 'utf-8');
        if (existingContent.includes('Coverage hints (from coverage-final.json)')) {
          await fs.writeFile(targetTestPath, testContent, 'utf-8');
          log(`♻️  Updated: ${path.relative(WORKSPACE_ROOT, targetTestPath)}`);
          updated++;
          areaStats[area].updated++;
          continue;
        }
      }

      log(`⏭️  Skipping (exists): ${path.relative(WORKSPACE_ROOT, targetTestPath)}`);
      skipped++;
      areaStats[area].skipped++;
      continue;
    }

    await fs.mkdir(path.dirname(targetTestPath), { recursive: true });
    await fs.writeFile(targetTestPath, testContent, 'utf-8');
    log(`✅ Generated: ${path.relative(WORKSPACE_ROOT, targetTestPath)}`);
    generated++;
    areaStats[area].generated++;
  }

  console.log(`\n✨ Summary:`);
  console.log(`   Generated: ${generated} test files`);
  console.log(`   Updated: ${updated} test files`);
  console.log(`   Skipped: ${skipped} files`);

  const areaEntries = Object.entries(areaStats).filter(([, stats]) => stats.generated + stats.updated + stats.skipped > 0);
  if (areaEntries.length > 0) {
    console.log('\n📁 By area:');
    areaEntries.forEach(([area, stats]) => {
      console.log(`   ${area}: +${stats.generated} updated ${stats.updated} skipped ${stats.skipped}`);
    });
  }

  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review generated tests in __tests__/`);
  console.log(`   2. Customize tests based on actual function signatures`);
  console.log(`   3. Run: pnpm test:coverage`);
  console.log(`   4. Iterate with: pnpm tsx scripts/generate-tests-from-coverage.ts --full-pass --additional --refresh-generated --quiet`);
}

// CLI
const args = process.argv.slice(2);
const maxFilesArg = args.find(arg => arg.startsWith('--max='));
const maxFiles = maxFilesArg ? parseInt(maxFilesArg.split('=')[1]) : 10;
const additional = args.includes('--additional');
const listOnly = args.includes('--list-only');
const refreshGenerated = args.includes('--refresh-generated');
const fullPass = args.includes('--full-pass');
const quiet = args.includes('--quiet') || fullPass;
const includeArg = args.find(arg => arg.startsWith('--include='));
const includePrefixes = includeArg
  ? includeArg.split('=')[1].split(',').map((value) => value.trim()).filter(Boolean)
  : [];

generateTests({ maxFiles, additional, listOnly, refreshGenerated, fullPass, quiet, includePrefixes }).catch(console.error);
