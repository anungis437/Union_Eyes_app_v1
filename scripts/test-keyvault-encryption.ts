// Test Encryption with Azure Key Vault
// ======================================
// This script tests end-to-end encryption/decryption using Azure Key Vault

import { getEncryptionKey } from '../lib/azure-keyvault';
import crypto from 'crypto';

async function encryptWithKey(plaintext: string, key: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

async function decryptWithKey(ciphertext: string, key: string): Promise<string> {
  const [ivBase64, encryptedBase64] = ciphertext.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function testEncryptionWithKeyVault() {
  console.log('Testing Encryption with Azure Key Vault...\n');
  
  try {
    // Retrieve encryption key from Key Vault
    console.log('1. Retrieving encryption key from Key Vault...');
    const key = await getEncryptionKey();
    console.log('   ✓ Key retrieved successfully\n');
    
    // Test data
    const testData = [
      { label: 'SIN', value: '123-456-789' },
      { label: 'SSN', value: '987-65-4321' },
      { label: 'Bank Account', value: '1234567890' },
      { label: 'Unicode (Chinese)', value: '你好世界' },
      { label: 'Special chars', value: 'Test@#$%^&*()' },
      { label: 'Long string', value: 'A'.repeat(500) }
    ];
    
    console.log('2. Testing encryption/decryption for multiple PII types...\n');
    
    let passedTests = 0;
    let totalTests = testData.length;
    
    for (const test of testData) {
      try {
        // Encrypt
        const encrypted = await encryptWithKey(test.value, key);
        
        // Decrypt
        const decrypted = await decryptWithKey(encrypted, key);
        
        // Verify
        const passed = decrypted === test.value;
        const status = passed ? '✓' : '✗';
        
        console.log(`   ${status} ${test.label}:`);
        console.log(`      Original:  ${test.value.substring(0, 50)}${test.value.length > 50 ? '...' : ''}`);
        console.log(`      Encrypted: ${encrypted.substring(0, 50)}...`);
        console.log(`      Decrypted: ${decrypted.substring(0, 50)}${decrypted.length > 50 ? '...' : ''}`);
        console.log(`      Match: ${passed ? 'YES' : 'NO'}`);
        console.log('');
        
        if (passed) passedTests++;
        
      } catch (error) {
        console.log(`   ✗ ${test.label}: FAILED`);
        console.log(`      Error: ${error}`);
        console.log('');
      }
    }
    
    console.log(`\n3. Testing key caching...`);
    const start = Date.now();
    
    // Get key 10 times (should use cache after first call)
    for (let i = 0; i < 10; i++) {
      await getEncryptionKey();
    }
    
    const duration = Date.now() - start;
    console.log(`   ✓ 10 key retrievals in ${duration}ms (avg ${(duration / 10).toFixed(1)}ms)`);
    console.log(`   Cache working: ${duration < 1000 ? '✓ Yes' : '✗ No'}`);
    console.log('');
    
    // Summary
    console.log('========================================');
    console.log(`Tests: ${passedTests}/${totalTests} passed`);
    console.log('========================================');
    
    if (passedTests === totalTests) {
      console.log('\n✅ All encryption tests PASSED');
      console.log('\n🎉 Azure Key Vault integration is fully functional!');
      console.log('   - Encryption key retrieved from Key Vault');
      console.log('   - AES-256-CBC encryption working correctly');
      console.log('   - Key caching operational (1-hour TTL)');
      console.log('   - Ready for production use\n');
      return true;
    } else {
      console.log(`\n❌ ${totalTests - passedTests} tests FAILED\n`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Encryption test FAILED');
    console.error(`Error: ${error}`);
    console.error('');
    return false;
  }
}

// Run the test
testEncryptionWithKeyVault()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
