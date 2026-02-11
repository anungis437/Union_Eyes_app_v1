/**
 * Cleanup Duplicate Schemas Script
 * 
 * Removes duplicate schema definitions caused by multiple runs of the validation script
 */

import fs from 'fs';
import path from 'path';

function findRouteFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findRouteFiles(fullPath, files);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function removeDuplicateSchemas(content: string): { content: string; duplicatesRemoved: number } {
  const lines = content.split('\n');
  const schemaDefinitions = new Map<string, number[]>(); // schema name -> line indices
  let duplicatesRemoved = 0;
  
  // Find all schema definitions and their line numbers
  lines.forEach((line, index) => {
    const match = line.match(/^const\s+(\w+Schema)\s*=\s*z\.object\s*\(/);
    if (match) {
      const schemaName = match[1];
      if (!schemaDefinitions.has(schemaName)) {
        schemaDefinitions.set(schemaName, []);
      }
      schemaDefinitions.get(schemaName)!.push(index);
    }
  });
  
  // For each schema with duplicates, keep only the first one
  const linesToRemove = new Set<number>();
  
  for (const [schemaName, lineIndices] of schemaDefinitions) {
    if (lineIndices.length > 1) {
      // Mark all duplicates for removal (keeping the first)
      for (let i = 1; i < lineIndices.length; i++) {
        const startLine = lineIndices[i];
        
        // Find the end of this schema definition (closing });)
        let depth = 0;
        let inObjectLiteral = false;
        
        for (let j = startLine; j < lines.length; j++) {
          const currentLine = lines[j];
          
          if (currentLine.includes('.object(')) {
            inObjectLiteral = true;
            depth = 1;
            continue;
          }
          
          if (inObjectLiteral) {
            const openBraces = (currentLine.match(/\{/g) || []).length;
            const closeBraces = (currentLine.match(/\}/g) || []).length;
            depth += openBraces - closeBraces;
            
            if (depth === 0 && currentLine.includes('});')) {
              // Mark all lines from startLine to j for removal
              for (let k = startLine; k <= j; k++) {
                linesToRemove.add(k);
              }
              duplicatesRemoved++;
              break;
            }
          }
        }
      }
    }
  }
  
  // Remove marked lines and empty lines
  const filteredLines = lines.filter((_, index) => !linesToRemove.has(index));
  
  // Remove excessive blank lines (more than 2 consecutive)
  const result: string[] = [];
  let blankCount = 0;
  
  for (const line of filteredLines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) {
        result.push(line);
      }
    } else {
      blankCount = 0;
      result.push(line);
    }
  }
  
  return {
    content: result.join('\n'),
    duplicatesRemoved
  };
}

async function main() {
  console.log('🧹 Cleaning up duplicate schemas...\n');
  
  const appDir = path.join(process.cwd(), 'app');
  const routeFiles = findRouteFiles(appDir);
  
  let totalFiles = 0;
  let totalDuplicates = 0;
  
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const { content: newContent, duplicatesRemoved } = removeDuplicateSchemas(content);
    
    if (duplicatesRemoved > 0) {
      fs.writeFileSync(file, newContent, 'utf-8');
      console.log(`✅ ${path.relative(process.cwd(), file)} - Removed ${duplicatesRemoved} duplicate(s)`);
      totalFiles++;
      totalDuplicates += duplicatesRemoved;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Files cleaned: ${totalFiles}`);
  console.log(`Total duplicates removed: ${totalDuplicates}`);
  
  if (totalDuplicates === 0) {
    console.log('\n✨ No duplicates found!');
  }
}

main().catch(console.error);
