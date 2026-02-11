# SQL Injection Prevention Guide

## Overview

This document provides guidelines for preventing SQL injection vulnerabilities in the Union Eyes application. It outlines safe patterns, unsafe patterns, and best practices for working with database queries.

## Table of Contents

1. [Understanding SQL Injection](#understanding-sql-injection)
2. [Safe Patterns](#safe-patterns)
3. [Unsafe Patterns to Avoid](#unsafe-patterns-to-avoid)
4. [Drizzle ORM Best Practices](#drizzle-orm-best-practices)
5. [Code Review Checklist](#code-review-checklist)
6. [Testing for SQL Injection](#testing-for-sql-injection)

---

## Understanding SQL Injection

SQL injection occurs when user-controlled data is incorporated into SQL queries without proper sanitization, allowing attackers to:
- Access unauthorized data
- Modify or delete data
- Bypass authentication
- Execute administrative operations

### Common Attack Vectors

```sql
-- Original query
SELECT * FROM users WHERE username = 'John'

-- Injected input: John' OR '1'='1
SELECT * FROM users WHERE username = 'John' OR '1'='1'
-- Returns all users!

-- Injected input: John'; DROP TABLE users; --
SELECT * FROM users WHERE username = 'John'; DROP TABLE users; --'
-- Deletes the users table!
```

---

## Safe Patterns

### ✅ 1. Use SQL Template Literals (Drizzle)

**Always use** `sql` `` template literals with parameters:

```typescript
import { sql } from 'drizzle-orm';

// ✅ SAFE: Parameters are automatically escaped
const userId = req.query.userId;
const result = await db.execute(sql`
  SELECT * FROM users WHERE id = ${userId}
`);
```

**Why it's safe:** Drizzle automatically handles parameterization and escaping.

---

### ✅ 2. Use Drizzle Query Builder

```typescript
import { eq, and, or, like, inArray } from 'drizzle-orm';
import { users, posts } from '@/db/schema';

// ✅ SAFE: Type-safe query builder
const result = await db
  .select()
  .from(users)
  .where(eq(users.id, userId));

// ✅ SAFE: Complex conditions
const result = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.organizationId, orgId),
      like(users.name, `%${searchTerm}%`)
    )
  );

// ✅ SAFE: IN clause with array
const userIds = ['id1', 'id2', 'id3'];
const result = await db
  .select()
  .from(users)
  .where(inArray(users.id, userIds));
```

**Why it's safe:** Type-safe, uses parameterization internally.

---

### ✅ 3. Validate Identifiers Against Allowlist

When you **must** use dynamic identifiers (table/column names):

```typescript
// ✅ SAFE: Allowlist validation
const ALLOWED_COLUMNS = ['name', 'email', 'status', 'created_at'];
const ALLOWED_SORT_DIRECTIONS = ['ASC', 'DESC'];

const sortColumn = req.query.sortColumn;
const sortDirection = req.query.sortDirection?.toUpperCase();

if (!ALLOWED_COLUMNS.includes(sortColumn)) {
  throw new Error('Invalid sort column');
}

if (!ALLOWED_SORT_DIRECTIONS.includes(sortDirection)) {
  throw new Error('Invalid sort direction');
}

// Now safe to use with sql.raw() since validated
const result = await db.execute(sql`
  SELECT * FROM users 
  ORDER BY ${sql.raw(sortColumn)} ${sql.raw(sortDirection)}
`);
```

**Why it's safe:** Only pre-approved values are used.

---

### ✅ 4. Use Drizzle Schema References

```typescript
import { users, organizations } from '@/db/schema';

// ✅ SAFE: Schema-based column references
const result = await db
  .select({
    userId: users.id,
    userName: users.name,
    orgName: organizations.name,
  })
  .from(users)
  .leftJoin(organizations, eq(users.organizationId, organizations.id));
```

**Why it's safe:** Compile-time validation, no string interpolation.

---

### ✅ 5. Use sql.join() for Dynamic Conditions

```typescript
// ✅ SAFE: Dynamic WHERE conditions
const conditions: SQL[] = [];

if (status) {
  conditions.push(eq(users.status, status));
}

if (minAge) {
  conditions.push(gte(users.age, minAge));
}

const result = await db
  .select()
  .from(users)
  .where(and(...conditions));

// Alternative with sql.join()
const result = await db.execute(sql`
  SELECT * FROM users
  WHERE ${sql.join(conditions, sql` AND `)}
`);
```

**Why it's safe:** Each condition is properly parameterized.

---

### ✅ 6. Safe Use of sql.raw() for Operators Only

```typescript
// ✅ SAFE: sql.raw() for SQL keywords and operators only
const conditions = [
  sql`status = ${status}`,
  sql`age >= ${minAge}`
];

const query = sql`
  SELECT * FROM users
  WHERE ${sql.join(conditions, sql.raw(' AND '))}
`;
```

**Why it's safe:** Only using sql.raw() for the operator, not data.

---

## Unsafe Patterns to Avoid

### ❌ 1. String Interpolation with sql.raw()

```typescript
// ❌ DANGEROUS: User input in sql.raw()
const userId = req.query.userId;
const result = await db.execute(
  sql.raw(`SELECT * FROM users WHERE id = '${userId}'`)
);
```

**Why it's dangerous:** No escaping, direct SQL injection.

---

### ❌ 2. Dynamic Identifiers Without Validation

```typescript
// ❌ DANGEROUS: Unvalidated table/column names
const tableName = req.query.table;
const columnName = req.query.column;

const result = await db.execute(
  sql.raw(`SELECT ${columnName} FROM ${tableName}`)
);
```

**Why it's dangerous:** Attacker can query any table/column.

---

### ❌ 3. String Concatenation for Queries

```typescript
// ❌ DANGEROUS: Building queries with string concatenation
const filter = req.query.filter;
const query = `SELECT * FROM users WHERE ${filter}`;
const result = await db.execute(sql.raw(query));
```

**Why it's dangerous:** Complete control given to attacker.

---

### ❌ 4. Manual Escaping Before sql.raw()

```typescript
// ❌ RISKY: Manual escaping is error-prone
const term = searchTerm.replace(/'/g, "''");
const query = sql.raw(`SELECT * FROM users WHERE name LIKE '%${term}%'`);
```

**Why it's dangerous:** Escaping bugs, encoding issues, context-dependent escaping.

---

### ❌ 5. Dynamic SQL with User-Controlled Logic

```typescript
// ❌ DANGEROUS: User controls query logic
const operator = req.query.operator; // Could be: OR, AND, etc.
const value = req.query.value;

const result = await db.execute(
  sql.raw(`SELECT * FROM users WHERE status ${operator} '${value}'`)
);
```

**Why it's dangerous:** Attacker can change query logic.

---

## Drizzle ORM Best Practices

### 1. Prefer Query Builder Over Raw SQL

```typescript
// ❌ Avoid
const result = await db.execute(sql`SELECT * FROM users WHERE name LIKE ${'%' + search + '%'}`);

// ✅ Prefer
const result = await db
  .select()
  .from(users)
  .where(like(users.name, `%${search}%`));
```

---

### 2. Use Type-Safe Operators

Drizzle provides many operators:

- `eq()` - Equals
- `ne()` - Not equals
- `gt()`, `gte()` - Greater than (or equal)
- `lt()`, `lte()` - Less than (or equal)
- `like()`, `ilike()` - Pattern matching
- `inArray()` - IN clause
- `between()` - BETWEEN clause
- `isNull()`, `isNotNull()` - NULL checks
- `and()`, `or()`, `not()` - Logical operators

```typescript
import { eq, and, gte, lte, like } from 'drizzle-orm';

const result = await db
  .select()
  .from(orders)
  .where(
    and(
      eq(orders.status, 'pending'),
      gte(orders.amount, 100),
      lte(orders.amount, 1000),
      like(orders.customerName, `%${searchTerm}%`)
    )
  );
```

---

### 3. Dynamic Filtering Pattern

```typescript
function buildFilters(params: FilterParams) {
  const conditions: SQL[] = [];
  
  if (params.status) {
    conditions.push(eq(orders.status, params.status));
  }
  
  if (params.minAmount) {
    conditions.push(gte(orders.amount, params.minAmount));
  }
  
  if (params.maxAmount) {
    conditions.push(lte(orders.amount, params.maxAmount));
  }
  
  if (params.search) {
    conditions.push(like(orders.customerName, `%${params.search}%`));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Usage
const filters = buildFilters(req.query);
const result = await db
  .select()
  .from(orders)
  .where(filters);
```

---

### 4. Transactions with Drizzle

```typescript
await db.transaction(async (tx) => {
  // All operations are parameterized
  await tx.insert(users).values({ name, email });
  await tx.update(organizations)
    .set({ memberCount: sql`${organizations.memberCount} + 1` })
    .where(eq(organizations.id, orgId));
});
```

---

## Code Review Checklist

When reviewing code for SQL injection vulnerabilities:

### ✅ Required Checks

- [ ] No `sql.raw()` with user input
- [ ] No string interpolation in SQL queries
- [ ] No string concatenation for query building
- [ ] All dynamic identifiers validated against allowlist
- [ ] Prefer Drizzle query builder over raw SQL
- [ ] Use `inArray()` instead of manual IN clause building
- [ ] All user input is parameterized
- [ ] No dynamic operators from user input

### 🔍 Red Flags

- `sql.raw()` with template literals containing `${}`
- `.replace(/'/g, "''")` followed by `sql.raw()`
- `sql.raw(\`SELECT ... WHERE ${userInput}\`)`
- Building queries with string concatenation
- Dynamic table or column names without validation
- User-controlled ORDER BY without allowlist

---

## Testing for SQL Injection

### Manual Testing

Test with these payloads:

```typescript
// Single quote escape
testInput = "' OR '1'='1"
testInput = "'; DROP TABLE users; --"
testInput = "' UNION SELECT * FROM users --"

// Comment injection
testInput = "-- comment"
testInput = "/* comment */"

// Boolean logic
testInput = "1' OR 'a'='a"
testInput = "admin' --"

// Stacked queries
testInput = "'; DELETE FROM users WHERE '1'='1"
```

### Automated Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('SQL Injection Protection', () => {
  it('should reject malicious input', async () => {
    const maliciousInputs = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --"
    ];
    
    for (const input of maliciousInputs) {
      const result = await searchUsers(input);
      // Should return empty or throw error, not all users
      expect(result.length).toBeLessThan(2);
    }
  });
  
  it('should properly escape special characters', async () => {
    const input = "O'Brien"; // Legitimate name with apostrophe
    const result = await searchUsers(input);
    // Should work without SQL errors
    expect(result).toBeDefined();
  });
});
```

### Using SQLMap (External Tool)

```bash
# Test a GET endpoint
sqlmap -u "http://localhost:3000/api/users?search=test" --batch

# Test a POST endpoint
sqlmap -u "http://localhost:3000/api/search" \
  --data='{"query":"test"}' \
  --method=POST \
  --headers="Content-Type: application/json" \
  --batch
```

---

## Migration Path for Existing Code

### Step 1: Identify sql.raw() Usage

```bash
grep -r "sql.raw(" --include="*.ts" --exclude-dir="node_modules"
```

### Step 2: Categorize Each Instance

- **Safe:** Migration scripts, tests, static SQL
- **Needs Fix:** User input, dynamic identifiers
- **Review:** Allowlist-validated input

### Step 3: Refactor Using Safe Patterns

```typescript
// ❌ Before
const sort = req.query.sort;
const result = await db.execute(sql.raw(`
  SELECT * FROM users ORDER BY ${sort}
`));

// ✅ After
const ALLOWED_SORT_COLUMNS = ['name', 'email', 'created_at'];
const sort = req.query.sort;

if (!ALLOWED_SORT_COLUMNS.includes(sort)) {
  throw new Error('Invalid sort column');
}

const result = await db
  .select()
  .from(users)
  .orderBy(users[sort]); // Type-safe column reference
```

### Step 4: Add Tests

Add SQL injection tests for each refactored endpoint.

---

## ESLint Configuration

Add this rule to catch dangerous sql.raw() usage:

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="sql"][callee.property.name="raw"]',
          message: 'Avoid sql.raw(). Use sql`` template literals or Drizzle query builder for safety.'
        },
        {
          selector: 'TemplateLiteral:has(CallExpression[callee.object.name="sql"][callee.property.name="raw"])',
          message: 'Never use template literals with sql.raw(). This is a SQL injection risk.'
        }
      ]
    }
  }
];
```

---

## Additional Resources

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

## Summary

**Golden Rules:**

1. ✅ **Always use parameterized queries** via sql`` template literals or Drizzle query builder
2. ❌ **Never use sql.raw() with user input**
3. ✅ **Validate all identifiers against allowlists** if dynamic
4. ✅ **Prefer Drizzle query builder** over raw SQL
5. ✅ **Test for SQL injection** in all user-facing endpoints

Following these guidelines will significantly reduce the risk of SQL injection vulnerabilities in the Union Eyes application.
