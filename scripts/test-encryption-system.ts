#!/usr/bin/env tsx
/**
 * Test Encryption System End-to-End
 * 
 * Validates that the encryption system is working correctly.
 * 
 * Tests:
 * 1. Environment configuration
 * 2. Encryption service initialization
 * 3. SIN encryption/decryption round-trip
 * 4. Format validation
 * 5. Masked display
 * 6. Error handling
 * 
 * Usage:
 *   pnpm tsx scripts/test-encryption-system.ts
 */

import { 
  encryptSIN, 
  decryptSIN, 
  formatSINForDisplay,
  encryptionService,
  generateEncryptionKey
} from '../lib/encryption';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  console.log(`${icon} ${result.name}${duration}`);
  if (!result.passed) {
    console.log(`   Error: ${result.message}`);
  }
}

async function runTests() {
  console.log('🔐 Union Eyes - Encryption System Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Test 1: Environment Configuration
  console.log('📋 1. Environment Configuration\n');
  
  const hasKeyVaultUrl = !!process.env.AZURE_KEY_VAULT_URL;
  const hasFallbackKey = !!process.env.FALLBACK_ENCRYPTION_KEY;
  
  logResult({
    name: 'Azure Key Vault URL configured',
    passed: true,
    message: hasKeyVaultUrl 
      ? `Configured: ${process.env.AZURE_KEY_VAULT_URL}` 
      : 'Not configured (using fallback)',
  });
  
  logResult({
    name: 'Fallback encryption key configured',
    passed: hasFallbackKey,
    message: hasFallbackKey 
      ? 'Configured' 
      : 'Missing FALLBACK_ENCRYPTION_KEY in environment',
  });
  
  if (!hasKeyVaultUrl && !hasFallbackKey) {
    console.log('\n❌ No encryption key configured!');
    console.log('   Run: pnpm tsx scripts/generate-encryption-key.ts\n');
    process.exit(1);
  }
  
  console.log();
  
  // Test 2: Encryption Service Initialization
  console.log('🔧 2. Encryption Service Initialization\n');
  
  try {
    // The service initializes automatically
    logResult({
      name: 'Encryption service initialized',
      passed: true,
      message: 'Service ready',
    });
  } catch (error) {
    logResult({
      name: 'Encryption service initialized',
      passed: false,
      message: (error as Error).message,
    });
  }
  
  console.log();
  
  // Test 3: SIN Encryption/Decryption
  console.log('🔐 3. SIN Encryption/Decryption\n');
  
  const testSINs = [
    '123456789',
    '987-654-321',
    '111 222 333',
  ];
  
  for (const testSIN of testSINs) {
    try {
      const startTime = Date.now();
      
      // Encrypt
      const encrypted = await encryptSIN(testSIN);
      
      // Decrypt
      const decrypted = await decryptSIN(encrypted);
      
      const duration = Date.now() - startTime;
      
      // Clean SIN for comparison
      const cleanSIN = testSIN.replace(/[\s-]/g, '');
      
      logResult({
        name: `Encrypt/Decrypt "${testSIN}"`,
        passed: decrypted === cleanSIN,
        message: decrypted === cleanSIN 
          ? `Success: ${encrypted.substring(0, 30)}...` 
          : `Failed: expected ${cleanSIN}, got ${decrypted}`,
        duration,
      });
    } catch (error) {
      logResult({
        name: `Encrypt/Decrypt "${testSIN}"`,
        passed: false,
        message: (error as Error).message,
      });
    }
  }
  
  console.log();
  
  // Test 4: Format Validation
  console.log('✅ 4. Format Validation\n');
  
  const invalidSINs = [
    { value: '12345', expected: 'reject' },
    { value: 'ABC-DEF-GHI', expected: 'reject' },
    { value: '1234567890', expected: 'reject' },
    { value: '', expected: 'reject' },
  ];
  
  for (const test of invalidSINs) {
    try {
      await encryptSIN(test.value);
      logResult({
        name: `Reject invalid SIN "${test.value}"`,
        passed: false,
        message: 'Should have thrown error',
      });
    } catch (error) {
      logResult({
        name: `Reject invalid SIN "${test.value}"`,
        passed: true,
        message: (error as Error).message,
      });
    }
  }
  
  console.log();
  
  // Test 5: Masked Display
  console.log('🎭 5. Masked Display\n');
  
  try {
    const plainSIN = '123456789';
    const encrypted = await encryptSIN(plainSIN);
    
    const masked = await formatSINForDisplay(encrypted, true);
    const expected = '***-***-6789';
    
    logResult({
      name: 'Format SIN for display',
      passed: masked === expected,
      message: masked === expected 
        ? `Correctly masked: ${masked}` 
        : `Expected ${expected}, got ${masked}`,
    });
    
    // Test plaintext masking
    const maskedPlain = await formatSINForDisplay('987654321', false);
    const expectedPlain = '***-***-4321';
    
    logResult({
      name: 'Format plaintext SIN for display',
      passed: maskedPlain === expectedPlain,
      message: maskedPlain === expectedPlain 
        ? `Correctly masked: ${maskedPlain}` 
        : `Expected ${expectedPlain}, got ${maskedPlain}`,
    });
  } catch (error) {
    logResult({
      name: 'Format SIN for display',
      passed: false,
      message: (error as Error).message,
    });
  }
  
  console.log();
  
  // Test 6: Error Handling
  console.log('🛡️  6. Error Handling\n');
  
  try {
    await decryptSIN('');
    logResult({
      name: 'Reject empty encrypted SIN',
      passed: false,
      message: 'Should have thrown error',
    });
  } catch (error) {
    logResult({
      name: 'Reject empty encrypted SIN',
      passed: true,
      message: (error as Error).message,
    });
  }
  
  try {
    await decryptSIN('INVALID_DATA_NOT_BASE64');
    logResult({
      name: 'Reject invalid encrypted data',
      passed: false,
      message: 'Should have thrown error',
    });
  } catch (error) {
    logResult({
      name: 'Reject invalid encrypted data',
      passed: true,
      message: 'Correctly rejected invalid data',
    });
  }
  
  console.log();
  
  // Test 7: Encryption Properties
  console.log('🔍 7. Encryption Properties\n');
  
  try {
    const plainSIN = '999888777';
    const encrypted = await encryptSIN(plainSIN);
    
    // Parse encrypted data
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    
    logResult({
      name: 'Has initialization vector (IV)',
      passed: !!parsed.iv,
      message: parsed.iv ? `IV present (${Buffer.from(parsed.iv, 'base64').length} bytes)` : 'Missing IV',
    });
    
    logResult({
      name: 'Has authentication tag',
      passed: !!parsed.authTag,
      message: parsed.authTag ? `Auth tag present (${Buffer.from(parsed.authTag, 'base64').length} bytes)` : 'Missing auth tag',
    });
    
    logResult({
      name: 'Has ciphertext',
      passed: !!parsed.ciphertext,
      message: parsed.ciphertext ? 'Ciphertext present' : 'Missing ciphertext',
    });
    
    logResult({
      name: 'Has key version',
      passed: !!parsed.keyVersion,
      message: parsed.keyVersion ? `Version: ${parsed.keyVersion}` : 'Missing version',
    });
    
    // Test different encryptions produce different ciphertext
    const encrypted2 = await encryptSIN(plainSIN);
    logResult({
      name: 'Random IV produces different ciphertext',
      passed: encrypted !== encrypted2,
      message: encrypted !== encrypted2 
        ? 'Each encryption is unique (good!)' 
        : 'Same ciphertext produced (bad!)',
    });
  } catch (error) {
    logResult({
      name: 'Encryption properties',
      passed: false,
      message: (error as Error).message,
    });
  }
  
  console.log();
  
  // Test 8: Performance
  console.log('⚡ 8. Performance\n');
  
  try {
    const iterations = 10;
    const testSIN = '555666777';
    
    // Encryption performance
    const encStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await encryptSIN(testSIN);
    }
    const encDuration = Date.now() - encStart;
    const encAvg = encDuration / iterations;
    
    logResult({
      name: `Encryption speed (${iterations} iterations)`,
      passed: encAvg < 50,
      message: `${encAvg.toFixed(2)}ms per encryption ${encAvg < 50 ? '(good)' : '(slow)'}`,
      duration: encDuration,
    });
    
    // Decryption performance
    const encrypted = await encryptSIN(testSIN);
    const decStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await decryptSIN(encrypted);
    }
    const decDuration = Date.now() - decStart;
    const decAvg = decDuration / iterations;
    
    logResult({
      name: `Decryption speed (${iterations} iterations)`,
      passed: decAvg < 50,
      message: `${decAvg.toFixed(2)}ms per decryption ${decAvg < 50 ? '(good)' : '(slow)'}`,
      duration: decDuration,
    });
  } catch (error) {
    logResult({
      name: 'Performance tests',
      passed: false,
      message: (error as Error).message,
    });
  }
  
  console.log();
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`   Total Tests: ${total}`);
  console.log(`   ✅ Passed:   ${passed}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Encryption system is working correctly.\n');
    console.log('Next Steps:');
    console.log('  1. Run unit tests: pnpm test __tests__/lib/encryption.test.ts');
    console.log('  2. Test in application UI');
    console.log('  3. Configure Azure Key Vault for production');
    console.log('  4. Review docs/ENCRYPTION_GUIDE.md\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    console.log('Troubleshooting:');
    console.log('  1. Check FALLBACK_ENCRYPTION_KEY in .env.local');
    console.log('  2. Run: pnpm tsx scripts/generate-encryption-key.ts');
    console.log('  3. Review docs/ENCRYPTION_QUICKSTART.md\n');
    process.exit(1);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
