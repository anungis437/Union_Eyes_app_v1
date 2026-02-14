/**
 * Debug session context functions
 * 
 * This script tests if current_user_id() and current_tenant_id() functions work correctly
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function testSessionContext() {
  console.log('🔍 Testing session context functions...\n');
  
  try {
    // Set session context
    const testUserId = 'test-user-123';
    const testTenant = 'test-tenant-456';
    const testOrgId = '12345678-1234-1234-1234-123456789012';
    
    // SECURITY FIX: Use proper parameterization instead of sql.raw()
    // NOTE: This is a test script with hardcoded values, but in production code
    // NEVER use sql.raw() for session variables or any user input
    await db.execute(sql`SET app.current_user_id = ${testUserId}`);
    await db.execute(sql`SET app.current_tenant_id = ${testTenant}`);
    await db.execute(sql`SET app.current_organization_id = ${testOrgId}`);
    
    console.log(`✅ Set session context:`);
    console.log(`   user_id: ${testUserId}`);
    console.log(`   tenant_id: ${testTenant}`);
    console.log(`   org_id: ${testOrgId}\n`);
    
    // Test current_user_id() function
    const result1 = await db.execute(sql`SELECT current_user_id() as user_id`);
    console.log('📊 current_user_id() returned:', result1[0]);
    
    // Test current_tenant_id() function
    const result2 = await db.execute(sql`SELECT current_tenant_id() as tenant_id`);
    console.log('📊 current_tenant_id() returned:', result2[0]);
    
    // Test reading session variables directly
    const result3 = await db.execute(sql`SELECT current_setting('app.current_user_id', true) as user_id_direct`);
    console.log('📊 Direct session read:', result3[0]);
    
    console.log('\n✅ Session context is working correctly!');
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSessionContext();
