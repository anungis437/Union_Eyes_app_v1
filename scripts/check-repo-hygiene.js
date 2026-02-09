#!/usr/bin/env node
/**
 * Repo Hygiene Check
 * Ensures no build artifacts are tracked in git
 * 
 * This script fails if any build artifacts are found tracked in git.
 * Run before committing to ensure clean source-only repository.
 */

const { execSync } = require('child_process');

console.log('🔍 Checking repository hygiene...');
console.log('');

// Define patterns for artifacts that should NEVER be tracked
const FORBIDDEN_PATTERNS = [
  { pattern: /^\.next\//, name: '^.next/' },
  { pattern: /^node_modules\//, name: '^node_modules/' },
  { pattern: /^dist\//, name: '^dist/' },
  { pattern: /^build\//, name: '^build/' },
  { pattern: /^\.turbo\//, name: '^.turbo/' },
  { pattern: /^\.cache\//, name: '^.cache/' },
  { pattern: /^coverage\//, name: '^coverage/' },
  { pattern: /^out\//, name: '^out/' },
  { pattern: /\.tsbuildinfo$/, name: '.tsbuildinfo$' },
  { pattern: /^\.pnpm-cache\//, name: '^.pnpm-cache/' },
];

let violationsFound = 0;
let totalViolations = 0;

// Get all tracked files
let allFiles;
try {
  allFiles = execSync('git ls-files', { 
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer
  }).split('\n').filter(Boolean);
} catch (e) {
  console.error('❌ Error: Unable to execute git ls-files');
  console.error('   Make sure you are in a git repository.');
  process.exit(1);
}

// Check each pattern
for (const { pattern, name } of FORBIDDEN_PATTERNS) {
  console.log(`Checking pattern: ${name}`);
  
  const matches = allFiles.filter(file => pattern.test(file));
  
  if (matches.length > 0) {
    console.log(`❌ VIOLATION: Found tracked artifacts matching '${name}':`);
    matches.slice(0, 5).forEach(line => console.log(`   ${line}`));
    console.log(`   (${matches.length} files total)`);
    console.log('');
    violationsFound++;
    totalViolations += matches.length;
  } else {
    console.log(`✅ No violations for '${name}'`);
  }
  console.log('');
}

// Report results
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (violationsFound === 0) {
  console.log('✅ PASS: Repository hygiene check passed!');
  console.log('   No build artifacts are tracked in git.');
  process.exit(0);
} else {
  console.log('❌ FAIL: Repository hygiene check failed!');
  console.log(`   Found ${violationsFound} pattern violations (${totalViolations} files)`);
  console.log('');
  console.log('To fix, run:');
  console.log('  git rm --cached -r .turbo/ .next/ dist/ build/ coverage/ out/');
  console.log('  git commit -m "chore: remove tracked build artifacts"');
  console.log('');
  console.log('Then ensure .gitignore includes these patterns.');
  process.exit(1);
}
