# Encryption System - Quick Start Guide

## ðŸš€ Getting Started with Encryption

This guide walks you through setting up the encryption system for local development.

### Prerequisites

- âœ… Database migration 068 applied
- âœ… `@azure/keyvault-keys` package installed
- âœ… Node.js 18+ and pnpm

---

## Step 1: Generate Encryption Key

For **local development**, generate a fallback encryption key:

```bash
pnpm tsx scripts/generate-encryption-key.ts
```

This will output a base64-encoded 256-bit key. Copy it!

---

## Step 2: Configure Environment

Add to your `.env.local`:

```bash
# Encryption Configuration
FALLBACK_ENCRYPTION_KEY=<paste-key-from-step-1>
ENCRYPTION_KEY_NAME=pii-encryption-key
```

**Production**: See [ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md) for Azure Key Vault setup.

---

## Step 3: Run Database Migration

Apply the encrypted PII fields migration:

```bash
# Generate Drizzle migration (if not already done)
pnpm db:generate

# Apply migration
pnpm db:migrate
```

Or run the SQL migration directly:

```bash
psql $DATABASE_URL -f db/migrations/068_add_encrypted_pii_fields.sql
```

---

## Step 4: Test Encryption

Quick test to verify everything works:

```bash
node -e "
const { encryptSIN, decryptSIN } = require('./lib/encryption');

(async () => {
  const plainSIN = '123456789';
const encrypted = await encryptSIN(plainSIN);
const decrypted = await decryptSIN(encrypted);
if (decrypted === plainSIN) {
} else {
}
})();
"
```

---

## Step 5: Run Unit Tests

Verify all encryption functions work:

```bash
pnpm test __tests__/lib/encryption.test.ts
```

You should see ~20 tests passing, covering:

- Encryption/decryption
- Format validation
- Masked display
- Error handling
- Performance benchmarks

---

## Step 6: Migrate Existing Data (if needed)

If you have existing plaintext SIN data in the database:

```bash
# Dry run first (see what would be migrated)
pnpm tsx scripts/migrate-sin-to-encrypted.ts --dry-run

# Perform actual migration
pnpm tsx scripts/migrate-sin-to-encrypted.ts
```

âš ï¸ **Important**: Backup your database before running this!

---

## Step 7: Test in Application

Test encryption in the application:

1. **Register a new member** with SIN:

```typescript
import { encryptSIN } from '@/lib/encryption';

const encryptedSin = await encryptSIN('123-456-789');
await db.insert(users).values({
  email: 'test@example.com',
  encryptedSin: encryptedSin,
});
```

1. **Generate T4A** (tax document):

```typescript
import { generateT4A } from '@/lib/services/strike-fund-tax-service';

const t4a = await generateT4A(memberId, 2025);
// Decrypted for tax document
```

1. **Display masked SIN** in UI:

```typescript
import { formatSINForDisplay } from '@/lib/encryption';

const masked = await formatSINForDisplay(member.encryptedSin, true);
// ***-***-1234
```

---

## ðŸŽ¯ Checklist

Before deploying to production:

- [ ] Generated encryption key for dev
- [ ] Added FALLBACK_ENCRYPTION_KEY to .env.local
- [ ] Ran database migration
- [ ] All encryption tests passing
- [ ] Tested encryption in application
- [ ] Configured Azure Key Vault for production
- [ ] Updated AZURE_KEY_VAULT_URL in production env
- [ ] Tested T4A generation with encrypted SIN
- [ ] Verified audit logging works
- [ ] Reviewed [ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md)

---

## ðŸ†˜ Troubleshooting

### "Cannot find module '@azure/keyvault-keys'"

```bash
pnpm install -w @azure/keyvault-keys
```

### "Fallback encryption key must be 32 bytes"

Re-run the key generator:

```bash
pnpm tsx scripts/generate-encryption-key.ts
```

### "Failed to decrypt SIN"

- Check FALLBACK_ENCRYPTION_KEY is in .env.local
- Verify the key is base64 encoded
- Check if data was encrypted with a different key

### Need more help?

See [ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md) for detailed troubleshooting.

---

## ðŸ“š Documentation

- **[ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md)** - Complete encryption documentation
- **[lib/encryption.ts](../lib/encryption.ts)** - Encryption API reference
- **[**tests**/lib/encryption.test.ts](../__tests__/lib/encryption.test.ts)** - Test examples

---

## ðŸ” Security Reminders

- âŒ **Never** commit FALLBACK_ENCRYPTION_KEY to git
- âŒ **Never** use fallback key in production
- âŒ **Never** log plaintext SIN
- âœ… **Always** use Azure Key Vault for production
- âœ… **Always** decrypt SIN only for official purposes
- âœ… **Always** review audit logs regularly

---

**Ready for Production?** â†’ See [ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md) for Azure Key Vault setup.
