// ESLint Configuration for SQL Injection Prevention
// Add these rules to your eslint.config.mjs file

export const sqlInjectionRules = {
  rules: {
    // Restrict dangerous sql.raw() usage
    'no-restricted-syntax': [
      'error',
      {
        // Ban sql.raw() entirely (can be relaxed to warning)
        selector: 'CallExpression[callee.object.name="sql"][callee.property.name="raw"]',
        message: [
          '⚠️  sql.raw() detected - Potential SQL injection risk!',
          '✅ Use sql`` template literals instead: sql`SELECT * FROM users WHERE id = ${userId}`',
          '✅ Or use Drizzle query builder: db.select().from(users).where(eq(users.id, userId))',
          '📖 See SQL_INJECTION_PREVENTION_GUIDE.md for safe patterns'
        ].join('\n')
      },
      {
        // Ban template literals inside sql.raw()
        selector: 'CallExpression[callee.object.name="sql"][callee.property.name="raw"] > TemplateLiteral',
        message: [
          '🚨 CRITICAL: Template literal inside sql.raw() - SQL injection vulnerability!',
          '❌ Never use: sql.raw(`SELECT * FROM ${table}`)',
          '✅ Use parameterization: sql`SELECT * FROM users`',
          '📖 See SQL_INJECTION_PREVENTION_GUIDE.md'
        ].join('\n')
      },
      {
        // Ban string concatenation with sql.raw()
        selector: 'CallExpression[callee.object.name="sql"][callee.property.name="raw"][arguments.0.type="BinaryExpression"]',
        message: [
          '🚨 CRITICAL: String concatenation with sql.raw() - SQL injection vulnerability!',
          '❌ Never use: sql.raw("SELECT * FROM " + table)',
          '✅ Use parameterization: sql`SELECT * FROM users`',
          '📖 See SQL_INJECTION_PREVENTION_GUIDE.md'
        ].join('\n')
      }
    ],
    
    // Additional TypeScript/JavaScript security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  }
};

// Usage in eslint.config.mjs:
/*
import { sqlInjectionRules } from './eslint-sql-injection-rules.js';

export default [
  {
    files: ['**\/*.ts', '**\/*.tsx'],
    ...sqlInjectionRules,
    // ... other config
  }
];
*/

// Or merge directly:
/*
export default [
  {
    rules: {
      ...sqlInjectionRules.rules,
      // ... other rules
    }
  }
];
*/
