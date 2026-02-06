# 🔐 Encryption System Scripts

This directory contains scripts for managing the PII encryption system in Union Eyes.

## Available Scripts

### 1. Generate Encryption Key

**Script**: `generate-encryption-key.ts`  
**Command**: `pnpm encrypt:generate-key`

Generates a secure 256-bit AES encryption key for development environments.

```bash
pnpm encrypt:generate-key

# With auto-write to .env.local
pnpm encrypt:generate-key --write
```

**Output**: Base64-encoded encryption key to add to `.env.local`

**When to use**:
- Setting up local development environment
- Creating new test environments
- Rotating development keys

⚠️ **Warning**: Never use generated keys in production. Use Azure Key Vault instead.

---

### 2. Test Encryption System

**Script**: `test-encryption-system.ts`  
**Command**: `pnpm encrypt:test`

Runs end-to-end tests of the encryption system to verify everything is configured correctly.

```bash
pnpm encrypt:test
```

**Tests**:
- ✅ Environment configuration
- ✅ Encryption service initialization
- ✅ SIN encryption/decryption round-trips
- ✅ Format validation
- ✅ Masked display
- ✅ Error handling
- ✅ Encryption properties (IV, auth tag, key version)
- ✅ Performance benchmarks

**When to use**:
- After setting up encryption for the first time
- After changing encryption configuration
- Before deploying to production
- To verify Azure Key Vault connectivity

---

### 3. Migrate SIN to Encrypted

**Script**: `migrate-sin-to-encrypted.ts`  
**Commands**:
- `pnpm encrypt:migrate:dry-run` - Preview migration without changes
- `pnpm encrypt:migrate` - Perform actual migration

Migrates existing plaintext SIN data to encrypted format.

```bash
# Dry run first (recommended)
pnpm encrypt:migrate:dry-run

# Perform actual migration
pnpm encrypt:migrate

# Custom batch size
pnpm encrypt:migrate --batch-size=50

# Skip confirmation prompt
pnpm encrypt:migrate --force
```

**Options**:
- `--dry-run` - Show what would be migrated without making changes
- `--batch-size=N` - Process N records at a time (default: 100)
- `--force` - Skip confirmation prompt

**When to use**:
- After deploying encryption system to existing database
- During initial rollout of PII encryption
- When migrating from legacy systems

⚠️ **Important**: 
- Backup database before running
- Run dry-run first to preview changes
- Monitor for errors during migration

---

## Quick Start

### First-Time Setup

1. **Generate encryption key**:
   ```bash
   pnpm encrypt:generate-key
   ```

2. **Add key to `.env.local`**:
   ```bash
   FALLBACK_ENCRYPTION_KEY=<generated-key>
   ```

3. **Test encryption**:
   ```bash
   pnpm encrypt:test
   ```

4. **Run migration** (if you have existing data):
   ```bash
   pnpm encrypt:migrate:dry-run
   pnpm encrypt:migrate
   ```

---

## Script Locations

All scripts are in the `scripts/` directory:

```
scripts/
├── generate-encryption-key.ts      # Key generator
├── test-encryption-system.ts       # End-to-end tests
└── migrate-sin-to-encrypted.ts     # Data migration
```

---

## Related Documentation

- **[docs/ENCRYPTION_QUICKSTART.md](../docs/ENCRYPTION_QUICKSTART.md)** - Quick start guide
- **[docs/ENCRYPTION_GUIDE.md](../docs/ENCRYPTION_GUIDE.md)** - Complete documentation
- **[lib/encryption.ts](../lib/encryption.ts)** - Encryption API
- **[db/migrations/068_add_encrypted_pii_fields.sql](../db/migrations/068_add_encrypted_pii_fields.sql)** - Database migration

---

## Troubleshooting

### "Cannot find module '@azure/keyvault-keys'"
```bash
pnpm install -w @azure/keyvault-keys
```

### "Fallback encryption key must be 32 bytes"
```bash
pnpm encrypt:generate-key
```

### "Failed to decrypt SIN"
- Verify `FALLBACK_ENCRYPTION_KEY` is in `.env.local`
- Run `pnpm encrypt:test` to diagnose issues
- Check if data was encrypted with a different key

### Migration fails
- Ensure database migration 068 is applied
- Check database connection
- Review error logs for specific issues
- Use `--batch-size` to reduce memory usage

---

## Production Deployment

For production deployments:

1. **Do NOT use `FALLBACK_ENCRYPTION_KEY`**
2. **Configure Azure Key Vault**:
   ```bash
   AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-secret
   AZURE_TENANT_ID=your-tenant-id
   ENCRYPTION_KEY_NAME=pii-encryption-key
   ```
3. **Test with production credentials** (on staging first!)
4. **Run migration with backups**
5. **Monitor audit logs**

See [docs/ENCRYPTION_GUIDE.md](../docs/ENCRYPTION_GUIDE.md) for detailed production setup.

---

## Security Best Practices

- ❌ **Never** commit encryption keys to git
- ❌ **Never** use fallback keys in production
- ❌ **Never** log plaintext SIN values
- ✅ **Always** backup database before migration
- ✅ **Always** run dry-run first
- ✅ **Always** use Azure Key Vault in production
- ✅ **Always** review audit logs regularly

---

**Questions?** See [docs/ENCRYPTION_GUIDE.md](../docs/ENCRYPTION_GUIDE.md) for comprehensive documentation.
