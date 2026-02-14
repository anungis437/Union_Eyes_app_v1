#!/usr/bin/env node
/**
 * Console Statement Migration Script
 * Replaces console.log/error/warn/info/debug with structured logger
 * 
 * Usage: node scripts/replace-console.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const LoggerImport = "import { logger } from '@/lib/logger';";

// Files to exclude
const EXCLUDE_PATTERNS = [
    'node_modules',
    '.next',
    '__tests__',
    'e2e',
    'scripts',
    '.github',
    'lib/console-wrapper',
    'lib/logger.ts'
];

function shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getFiles(dir, extensions = ['.ts', '.tsx']) {
    const files = [];
    
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (shouldExclude(fullPath)) continue;
            
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    }
    
    walk(dir);
    return files;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;
    
    // Check if file already has logger import
    const hasLoggerImport = content.includes("from '@/lib/logger'") || 
                           content.includes('from "@/lib/logger"');
    
    // Replace console statements
    // console.error(...) -> logger.error(...)
    content = content.replace(/console\.error\(([^)]+)\)/g, 'logger.error($1)');
    
    // console.warn(...) -> logger.warn(...)
    content = content.replace(/console\.warn\(([^)]+)\)/g, 'logger.warn($1)');
    
    // console.log(...) -> logger.info(...)
    content = content.replace(/console\.log\(([^)]+)\)/g, 'logger.info($1)');
    
    // console.info(...) -> logger.info(...)
    content = content.replace(/console\.info\(([^)]+)\)/g, 'logger.info($1)');
    
    // console.debug(...) -> logger.debug(...)
    content = content.replace(/console\.debug\(([^)]+)\)/g, 'logger.debug($1)');
    
    // Check if logger is now used but import is missing
    const needsImport = content.includes('logger.') && !hasLoggerImport;
    
    if (needsImport) {
        // Find the last import and add logger import after it
        const importMatches = content.match(/^import\s+.*from\s+['"][^'"]+['"];/gm);
        
        if (importMatches && importMatches.length > 0) {
            const lastImport = importMatches[importMatches.length - 1];
            const insertIndex = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, insertIndex) + '\n' + LoggerImport + content.slice(insertIndex);
            modified = true;
        }
    }
    
    if (content !== originalContent) {
        modified = true;
        
        if (DRY_RUN) {
            console.log(`[DRY RUN] Would modify: ${filePath}`);
        } else {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`[MODIFIED] ${filePath}`);
        }
    }
    
    return modified;
}

console.log('=== Console Statement Migration Script ===');
console.log(`Dry Run: ${DRY_RUN}`);
console.log('');

const files = getFiles('.');
console.log(`Found ${files.length} files to process`);
console.log('');

let modifiedCount = 0;

for (const file of files) {
    if (processFile(file)) {
        modifiedCount++;
    }
}

console.log('');
console.log('=== Summary ===');
console.log(`Files processed: ${files.length}`);
console.log(`Files modified: ${modifiedCount}`);

if (DRY_RUN) {
    console.log('');
    console.log('This was a DRY RUN. No files were actually modified.');
    console.log('Run without --dry-run to apply changes.');
}
