/**
 * Check DATABASE_URL and Connection
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
console.log('📄 Loading environment from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env.local:', result.error.message);
  process.exit(1);
}

console.log('\n🔐 DATABASE_URL Configuration:\n');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

// Parse connection string (hide password)
try {
  const url = new URL(dbUrl);
  console.log(`  Protocol: ${url.protocol}`);
  console.log(`  Host: ${url.hostname}`);
  console.log(`  Port: ${url.port || 'default'}`);
  console.log(`  Database: ${url.pathname.substring(1)}`);
  console.log(`  User: ${url.username}`);
  console.log(`  Password: ${url.password ? '***' + url.password.slice(-4) : 'not set'}`);
  
  // Check search params
  const params = Array.from(url.searchParams.entries());
  if (params.length > 0) {
    console.log('\n  Parameters:');
    params.forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });
  }
  
} catch (error: unknown) {
  console.error('❌ Invalid DATABASE_URL format:', error.message);
  console.log('\nFull URL (first 50 chars):', dbUrl.substring(0, 50) + '...');
  process.exit(1);
}

console.log('\n✅ Connection string parsed successfully');
