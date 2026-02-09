# CourtLens Supabase Package

This package provides the complete Supabase database configuration, types, and helper functions for the CourtLens billing system.

## Overview

The CourtLens Supabase package includes:

- **Complete PostgreSQL database schema** with 15+ tables for billing operations
- **Multi-tenant architecture** with organization-based row-level security
- **IOLTA compliance** for Canadian legal trust accounting requirements
- **Enterprise-grade audit trails** for regulatory compliance
- **Real-time subscriptions** for live data updates
- **Type-safe TypeScript interfaces** matching the database schema

## Architecture

### Database Structure

The database is organized around core entities:

- **Organizations**: Multi-tenant isolation with separate billing domains
- **Users**: Role-based access control (admin, lawyer, paralegal, clerk, user)
- **Clients**: Client management with contact information and billing settings
- **Matters**: Legal matters with billing configurations and status tracking
- **Time Entries**: Time tracking with approval workflows and billing integration
- **Invoices**: Comprehensive invoicing with line items and payment tracking
- **Trust Accounts**: IOLTA-compliant trust accounting with transaction logging
- **Audit Log**: Complete audit trail for regulatory compliance

### Security Features

- **Row-Level Security (RLS)**: Organization-based data isolation
- **Role-Based Access Control**: Fine-grained permissions by user role
- **Trust Account Protection**: IOLTA compliance validation functions
- **Audit Trail**: Automatic logging of all data modifications

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Generate TypeScript types from Supabase (if schema changes)
pnpm gen:types
```

## Environment Setup

Create a `.env` file in your application root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Migration

Run the migrations in order to set up the database:

```bash
# Start Supabase locally
pnpm db:start

# Apply migrations
pnpm migrate:up

# Check migration status
pnpm migrate:status

# Reset database (development only)
pnpm db:reset
```

## Usage

### Basic Client Setup

```typescript
import { getSupabaseClient, supabase } from '@court-lens/supabase';

// Get authenticated client (respects RLS)
const client = getSupabaseClient();

// Alternative import
const client = supabase();
```

### Type-Safe Queries

```typescript
import { 
  getSupabaseClient, 
  type Client, 
  type Matter,
  type TimeEntry 
} from '@court-lens/supabase';

const client = getSupabaseClient();

// Type-safe client query
const { data: clients } = await client
  .from('clients')
  .select('*')
  .eq('is_active', true);

// clients is automatically typed as Client[]
```

### Helper Functions

```typescript
import { 
  getCurrentUserOrganizationId,
  checkUserRole,
  executeQuery,
  getPaginatedResults
} from '@court-lens/supabase';

// Get current user's organization
const orgId = await getCurrentUserOrganizationId();

// Check user permissions
const isLawyer = await checkUserRole('lawyer');

// Execute with error handling
const { data, error } = await executeQuery(async (client) => {
  return await client.from('matters').select('*').limit(10);
});

// Paginated queries
const results = await getPaginatedResults(
  client.from('time_entries').select('*'),
  1, // page
  25  // per page
);
```

### Real-Time Subscriptions

```typescript
import { subscribeToUserChanges } from '@court-lens/supabase';

// Subscribe to organization-filtered changes
const unsubscribe = await subscribeToUserChanges('invoices', (payload) => {
  console.log('Invoice updated:', payload.new);
});

// Clean up subscription
unsubscribe();
```

### Trust Account Validation (IOLTA Compliance)

```typescript
import { validateTrustTransaction } from '@court-lens/supabase';

// Validate trust withdrawal before processing
const validation = await validateTrustTransaction(
  clientId,
  matterId, 
  trustAccountId,
  'withdrawal',
  1000.00
);

if (!validation.valid) {
  throw new Error(validation.error);
}
```

### Audit Logging

```typescript
import { logAuditAction } from '@court-lens/supabase';

// Automatically log data changes for compliance
await logAuditAction(
  'invoices',
  invoiceId,
  'UPDATE',
  oldInvoiceData,
  newInvoiceData
);
```

### Error Handling

```typescript
import { formatSupabaseError } from '@court-lens/supabase';

try {
  const { data, error } = await client
    .from('clients')
    .insert(newClient);
    
  if (error) {
    const userFriendlyMessage = formatSupabaseError(error);
    // Display to user: "A record with this information already exists"
  }
} catch (error) {
  console.error('Database error:', error);
}
```

## Database Schema

### Core Tables

- **organizations**: Multi-tenant organization data
- **users**: User accounts with role-based permissions
- **clients**: Client contact and billing information
- **matters**: Legal matters with billing configuration
- **time_entries**: Time tracking with approval workflow
- **expenses**: Expense tracking and reimbursement
- **invoices**: Invoice generation and management
- **invoice_items**: Line items for invoices
- **payments**: Payment processing and allocation
- **payment_allocations**: Payment distribution to invoices
- **trust_accounts**: IOLTA-compliant trust account setup
- **trust_transactions**: Trust fund movements with validation
- **trust_ledger**: Current trust balances per client/matter
- **billing_rates**: Configurable billing rates by user/matter
- **billing_templates**: Reusable billing configurations
- **audit_log**: Complete audit trail for compliance

### Financial Views

- **invoice_summary**: Aggregated invoice data with totals
- **client_billing_summary**: Client billing performance metrics
- **matter_financial_summary**: Matter profitability analysis
- **trust_balance_summary**: Current trust balances by account

## Canadian Legal Compliance

The database includes specific features for Canadian legal practice:

- **IOLTA Trust Accounting**: Compliant trust fund management
- **Provincial Tax Rates**: GST/HST/PST calculations by province
- **Legal Practice Areas**: Common Canadian legal matter types
- **Regulatory Audit Trails**: Complete transaction logging
- **Multi-Province Support**: Configurable tax rates and rules

## Development

### Adding New Migrations

```bash
# Create a new migration
pnpm migrate:new "add_new_feature"

# Edit the generated SQL file
# Then apply the migration
pnpm migrate:up
```

### Regenerating Types

```bash
# After schema changes, regenerate TypeScript types
pnpm gen:types

# This updates types.ts with the latest schema
```

### Testing

```bash
# Type check the package
pnpm type-check

# Build to check for issues
pnpm build
```

## Security Considerations

1. **Row-Level Security**: All tables have RLS policies for multi-tenant isolation
2. **Service Role Usage**: Only use service role client for trusted server-side operations
3. **Trust Account Access**: Additional validation functions protect trust fund integrity
4. **Audit Requirements**: All financial operations are automatically logged

## Support

For questions about the Supabase configuration or database schema, contact the CourtLens development team.

## License

Proprietary - CourtLens Legal Technology Inc.
