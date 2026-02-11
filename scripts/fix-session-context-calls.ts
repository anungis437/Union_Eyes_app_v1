/**
 * Fix setSessionContext calls to include all 3 parameters
 */

import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), '__tests__', 'security', 'rls-policy-tests.test.ts');

let content = fs.readFileSync(filePath, 'utf-8');

// Fix pattern: setSessionContext(user.id, user.orgId) -> setSessionContext(user.id, user.tenantId, user.orgId)
content = content.replace(/setSessionContext\((\w+)\.id,\s*\1\.orgId\)/g, 'setSessionContext($1.id, $1.tenantId, $1.orgId)');

// Fix weird patterns like setSessionContext(user1.client, user1)
content = content.replace(/setSessionContext\((\w+)\.client,\s*\1\)/g, 'setSessionContext($1.id, $1.tenantId, $1.orgId)');

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed all setSessionContext calls');
