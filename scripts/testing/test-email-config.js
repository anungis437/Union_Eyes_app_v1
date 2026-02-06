/**
 * Email Configuration Test Script
 * 
 * Verifies email service configuration without requiring full app context
 * Run with: node test-email-config.js
 */

console.log('\n============================================');
console.log('  Email Configuration Test');
console.log('  ' + new Date().toISOString());
console.log('============================================\n');

// Test 1: Check environment variables
console.log('Test 1: Environment Variables');
console.log('---------------------------------------------');

const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const resendKey = envContent.match(/RESEND_API_KEY=(.+)/);
  const emailFrom = envContent.match(/EMAIL_FROM=(.+)/);
  const emailReplyTo = envContent.match(/EMAIL_REPLY_TO=(.+)/);
  const appUrl = envContent.match(/NEXT_PUBLIC_APP_URL=(.+)/);
  
  if (resendKey && resendKey[1]) {
    const key = resendKey[1].trim();
    console.log('✓ RESEND_API_KEY found');
    console.log(`  Value: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`);
    console.log(`  Length: ${key.length} characters`);
  } else {
    console.log('✗ RESEND_API_KEY not found or empty');
  }
  
  console.log('');
  console.log('  EMAIL_FROM:', emailFrom ? emailFrom[1].trim() : 'Not set (will use default: noreply@unionclaims.com)');
  console.log('  EMAIL_REPLY_TO:', emailReplyTo ? emailReplyTo[1].trim() : 'Not set (will use default: support@unionclaims.com)');
  console.log('  NEXT_PUBLIC_APP_URL:', appUrl ? appUrl[1].trim() : 'Not set (will use default: http://localhost:3000)');
  
} catch (error) {
  console.log('✗ Error reading .env.local:', error.message);
}

console.log('');

// Test 2: Check email service file exists
console.log('Test 2: Email Service Files');
console.log('---------------------------------------------');

const emailServicePath = path.join(__dirname, 'lib', 'email-service.ts');
const notificationsPath = path.join(__dirname, 'lib', 'claim-notifications.ts');
const templatesPath = path.join(__dirname, 'lib', 'email-templates.tsx');

console.log('  email-service.ts:', fs.existsSync(emailServicePath) ? '✓ Found' : '✗ Not found');
console.log('  claim-notifications.ts:', fs.existsSync(notificationsPath) ? '✓ Found' : '✗ Not found');
console.log('  email-templates.tsx:', fs.existsSync(templatesPath) ? '✓ Found' : '✗ Not found');

console.log('');

// Test 3: Check workflow engine integration
console.log('Test 3: Workflow Engine Integration');
console.log('---------------------------------------------');

try {
  const workflowPath = path.join(__dirname, 'lib', 'workflow-engine.ts');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  const hasImport = workflowContent.includes("import { sendClaimStatusNotification }");
  const hasCall = workflowContent.includes("sendClaimStatusNotification(");
  
  console.log('  Import statement:', hasImport ? '✓ Found' : '✗ Not found');
  console.log('  Function call:', hasCall ? '✓ Found' : '✗ Not found');
  
  if (hasCall) {
    // Check if it's in a try-catch
    const hasCatch = workflowContent.match(/sendClaimStatusNotification.*\.catch/s);
    console.log('  Error handling:', hasCatch ? '✓ Has .catch()' : '⚠ No error handling');
  }
} catch (error) {
  console.log('✗ Error reading workflow-engine.ts:', error.message);
}

console.log('');

// Test 4: Check Resend package
console.log('Test 4: Dependencies');
console.log('---------------------------------------------');

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const resendVersion = packageJson.dependencies?.resend || packageJson.devDependencies?.resend;
  const reactEmailVersion = packageJson.dependencies?.['@react-email/components'] || 
                            packageJson.devDependencies?.['@react-email/components'];
  
  console.log('  resend:', resendVersion ? `✓ v${resendVersion}` : '✗ Not installed');
  console.log('  @react-email/components:', reactEmailVersion ? `✓ v${reactEmailVersion}` : '✗ Not installed');
  console.log('  @react-email/render:', packageJson.dependencies?.['@react-email/render'] ? '✓ Installed' : '✗ Not installed');
} catch (error) {
  console.log('✗ Error reading package.json:', error.message);
}

console.log('');

// Test 5: Email template check
console.log('Test 5: Email Template');
console.log('---------------------------------------------');

try {
  const templateContent = fs.readFileSync(templatesPath, 'utf8');
  
  const hasClaimNotification = templateContent.includes('ClaimStatusNotificationEmail');
  const hasReactEmail = templateContent.includes('@react-email/components');
  const hasGetStatusInfo = templateContent.includes('getStatusInfo');
  
  console.log('  ClaimStatusNotificationEmail export:', hasClaimNotification ? '✓ Found' : '✗ Not found');
  console.log('  React Email imports:', hasReactEmail ? '✓ Found' : '✗ Not found');
  console.log('  getStatusInfo function:', hasGetStatusInfo ? '✓ Found' : '✗ Not found');
  
  // Check for status colors
  const statusColors = {
    'submitted': '#3b82f6',
    'under_review': '#f59e0b',
    'resolved': '#10b981',
    'rejected': '#ef4444',
  };
  
  console.log('');
  console.log('  Status colors defined:');
  for (const [status, color] of Object.entries(statusColors)) {
    const hasColor = templateContent.includes(color);
    console.log(`    ${status}:`, hasColor ? `✓ ${color}` : '✗ Not found');
  }
} catch (error) {
  console.log('✗ Error reading email template:', error.message);
}

console.log('');

// Summary
console.log('============================================');
console.log('  Configuration Summary');
console.log('============================================\n');

console.log('Next Steps:');
console.log('1. If RESEND_API_KEY is configured: ✓ Ready to test');
console.log('2. If not configured: Add to .env.local');
console.log('3. Run dev server: pnpm dev');
console.log('4. Update claim status and check console logs');
console.log('5. Check email inbox for notifications');
console.log('');
console.log('For detailed testing instructions, see:');
console.log('  test-email-notifications.md');
console.log('');
