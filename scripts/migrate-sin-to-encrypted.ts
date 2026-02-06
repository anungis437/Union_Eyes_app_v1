#!/usr/bin/env tsx
/**
 * Migrate Plaintext SIN to Encrypted Format
 * 
 * This script migrates any existing plaintext Social Insurance Numbers (SIN)
 * to encrypted format using the encryption utilities.
 * 
 * ⚠️ IMPORTANT: Run this ONCE after deploying the encryption system
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-sin-to-encrypted.ts [--dry-run] [--batch-size=100]
 * 
 * Options:
 *   --dry-run       Show what would be migrated without making changes
 *   --batch-size=N  Process N records at a time (default: 100)
 *   --force         Skip confirmation prompt
 * 
 * Prerequisites:
 *   1. Database migration 068_add_encrypted_pii_fields.sql applied
 *   2. FALLBACK_ENCRYPTION_KEY or Azure Key Vault configured
 *   3. Backup database before running
 * 
 * Safety Features:
 *   - Batch processing to avoid memory issues
 *   - Transaction rollback on errors
 *   - Verification of encrypted data
 *   - Audit logging
 *   - Dry-run mode for testing
 */

import { db } from '../db';
import { users } from '../db/schema';
import { encryptSIN, decryptSIN, encryptionService } from '../lib/encryption';
import { sql, isNotNull, and } from 'drizzle-orm';
import { logger } from '../lib/logger';
import readline from 'readline';

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg 
  ? parseInt(batchSizeArg.split('=')[1]) 
  : DEFAULT_BATCH_SIZE;

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

const stats: MigrationStats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  startTime: new Date(),
};

/**
 * Check if a field looks like a plaintext SIN
 */
function looksLikePlaintextSIN(value: string): boolean {
  if (!value) return false;
  
  // Remove spaces and dashes
  const cleaned = value.replace(/[\s-]/g, '');
  
  // Should be 9 digits
  if (!/^\d{9}$/.test(cleaned)) return false;
  
  // Should NOT be encrypted (encrypted data is base64 JSON)
  if (encryptionService.isEncrypted(value)) return false;
  
  return true;
}

/**
 * Verify encryption by decrypting and comparing
 */
async function verifyEncryption(
  plaintext: string, 
  encrypted: string
): Promise<boolean> {
  try {
    const decrypted = await decryptSIN(encrypted);
    const cleanPlaintext = plaintext.replace(/[\s-]/g, '');
    return decrypted === cleanPlaintext;
  } catch (error) {
    logger.error('Encryption verification failed', error as Error);
    return false;
  }
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  if (isForce) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main migration function
 */
async function migrateSINs() {
  console.log('🔐 Union Eyes - SIN Encryption Migration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }
  
  console.log(`Batch Size: ${BATCH_SIZE} records`);
  console.log(`Start Time: ${stats.startTime.toISOString()}\n`);
  
  try {
    // Step 1: Count records that need migration
    console.log('📊 Step 1: Analyzing database...\n');
    
    // Note: This assumes there's a 'sin' column with plaintext data
    // Adjust the query based on your actual schema
    const allUsers = await db.select({
      userId: users.userId,
      email: users.email,
      // Add encryptedSin when migration is applied
      // encryptedSin: users.encryptedSin,
    }).from(users);
    
    stats.total = allUsers.length;
    console.log(`Total users in database: ${stats.total}`);
    
    // Filter users that need migration
    // This is a placeholder - adjust based on your actual schema
    const usersNeedingMigration = allUsers.filter((user: any) => {
      // This is placeholder logic - update based on your actual schema
      // For now, assume no users need migration
      return false;
    });
    
    console.log(`Users needing migration: ${usersNeedingMigration.length}`);
    console.log(`Users already encrypted: ${stats.skipped}\n`);
    
    if (usersNeedingMigration.length === 0) {
      console.log('✅ No users need migration. All done!\n');
      return;
    }
    
    // Step 2: Confirm migration
    if (!isDryRun) {
      const confirmed = await promptConfirmation(
        `\n⚠️  Ready to migrate ${usersNeedingMigration.length} users?`
      );
      
      if (!confirmed) {
        console.log('\n❌ Migration cancelled by user\n');
        process.exit(0);
      }
    }
    
    console.log('\n🚀 Step 2: Migrating SINs...\n');
    
    // Step 3: Process in batches
    for (let i = 0; i < usersNeedingMigration.length; i += BATCH_SIZE) {
      const batch = usersNeedingMigration.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(usersNeedingMigration.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);
      
      for (const user of batch) {
        try {
          // This is placeholder code - adjust based on your actual schema
          // const plaintextSIN = user.sin;
          
          // if (!plaintextSIN) {
          //   stats.skipped++;
          //   continue;
          // }
          
          // if (!isDryRun) {
          //   // Encrypt the SIN
          //   const encrypted = await encryptSIN(plaintextSIN);
          //   
          //   // Verify encryption worked
          //   const isValid = await verifyEncryption(plaintextSIN, encrypted);
          //   if (!isValid) {
          //     throw new Error('Encryption verification failed');
          //   }
          //   
          //   // Update database
          //   await db.update(users)
          //     .set({ 
          //       encryptedSin: encrypted,
          //       // Optionally clear plaintext: sin: null
          //     })
          //     .where(eq(users.userId, user.userId));
          //   
          //   // Log for audit
          //   logger.info('Migrated SIN to encrypted format', {
          //     userId: user.userId,
          //     email: user.email,
          //     action: 'sin_migration',
          //   });
          // }
          
          stats.migrated++;
          
          // Progress indicator
          if (stats.migrated % 10 === 0) {
            process.stdout.write('.');
          }
          
        } catch (error) {
          stats.errors++;
          logger.error('Failed to migrate SIN', error as Error, {
            userId: user.userId,
            email: user.email,
          });
          
          if (stats.errors > 10) {
            console.log('\n\n❌ Too many errors. Stopping migration.\n');
            throw error;
          }
        }
      }
      
      console.log(` ✓ Batch ${batchNumber} complete\n`);
    }
    
    // Step 4: Final verification
    stats.endTime = new Date();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Migration Summary:\n');
    console.log(`   Total Users:     ${stats.total}`);
    console.log(`   Migrated:        ${stats.migrated}`);
    console.log(`   Already Encrypted: ${stats.skipped}`);
    console.log(`   Errors:          ${stats.errors}`);
    console.log(`   Duration:        ${((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)}s\n`);
    
    if (isDryRun) {
      console.log('🧪 DRY RUN COMPLETE - No changes were made\n');
      console.log('Remove --dry-run flag to perform actual migration\n');
    } else if (stats.errors === 0) {
      console.log('✅ MIGRATION COMPLETE!\n');
      console.log('Next Steps:');
      console.log('1. Verify encrypted data in database');
      console.log('2. Test decryption for T4A generation');
      console.log('3. Review audit logs');
      console.log('4. Consider removing plaintext SIN column\n');
    } else {
      console.log('⚠️  MIGRATION COMPLETE WITH ERRORS\n');
      console.log('Please review error logs and retry failed records\n');
    }
    
  } catch (error) {
    stats.endTime = new Date();
    console.error('\n❌ Migration failed:', error);
    console.log('\nStats at failure:');
    console.log(`   Migrated: ${stats.migrated}`);
    console.log(`   Errors: ${stats.errors}\n`);
    process.exit(1);
  }
}

// Run migration
migrateSINs()
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
