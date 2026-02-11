/**
 * Schema Duplicate Detector
 * 
 * Finds duplicate definitions across schema files:
 * 1. Duplicate table names
 * 2. Duplicate enum names
 * 3. Duplicate type names
 * 4. Similar table structures
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface SchemaDefinition {
  file: string;
  tables: string[];
  enums: string[];
  types: string[];
}

interface Duplicate {
  name: string;
  type: 'table' | 'enum' | 'type';
  locations: string[];
}

const SCHEMA_DIR = path.join(process.cwd(), 'db', 'schema');

/**
 * Extract all definitions from a schema file
 */
async function extractDefinitions(filePath: string): Promise<SchemaDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Extract table names
  const tables: string[] = [];
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable)/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    tables.push(match[1]);
  }
  
  // Extract enum names
  const enums: string[] = [];
  const enumRegex = /export\s+const\s+(\w+)\s*=\s*(?:pgEnum|mysqlEnum)/g;
  
  while ((match = enumRegex.exec(content)) !== null) {
    enums.push(match[1]);
  }
  
  // Extract type names
  const types: string[] = [];
  const typeRegex = /export\s+(?:type|interface)\s+(\w+)/g;
  
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }
  
  return {
    file: fileName,
    tables,
    enums,
    types,
  };
}

/**
 * Find all duplicates across schema files
 */
async function findDuplicates(): Promise<Map<string, Duplicate>> {
  const schemaFiles = await glob('*.ts', { cwd: SCHEMA_DIR, absolute: true });
  const definitions: SchemaDefinition[] = [];
  
  // Extract definitions from all files
  for (const file of schemaFiles) {
    const defs = await extractDefinitions(file);
    definitions.push(defs);
  }
  
  const duplicates = new Map<string, Duplicate>();
  
  // Check for duplicate tables
  const tableLocations = new Map<string, string[]>();
  for (const def of definitions) {
    for (const table of def.tables) {
      if (!tableLocations.has(table)) {
        tableLocations.set(table, []);
      }
      tableLocations.get(table)!.push(def.file);
    }
  }
  
  for (const [name, locations] of tableLocations) {
    if (locations.length > 1) {
      duplicates.set(`table:${name}`, {
        name,
        type: 'table',
        locations,
      });
    }
  }
  
  // Check for duplicate enums
  const enumLocations = new Map<string, string[]>();
  for (const def of definitions) {
    for (const enumName of def.enums) {
      if (!enumLocations.has(enumName)) {
        enumLocations.set(enumName, []);
      }
      enumLocations.get(enumName)!.push(def.file);
    }
  }
  
  for (const [name, locations] of enumLocations) {
    if (locations.length > 1) {
      duplicates.set(`enum:${name}`, {
        name,
        type: 'enum',
        locations,
      });
    }
  }
  
  // Check for duplicate types
  const typeLocations = new Map<string, string[]>();
  for (const def of definitions) {
    for (const typeName of def.types) {
      if (!typeLocations.has(typeName)) {
        typeLocations.set(typeName, []);
      }
      typeLocations.get(typeName)!.push(def.file);
    }
  }
  
  for (const [name, locations] of typeLocations) {
    if (locations.length > 1) {
      duplicates.set(`type:${name}`, {
        name,
        type: 'type',
        locations,
      });
    }
  }
  
  return duplicates;
}

/**
 * Check for commented-out or deprecated schemas
 */
async function findDeprecated(): Promise<string[]> {
  const indexPath = path.join(SCHEMA_DIR, 'index.ts');
  const content = await fs.readFile(indexPath, 'utf-8');
  const deprecated: string[] = [];
  
  // Find commented-out exports
  const commentedExportRegex = /\/\/\s*export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g;
  let match;
  
  while ((match = commentedExportRegex.exec(content)) !== null) {
    deprecated.push(`${match[1]}.ts`);
  }
  
  // Check for "deprecated" or "DEPRECATED" comments
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('deprecated') || line.includes('// commented out')) {
      const nextLine = lines[i + 1];
      if (nextLine) {
        const exportMatch = nextLine.match(/from\s+['"]\.\/([^'"]+)['"]/);
        if (exportMatch && !deprecated.includes(`${exportMatch[1]}.ts`)) {
          deprecated.push(`${exportMatch[1]}.ts`);
        }
      }
    }
  }
  
  return deprecated;
}

/**
 * Generate duplicate report
 */
async function generateReport(duplicates: Map<string, Duplicate>, deprecated: string[]): Promise<void> {
  console.log('\n🔍 Schema Duplicate Analysis Report\n');
  console.log('='.repeat(80));
  
  // Summary
  const tableCount = Array.from(duplicates.values()).filter(d => d.type === 'table').length;
  const enumCount = Array.from(duplicates.values()).filter(d => d.type === 'enum').length;
  const typeCount = Array.from(duplicates.values()).filter(d => d.type === 'type').length;
  
  console.log('\n📊 Summary:');
  console.log(`   Total duplicates found: ${duplicates.size}`);
  console.log(`   - Duplicate tables: ${tableCount}`);
  console.log(`   - Duplicate enums: ${enumCount}`);
  console.log(`   - Duplicate types: ${typeCount}`);
  console.log(`   Deprecated/unused schemas: ${deprecated.length}`);
  
  // List duplicates by type
  if (tableCount > 0) {
    console.log('\n⚠️  Duplicate Tables:');
    Array.from(duplicates.values())
      .filter(d => d.type === 'table')
      .forEach((dup, idx) => {
        console.log(`   ${idx + 1}. "${dup.name}" found in:`);
        dup.locations.forEach(loc => console.log(`      - ${loc}`));
      });
  }
  
  if (enumCount > 0) {
    console.log('\n⚠️  Duplicate Enums:');
    Array.from(duplicates.values())
      .filter(d => d.type === 'enum')
      .forEach((dup, idx) => {
        console.log(`   ${idx + 1}. "${dup.name}" found in:`);
        dup.locations.forEach(loc => console.log(`      - ${loc}`));
      });
  }
  
  if (typeCount > 0) {
    console.log('\n⚠️  Duplicate Types:');
    Array.from(duplicates.values())
      .filter(d => d.type === 'type')
      .forEach((dup, idx) => {
        console.log(`   ${idx + 1}. "${dup.name}" found in:`);
        dup.locations.forEach(loc => console.log(`      - ${loc}`));
      });
  }
  
  // List deprecated schemas
  if (deprecated.length > 0) {
    console.log('\n🗑️  Deprecated/Unused Schemas:');
    deprecated.forEach((schema, idx) => {
      console.log(`   ${idx + 1}. ${schema}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Consolidation Recommendations:');
  if (duplicates.size > 0) {
    console.log('   1. Review duplicate definitions and consolidate into single source');
    console.log('   2. Update imports to reference the canonical definition');
    console.log('   3. Add explicit re-exports in index.ts to clarify intent');
  }
  
  if (deprecated.length > 0) {
    console.log(`   4. Remove ${deprecated.length} deprecated schema files after migration`);
    console.log('   5. Update any remaining references to deprecated schemas');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Analysis complete!\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Finding duplicate definitions...\n');
    const duplicates = await findDuplicates();
    const deprecated = await findDeprecated();
    await generateReport(duplicates, deprecated);
    
    // Write detailed JSON report
    const reportPath = path.join(process.cwd(), 'schema-duplicates-analysis.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          totalDuplicates: duplicates.size,
          deprecatedSchemas: deprecated.length,
        },
        duplicates: Array.from(duplicates.values()),
        deprecated,
      }, null, 2)
    );
    
    console.log(`📄 Detailed JSON report written to: ${reportPath}\n`);
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

main();
