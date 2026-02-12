/**
 * OpenAPI Generator for Union Eyes API
 * 
 * Automated documentation generation from Next.js App Router routes
 * Scans all app/api/**\/route.ts files and generates OpenAPI 3.0 spec
 * 
 * Usage:
 *   pnpm run openapi:generate
 *   pnpm run openapi:generate --merge  (merge with existing spec)
 * 
 * Features:
 * - Auto-detects HTTP methods (GET, POST, PUT, DELETE, PATCH)
 * - Extracts Zod schemas for request/response validation
 * - Infers authentication requirements from api-auth-guard usage
 * - Generates standardized error responses
 * - Preserves manual documentation annotations
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import yaml from 'js-yaml';

// ============================================================================
// TYPES
// ============================================================================

interface RouteInfo {
  path: string;
  filePath: string;
  methods: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    functionName: string;
    requiresAuth: boolean;
    hasZodValidation: boolean;
    zodSchemaName?: string;
    summary?: string;
    description?: string;
  }[];
}

interface OpenAPIPath {
  [method: string]: {
    summary?: string;
    description?: string;
    operationId: string;
    tags?: string[];
    security?: Array<{ bearerAuth: [] }>;
    parameters?: any[];
    requestBody?: any;
    responses: any;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_DIR = path.join(process.cwd(), 'app', 'api');
const OPENAPI_OUTPUT = path.join(process.cwd(), 'docs', 'api', 'openapi-generated.yaml');
const OPENAPI_EXISTING = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml');

const COMMON_RESPONSES = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
  '429': { $ref: '#/components/responses/RateLimitExceeded' },
  '500': { $ref: '#/components/responses/InternalError' },
};

// ============================================================================
// ROUTE SCANNER
// ============================================================================

/**
 * Find all route.ts files in app/api directory
 */
async function findAllRoutes(): Promise<string[]> {
  const pattern = path.join(API_DIR, '**', 'route.ts').replace(/\\/g, '/');
  const files = await glob(pattern);
  console.log(`Found ${files.length} route files`);
  return files;
}

/**
 * Convert file path to API path
 * Example: app/api/voting/sessions/route.ts -> /voting/sessions
 */
function filePathToApiPath(filePath: string): string {
  const relativePath = path.relative(API_DIR, filePath);
  const pathWithoutFile = relativePath.replace(/route\.ts$/, '');
  const pathParts = pathWithoutFile.split(path.sep).filter(Boolean);
  
  // Convert [id] to {id} for OpenAPI parameter syntax
  const apiPath = pathParts.map(part => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return `{${part.slice(1, -1)}}`;
    }
    return part;
  }).join('/');
  
  return '/' + apiPath;
}

/**
 * Extract HTTP methods and metadata from route file
 */
function parseRouteFile(filePath: string): RouteInfo {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const methods: RouteInfo['methods'] = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Check for authentication guard usage
  const requiresAuth = content.includes('requireApiAuth') || 
                       content.includes('authGuard') ||
                       content.includes('getServerSession');
  
  // Check for Zod validation
  const hasZodValidation = content.includes('z.object') || content.includes('.safeParse');
  
  // Extract Zod schema names
  const zodSchemaMatch = content.match(/const\s+(\w+Schema)\s*=/);
  const zodSchemaName = zodSchemaMatch?.[1];
  
  // Extract JSDoc comments for summary/description
  const summaryMatch = content.match(/\/\*\*[\s\S]*?\*\s+([^\n*]+)/);
  const summary = summaryMatch?.[1]?.trim();
  
  const descriptionMatch = content.match(/\/\*\*[\s\S]*?\*\s+@description\s+([^\n*]+)/);
  const description = descriptionMatch?.[1]?.trim();
  
  // Find exported async functions
  ts.forEachChild(sourceFile, node => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      if (httpMethods.includes(functionName)) {
        methods.push({
          method: functionName as any,
          functionName,
          requiresAuth,
          hasZodValidation,
          zodSchemaName,
          summary,
          description,
        });
      }
    }
    
    // Also check for: export const GET = async () => {}
    if (ts.isVariableStatement(node)) {
      const modifiers = node.modifiers;
      const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      
      if (isExported) {
        node.declarationList.declarations.forEach(declaration => {
          if (ts.isIdentifier(declaration.name)) {
            const varName = declaration.name.text;
            if (httpMethods.includes(varName)) {
              methods.push({
                method: varName as any,
                functionName: varName,
                requiresAuth,
                hasZodValidation,
                zodSchemaName,
                summary,
                description,
              });
            }
          }
        });
      }
    }
  });
  
  return {
    path: filePathToApiPath(filePath),
    filePath,
    methods: methods.sort((a, b) => {
      const order = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };
      return order[a.method] - order[b.method];
    }),
  };
}

/**
 * Extract path parameters from API path
 * Example: /voting/sessions/{id} -> [{name: 'id', in: 'path', required: true}]
 */
function extractPathParameters(apiPath: string): any[] {
  const params: any[] = [];
  const paramMatches = apiPath.matchAll(/\{(\w+)\}/g);
  
  for (const match of paramMatches) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `${match[1]} identifier`,
    });
  }
  
  return params;
}

/**
 * Infer tags from API path
 * Example: /voting/sessions -> ['Voting']
 */
function inferTags(apiPath: string): string[] {
  const parts = apiPath.split('/').filter(Boolean);
  if (parts.length === 0) return ['General'];
  
  // Capitalize first part as main tag
  const mainTag = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return [mainTag];
}

/**
 * Generate operation ID
 * Example: GET /voting/sessions/{id} -> getVotingSessionById
 */
function generateOperationId(method: string, apiPath: string): string {
  const parts = apiPath.split('/').filter(Boolean);
  const methodPrefix = method.toLowerCase();
  
  const pathParts = parts.map((part, idx) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      const param = part.slice(1, -1);
      return `By${param.charAt(0).toUpperCase()}${param.slice(1)}`;
    }
    // Capitalize first letter
    return part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, '');
  });
  
  return methodPrefix + pathParts.join('');
}

// ============================================================================
// OPENAPI GENERATOR
// ============================================================================

/**
 * Generate OpenAPI spec for a single route
 */
function generatePathSpec(routeInfo: RouteInfo): OpenAPIPath {
  const pathSpec: OpenAPIPath = {};
  const pathParams = extractPathParameters(routeInfo.path);
  const tags = inferTags(routeInfo.path);
  
  for (const methodInfo of routeInfo.methods) {
    const operationId = generateOperationId(methodInfo.method, routeInfo.path);
    
    pathSpec[methodInfo.method.toLowerCase()] = {
      summary: methodInfo.summary || `${methodInfo.method} ${routeInfo.path}`,
      description: methodInfo.description,
      operationId,
      tags,
      ...(methodInfo.requiresAuth && {
        security: [{ bearerAuth: [] }],
      }),
      ...(pathParams.length > 0 && {
        parameters: pathParams,
      }),
      ...(['POST', 'PUT', 'PATCH'].includes(methodInfo.method) && {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: methodInfo.hasZodValidation
                ? { $ref: `#/components/schemas/${methodInfo.zodSchemaName || 'RequestBody'}` }
                : { type: 'object' },
            },
          },
        },
      }),
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        ...COMMON_RESPONSES,
      },
    };
  }
  
  return pathSpec;
}

/**
 * Generate complete OpenAPI document
 */
async function generateOpenAPISpec(routes: RouteInfo[]): Promise<any> {
  const paths: Record<string, OpenAPIPath> = {};
  
  for (const route of routes) {
    if (route.methods.length > 0) {
      paths[route.path] = generatePathSpec(route);
    }
  }
  
  const openApiDoc = {
    openapi: '3.0.3',
    info: {
      title: 'Union Eyes API',
      version: '2.0.0',
      description: `
Comprehensive API for Union Eyes v2 - Labor Union Management Platform

**Auto-generated** from source code on ${new Date().toISOString()}

## Features
- Claims Management
- CBA Intelligence & AI
- Member Management
- Voting & Elections
- Education & Training
- Document Management
- Financial/ERP Integration
- Analytics & Reporting

## Authentication
Most endpoints require Bearer token authentication via Clerk.
Include: \`Authorization: Bearer <token>\` header.
      `.trim(),
      contact: {
        name: 'Union Eyes Support',
        email: 'support@unioneyes.io',
      },
    },
    servers: [
      {
        url: 'https://api.unioneyes.io/api',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.unioneyes.io/api',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Local development',
      },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Clerk JWT token',
        },
      },
      responses: {
        BadRequest: {
          description: 'Validation error or invalid request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  traceId: { type: 'string' },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'AUTH_REQUIRED' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'FORBIDDEN' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'NOT_FOUND' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                  message: { type: 'string' },
                  resetIn: { type: 'number' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'INTERNAL_ERROR' },
                  message: { type: 'string' },
                  traceId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  };
  
  return openApiDoc;
}

// ============================================================================
// MERGE WITH EXISTING SPEC
// ============================================================================

/**
 * Merge generated spec with existing manual documentation
 */
function mergeWithExistingSpec(generated: any, existing: any): any {
  // Keep existing paths if they have more detailed documentation
  const mergedPaths = { ...generated.paths };
  
  if (existing?.paths) {
    for (const [path, pathSpec] of Object.entries(existing.paths)) {
      if (mergedPaths[path]) {
        // Merge: prefer existing if it has more detail
        for (const [method, methodSpec] of Object.entries(pathSpec as any)) {
          const existingMethod = methodSpec as any;
          const generatedMethod = mergedPaths[path][method];
          
          if (generatedMethod && existingMethod) {
            // Keep existing if it has requestBody schema or detailed responses
            if (existingMethod.requestBody?.content?.['application/json']?.schema?.$ref ||
                existingMethod.requestBody?.content?.['application/json']?.schema?.properties ||
                existingMethod.responses?.['200']?.content?.['application/json']?.schema?.properties) {
              mergedPaths[path][method] = {
                ...generatedMethod,
                ...existingMethod,
                // Keep generated operationId and tags
                operationId: generatedMethod.operationId,
                tags: generatedMethod.tags,
              };
            }
          }
        }
      } else {
        // Path not in generated spec, keep existing
        mergedPaths[path] = pathSpec;
      }
    }
  }
  
  return {
    ...generated,
    paths: mergedPaths,
    // Merge components if they exist in existing spec
    components: {
      ...generated.components,
      ...(existing?.components?.schemas && {
        schemas: {
          ...(generated.components?.schemas || {}),
          ...existing.components.schemas,
        },
      }),
    },
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔍 Scanning API routes...\n');
  
  const routeFiles = await findAllRoutes();
  const routes = routeFiles
    .map(parseRouteFile)
    .filter(route => route.methods.length > 0);
  
  console.log(`\n📊 Statistics:`);
  console.log(`  - Total route files: ${routeFiles.length}`);
  console.log(`  - Routes with HTTP methods: ${routes.length}`);
  console.log(`  - Total HTTP handlers: ${routes.reduce((sum, r) => sum + r.methods.length, 0)}`);
  console.log(`  - Routes with auth: ${routes.filter(r => r.methods.some(m => m.requiresAuth)).length}`);
  console.log(`  - Routes with Zod: ${routes.filter(r => r.methods.some(m => m.hasZodValidation)).length}`);
  
  console.log('\n📝 Generating OpenAPI specification...');
  const generatedSpec = await generateOpenAPISpec(routes);
  
  // Check if we should merge with existing spec
  const shouldMerge = process.argv.includes('--merge');
  let finalSpec = generatedSpec;
  
  if (shouldMerge && fs.existsSync(OPENAPI_EXISTING)) {
    console.log('🔀 Merging with existing specification...');
    const existingContent = fs.readFileSync(OPENAPI_EXISTING, 'utf-8');
    const existingSpec = yaml.load(existingContent) as any;
    finalSpec = mergeWithExistingSpec(generatedSpec, existingSpec);
  }
  
  // Write to file
  const yamlContent = yaml.dump(finalSpec, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(OPENAPI_OUTPUT, yamlContent, 'utf-8');
  
  console.log(`\n✅ OpenAPI specification generated successfully!`);
  console.log(`   Output: ${OPENAPI_OUTPUT}`);
  console.log(`   Documented endpoints: ${Object.keys(finalSpec.paths).length}`);
  console.log(`   Coverage: ${Object.keys(finalSpec.paths).length}/${routes.length} routes`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review: docs/api/openapi-generated.yaml`);
  console.log(`   2. Set up Swagger UI: pnpm add swagger-ui-react`);
  console.log(`   3. Deploy to: /api/docs endpoint`);
}

main().catch(console.error);
