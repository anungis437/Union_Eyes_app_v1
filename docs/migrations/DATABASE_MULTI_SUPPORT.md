# Multi-Database Support Documentation

This application is designed to work with multiple database systems, providing flexibility for different deployment scenarios.

## Supported Databases

### 1. PostgreSQL (Default)
- **Use Case**: Supabase, Local development, Heroku Postgres
- **Driver**: `postgres-js`
- **Dialect**: `postgresql`
- **Features**: Full-text search, JSONB, Arrays, Advanced indexing

### 2. Azure SQL Server
- **Use Case**: Enterprise deployments on Microsoft Azure
- **Driver**: `tedious` (via node-postgres)
- **Dialect**: `mssql`
- **Features**: Full-text search, JSON support, Enterprise security

### 3. Microsoft SQL Server
- **Use Case**: On-premises deployments, Local SQL Server
- **Driver**: `tedious`
- **Dialect**: `mssql`
- **Features**: Same as Azure SQL

## Configuration

### Environment Variables

```bash
# Database type selection
DATABASE_TYPE=postgresql  # or "azure-sql" or "mssql"

# Connection string (format depends on database type)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Azure SQL specific (optional)
AZURE_SQL_CONNECTION_STRING=Server=tcp:...;Database=...;

# Pool configuration
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30
DB_CONNECTION_TIMEOUT=10
DB_SSL=false
```

### PostgreSQL Configuration

```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:password@localhost:5432/unionclaims

# Supabase example
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Azure SQL Configuration

```bash
DATABASE_TYPE=azure-sql
DATABASE_URL=mssql://admin@server:password@server.database.windows.net:1433/database?encrypt=true

# Or use connection string
AZURE_SQL_CONNECTION_STRING=Server=tcp:server.database.windows.net,1433;Database=database;User ID=admin;Password=password;Encrypt=yes;
```

## Database Abstraction Layer

The application uses a unified database abstraction layer (`lib/database/multi-db-client.ts`) that:

1. **Automatic Driver Selection**: Detects database type from environment variables
2. **Unified Query Interface**: Same code works across all databases
3. **SQL Dialect Translation**: Handles syntax differences automatically
4. **Feature Parity**: Provides consistent features across databases

### Key Features

#### Full-Text Search
```typescript
// Automatically uses appropriate syntax
const results = createFullTextSearchQuery(
  'search term',
  ['documents.name', 'documents.content_text']
);

// PostgreSQL: Uses to_tsquery, ts_rank
// Azure SQL: Uses CONTAINS, RANK
```

#### Date/Time Functions
```typescript
// Returns current timestamp for any database
const now = getCurrentTimestamp(dbType);

// PostgreSQL: NOW()
// Azure SQL: GETUTCDATE()
```

#### Array Operations
```typescript
// Works with both array types and JSON arrays
const updated = arrayAppend('tags', 'new-tag');

// PostgreSQL: array_append(tags, 'new-tag')
// Azure SQL: JSON_MODIFY(tags, 'append $', 'new-tag')
```

#### Case-Insensitive Search
```typescript
// Unified case-insensitive pattern matching
const query = createLikeQuery(column, '%search%');

// PostgreSQL: ILIKE
// Azure SQL: LIKE (with proper collation)
```

## Schema Management

### Drizzle ORM Schema

The application uses Drizzle ORM which provides:
- Type-safe database queries
- Automatic schema generation
- Migration management
- Multi-database support

```typescript
import { documents } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// This code works on both PostgreSQL and Azure SQL
const results = await db
  .select()
  .from(documents)
  .where(
    and(
      eq(documents.tenantId, tenantId),
      isNull(documents.deletedAt)
    )
  );
```

### Migrations

```bash
# Generate migration (detects database type automatically)
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push

# View current schema
pnpm drizzle-kit introspect
```

## Service Layer

All services use the abstraction layer:

```typescript
import { getDatabase, eq, and, inArray } from '@/lib/database/multi-db-client';
import { documents } from '@/db/schema';

export async function getDocuments(tenantId: string) {
  const db = await getDatabase();
  
  // Works on both PostgreSQL and Azure SQL
  return await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId));
}
```

## Performance Considerations

### PostgreSQL
- **Strengths**: Advanced indexing, JSONB performance, Array operations
- **Optimization**: Use GIN indexes for full-text search and JSONB
- **Pooling**: Recommended max connections: 10-20

### Azure SQL
- **Strengths**: Enterprise features, Automatic tuning, Scalability
- **Optimization**: Use columnstore indexes for analytics
- **Pooling**: Recommended max connections: 50-100 (depending on tier)

## Migration Between Databases

### PostgreSQL to Azure SQL

1. **Export Data**:
```bash
pg_dump -h host -U user -d database > backup.sql
```

2. **Update Configuration**:
```bash
DATABASE_TYPE=azure-sql
DATABASE_URL=mssql://...
```

3. **Run Migrations**:
```bash
pnpm drizzle-kit push
```

4. **Import Data**:
```bash
# Convert PostgreSQL dump to SQL Server format
# Import using Azure Data Studio or sqlcmd
```

### Azure SQL to PostgreSQL

1. **Export Data**:
```bash
# Use Azure Data Studio or SSMS to export
```

2. **Update Configuration**:
```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://...
```

3. **Run Migrations**:
```bash
pnpm drizzle-kit push
```

4. **Import Data**:
```bash
psql -h host -U user -d database < converted_data.sql
```

## Testing

### Unit Tests

```typescript
describe('Multi-Database Support', () => {
  it('should work with PostgreSQL', async () => {
    process.env.DATABASE_TYPE = 'postgresql';
    const db = await getDatabase();
    // Test queries
  });

  it('should work with Azure SQL', async () => {
    process.env.DATABASE_TYPE = 'azure-sql';
    const db = await getDatabase();
    // Test queries
  });
});
```

### Integration Tests

Run tests against both databases:

```bash
# PostgreSQL
DATABASE_TYPE=postgresql pnpm test

# Azure SQL
DATABASE_TYPE=azure-sql pnpm test
```

## Troubleshooting

### Connection Issues

**PostgreSQL**:
```typescript
// Check connection
const health = await checkDatabaseHealth();
console.log(health);
```

**Azure SQL**:
- Verify firewall rules
- Check SSL/TLS configuration
- Confirm authentication credentials

### Query Syntax Errors

If you encounter syntax errors:
1. Check database type in environment
2. Verify abstraction layer is being used
3. Test query on specific database manually

### Performance Issues

**PostgreSQL**:
- Enable query logging: `log_statement = 'all'`
- Analyze queries: `EXPLAIN ANALYZE`
- Check indexes: `\di` in psql

**Azure SQL**:
- Use Query Performance Insight
- Enable Query Store
- Check execution plans

## Best Practices

1. **Always Use Abstraction Layer**: Never write database-specific queries directly
2. **Test on Both Databases**: Ensure features work across all supported databases
3. **Use Drizzle ORM**: Leverage type safety and automatic query building
4. **Handle Null Values**: Both databases treat NULL differently in some contexts
5. **Connection Pooling**: Configure pools appropriately for your database
6. **Error Handling**: Catch and handle database-specific errors
7. **Migrations**: Test migrations on all database types before production

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Azure SQL Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)
