/**
 * RLS Isolation Test Script
 * 
 * Tests that Row-Level Security properly isolates data between tenants.
 * This script simulates API calls with different tenant cookies to verify isolation.
 */

const TEST_TENANTS = {
  unionLocal123: {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'Union Local 123',
    expectedClaims: ['CLM-2024-TEST-001', 'CLM-2024-TEST-002']
  },
  workersAlliance: {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Workers Alliance',
    expectedClaims: ['CLM-2024-TEST-003', 'CLM-2024-TEST-004']
  },
  defaultUnion: {
    id: '29cec18c-5df2-41c0-a7c8-73a9464c9d3b',
    name: 'Default Union',
    expectedClaims: [] // No test claims for this tenant
  },
  defaultOrg: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Default Organization',
    expectedClaims: [] // No test claims for this tenant
  }
};

async function testTenantIsolation(tenantKey) {
  const tenant = TEST_TENANTS[tenantKey];
  console.log(`\n🧪 Testing ${tenant.name} (${tenant.id})`);
  console.log('━'.repeat(60));

  try {
    // Fetch claims with tenant cookie
    const response = await fetch('http://localhost:3000/api/claims', {
      headers: {
        'Cookie': `selected_tenant_id=${tenant.id}`
      }
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return false;
    }

    const data = await response.json();
    const claimNumbers = data.claims
      .filter(c => c.claimNumber.startsWith('CLM-2024-TEST'))
      .map(c => c.claimNumber)
      .sort();

    console.log(`📊 Found ${claimNumbers.length} test claim(s):`, claimNumbers);
    console.log(`📋 Expected ${tenant.expectedClaims.length} claim(s):`, tenant.expectedClaims);

    // Check if results match expectations
    const expectedSorted = [...tenant.expectedClaims].sort();
    const match = JSON.stringify(claimNumbers) === JSON.stringify(expectedSorted);

    if (match) {
      console.log('✅ PASS - Correct claims returned for tenant');
      return true;
    } else {
      console.log('❌ FAIL - Unexpected claims returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing tenant:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 Starting RLS Isolation Tests');
  console.log('═'.repeat(60));
  console.log('Testing that each tenant only sees their own claims...\n');

  const results = {};
  
  // Test each tenant
  for (const tenantKey of Object.keys(TEST_TENANTS)) {
    results[tenantKey] = await testTenantIsolation(tenantKey);
  }

  // Summary
  console.log('\n📈 Test Summary');
  console.log('═'.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [tenantKey, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${TEST_TENANTS[tenantKey].name}`);
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All RLS isolation tests passed!');
    console.log('✅ Each tenant can only access their own data');
  } else {
    console.log('⚠️  Some tests failed - RLS may not be properly configured');
  }
  
  console.log('═'.repeat(60));
}

// Run tests
runTests().catch(console.error);
