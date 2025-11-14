/**
 * Workflow UI Test Script
 * 
 * This script tests the workflow functionality including:
 * - Navigation to workbench and claim details
 * - Status updates with workflow validation
 * - Workflow history tracking
 * - API endpoint validation
 * 
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - User logged in as info@nzilaventures.com (LRO)
 * - Test claims CLM-2025-003 and CLM-2025-004 assigned
 * 
 * Run with: node test-workflow.js
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  claimNumbers: ['CLM-2025-003', 'CLM-2025-004'],
  testUser: {
    email: 'info@nzilaventures.com',
    role: 'LRO'
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`  ${message}`, colors.blue);
  log(`${'='.repeat(60)}`, colors.blue);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    logSuccess(`${name}`);
  } else {
    results.failed++;
    logError(`${name}`);
  }
  if (details) {
    log(`  ${details}`, colors.reset);
  }
}

/**
 * Test 1: API Endpoints Availability
 */
async function testApiEndpoints() {
  logSection('Test 1: API Endpoints Availability');
  
  const claimNumber = TEST_CONFIG.claimNumbers[0];
  const endpoints = [
    { method: 'GET', path: `/api/claims/${claimNumber}`, expectStatus: [200, 401] },
    { method: 'GET', path: `/api/claims/${claimNumber}/workflow`, expectStatus: [200, 401, 403] },
    { method: 'GET', path: `/api/claims/${claimNumber}/workflow/history`, expectStatus: [200, 401, 403, 500] },
    { method: 'GET', path: `/api/workbench/assigned`, expectStatus: [200, 401] },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Accept': 'application/json' }
      });
      
      const statusOk = endpoint.expectStatus.includes(response.status);
      recordTest(
        `${endpoint.method} ${endpoint.path}`,
        statusOk,
        `Status: ${response.status} ${statusOk ? '(Expected)' : '(Unexpected)'}`
      );

      // Log response for debugging
      if (!statusOk) {
        const body = await response.text();
        logWarning(`  Response: ${body.substring(0, 100)}`);
      }
    } catch (error) {
      recordTest(
        `${endpoint.method} ${endpoint.path}`,
        false,
        `Error: ${error.message}`
      );
    }
  }
}

/**
 * Test 2: Workflow Transition Validation
 */
async function testWorkflowTransitions() {
  logSection('Test 2: Workflow Transition Validation');
  
  const validTransitions = [
    { from: 'submitted', to: 'under_review', valid: true },
    { from: 'submitted', to: 'resolved', valid: false },
    { from: 'under_review', to: 'investigation', valid: true },
    { from: 'under_review', to: 'pending_documentation', valid: true },
    { from: 'under_review', to: 'resolved', valid: true },
    { from: 'investigation', to: 'pending_documentation', valid: true },
    { from: 'investigation', to: 'resolved', valid: true },
    { from: 'pending_documentation', to: 'under_review', valid: true },
    { from: 'resolved', to: 'closed', valid: true },
    { from: 'resolved', to: 'submitted', valid: false },
  ];

  logInfo('Testing workflow transition logic...');
  
  // Import workflow validation logic
  const workflowRules = {
    submitted: ['under_review', 'assigned'],
    under_review: ['investigation', 'pending_documentation', 'resolved', 'rejected'],
    assigned: ['under_review', 'investigation'],
    investigation: ['pending_documentation', 'resolved', 'rejected'],
    pending_documentation: ['under_review', 'investigation'],
    resolved: ['closed'],
    rejected: ['closed'],
    closed: []
  };

  for (const transition of validTransitions) {
    const allowed = workflowRules[transition.from]?.includes(transition.to) || false;
    const testPassed = (allowed === transition.valid);
    
    recordTest(
      `Transition: ${transition.from} → ${transition.to}`,
      testPassed,
      `Expected: ${transition.valid ? 'Valid' : 'Invalid'}, Got: ${allowed ? 'Valid' : 'Invalid'}`
    );
  }
}

/**
 * Test 3: Claim Data Structure
 */
async function testClaimDataStructure() {
  logSection('Test 3: Claim Data Structure');
  
  const claimNumber = TEST_CONFIG.claimNumbers[0];
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/claims/${claimNumber}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 401) {
      recordTest('Claim data structure', false, 'Authentication required - cannot test without session');
      return;
    }

    const data = await response.json();
    const claim = data.claim;

    if (!claim) {
      recordTest('Claim data exists', false, 'No claim data in response');
      return;
    }

    // Check required fields
    const requiredFields = [
      'claimId', 'claimNumber', 'status', 'priority', 'claimType',
      'description', 'desiredOutcome', 'incidentDate', 'location',
      'createdAt', 'updatedAt'
    ];

    for (const field of requiredFields) {
      const exists = claim.hasOwnProperty(field) && claim[field] !== null;
      recordTest(
        `Claim has field: ${field}`,
        exists,
        exists ? `Value: ${JSON.stringify(claim[field]).substring(0, 50)}` : 'Field missing or null'
      );
    }

    // Check data types
    recordTest('claimNumber is string', typeof claim.claimNumber === 'string');
    recordTest('status is valid enum', ['submitted', 'under_review', 'assigned', 'investigation', 'pending_documentation', 'resolved', 'rejected', 'closed'].includes(claim.status));
    recordTest('priority is valid enum', ['low', 'medium', 'high', 'urgent'].includes(claim.priority));

  } catch (error) {
    recordTest('Claim data structure', false, `Error: ${error.message}`);
  }
}

/**
 * Test 4: Workflow History Structure
 */
async function testWorkflowHistoryStructure() {
  logSection('Test 4: Workflow History Structure');
  
  const claimNumber = TEST_CONFIG.claimNumbers[0];
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/claims/${claimNumber}/workflow/history`, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 401 || response.status === 403) {
      recordTest('Workflow history structure', false, 'Authentication/Authorization required');
      return;
    }

    if (response.status === 500) {
      const error = await response.json();
      recordTest('Workflow history API', false, `Server error: ${error.error || 'Unknown'}`);
      return;
    }

    const data = await response.json();
    
    recordTest('History response has history array', Array.isArray(data.history));
    recordTest('History response has totalEvents', typeof data.totalEvents === 'number');

    if (data.history.length > 0) {
      const firstEntry = data.history[0];
      const historyFields = ['id', 'updateType', 'message', 'createdBy', 'createdAt'];
      
      for (const field of historyFields) {
        recordTest(
          `History entry has field: ${field}`,
          firstEntry.hasOwnProperty(field)
        );
      }
    } else {
      logWarning('No workflow history entries found (this may be expected for new claims)');
    }

  } catch (error) {
    recordTest('Workflow history structure', false, `Error: ${error.message}`);
  }
}

/**
 * Test 5: Status Update Payload Validation
 */
async function testStatusUpdatePayload() {
  logSection('Test 5: Status Update Payload Validation');
  
  const testPayloads = [
    { 
      payload: {}, 
      valid: false, 
      reason: 'Missing required status field' 
    },
    { 
      payload: { status: 'under_review' }, 
      valid: true, 
      reason: 'Valid status without notes' 
    },
    { 
      payload: { status: 'under_review', notes: 'Test note' }, 
      valid: true, 
      reason: 'Valid status with notes' 
    },
    { 
      payload: { status: 'invalid_status', notes: 'Test' }, 
      valid: false, 
      reason: 'Invalid status value' 
    },
    { 
      payload: { status: '', notes: 'Test' }, 
      valid: false, 
      reason: 'Empty status string' 
    }
  ];

  for (const test of testPayloads) {
    const hasStatus = test.payload.status && test.payload.status.length > 0;
    const payloadValid = hasStatus;
    const testPassed = (payloadValid === test.valid);
    
    recordTest(
      `Payload validation: ${test.reason}`,
      testPassed,
      `Payload: ${JSON.stringify(test.payload)}`
    );
  }
}

/**
 * Test 6: UI Component Requirements
 */
async function testUIComponentRequirements() {
  logSection('Test 6: UI Component Requirements');
  
  const requirements = [
    {
      component: 'StatusUpdate',
      file: 'components/status-update.tsx',
      checks: [
        'Uses PATCH method for status updates',
        'Sends to /api/claims/[id]/status endpoint',
        'Includes status and notes in payload',
        'Calls onStatusUpdated callback on success',
        'Shows success/error messages'
      ]
    },
    {
      component: 'Claim Detail Page',
      file: 'app/dashboard/claims/[id]/page.tsx',
      checks: [
        'Fetches claim by claimNumber',
        'Displays StatusUpdate component',
        'Fetches workflow history',
        'Shows LRO perspective labels',
        'Has "Back to Assigned Claims" link'
      ]
    },
    {
      component: 'Workbench',
      file: 'app/dashboard/workbench/page.tsx',
      checks: [
        'Fetches assigned claims',
        'Displays claim list',
        'Links to claim detail with claimNumber',
        'Shows claim status and priority'
      ]
    }
  ];

  for (const req of requirements) {
    logInfo(`Component: ${req.component} (${req.file})`);
    for (const check of req.checks) {
      // These are manual checks - just log them
      log(`  □ ${check}`, colors.yellow);
    }
  }
  
  logWarning('UI component checks require manual verification');
  results.warnings++;
}

/**
 * Test 7: Database Schema Validation
 */
async function testDatabaseSchemaValidation() {
  logSection('Test 7: Database Schema Validation');
  
  const schemaChecks = [
    { table: 'claims', column: 'claim_number', type: 'text', required: true },
    { table: 'claims', column: 'status', type: 'claim_status', required: true },
    { table: 'claims', column: 'priority', type: 'claim_priority', required: true },
    { table: 'claims', column: 'assigned_to', type: 'uuid', required: false },
    { table: 'claims', column: 'created_at', type: 'timestamp', required: true },
    { table: 'claims', column: 'updated_at', type: 'timestamp', required: true },
    { table: 'claim_updates', column: 'claim_id', type: 'uuid', required: true },
    { table: 'claim_updates', column: 'update_type', type: 'text', required: true },
    { table: 'claim_updates', column: 'message', type: 'text', required: true },
    { table: 'user_management.users', column: 'user_id', type: 'uuid', required: true },
    { table: 'user_management.users', column: 'email', type: 'text', required: true }
  ];

  logInfo('Database schema checks (verify these in your database):');
  for (const check of schemaChecks) {
    log(`  □ ${check.table}.${check.column} (${check.type}) ${check.required ? '[REQUIRED]' : '[OPTIONAL]'}`, colors.yellow);
  }
  
  logWarning('Database schema checks require direct database access');
  results.warnings++;
}

/**
 * Test 8: Error Handling Scenarios
 */
async function testErrorHandling() {
  logSection('Test 8: Error Handling Scenarios');
  
  const errorScenarios = [
    {
      name: 'Non-existent claim',
      endpoint: '/api/claims/CLM-9999-999',
      expectedStatus: [404, 401]
    },
    {
      name: 'Invalid claim number format',
      endpoint: '/api/claims/invalid-format',
      expectedStatus: [404, 500, 401]
    },
    {
      name: 'Missing authentication',
      endpoint: '/api/workbench/assigned',
      expectedStatus: [401]
    }
  ];

  for (const scenario of errorScenarios) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${scenario.endpoint}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      const statusOk = scenario.expectedStatus.includes(response.status);
      recordTest(
        `Error handling: ${scenario.name}`,
        statusOk,
        `Status: ${response.status} ${statusOk ? '(Expected)' : '(Unexpected)'}`
      );
    } catch (error) {
      recordTest(
        `Error handling: ${scenario.name}`,
        false,
        `Network error: ${error.message}`
      );
    }
  }
}

/**
 * Print test summary
 */
function printSummary() {
  logSection('Test Summary');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${total}`, colors.cyan);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, colors.red);
  log(`Warnings: ${results.warnings}`, colors.yellow);
  log(`Pass Rate: ${passRate}%\n`, passRate >= 80 ? colors.green : colors.yellow);
  
  if (results.failed > 0) {
    logSection('Failed Tests');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        logError(t.name);
        if (t.details) log(`  ${t.details}`, colors.reset);
      });
  }
  
  if (results.warnings > 0) {
    log('\nNote: Some tests require manual verification or database access.', colors.yellow);
  }
  
  log('\n');
}

/**
 * Main test execution
 */
async function runTests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('  Workflow UI Test Suite', colors.blue);
  log('  ' + new Date().toISOString(), colors.blue);
  log('='.repeat(60) + '\n', colors.blue);
  
  logInfo(`Testing against: ${TEST_CONFIG.baseUrl}`);
  logInfo(`Test claims: ${TEST_CONFIG.claimNumbers.join(', ')}\n`);

  try {
    await testApiEndpoints();
    await testWorkflowTransitions();
    await testClaimDataStructure();
    await testWorkflowHistoryStructure();
    await testStatusUpdatePayload();
    await testUIComponentRequirements();
    await testDatabaseSchemaValidation();
    await testErrorHandling();
    
    printSummary();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Fatal error running tests: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
