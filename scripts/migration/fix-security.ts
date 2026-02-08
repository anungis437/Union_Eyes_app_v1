#!/usr/bin/env tsx
/**
 * Security Fix Automation Codemod
 *
 * Usage:
 *   tsx scripts/migration/fix-security.ts [path] [--apply] [--scan]
 *
 * Defaults to dry-run unless --apply is provided.
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { Project, SyntaxKind, Node, CallExpression, SourceFile } from 'ts-morph';
import {
  Project,
  SyntaxKind,
  Node,
  CallExpression,
  SourceFile,
  Statement,
  Block,
  FunctionExpression,
  ArrowFunction,
  FunctionDeclaration,
} from 'ts-morph';

interface FixStats {
  filesProcessed: number;
  filesModified: number;
  filesSkipped: number;
  warnings: string[];
  errors: string[];
}

const stats: FixStats = {
  filesProcessed: 0,
  filesModified: 0,
  filesSkipped: 0,
  warnings: [],
  errors: [],
};

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});

const skipPathMatchers = [
  /\/api\/health\b/i,
  /\/api\/status\b/i,
  /\/api\/docs\b/i,
  /\/api\/webhooks\b/i,
  /\/api\/stripe\/webhooks\b/i,
  /\/api\/whop\/webhooks\b/i,
  /\/api\/integrations\/shopify\/webhooks\b/i,
];

const orgIdKeys = [
  'organizationId',
  'orgId',
  'organization_id',
  'org_id',
  'unionId',
  'union_id',
  'localId',
  'local_id',
];

const authContextKeys = ['userId', 'orgId', 'organizationId', 'tenantId'];

const orgRouteMatchers = [/\/api\/organizations\b/i, /\/api\/organization\b/i];

function shouldSkip(filePath: string): boolean {
  return skipPathMatchers.some((matcher) => matcher.test(filePath));
}

function isOrgRoute(filePath: string): boolean {
  return orgRouteMatchers.some((matcher) => matcher.test(filePath));
}

function getRoleLevel(filePath: string, method: string): number {
  const lower = filePath.toLowerCase();

  if (lower.includes('/api/admin') || lower.includes('/api/system')) {
    return 90;
  }

  if (lower.includes('/api/privacy') || lower.includes('/api/emergency')) {
    return 90;
  }

  if (
    lower.includes('/api/strike') ||
    lower.includes('/api/tax') ||
    lower.includes('/api/financial') ||
    lower.includes('/api/reconciliation') ||
    lower.includes('/api/billing') ||
    lower.includes('/api/dues')
  ) {
    return 60;
  }

  if (lower.includes('/api/reports')) {
    return 50;
  }

  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  return mutating ? 20 : 10;
}

function ensureImport(sourceFile: SourceFile, module: string, named: string[]) {
  const existing = sourceFile.getImportDeclaration(module);
  if (!existing) {
    sourceFile.addImportDeclaration({ moduleSpecifier: module, namedImports: named });
    return;
  }

  const current = new Set(existing.getNamedImports().map((imp) => imp.getName()));
  named.forEach((name) => current.add(name));
  existing.removeNamedImports();
  existing.addNamedImports(Array.from(current));
}

function removeNamedImports(sourceFile: SourceFile, module: string, names: string[]) {
  const existing = sourceFile.getImportDeclaration(module);
  if (!existing) return;

  const remaining = existing
    .getNamedImports()
    .map((imp) => imp.getName())
    .filter((name) => !names.includes(name));

  if (remaining.length === 0) {
    existing.remove();
    return;
  }

  existing.removeNamedImports();
  existing.addNamedImports(remaining);
}

function ensureNextResponseImport(sourceFile: SourceFile) {
  const existing = sourceFile.getImportDeclaration('next/server');
  if (!existing) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'next/server',
      namedImports: ['NextResponse'],
    });
    return;
  }

  const names = existing.getNamedImports().map((imp) => imp.getName());
  if (!names.includes('NextResponse')) {
    existing.addNamedImport('NextResponse');
  }
}

function transformValidatedWrapper(
  sourceFile: SourceFile,
  callExpr: CallExpression,
  method: string,
  kind: 'body' | 'query'
): boolean {
  const args = callExpr.getArguments();
  if (args.length < 2) return false;

  const schemaExpr = args[0];
  const handler = args[1];

  if (!Node.isArrowFunction(handler) && !Node.isFunctionExpression(handler)) {
    return false;
  }

  const handlerBody = handler.getBody();
  if (!handlerBody || !Node.isBlock(handlerBody)) {
    return false;
  }

  const schemaText = schemaExpr.getText();
  const innerBodyText = handlerBody
    .getText()
    .replace(/^\{\s*/, '')
    .replace(/\s*\}$/, '');

  const roleLevel = getRoleLevel(sourceFile.getFilePath(), method);
  const parsingBlock = kind === 'body'
    ? `  let rawBody: unknown;\n  try {\n    rawBody = await request.json();\n  } catch {\n    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });\n  }\n\n  const parsed = ${schemaText}.safeParse(rawBody);\n  if (!parsed.success) {\n    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });\n  }\n\n  const body = parsed.data;\n`
    : `  const parsed = ${schemaText}.safeParse(Object.fromEntries(request.nextUrl.searchParams));\n  if (!parsed.success) {\n    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });\n  }\n\n  const query = parsed.data;\n`;

  const guardBlock = buildOrgGuardBlock(kind === 'body' ? 'body' : 'query');

  const wrapperText = `withEnhancedRoleAuth(${roleLevel}, async (request, context) => {\n${parsingBlock}  const user = { id: context.userId, organizationId: context.organizationId };\n\n${guardBlock}${innerBodyText}\n})`;

  callExpr.replaceWithText(wrapperText);
  return true;
}

function transformWithAuthWrapper(
  sourceFile: SourceFile,
  callExpr: CallExpression,
  method: string
): boolean {
  const args = callExpr.getArguments();
  if (args.length < 1) return false;

  const handler = args[0];
  if (!Node.isArrowFunction(handler) && !Node.isFunctionExpression(handler)) {
    return false;
  }

  const handlerBody = handler.getBody();
  if (!handlerBody || !Node.isBlock(handlerBody)) {
    return false;
  }

  const innerBodyText = handlerBody
    .getText()
    .replace(/^\{\s*/, '')
    .replace(/\s*\}$/, '');

  const roleLevel = getRoleLevel(sourceFile.getFilePath(), method);
  const wrapperText = `withEnhancedRoleAuth(${roleLevel}, async (request, context) => {\n  const user = { id: context.userId, organizationId: context.organizationId };\n\n${innerBodyText}\n})`;

  callExpr.replaceWithText(wrapperText);
  return true;
}

function reportMissingOrgScope(sourceFile: SourceFile) {
  const text = sourceFile.getFullText();
  const orgVars = getOrgIdVariableNames(sourceFile, {
    includeContextDerived: false,
    onlyRequestDerived: true,
  });
  const usesOrgId = orgVars.length > 0;
  if (!usesOrgId) return;

  const hasContextOrg = text.includes('context.organizationId') || text.includes('context.tenantId');
  const hasAuthResultGuard = /authResult\.orgId/.test(text);
  const hasOrgGuard = orgIdKeys.some((key) =>
    new RegExp(`\\b${key}\\b\\s*!==\\s*context\\.(organizationId|tenantId)`).test(text)
  )
    || /\\borgScopeId\\b\\s*!==\\s*context\\.(organizationId|tenantId)/.test(text)
    || /\\borganizationId\\b\\s*!==\\s*authResult\\.orgId/.test(text)
    || /\\borgId\\b\\s*!==\\s*authResult\\.orgId/.test(text)
    || hasAuthResultGuard;

  if ((!hasContextOrg && !hasAuthResultGuard) || !hasOrgGuard) {
    stats.warnings.push(
      `Missing org-scope guard: ${path.relative(process.cwd(), sourceFile.getFilePath())}`
    );
  }
}

function buildOrgGuardBlock(dataVar: 'body' | 'query'): string {
  const accessors = orgIdKeys
    .map((key) => `(${dataVar} as Record<string, unknown>)["${key}"]`)
    .join(' ?? ');

  return `  const orgId = ${accessors};\n  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }\n\n`;
}

function buildOrgGuardFromNames(
  names: string[],
  contextKey: 'organizationId' | 'tenantId',
  contextParam: string
): string {
  const accessors = names.join(' ?? ');
  return `  const orgScopeId = ${accessors};\n  if (typeof orgScopeId === 'string' && orgScopeId.length > 0 && orgScopeId !== ${contextParam}.${contextKey}) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }\n\n`;
}

function handlerHasOrgGuard(
  handlerBody: Block,
  contextKey: 'organizationId' | 'tenantId',
  contextParam: string
): boolean {
  const text = handlerBody.getText();
  if (!text.includes(`${contextParam}.${contextKey}`)) return false;

  const hasKeyGuard = orgIdKeys.some((key) =>
    new RegExp(`\\b${key}\\b\\s*!==\\s*${contextParam}\\.${contextKey}`).test(text)
  );

  return hasKeyGuard || new RegExp(`\\borgScopeId\\b\\s*!==\\s*${contextParam}\\.${contextKey}`).test(text);
}

function getOrgIdVariableNames(
  node: Node,
  options: { includeContextDerived: boolean; onlyRequestDerived: boolean }
): string[] {
  const names = new Set<string>();
  const declarations = node.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

  for (const decl of declarations) {
    if (!options.includeContextDerived && isContextOrAuthDerived(decl, 'context')) {
      continue;
    }

    if (options.onlyRequestDerived && !isRequestDerived(decl)) {
      continue;
    }

    const nameNode = decl.getNameNode();
    if (Node.isIdentifier(nameNode)) {
      const name = nameNode.getText();
      if (orgIdKeys.includes(name)) {
        names.add(name);
      }
      continue;
    }

    if (Node.isObjectBindingPattern(nameNode)) {
      for (const element of nameNode.getElements()) {
        const elementName = element.getNameNode();
        if (Node.isIdentifier(elementName)) {
          const name = elementName.getText();
          if (orgIdKeys.includes(name)) {
            names.add(name);
          }
        }
      }
    }
  }

  return Array.from(names);
}

function getOrgIdNamesFromStatement(statement: Statement): string[] {
  const names = new Set<string>();
  const declarations = statement
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .filter((decl) => decl.getFirstAncestorByKind(SyntaxKind.Statement) === statement);

  for (const decl of declarations) {
    if (isContextOrAuthDerived(decl, 'context')) {
      continue;
    }

    if (!isRequestDerived(decl)) {
      continue;
    }

    const nameNode = decl.getNameNode();
    if (Node.isIdentifier(nameNode)) {
      const name = nameNode.getText();
      if (orgIdKeys.includes(name)) {
        names.add(name);
      }
      continue;
    }

    if (Node.isObjectBindingPattern(nameNode)) {
      for (const element of nameNode.getElements()) {
        const elementName = element.getNameNode();
        if (Node.isIdentifier(elementName)) {
          const name = elementName.getText();
          if (orgIdKeys.includes(name)) {
            names.add(name);
          }
        }
      }
    }
  }

  return Array.from(names);
}

function insertOrgGuardInBlock(
  block: Block,
  contextKey: 'organizationId' | 'tenantId',
  contextParam: string
): boolean {
  const statements = block.getStatements();
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const names = getOrgIdNamesFromStatement(statement);
    if (names.length > 0) {
      block.insertStatements(index + 1, buildOrgGuardFromNames(names, contextKey, contextParam));
      return true;
    }

    const childBlocks = statement.getDescendantsOfKind(SyntaxKind.Block);
    for (const child of childBlocks) {
      if (insertOrgGuardInBlock(child, contextKey, contextParam)) {
        return true;
      }
    }
  }

  return false;
}

function ensureOrgGuardInHandler(
  handler: ArrowFunction | FunctionExpression | FunctionDeclaration,
  contextKey: 'organizationId' | 'tenantId'
): boolean {
  const handlerBody = handler.getBody();
  if (!handlerBody || !Node.isBlock(handlerBody)) {
    return false;
  }

  const contextParam = ensureContextParam(handler);
  if (!contextParam) {
    return false;
  }

  if (handlerHasOrgGuard(handlerBody, contextKey, contextParam)) {
    return false;
  }

  return insertOrgGuardInBlock(handlerBody, contextKey, contextParam);
}

function ensureOrgRouteParamGuard(
  handler: ArrowFunction | FunctionExpression | FunctionDeclaration,
  contextParam: string
): boolean {
  const handlerBody = handler.getBody();
  if (!handlerBody || !Node.isBlock(handlerBody)) {
    return false;
  }

  if (handlerHasOrgGuard(handlerBody, 'organizationId', contextParam)) {
    return false;
  }

  const statements = handlerBody.getStatements();
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const names = getOrgParamIdNamesFromStatement(statement);
    if (names.length > 0) {
      handlerBody.insertStatements(index + 1, buildOrgGuardFromNames(names, 'organizationId', contextParam));
      return true;
    }

    const childBlocks = statement.getDescendantsOfKind(SyntaxKind.Block);
    for (const child of childBlocks) {
      if (insertOrgParamGuardInBlock(child, contextParam)) {
        return true;
      }
    }
  }

  return false;
}

function insertOrgParamGuardInBlock(block: Block, contextParam: string): boolean {
  const statements = block.getStatements();
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const names = getOrgParamIdNamesFromStatement(statement);
    if (names.length > 0) {
      block.insertStatements(index + 1, buildOrgGuardFromNames(names, 'organizationId', contextParam));
      return true;
    }
  }

  return false;
}

function getOrgParamIdNamesFromStatement(statement: Statement): string[] {
  const names = new Set<string>();
  const declarations = statement
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .filter((decl) => decl.getFirstAncestorByKind(SyntaxKind.Statement) === statement);

  for (const decl of declarations) {
    const nameNode = decl.getNameNode();
    if (Node.isIdentifier(nameNode) && nameNode.getText() === 'id') {
      names.add('id');
      continue;
    }

    if (Node.isObjectBindingPattern(nameNode)) {
      for (const element of nameNode.getElements()) {
        const elementName = element.getNameNode();
        if (Node.isIdentifier(elementName) && elementName.getText() === 'id') {
          names.add('id');
        }
      }
    }
  }

  return Array.from(names);
}

function isRequestDerived(decl: import('ts-morph').VariableDeclaration): boolean {
  const initializer = decl.getInitializer();
  if (!initializer) return false;

  const resolved = Node.isAwaitExpression(initializer)
    ? initializer.getExpression()
    : initializer;

  if (Node.isIdentifier(resolved)) {
    const name = resolved.getText();
    return name === 'body' || name === 'searchParams' || name === 'params';
  }

  if (Node.isPropertyAccessExpression(resolved)) {
    const base = resolved.getExpression();
    if (Node.isIdentifier(base)) {
      const name = base.getText();
      if (name === 'body' || name === 'searchParams' || name === 'params') {
        return true;
      }
    }
  }

  if (Node.isCallExpression(resolved)) {
    const expr = resolved.getExpression();
    if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'get') {
      const base = expr.getExpression();
      if (Node.isIdentifier(base) && base.getText() === 'searchParams') {
        return true;
      }
      if (Node.isPropertyAccessExpression(base) && base.getName() === 'searchParams') {
        return true;
      }
      if (Node.isPropertyAccessExpression(base) && base.getName() === 'headers') {
        return true;
      }
    }
  }

  return false;
}

function isContextOrAuthDerived(
  decl: import('ts-morph').VariableDeclaration,
  contextParam: string
): boolean {
  const initializer = decl.getInitializer();
  if (!initializer) return false;

  const resolved = Node.isAwaitExpression(initializer)
    ? initializer.getExpression()
    : initializer;

  if (Node.isCallExpression(resolved) && isAuthCall(resolved)) {
    return true;
  }

  if (Node.isIdentifier(resolved) && resolved.getText() === contextParam) {
    return true;
  }

  if (Node.isPropertyAccessExpression(resolved)) {
    const base = resolved.getExpression();
    if (Node.isIdentifier(base) && base.getText() === contextParam) {
      return true;
    }
  }

  return false;
}

function isAuthCall(node: Node): boolean {
  if (!Node.isCallExpression(node)) return false;
  const expr = node.getExpression();
  return Node.isIdentifier(expr) && expr.getText() === 'auth';
}

function replaceAuthDestructureWithContext(
  handler: ArrowFunction | FunctionExpression | FunctionDeclaration,
  contextParam: string
): boolean {
  let changed = false;
  const declarations = handler.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

  for (const decl of declarations) {
    const initializer = decl.getInitializer();
    if (!initializer) continue;

    const resolved = Node.isAwaitExpression(initializer)
      ? initializer.getExpression()
      : initializer;

    if (!Node.isCallExpression(resolved) || !isAuthCall(resolved)) {
      continue;
    }

    const nameNode = decl.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) {
      continue;
    }

    const elementNames = nameNode.getElements()
      .map((element) => element.getNameNode())
      .filter(Node.isIdentifier)
      .map((node) => node.getText());

    if (elementNames.length === 0) continue;
    if (!elementNames.every((name) => authContextKeys.includes(name))) continue;

    const mappedEntries = elementNames.map((name) => {
      if (name === 'userId') return `userId: ${contextParam}.userId`;
      if (name === 'tenantId') return `tenantId: ${contextParam}.tenantId`;
      if (name === 'organizationId') return `organizationId: ${contextParam}.organizationId`;
      if (name === 'orgId') return `orgId: ${contextParam}.organizationId`;
      return `${name}: ${contextParam}.${name}`;
    });

    const replacement = `({ ${mappedEntries.join(', ')} })`;
    decl.setInitializer(replacement);
    changed = true;
  }

  return changed;
}

function replaceTenantHeaderLookups(
  handler: ArrowFunction | FunctionExpression | FunctionDeclaration,
  contextParam: string
): boolean {
  let changed = false;
  const callExpressions = handler.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    if (!Node.isPropertyAccessExpression(expression)) continue;
    if (expression.getName() !== 'get') continue;

    const target = expression.getExpression();
    if (!Node.isPropertyAccessExpression(target)) continue;
    if (target.getName() !== 'headers') continue;

    const args = callExpr.getArguments();
    if (args.length !== 1 || !Node.isStringLiteral(args[0])) continue;

    const headerName = args[0].getLiteralText().toLowerCase();
    if (headerName === 'x-tenant-id') {
      callExpr.replaceWithText(`${contextParam}.tenantId`);
      changed = true;
    }

    if (headerName === 'x-user-id') {
      callExpr.replaceWithText(`${contextParam}.userId`);
      changed = true;
    }
  }

  return changed;
}

function ensureContextParam(
  handler: ArrowFunction | FunctionExpression | FunctionDeclaration
): string | null {
  const params = handler.getParameters();
  if (params.length >= 2) {
    const nameNode = params[1].getNameNode();
    if (Node.isIdentifier(nameNode)) {
      return nameNode.getText();
    }
    return null;
  }

  handler.insertParameter(1, { name: 'context' });
  return 'context';
}

function resolveHandlerFunction(
  sourceFile: SourceFile,
  handlerNode: Node
): ArrowFunction | FunctionExpression | FunctionDeclaration | null {
  if (Node.isArrowFunction(handlerNode) || Node.isFunctionExpression(handlerNode)) {
    return handlerNode;
  }

  if (Node.isIdentifier(handlerNode)) {
    const name = handlerNode.getText();
    const funcDecl = sourceFile.getFunctions().find((fn) => fn.getName() === name);
    if (funcDecl) {
      return funcDecl;
    }

    const varDecl = sourceFile.getVariableDeclarations().find((decl) => decl.getName() === name);
    const initializer = varDecl?.getInitializer();
    if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
      return initializer;
    }
  }

  return null;
}

function getRouteMethodForNode(node: Node): string | null {
  const ancestors = node.getAncestors();

  for (const ancestor of ancestors) {
    if (Node.isVariableDeclaration(ancestor)) {
      const name = ancestor.getName();
      if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name)) {
        const varStmt = ancestor.getFirstAncestorByKind(SyntaxKind.VariableStatement);
        if (varStmt?.isExported()) {
          return name;
        }
      }
    }

    if (Node.isFunctionDeclaration(ancestor)) {
      const name = ancestor.getName();
      if (name && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name) && ancestor.isExported()) {
        return name;
      }
    }
  }

  return null;
}

function replaceRecordAny(text: string): string {
  return text.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');
}

function insertOrgGuardFallback(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  if (!text.includes('withEnhancedRoleAuth')) {
    if (text.includes('const authResult = await auth()')) {
      const guardRegex = /authResult\.orgId\s*&&\s*organizationId\s*!==\s*authResult\.orgId/;
      if (guardRegex.test(text)) {
        return false;
      }

      const match = text.match(/(\bconst\s+organizationId\s*=\s*params\.id\s*;)/);
      if (match) {
        const guardBlock =
          `\n  if (authResult.orgId && organizationId !== authResult.orgId) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }\n`;
        const updated = text.replace(match[0], `${match[0]}${guardBlock}`);
        if (updated !== text) {
          sourceFile.replaceWithText(updated);
          return true;
        }
      }
    }

    return false;
  }

  if (/\borgScopeId\b\s*!==\s*context\.organizationId/.test(text)) {
    return false;
  }

  if (/\borganizationId\b\s*!==\s*context\.organizationId/.test(text)) {
    return false;
  }

  if (/\borgId\b\s*!==\s*context\.organizationId/.test(text)) {
    return false;
  }

  const patterns: Array<{ regex: RegExp; name: 'organizationId' | 'orgId' }> = [
    {
      regex: /(\bconst\s+\{[^}]*\borganizationId\b[^}]*\}\s*=\s*body\s*;)/,
      name: 'organizationId',
    },
    {
      regex: /(\bconst\s+\{[^}]*\borgId\b[^}]*\}\s*=\s*body\s*;)/,
      name: 'orgId',
    },
    {
      regex: /(\bconst\s+organizationId\s*=\s*body\.organizationId\s*;)/,
      name: 'organizationId',
    },
    {
      regex: /(\bconst\s+orgId\s*=\s*body\.orgId\s*;)/,
      name: 'orgId',
    },
    {
      regex: /(\bconst\s+organizationId\s*=\s*request\.nextUrl\.searchParams\.get\(['"]organizationId['"]\)\s*;)/,
      name: 'organizationId',
    },
    {
      regex: /(\bconst\s+orgId\s*=\s*request\.nextUrl\.searchParams\.get\(['"]orgId['"]\)\s*;)/,
      name: 'orgId',
    },
    {
      regex: /(\bconst\s+organizationId\s*=\s*searchParams\.get\(['"]organizationId['"]\)\s*;)/,
      name: 'organizationId',
    },
    {
      regex: /(\bconst\s+orgId\s*=\s*searchParams\.get\(['"]orgId['"]\)\s*;)/,
      name: 'orgId',
    },
    {
      regex: /(\bconst\s+organizationId\s*=\s*req\.headers\.get\(['"]x-organization-id['"]\)\s*;)/,
      name: 'organizationId',
    },
    {
      regex: /(\bconst\s+organizationId\s*=\s*request\.headers\.get\(['"]x-organization-id['"]\)\s*;)/,
      name: 'organizationId',
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;

    const guardBlock =
      pattern.name === 'organizationId'
        ? `\n  if (organizationId && organizationId !== context.organizationId) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }\n`
        : `\n  if (orgId && orgId !== context.organizationId) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }\n`;

    const updated = text.replace(pattern.regex, `$1${guardBlock}`);
    if (updated !== text) {
      sourceFile.replaceWithText(updated);
      return true;
    }
  }

  return false;
}

function processFile(filePath: string, apply: boolean): boolean {
  stats.filesProcessed += 1;

  if (shouldSkip(filePath)) {
    stats.filesSkipped += 1;
    return false;
  }

  const sourceFile = project.addSourceFileAtPath(filePath);
  let changed = false;

  try {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of [...callExpressions]) {
      if (callExpr.wasForgotten()) {
        continue;
      }

      let callName: string;
      try {
        callName = callExpr.getExpression().getText();
      } catch (error) {
        const snippet = callExpr.wasForgotten()
          ? '<forgotten>'
          : callExpr.getText().slice(0, 120);
        stats.warnings.push(
          `Skipped node (call name failed): ${path.relative(process.cwd(), filePath)} :: ${snippet}`
        );
        continue;
      }

      if (callName === 'withEnhancedRoleAuth') {
        const args = callExpr.getArguments();
        if (args.length >= 2) {
          const handlerNode = args[1];
          const handler = resolveHandlerFunction(sourceFile, handlerNode);
          if (handler) {
            const contextParam = ensureContextParam(handler);
            if (contextParam && replaceAuthDestructureWithContext(handler, contextParam)) {
              changed = true;
            }

            if (ensureOrgGuardInHandler(handler, 'organizationId')) {
              ensureNextResponseImport(sourceFile);
              changed = true;
            }

            if (contextParam && isOrgRoute(filePath)) {
              if (ensureOrgRouteParamGuard(handler, contextParam)) {
                ensureNextResponseImport(sourceFile);
                changed = true;
              }
            }
          }
        }
      }

      if (callName === 'withTenantAuth') {
        const args = callExpr.getArguments();
        if (args.length >= 1) {
          const handlerNode = args[0];
          const handler = resolveHandlerFunction(sourceFile, handlerNode);
          if (handler) {
            const contextParam = ensureContextParam(handler);
            if (contextParam) {
              if (replaceTenantHeaderLookups(handler, contextParam)) {
                changed = true;
              }
              if (ensureOrgGuardInHandler(handler, 'tenantId')) {
                ensureNextResponseImport(sourceFile);
                changed = true;
              }
            }
          }
        }
      }

      let method: string | null = null;
      try {
        method = getRouteMethodForNode(callExpr);
      } catch (error) {
        const snippet = callExpr.wasForgotten()
          ? '<forgotten>'
          : callExpr.getText().slice(0, 120);
        stats.warnings.push(
          `Skipped node (method lookup failed): ${path.relative(process.cwd(), filePath)} :: ${snippet}`
        );
        continue;
      }

      if (!method) continue;

      if (callName === 'withValidatedBody') {
        if (transformValidatedWrapper(sourceFile, callExpr, method, 'body')) {
          changed = true;
        }
      }

      if (callName === 'withValidatedQuery') {
        if (transformValidatedWrapper(sourceFile, callExpr, method, 'query')) {
          changed = true;
        }
      }

      if (callName === 'withAuth') {
        if (transformWithAuthWrapper(sourceFile, callExpr, method)) {
          changed = true;
        }
      }
    }

    if (sourceFile.getFullText().includes('withAuth(')) {
      stats.warnings.push(`withAuth detected (manual RBAC review): ${path.relative(process.cwd(), filePath)}`);
    }

    if (changed) {
      ensureImport(sourceFile, '@/lib/enterprise-role-middleware', ['withEnhancedRoleAuth']);
      ensureNextResponseImport(sourceFile);
      removeNamedImports(sourceFile, '@/lib/middleware/api-security', [
        'withValidatedBody',
        'withValidatedQuery',
      ]);
      removeNamedImports(sourceFile, '@/lib/middleware/api-security', ['withAuth']);
    }

    if (!changed && insertOrgGuardFallback(sourceFile)) {
      ensureNextResponseImport(sourceFile);
      changed = true;
    }

    const updatedText = replaceRecordAny(sourceFile.getFullText());
    reportMissingOrgScope(sourceFile);
    if (updatedText !== sourceFile.getFullText()) {
      sourceFile.replaceWithText(updatedText);
      changed = true;
    }

    if (!changed) {
      stats.filesSkipped += 1;
      project.removeSourceFile(sourceFile);
      return false;
    }

    if (!apply) {
      stats.filesModified += 1;
      project.removeSourceFile(sourceFile);
      return true;
    }

    sourceFile.saveSync();
    stats.filesModified += 1;
    project.removeSourceFile(sourceFile);
    return true;
  } catch (error) {
    stats.errors.push(`Error processing ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    project.removeSourceFile(sourceFile);
    return false;
  }
}

function scanFiles(targetPath: string): string[] {
  const pattern = path.join(targetPath, '**/route.ts').replace(/\\/g, '/');
  return globSync(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    absolute: true,
  });
}

function printSummary(apply: boolean) {
  const mode = apply ? 'APPLY' : 'DRY RUN';
  console.log(`\n=== Fix Summary (${mode}) ===`);
  console.log(`Processed: ${stats.filesProcessed}`);
  console.log(`Modified:  ${stats.filesModified}`);
  console.log(`Skipped:   ${stats.filesSkipped}`);

  if (stats.warnings.length > 0) {
    console.log('\nWarnings:');
    stats.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const scanOnly = args.includes('--scan');
const reportOnly = args.includes('--report-only');
const targetPath = args.find((arg) => !arg.startsWith('--')) || 'app/api';

if (!fs.existsSync(targetPath)) {
  console.error(`Target path does not exist: ${targetPath}`);
  process.exit(1);
}

const files = scanFiles(targetPath);

if (scanOnly) {
  files.forEach((file) => {
    if (shouldSkip(file)) return;
    console.log(path.relative(process.cwd(), file));
  });
  process.exit(0);
}

if (reportOnly) {
  for (const file of files) {
    if (shouldSkip(file)) continue;
    const sourceFile = project.addSourceFileAtPath(file);
    reportMissingOrgScope(sourceFile);
    project.removeSourceFile(sourceFile);
  }
  printSummary(false);
  process.exit(0);
}

for (const file of files) {
  const changed = processFile(file, apply);
  if (!apply && changed) {
    console.log(`Would update: ${path.relative(process.cwd(), file)}`);
  }
  if (apply && changed) {
    console.log(`Updated: ${path.relative(process.cwd(), file)}`);
  }
}

printSummary(apply);
