// Test Azure Key Vault Integration
// =================================
// This script tests that we can retrieve the encryption key from Azure Key Vault

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const KEY_VAULT_URL = 'https://unioneyes-keyvault.vault.azure.net';
const SECRET_NAME = 'pii-master-key';

async function testKeyVaultAccess() {
  console.log('Testing Azure Key Vault Integration...\n');
  
  try {
    // Create Key Vault client with default Azure credentials
    console.log('1. Creating Key Vault client...');
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KEY_VAULT_URL, credential);
    console.log('   ✓ Client created\n');
    
    // Retrieve the encryption key
    console.log('2. Retrieving encryption key from Key Vault...');
    const secret = await client.getSecret(SECRET_NAME);
    console.log('   ✓ Secret retrieved successfully\n');
    
    // Display secret details
    console.log('Secret Details:');
    console.log(`   Name: ${secret.name}`);
    console.log(`   Enabled: ${secret.properties.enabled}`);
    console.log(`   Created: ${secret.properties.createdOn?.toISOString()}`);
    console.log(`   Updated: ${secret.properties.updatedOn?.toISOString()}`);
    console.log(`   Expires: ${secret.properties.expiresOn?.toISOString() || 'Never'}`);
    console.log(`   Key Length: ${secret.value?.length} characters`);
    console.log('');
    
    // Test key format (should be base64)
    if (secret.value) {
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(secret.value);
      console.log(`3. Validating key format...`);
      console.log(`   Base64 format: ${isBase64 ? '✓ Valid' : '✗ Invalid'}`);
      
      // Decode to verify it's 256 bits (32 bytes)
      const decoded = Buffer.from(secret.value, 'base64');
      console.log(`   Key size: ${decoded.length} bytes (${decoded.length * 8} bits)`);
      console.log(`   Expected: 32 bytes (256 bits)`);
      console.log(`   Valid AES-256 key: ${decoded.length === 32 ? '✓ Yes' : '✗ No'}`);
      console.log('');
    }
    
    console.log('✅ Azure Key Vault integration test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('❌ Azure Key Vault integration test FAILED');
    console.error(`Error: ${error}`);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Ensure you are logged into Azure CLI: az login');
    console.error('  2. Verify Key Vault exists: az keyvault show --name unioneyes-keyvault');
    console.error('  3. Check permissions: You need "Key Vault Secrets User" role');
    console.error('  4. Wait 5-10 minutes for RBAC propagation if just granted access');
    console.error('');
    return false;
  }
}

// Run the test
testKeyVaultAccess()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
