/**
 * Generate tests for files that don't have test coverage
 * This script scans the codebase and creates test skeletons for uncovered files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

interface FileToTest {
  filePath: string;
  relativePath: string;
  testPath: string;
  type: 'component' | 'service' | 'action' | 'lib' | 'api';
  hasTest: boolean;
}

// Directories to scan for source files
const SOURCE_DIRS = [
  'lib',
  'components',
  'services',
  'actions',
  'app/api',
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /\.config\./,
  /\/migrations\//,
  /\/drizzle\//,
  /layout\.tsx$/,
  /loading\.tsx$/,
  /error\.tsx$/,
  /not-found\.tsx$/,
  /global-error\.tsx$/,
];

/**
 * Recursively find all source files in a directory
 */
function findSourceFiles(dir: string, baseDir: string): FileToTest[] {
  const files: FileToTest[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findSourceFiles(fullPath, baseDir));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      const relativePath = path.relative(rootDir, fullPath);
      
      // Check exclude patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath))) {
        continue;
      }

      // Determine file type
      let type: FileToTest['type'] = 'lib';
      if (relativePath.startsWith('components')) type = 'component';
      else if (relativePath.startsWith('services')) type = 'service';
      else if (relativePath.startsWith('actions')) type = 'action';
      else if (relativePath.startsWith('app/api') || relativePath.includes('/api/')) type = 'api';

      // Determine test path
      const testPath = path.join(
        rootDir,
        '__tests__',
        relativePath.replace(/\.tsx?$/, '.test.ts')
      );

      // Check if test exists
      const hasTest = fs.existsSync(testPath);

      files.push({
        filePath: fullPath,
        relativePath,
        testPath,
        type,
        hasTest,
      });
    }
  }

  return files;
}

/**
 * Extract exports from a source file
 */
function extractExports(filePath: string): { name: string; type: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports: { name: string; type: string }[] = [];

  // Match export function/const/class
  const exportRegex = /export\s+(async\s+)?(function|const|class)\s+(\w+)/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push({
      name: match[3],
      type: match[2],
    });
  }

  // Match default exports
  if (content.includes('export default')) {
    const defaultMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (defaultMatch) {
      exports.push({
        name: defaultMatch[1],
        type: 'default',
      });
    }
  }

  return exports;
}

/**
 * Generate test content for a component
 */
function generateComponentTest(file: FileToTest, exports: { name: string; type: string }[]): string {
  const importPath = file.relativePath.replace(/\.tsx?$/, '').replace(/\\/g, '/');
  const componentName = exports.find(e => e.type === 'default' || e.type === 'function' || e.type === 'const')?.name || 'Component';

  return `/**
 * Tests for ${file.relativePath}
 * Auto-generated test skeleton - customize as needed
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ${componentName} from '@/${importPath}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    // TODO: Add proper props
    render(<${componentName} />);
  });

  it('handles props correctly', () => {
    // TODO: Test prop variations
  });

  it('handles user interactions', async () => {
    // TODO: Test interactive elements
  });
});
`;
}

/**
 * Generate test content for a service/lib file
 */
function generateServiceTest(file: FileToTest, exports: { name: string; type: string }[]): string {
  const importPath = file.relativePath.replace(/\.tsx?$/, '').replace(/\\/g, '/');
  const fileName = path.basename(file.relativePath, path.extname(file.relativePath));

  const tests = exports.map(exp => {
    if (exp.type === 'function' || exp.type === 'const') {
      return `  describe('${exp.name}', () => {
    it('is defined and exported', () => {
      expect(${exp.name}).toBeDefined();
    });

    it('handles valid input correctly', () => {
      // TODO: Test with valid inputs
    });

    it('handles invalid input gracefully', () => {
      // TODO: Test error cases
    });
  });
`;
    }
    return '';
  }).filter(Boolean).join('\n');

  const imports = exports.map(e => e.name).join(', ');

  return `/**
 * Tests for ${file.relativePath}
 * Auto-generated test skeleton - customize as needed
 */

import { describe, it, expect } from 'vitest';
import { ${imports} } from '@/${importPath}';

describe('${fileName}', () => {
${tests || `  it('exists', () => {\n    expect(true).toBe(true);\n  });\n`}
});
`;
}

/**
 * Generate test content for an API route
 */
function generateApiTest(file: FileToTest, exports: { name: string; type: string }[]): string {
  const hasGet = exports.some(e => e.name === 'GET');
  const hasPost = exports.some(e => e.name === 'POST');
  const hasPut = exports.some(e => e.name === 'PUT');
  const hasDelete = exports.some(e => e.name === 'DELETE');

  const importPath = file.relativePath.replace(/\.tsx?$/, '').replace(/\\/g, '/');
  const routeName = importPath.split('/').slice(-2).join('/');

  return `/**
 * Tests for API route: ${routeName}
 * Auto-generated test skeleton - customize as needed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
${hasGet ? `import { GET } from '@/${importPath}';\n` : ''}${hasPost ? `import { POST } from '@/${importPath}';\n` : ''}${hasPut ? `import { PUT } from '@/${importPath}';\n` : ''}${hasDelete ? `import { DELETE } from '@/${importPath}';\n` : ''}
describe('API Route: ${routeName}', () => {
  ${hasGet ? `describe('GET', () => {
    it('handles valid requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await GET(request);
      expect(response).toBeDefined();
    });

    it('handles invalid requests', async () => {
      // TODO: Test error cases
    });

    it('requires authentication', async () => {
      // TODO: Test auth requirements
    });
  });
` : ''}
  ${hasPost ? `describe('POST', () => {
    it('handles valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ /* TODO: Add test data */ }),
      });
      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('validates request body', async () => {
      // TODO: Test validation
    });

    it('requires authorization', async () => {
      // TODO: Test authorization
    });
  });
` : ''}
});
`;
}

/**
 * Generate test content for a server action
 */
function generateActionTest(file: FileToTest, exports: { name: string; type: string }[]): string {
  const importPath = file.relativePath.replace(/\.tsx?$/, '').replace(/\\/g, '/');
  const fileName = path.basename(file.relativePath, path.extname(file.relativePath));

  const tests = exports.map(exp => {
    return `  describe('${exp.name}', () => {
    it('is a server action', () => {
      expect(typeof ${exp.name}).toBe('function');
    });

    it('handles valid input', async () => {
      // TODO: Test with valid FormData or params
    });

    it('validates input data', async () => {
      // TODO: Test validation
    });

    it('handles errors gracefully', async () => {
      // TODO: Test error handling
    });
  });
`;
  }).join('\n');

  const imports = exports.map(e => e.name).join(', ');

  return `/**
 * Tests for server actions: ${fileName}
 * Auto-generated test skeleton - customize as needed
 */

import { describe, it, expect } from 'vitest';
import { ${imports} } from '@/${importPath}';

describe('Server Actions: ${fileName}', () => {
${tests}
});
`;
}

/**
 * Generate test file for a source file
 */
function generateTestFile(file: FileToTest): string {
  const exports = extractExports(file.filePath);

  switch (file.type) {
    case 'component':
      return generateComponentTest(file, exports);
    case 'api':
      return generateApiTest(file, exports);
    case 'action':
      return generateActionTest(file, exports);
    case 'service':
    case 'lib':
    default:
      return generateServiceTest(file, exports);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const maxFiles = args.find(arg => arg.startsWith('--max='))?.split('=')[1];
  const listOnly = args.includes('--list-only');
  const skipExisting = args.includes('--skip-existing');

  console.log('\n🔍 Scanning codebase for files needing tests...\n');

  // Find all source files
  const allFiles: FileToTest[] = [];
  for (const dir of SOURCE_DIRS) {
    const dirPath = path.join(rootDir, dir);
    allFiles.push(...findSourceFiles(dirPath, rootDir));
  }

  // Filter to files without tests
  const filesNeedingTests = skipExisting 
    ? allFiles.filter(f => !f.hasTest)
    : allFiles;

  console.log(`📊 Found ${allFiles.length} source files`);
  console.log(`📝 ${filesNeedingTests.length} files need tests\n`);

  // Group by type
  const byType = filesNeedingTests.reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('By type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  if (listOnly) {
    console.log('\n📋 Files needing tests:');
    filesNeedingTests.slice(0, maxFiles ? parseInt(maxFiles) : 20).forEach(file => {
      console.log(`  ${file.hasTest ? '✓' : '✗'} ${file.relativePath}`);
    });
    console.log('\nℹ️  List-only mode. No tests generated.');
    return;
  }

  // Generate tests
  const filesToProcess = maxFiles 
    ? filesNeedingTests.slice(0, parseInt(maxFiles))
    : filesNeedingTests;

  console.log(`\n✨ Generating tests for ${filesToProcess.length} files...\n`);

  let generated = 0;
  let skipped = 0;

  for (const file of filesToProcess) {
    try {
      const testContent = generateTestFile(file);
      const testDir = path.dirname(file.testPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Write test file (skip if exists unless we want to overwrite)
      if (!fs.existsSync(file.testPath) || !skipExisting) {
        fs.writeFileSync(file.testPath, testContent, 'utf-8');
        console.log(`✓ Generated: ${path.relative(rootDir, file.testPath)}`);
        generated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`✗ Error generating test for ${file.relativePath}:`, error);
    }
  }

  console.log(`\n✨ Complete! Generated ${generated} tests, skipped ${skipped}\n`);
}

main().catch(console.error);
