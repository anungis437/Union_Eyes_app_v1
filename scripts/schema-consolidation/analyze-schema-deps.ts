/**
 * Schema Dependency Analyzer
 * 
 * Analyzes the current schema structure to:
 * 1. Map all dependencies between schema files
 * 2. Identify circular dependencies
 * 3. Calculate import depth
 * 4. Generate consolidation recommendations
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface SchemaDependency {
  file: string;
  imports: string[];
  exports: string[];
  exportedTables: string[];
  exportedEnums: string[];
  exportedTypes: string[];
  lineCount: number;
}

interface DependencyGraph {
  nodes: Map<string, SchemaDependency>;
  edges: Map<string, Set<string>>;
  circularDeps: string[][];
  maxDepth: number;
}

const SCHEMA_DIR = path.join(process.cwd(), 'db', 'schema');

/**
 * Parse a schema file to extract imports and exports
 */
async function parseSchemaFile(filePath: string): Promise<SchemaDependency> {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const lines = content.split('\n');
  
  // Extract imports
  const imports: string[] = [];
  const importRegex = /from\s+['"](.+?)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Only track relative schema imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      imports.push(importPath);
    }
  }
  
  // Extract exported tables (pgTable/mysqlTable declarations)
  const exportedTables: string[] = [];
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable/g;
  while ((match = tableRegex.exec(content)) !== null) {
    exportedTables.push(match[1]);
  }
  
  // Extract exported enums
  const exportedEnums: string[] = [];
  const enumRegex = /export\s+const\s+(\w+Enum)\s*=\s*pgEnum/g;
  while ((match = enumRegex.exec(content)) !== null) {
    exportedEnums.push(match[1]);
  }
  
  // Extract exported types
  const exportedTypes: string[] = [];
  const typeRegex = /export\s+type\s+(\w+)/g;
  while ((match = typeRegex.exec(content)) !== null) {
    exportedTypes.push(match[1]);
  }
  
  // Count all exports
  const exports: string[] = [...exportedTables, ...exportedEnums, ...exportedTypes];
  
  return {
    file: fileName,
    imports,
    exports,
    exportedTables,
    exportedEnums,
    exportedTypes,
    lineCount: lines.length,
  };
}

/**
 * Build the dependency graph
 */
async function buildDependencyGraph(): Promise<DependencyGraph> {
  const schemaFiles = await glob('*.ts', { cwd: SCHEMA_DIR, absolute: true });
  const nodes = new Map<string, SchemaDependency>();
  const edges = new Map<string, Set<string>>();
  
  // Parse all schema files
  for (const file of schemaFiles) {
    const dependency = await parseSchemaFile(file);
    const fileName = path.basename(file);
    nodes.set(fileName, dependency);
    edges.set(fileName, new Set(dependency.imports.map(imp => {
      // Convert relative import to filename
      const resolved = path.basename(imp.replace(/^\.\//, '').replace(/\.\w+$/, '') + '.ts');
      return resolved;
    })));
  }
  
  // Detect circular dependencies
  const circularDeps = findCircularDependencies(edges);
  
  // Calculate max depth
  const maxDepth = calculateMaxDepth(edges);
  
  return {
    nodes,
    edges,
    circularDeps,
    maxDepth,
  };
}

/**
 * Find circular dependencies using DFS
 */
function findCircularDependencies(edges: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  const currentPath: string[] = [];
  
  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);
    
    const neighbors = edges.get(node) || new Set();
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = currentPath.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...currentPath.slice(cycleStart), neighbor]);
        }
      }
    }
    
    recursionStack.delete(node);
    currentPath.pop();
  }
  
  for (const node of edges.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  
  return cycles;
}

/**
 * Calculate maximum import depth
 */
function calculateMaxDepth(edges: Map<string, Set<string>>): number {
  const depths = new Map<string, number>();
  
  function getDepth(node: string, visiting = new Set<string>()): number {
    if (depths.has(node)) {
      return depths.get(node)!;
    }
    
    if (visiting.has(node)) {
      return 0; // Circular dependency
    }
    
    visiting.add(node);
    const neighbors = edges.get(node) || new Set();
    const maxNeighborDepth = Math.max(0, ...Array.from(neighbors).map(n => getDepth(n, visiting)));
    visiting.delete(node);
    
    const depth = maxNeighborDepth + 1;
    depths.set(node, depth);
    return depth;
  }
  
  for (const node of edges.keys()) {
    getDepth(node);
  }
  
  return Math.max(...Array.from(depths.values()));
}

/**
 * Generate consolidation report
 */
async function generateReport(graph: DependencyGraph): Promise<void> {
  console.log('\n📊 Schema Consolidation Analysis Report\n');
  console.log('=' .repeat(80));
  
  // Summary statistics
  console.log('\n📈 Summary Statistics:');
  console.log(`   Total schema files: ${graph.nodes.size}`);
  console.log(`   Total dependencies: ${Array.from(graph.edges.values()).reduce((sum, deps) => sum + deps.size, 0)}`);
  console.log(`   Circular dependencies: ${graph.circularDeps.length}`);
  console.log(`   Maximum import depth: ${graph.maxDepth}`);
  
  const totalLines = Array.from(graph.nodes.values()).reduce((sum, node) => sum + node.lineCount, 0);
  const avgLines = Math.round(totalLines / graph.nodes.size);
  console.log(`   Total lines of code: ${totalLines.toLocaleString()}`);
  console.log(`   Average lines per file: ${avgLines}`);
  
  // Circular dependencies
  if (graph.circularDeps.length > 0) {
    console.log('\n🔄 Circular Dependencies:');
    graph.circularDeps.forEach((cycle, idx) => {
      console.log(`   ${idx + 1}. ${cycle.join(' → ')}`);
    });
  } else {
    console.log('\n✅ No circular dependencies detected');
  }
  
  // Most connected files (hub files)
  console.log('\n🔗 Most Connected Schemas (Hub Files):');
  const connectivity = Array.from(graph.edges.entries())
    .map(([file, deps]) => ({
      file,
      outgoing: deps.size,
      incoming: Array.from(graph.edges.values()).filter(d => d.has(file)).length,
      total: deps.size + Array.from(graph.edges.values()).filter(d => d.has(file)).length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  connectivity.forEach((conn, idx) => {
    console.log(`   ${idx + 1}. ${conn.file}: ${conn.total} connections (${conn.outgoing} out, ${conn.incoming} in)`);
  });
  
  // Largest files
  console.log('\n📏 Largest Schema Files:');
  const largestFiles = Array.from(graph.nodes.values())
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 10);
  
  largestFiles.forEach((file, idx) => {
    console.log(`   ${idx + 1}. ${file.file}: ${file.lineCount} lines, ${file.exportedTables.length} tables`);
  });
  
  // Isolated files (no dependencies)
  const isolatedFiles =Array.from(graph.edges.entries())
    .filter(([file, deps]) => {
      const incoming = Array.from(graph.edges.values()).filter(d => d.has(file)).length;
      return deps.size === 0 && incoming === 0;
    })
    .map(([file]) => file);
  
  if (isolatedFiles.length > 0) {
    console.log('\n🏝️  Isolated Schemas (No Dependencies):');
    isolatedFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Analysis complete!\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Analyzing schema dependencies...\n');
    const graph = await buildDependencyGraph();
    await generateReport(graph);
    
    // Write detailed JSON report
    const reportPath = path.join(process.cwd(), 'schema-dependency-analysis.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: graph.nodes.size,
          circularDependencies: graph.circularDeps.length,
          maxDepth: graph.maxDepth,
        },
        nodes: Array.from(graph.nodes.entries()).map(([_, dep]) => dep),
        edges: Array.from(graph.edges.entries()).map(([from, to]) => ({
          from,
          to: Array.from(to),
        })),
        circularDependencies: graph.circularDeps,
      }, null, 2)
    );
    
    console.log(`📄 Detailed JSON report written to: ${reportPath}\n`);
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

main();
