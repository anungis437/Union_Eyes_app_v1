#!/usr/bin/env node

/**
 * Automated Input Validation Addition Script
 * 
 * Intelligently adds Zod validation schemas to API routes that accept POST/PUT/PATCH
 * 
 * Strategy:
 * 1. Scan routes for POST/PUT/PATCH handlers without validation
 * 2. Analyze request body usage to infer schema fields
 * 3. Generate appropriate Zod schemas
 * 4. Insert validation checks before business logic
 * 5. Report on changes made
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationCandidate {
  filePath: string;
  method: string;
  bodyFields: string[];
  hasZod: boolean;
  hasValidation: boolean;
  priority: number;
}

interface ValidationResult {
  filePath: string;
  success: boolean;
  error?: string;
  fieldsAdded?: number;
}

/**
 * Find all route files
 */
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

/**
 * Analyze route file to determine if it needs validation
 */
function analyzeRoute(filePath: string): ValidationCandidate | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if it has POST/PUT/PATCH methods
  const hasMutationMethod = /export\s+const\s+(POST|PUT|PATCH)\s*=/.test(content);
  if (!hasMutationMethod) return null;
  
  // Check if already has validation
  const hasValidation = /\.safeParse\(|\.parse\(|validateRequired|schema\.parse/.test(content);
  if (hasValidation) return null;
  
  // Check if it imports or uses zod
  const hasZod = /from ['"]zod['"]|z\.object|z\.string/.test(content);
  
  // Extract body field usage patterns
  const bodyFields = extractBodyFields(content);
  if (bodyFields.length === 0) return null;
  
  // Determine priority based on sensitivity
  const priority = calculatePriority(filePath, bodyFields, content);
  
  // Determine method
  const methodMatch = content.match(/export\s+const\s+(POST|PUT|PATCH)\s*=/);
  const method = methodMatch ? methodMatch[1] : 'POST';
  
  return {
    filePath,
    method,
    bodyFields,
    hasZod,
    hasValidation: false,
    priority,
  };
}

/**
 * Extract field names used from request body
 */
function extractBodyFields(content: string): string[] {
  const fields = new Set<string>();
  
  // Pattern 1: const { field1, field2 } = body
  const destructurePattern = /const\s+\{([^}]+)\}\s*=\s*(?:body|await\s+request\.json\(\))/g;
  let match;
  while ((match = destructurePattern.exec(content)) !== null) {
    const fieldList = match[1].split(',').map(f => f.trim().split(':')[0].trim());
    fieldList.forEach(f => fields.add(f));
  }
  
  // Pattern 2: body.fieldName
  const dotAccessPattern = /body\.(\w+)/g;
  while ((match = dotAccessPattern.exec(content)) !== null) {
    fields.add(match[1]);
  }
  
  return Array.from(fields).filter(f => f && f !== 'json');
}

/**
 * Calculate priority based on route sensitivity
 */
function calculatePriority(filePath: string, fields: string[], content: string): number {
  let priority = 50;
  
  // High priority domains
  if (filePath.includes('/members/')) priority += 20;
  if (filePath.includes('/claims/')) priority += 20;
  if (filePath.includes('/billing/')) priority += 20;
  if (filePath.includes('/admin/')) priority += 15;
  if (filePath.includes('/documents/')) priority += 15;
  if (filePath.includes('/financial/')) priority += 20;
  
  // Sensitive field names
  const sensitiveFields = ['password', 'email', 'phone', 'ssn', 'payment', 'amount', 'userId', 'memberId'];
  const hasSensitiveField = fields.some(f => 
    sensitiveFields.some(sf => f.toLowerCase().includes(sf))
  );
  if (hasSensitiveField) priority += 15;
  
  // Has database operations
  if (/db\.(insert|update|delete|execute)/.test(content)) priority += 10;
  
  // Has file operations
  if (/formData|upload|file/.test(content)) priority += 10;
  
  return Math.min(priority, 100);
}

/**
 * Generate Zod schema based on field analysis
 */
function generateZodSchema(fields: string[], schemaName: string, content: string): string {
  const fieldSchemas = fields.map(field => {
    const fieldLower = field.toLowerCase();
    
    // Determine field type based on name and usage
    if (fieldLower.includes('email')) {
      return `  ${field}: z.string().email('Invalid email address'),`;
    }
    if (fieldLower.includes('id') || fieldLower === 'id') {
      return `  ${field}: z.string().uuid('Invalid ${field}'),`;
    }
    if (fieldLower.includes('phone')) {
      return `  ${field}: z.string().min(10, 'Invalid phone number'),`;
    }
    if (fieldLower.includes('url')) {
      return `  ${field}: z.string().url('Invalid URL'),`;
    }
    if (fieldLower.includes('amount') || fieldLower.includes('price') || fieldLower.includes('cost')) {
      return `  ${field}: z.number().positive('${field} must be positive'),`;
    }
    if (fieldLower.includes('count') || fieldLower.includes('quantity')) {
      return `  ${field}: z.number().int().positive(),`;
    }
    if (fieldLower.includes('enabled') || fieldLower.includes('active') || fieldLower.includes('is')) {
      return `  ${field}: z.boolean().optional(),`;
    }
    if (fieldLower.includes('date') || fieldLower.includes('time')) {
      return `  ${field}: z.string().datetime().optional(),`;
    }
    if (fieldLower.includes('description') || fieldLower.includes('notes') || fieldLower.includes('comment')) {
      return `  ${field}: z.string().optional(),`;
    }
    if (fieldLower.includes('name') || fieldLower.includes('title')) {
      return `  ${field}: z.string().min(1, '${field} is required'),`;
    }
    
    // Check if field is used in a required context
    const isRequired = new RegExp(`if\\s*\\(!${field}\\)|${field}\\s*===\\s*undefined|throw.*${field}`).test(content);
    
    if (isRequired) {
      return `  ${field}: z.string().min(1, '${field} is required'),`;
    }
    
    return `  ${field}: z.unknown().optional(),`;
  });
  
  return `const ${schemaName} = z.object({\n${fieldSchemas.join('\n')}\n});`;
}

/**
 * Add validation to a route file
 */
function addValidation(candidate: ValidationCandidate): ValidationResult {
  try {
    let content = fs.readFileSync(candidate.filePath, 'utf-8');
    let modified = false;
    
    // Step 1: Ensure z import from zod
    if (!candidate.hasZod) {
      const firstImportMatch = content.match(/^import\s+/m);
      if (firstImportMatch) {
        const insertPos = firstImportMatch.index!;
        content = content.slice(0, insertPos) + 
          `import { z } from 'zod';\n` + 
          content.slice(insertPos);
        modified = true;
      }
    }
    
    // Step 2: Generate and insert schema
    const schemaName = generateSchemaName(candidate.filePath);
    const schema = generateZodSchema(candidate.bodyFields, schemaName, content);
    
    // Find where to insert schema (after imports, before handler)
    const handlerMatch = content.match(/export\s+const\s+(POST|PUT|PATCH)\s*=/);
    if (!handlerMatch) {
      return { filePath: candidate.filePath, success: false, error: 'Handler not found' };
    }
    
    const insertPos = handlerMatch.index!;
    content = content.slice(0, insertPos) + 
      `\n${schema}\n\n` + 
      content.slice(insertPos);
    modified = true;
    
    // Step 3: Add validation check in handler
    // Find the body parsing line
    const bodyParsePattern = /(const\s+(?:body|\{[^}]+\})\s*=\s*await\s+request\.json\(\);?)/;
    const bodyMatch = content.match(bodyParsePattern);
    
    if (bodyMatch) {
      const validationCode = `
    // Validate request body
    const validation = ${schemaName}.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { ${candidate.bodyFields.join(', ')} } = validation.data;`;
      
      const replaceStartPos = bodyMatch.index! + bodyMatch[0].length;
      content = content.slice(0, replaceStartPos) + 
        validationCode + 
        content.slice(replaceStartPos);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(candidate.filePath, content, 'utf-8');
      return {
        filePath: candidate.filePath,
        success: true,
        fieldsAdded: candidate.bodyFields.length,
      };
    }
    
    return { filePath: candidate.filePath, success: false, error: 'No modifications made' };
    
  } catch (error) {
    return {
      filePath: candidate.filePath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate schema name from file path
 */
function generateSchemaName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const apiIndex = parts.indexOf('api');
  
  if (apiIndex >= 0) {
    const routeParts = parts.slice(apiIndex + 1, -1).filter(p => !p.startsWith('['));
    const name = routeParts.map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join('');
    return `${name.charAt(0).toLowerCase()}${name.slice(1)}Schema`;
  }
  
  return 'requestSchema';
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning API routes for validation opportunities...\n');
  
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  const routeFiles = findRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files\n`);
  
  // Analyze all routes
  const candidates: ValidationCandidate[] = [];
  for (const file of routeFiles) {
    const candidate = analyzeRoute(file);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  
  // Sort by priority
  candidates.sort((a, b) => b.priority - a.priority);
  
  console.log(`\n📊 Found ${candidates.length} routes needing validation\n`);
  
  if (candidates.length === 0) {
    console.log('✅ All routes already have validation!\n');
    return;
  }
  
  // Show top candidates
  console.log('🎯 Top 20 Priority Routes:\n');
  candidates.slice(0, 20).forEach((c, i) => {
    const relativePath = c.filePath.replace(/.*[\\/]app[\\/]api[\\/]/, '/api/');
    console.log(`${i + 1}. [Priority ${c.priority}] ${relativePath}`);
    console.log(`   Fields: ${c.bodyFields.join(', ')}`);
    console.log(`   Method: ${c.method}\n`);
  });
  
  // Ask for confirmation
  console.log(`\n🚀 Ready to add validation to ${Math.min(candidates.length, 100)} routes?`);
  console.log('This will:');
  console.log('  - Add zod imports where needed');
  console.log('  - Generate appropriate schemas');
  console.log('  - Insert validation checks');
  console.log('  - Maintain existing code structure\n');
  
  // Process top 100 candidates
  const toProcess = candidates.slice(0, 100);
  const results: ValidationResult[] = [];
  
  console.log('Processing...\n');
  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    process.stdout.write(`\r[${i + 1}/${toProcess.length}] Processing routes...`);
    
    const result = addValidation(candidate);
    results.push(result);
  }
  
  console.log('\n\n✅ Processing complete!\n');
  
  // Report results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`📊 Results:`);
  console.log(`  ✅ Successfully added: ${successful.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);
  console.log(`  📝 Total fields validated: ${successful.reduce((sum, r) => sum + (r.fieldsAdded || 0), 0)}\n`);
  
  if (failed.length > 0 && failed.length <= 10) {
    console.log('❌ Failed routes:');
    failed.forEach(f => {
      const relativePath = f.filePath.replace(/.*[\\/]app[\\/]api[\\/]/, '/api/');
      console.log(`  - ${relativePath}: ${f.error}`);
    });
    console.log();
  }
  
  console.log('🎯 Next: Run security audit to see updated validation coverage');
  console.log('   pnpm tsx scripts/route-security-audit.ts\n');
}

main().catch(console.error);
