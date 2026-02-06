#!/usr/bin/env tsx
/**
 * Generate Encryption Key for Development
 * 
 * Generates a secure AES-256 encryption key for use in development/test environments.
 * 
 * Usage:
 *   pnpm tsx scripts/generate-encryption-key.ts
 * 
 * Output:
 *   - Displays base64-encoded 256-bit (32-byte) encryption key
 *   - Add to .env.local as FALLBACK_ENCRYPTION_KEY
 * 
 * Security Note:
 *   - DO NOT use this key in production
 *   - Production should use Azure Key Vault
 *   - Never commit this key to version control
 *   - Rotate keys regularly
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const KEY_LENGTH = 32; // 256 bits for AES-256

console.log('🔐 Union Eyes - Encryption Key Generator\n');

// Generate secure random key
const key = crypto.randomBytes(KEY_LENGTH);
const base64Key = key.toString('base64');

console.log('✅ Generated 256-bit AES encryption key\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('FALLBACK_ENCRYPTION_KEY=' + base64Key);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Next Steps:\n');
console.log('1. Copy the key above');
console.log('2. Add to your .env.local file:');
console.log('   FALLBACK_ENCRYPTION_KEY=<paste key here>\n');
console.log('3. Restart your development server\n');

// Optionally write to .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (fs.existsSync(envLocalPath)) {
  console.log('⚠️  Warning: .env.local already exists\n');
  console.log('Options:');
  console.log('  a) Manually add the key to .env.local');
  console.log('  b) Run with --write flag to append automatically\n');
  
  if (process.argv.includes('--write')) {
    const existingContent = fs.readFileSync(envLocalPath, 'utf-8');
    
    // Check if FALLBACK_ENCRYPTION_KEY already exists
    if (existingContent.includes('FALLBACK_ENCRYPTION_KEY=')) {
      console.log('❌ FALLBACK_ENCRYPTION_KEY already exists in .env.local');
      console.log('   Please update it manually if you want to change the key\n');
      process.exit(1);
    }
    
    // Append the key
    const newContent = `${existingContent}\n# Encryption (Generated ${new Date().toISOString()})\nFALLBACK_ENCRYPTION_KEY=${base64Key}\n`;
    fs.writeFileSync(envLocalPath, newContent);
    
    console.log('✅ Added FALLBACK_ENCRYPTION_KEY to .env.local\n');
  }
} else {
  console.log('ℹ️  .env.local not found');
  console.log('   Create it manually and add the key above\n');
}

// Display key properties
console.log('🔍 Key Properties:\n');
console.log(`   Length: ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`);
console.log(`   Algorithm: AES-256-GCM`);
console.log(`   Encoding: Base64`);
console.log(`   Entropy: ${(KEY_LENGTH * 8).toFixed(0)} bits\n`);

// Security reminders
console.log('🛡️  Security Reminders:\n');
console.log('   ❌ DO NOT commit this key to version control');
console.log('   ❌ DO NOT use in production (use Azure Key Vault)');
console.log('   ❌ DO NOT share this key via insecure channels');
console.log('   ✅ DO rotate keys regularly');
console.log('   ✅ DO use Azure Key Vault for production');
console.log('   ✅ DO keep .env.local in .gitignore\n');

// Production setup reminder
console.log('🚀 Production Setup:\n');
console.log('   For production, configure Azure Key Vault:');
console.log('   1. Create Azure Key Vault instance');
console.log('   2. Set AZURE_KEY_VAULT_URL in environment');
console.log('   3. Configure authentication (Managed Identity or Service Principal)');
console.log('   4. See docs/ENCRYPTION_GUIDE.md for details\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
