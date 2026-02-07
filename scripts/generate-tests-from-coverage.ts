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

function extractExports(sourceCode: string): string[] {
  const exports: string[] = [];
  
  // Match export function, export const, export class, export default
  const exportRegex = /export\s+(?:async\s+)?(?:function|const|class|default)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(sourceCode)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

function generateComponentTest(filePath: string, exports: string[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const componentName = exports[0] || fileName;
  
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

function generateServiceTest(filePath: string, exports: string[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const serviceName = fileName.replace(/-service$/, '').replace(/-/g, ' ');
  
  const functionTests = exports.map(funcName => `
  describe('${funcName}', () => {
    it('handles success case', async () => {
      const mockDb = createMockDb();
      const result = await ${funcName}(mockDb, {});
      expect(result).toBeDefined();
    });

    it('handles error case', async () => {
      const mockDb = createMockDb({ shouldFail: true });
      await expect(${funcName}(mockDb, {})).rejects.toThrow();
    });

    it('validates input parameters', async () => {
      const mockDb = createMockDb();
      await expect(${funcName}(mockDb, null as any)).rejects.toThrow();
    });
  });`).join('\n');

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${exports.join(', ')} } from '@/services/${fileName}';
import { createMockDb } from '../test-utils';

describe('${serviceName} Service', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });
${functionTests}
});
`;
}

function generateActionTest(filePath: string, exports: string[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const actionName = fileName.replace(/-actions$/, '').replace(/-/g, ' ');
  
  const functionTests = exports.map(funcName => `
  describe('${funcName}', () => {
    it('executes successfully with valid input', async () => {
      const result = await ${funcName}({ id: 'test-id' });
      expect(result).toBeDefined();
    });

    it('handles authorization', async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });
      await expect(${funcName}({})).rejects.toThrow('Unauthorized');
    });

    it('validates input schema', async () => {
      await expect(${funcName}({} as any)).rejects.toThrow();
    });
  });`).join('\n');

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${exports.join(', ')} } from '@/actions/${fileName}';
import { auth } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server');
const mockAuth = vi.mocked(auth);

describe('${actionName} Actions', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_123',
    } as any);
    vi.clearAllMocks();
  });
${functionTests}
});
`;
}

function generateLibTest(filePath: string, exports: string[], sourceCode: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(path.join(WORKSPACE_ROOT, 'lib'), filePath);
  const importPath = `@/lib/${relativePath.replace(/\.(ts|tsx)$/, '')}`;
  
  const functionTests = exports.map(funcName => `
  describe('${funcName}', () => {
    it('handles valid input', () => {
      const result = ${funcName}({});
      expect(result).toBeDefined();
    });

    it('handles edge cases', () => {
      expect(() => ${funcName}(null as any)).not.toThrow();
    });

    it('returns expected type', () => {
      const result = ${funcName}({});
      expect(typeof result).toBe('object');
    });
  });`).join('\n');

  return `import { describe, it, expect, vi } from 'vitest';
import { ${exports.join(', ')} } from '${importPath}';

describe('${fileName}', () => {
${functionTests}
});
`;
}

function generateApiTest(filePath: string, exports: string[], sourceCode: string): string {
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

function generateTestFile(filePath: string, fileType: string, exports: string[], sourceCode: string): string {
  switch (fileType) {
    case 'component':
      return generateComponentTest(filePath, exports, sourceCode);
    case 'service':
      return generateServiceTest(filePath, exports, sourceCode);
    case 'action':
      return generateActionTest(filePath, exports, sourceCode);
    case 'api':
      return generateApiTest(filePath, exports, sourceCode);
    default:
      return generateLibTest(filePath, exports, sourceCode);
  }
}

async function generateTests(maxFiles: number = 10): Promise<void> {
  console.log('🔍 Analyzing coverage data...\n');
  
  const lowCoverageFiles = await analyzeCoverage();
  
  console.log(`📊 Found ${lowCoverageFiles.length} files with low coverage\n`);
  console.log('Top 20 files needing coverage:\n');
  
  lowCoverageFiles.slice(0, 20).forEach((file, idx) => {
    const relativePath = path.relative(WORKSPACE_ROOT, file.path);
    console.log(
      `${idx + 1}. ${relativePath}\n` +
      `   Lines: ${file.statements.pct.toFixed(1)}% | ` +
      `Branches: ${file.branches.pct.toFixed(1)}% | ` +
      `Functions: ${file.functions.pct.toFixed(1)}%`
    );
  });

  console.log(`\n🚀 Generating tests for top ${maxFiles} files...\n`);

  let generated = 0;
  let skipped = 0;

  for (const file of lowCoverageFiles.slice(0, maxFiles)) {
    const testPath = getTestPath(file.path);
    
    if (await fileExists(testPath)) {
      console.log(`⏭️  Skipping (exists): ${path.relative(WORKSPACE_ROOT, testPath)}`);
      skipped++;
      continue;
    }

    const sourceCode = await readSourceCode(file.path);
    if (!sourceCode) {
      console.log(`⚠️  Skipping (no source): ${path.relative(WORKSPACE_ROOT, file.path)}`);
      skipped++;
      continue;
    }

    const exports = extractExports(sourceCode);
    if (exports.length === 0) {
      console.log(`⚠️  Skipping (no exports): ${path.relative(WORKSPACE_ROOT, file.path)}`);
      skipped++;
      continue;
    }

    const fileType = detectFileType(file.path);
    const testContent = generateTestFile(file.path, fileType, exports, sourceCode);

    await fs.mkdir(path.dirname(testPath), { recursive: true });
    await fs.writeFile(testPath, testContent, 'utf-8');

    console.log(`✅ Generated: ${path.relative(WORKSPACE_ROOT, testPath)}`);
    generated++;
  }

  console.log(`\n✨ Summary:`);
  console.log(`   Generated: ${generated} test files`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review generated tests in __tests__/`);
  console.log(`   2. Customize tests based on actual function signatures`);
  console.log(`   3. Run: pnpm test:coverage`);
  console.log(`   4. Iterate with: pnpm tsx scripts/generate-tests-from-coverage.ts --max 20`);
}

// CLI
const args = process.argv.slice(2);
const maxFilesArg = args.find(arg => arg.startsWith('--max='));
const maxFiles = maxFilesArg ? parseInt(maxFilesArg.split('=')[1]) : 10;

generateTests(maxFiles).catch(console.error);
