# Database Architecture - Multi-Database Support

## Overview

This application has been architected to support **multiple database systems** without code changes:

- âœ… **PostgreSQL** (Supabase, Local, Heroku Postgres)
- âœ… **Azure SQL Server** (Microsoft Azure)
- âœ… **Microsoft SQL Server** (On-premises, Local)

## Why Multi-Database Support?

### Business Benefits

1. **Deployment Flexibility**: Deploy to any cloud provider or on-premises
2. **Enterprise Requirements**: Many enterprises require SQL Server
3. **Cost Optimization**: Choose database based on pricing and features
4. **Migration Path**: Easy migration between database systems
5. **Vendor Independence**: Not locked into specific database vendor

### Technical Benefits

1. **Type Safety**: Drizzle ORM provides compile-time type checking
2. **Query Optimization**: Database-specific optimizations automatically applied
3. **Consistent API**: Same code works across all databases
4. **Feature Parity**: Full-text search, JSON, arrays work everywhere
5. **Easy Testing**: Test against multiple databases locally

## Architecture Layers

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         Application Layer                    â”‚
â”‚  (Components, Services, API Routes)          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                    â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     Abstraction Layer                        â”‚
â”‚  lib/database/multi-db-client.ts            â”‚
â”‚  â€¢ Unified query interface                   â”‚
â”‚  â€¢ SQL dialect translation                   â”‚
â”‚  â€¢ Feature compatibility                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                    â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         Drizzle ORM                          â”‚
â”‚  â€¢ Type-safe queries                         â”‚
â”‚  â€¢ Schema management                         â”‚
â”‚  â€¢ Migration system                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                    â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PostgreSQL  â”‚  Azure SQL   â”‚  SQL Server   â”‚
â”‚   Driver     â”‚    Driver    â”‚    Driver     â”‚
â”‚ (postgres-js)â”‚  (tedious)   â”‚  (tedious)    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Key Components

### 1. Multi-DB Client (`lib/database/multi-db-client.ts`)

Central abstraction layer providing:

```typescript
// Unified database access
import { getDatabase, eq, and, inArray } from '@/lib/database/multi-db-client';

const db = await getDatabase(); // Works with any database type

// Type-safe queries
const documents = await db
  .select()
  .from(documentsTable)
  .where(eq(documentsTable.tenantId, tenantId));
```

**Key Functions:**

- `getDatabase()` - Get unified database client
- `createFullTextSearchQuery()` - Full-text search across databases
- `getCurrentTimestamp()` - Current time for any database
- `arrayAppend()` - Array operations (PostgreSQL arrays / SQL Server JSON)
- `createLikeQuery()` - Case-insensitive search
- `checkDatabaseHealth()` - Connection health check

### 2. Database Client (`db/db.ts`)

Main database export with backward compatibility:

```typescript
import { db } from '@/db'; // PostgreSQL client (legacy)
import { getDatabase } from '@/db'; // Unified client (recommended)
```

### 3. Services Layer

All services use the abstraction layer:

**Example: Batch Operations Service**

```typescript
// lib/documents/batch-operations-service.ts
import { getDatabase, eq, and, inArray, isNull } from '@/lib/database/multi-db-client';
import { documents, auditLogs } from '@/db/schema';

export async function bulkDelete(
  documentIds: string[],
  tenantId: string,
  userId: string
) {
  const db = await getDatabase(); // Automatically uses correct database
  
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        inArray(documents.id, documentIds),
        eq(documents.tenantId, tenantId),
        isNull(documents.deletedAt)
      )
    );
  
  // Works on both PostgreSQL and Azure SQL!
}
```

## Configuration

### Environment Variables

Create `.env` or `.env.local`:

```bash
# Database Type (postgresql, azure-sql, or mssql)
DATABASE_TYPE=postgresql

# Connection String
DATABASE_URL=postgresql://user:pass@host:5432/database

# Optional: Pool Configuration
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30
DB_CONNECTION_TIMEOUT=10
DB_SSL=false
```

### PostgreSQL Configuration

```bash
# Supabase
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Local PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unionclaims_dev
```

### Azure SQL Configuration

```bash
# Azure SQL Server
DATABASE_TYPE=azure-sql
DATABASE_URL=mssql://admin@server:password@server.database.windows.net:1433/database?encrypt=true

# Alternative: Connection String
AZURE_SQL_CONNECTION_STRING=Server=tcp:server.database.windows.net,1433;Database=database;User ID=admin;Password=password;Encrypt=yes;
```

## Database Features

### Full-Text Search

Automatically translates search syntax:

**PostgreSQL:**

```sql
to_tsvector('english', content) @@ plainto_tsquery('english', 'search term')
ts_rank(to_tsvector('english', content), plainto_tsquery('english', 'search term'))
```

**Azure SQL:**

```sql
CONTAINS(content, 'search term')
RANK() OVER (ORDER BY ...)
```

**Usage:**

```typescript
const query = createFullTextSearchQuery(
  'union contract',
  ['documents.name', 'documents.content_text'],
  dbType
);
```

### JSON Operations

**PostgreSQL:**

```sql
metadata::jsonb->>'category'
metadata::jsonb @> '{"status":"active"}'
```

**Azure SQL:**

```sql
JSON_VALUE(metadata, '$.category')
JSON_QUERY(metadata, '$.status') = 'active'
```

**Usage:**

```typescript
const value = jsonExtract('metadata', '$.category', dbType);
```

### Array Operations

**PostgreSQL:**

```sql
array_append(tags, 'new-tag')
'tag-name' = ANY(tags)
```

**Azure SQL:**

```sql
JSON_MODIFY(tags, 'append $', 'new-tag')
JSON_VALUE(tags, '$[0]') = 'tag-name'
```

**Usage:**

```typescript
const updated = arrayAppend('tags', 'new-tag', dbType);
```

## Migration Guide

### PostgreSQL â†’ Azure SQL

1. **Export PostgreSQL Data:**

```bash
pg_dump -h localhost -U postgres -d unionclaims > backup.sql
```

1. **Update Environment:**

```bash
DATABASE_TYPE=azure-sql
DATABASE_URL=mssql://...
```

1. **Run Migrations:**

```bash
pnpm drizzle-kit push
```

1. **Import Data:**

- Convert SQL syntax (PostgreSQL â†’ T-SQL)
- Import using Azure Data Studio or sqlcmd

### Azure SQL â†’ PostgreSQL

1. **Export Azure SQL Data:**

- Use Azure Data Studio or SSMS
- Export as SQL script

1. **Update Environment:**

```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://...
```

1. **Run Migrations:**

```bash
pnpm drizzle-kit push
```

1. **Import Data:**

```bash
psql -h localhost -U postgres -d unionclaims < converted_data.sql
```

## Development Workflow

### Local Development

**Option 1: PostgreSQL (Recommended)**

```bash
# Install PostgreSQL locally or use Docker
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=unionclaims_dev \
  -p 5432:5432 \
  postgres:15

# Configure
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unionclaims_dev

# Run migrations
pnpm drizzle-kit push

# Start dev server
pnpm dev
```

**Option 2: SQL Server**

```bash
# Install SQL Server locally or use Docker
docker run -d \
  --name sqlserver-dev \
  -e ACCEPT_EULA=Y \
  -e SA_PASSWORD=YourStrong@Passw0rd \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest

# Configure
DATABASE_TYPE=mssql
DATABASE_URL=mssql://sa:YourStrong@Passw0rd@localhost:1433/unionclaims_dev

# Run migrations
pnpm drizzle-kit push

# Start dev server
pnpm dev
```

### Testing Against Both Databases

```bash
# Test with PostgreSQL
DATABASE_TYPE=postgresql pnpm test

# Test with Azure SQL
DATABASE_TYPE=azure-sql pnpm test

# Run integration tests
pnpm test:integration
```

## Performance Considerations

### PostgreSQL

- **Best For**: JSONB operations, complex queries, arrays
- **Indexing**: Use GIN indexes for full-text and JSONB
- **Pool Size**: 10-20 connections recommended
- **Optimize**: EXPLAIN ANALYZE queries, enable query logging

### Azure SQL

- **Best For**: Enterprise features, automatic tuning, analytics
- **Indexing**: Use columnstore for analytics workloads
- **Pool Size**: 50-100 connections (depends on tier)
- **Optimize**: Query Store, Performance Insight, execution plans

## Code Patterns

### âœ… Correct (Database-Agnostic)

```typescript
import { getDatabase, eq, and } from '@/lib/database/multi-db-client';
import { documents } from '@/db/schema';

const db = await getDatabase();
const results = await db
  .select()
  .from(documents)
  .where(and(
    eq(documents.tenantId, tenantId),
    eq(documents.id, documentId)
  ));
```

### âŒ Incorrect (Database-Specific)

```typescript
// Don't use Supabase client directly
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('tenant_id', tenantId);
```

## Best Practices

1. **Always use the abstraction layer** (`multi-db-client.ts`)
2. **Test on both PostgreSQL and Azure SQL** before deployment
3. **Use Drizzle ORM query builder** instead of raw SQL
4. **Handle null values consistently** across databases
5. **Configure connection pools** based on database type
6. **Monitor query performance** on target database
7. **Use transactions** for multi-step operations
8. **Implement proper error handling** for database-specific errors

## Troubleshooting

### Connection Issues

**Check database health:**

```typescript
import { checkDatabaseHealth } from '@/lib/database/multi-db-client';

const health = await checkDatabaseHealth();
// { ok: true, message: "Connection successful", type: "postgresql" }
```

**PostgreSQL issues:**

- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Confirm firewall/network access
- Test with `psql` command

**Azure SQL issues:**

- Verify Azure firewall rules allow your IP
- Check connection string format
- Confirm SSL/TLS encryption settings
- Test with Azure Data Studio

### Query Errors

**Syntax errors:**

- Ensure using abstraction layer functions
- Check for database-specific SQL in raw queries
- Verify column names match schema

**Performance issues:**

- Enable query logging
- Analyze execution plans
- Check indexes exist
- Review connection pool settings

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Azure SQL Docs](https://docs.microsoft.com/azure/azure-sql/)
- [Migration Guide](./DATABASE_MULTI_SUPPORT.md)
- [Environment Configuration](./.env.database.example)

## Support

For issues or questions:

1. Check documentation in `/docs`
2. Review troubleshooting section above
3. Test connection with health check
4. Verify environment variables
5. Check database logs

---

**Last Updated**: Phase 11 - Document Browser & Search UI
**Database Version**: Multi-database support v1.0
**Supported Databases**: PostgreSQL, Azure SQL Server, Microsoft SQL Server
