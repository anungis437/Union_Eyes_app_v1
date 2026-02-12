/**
 * k6 Load Testing Suite for UnionEyes API
 * 
 * Tests the performance, reliability, and scalability of critical API endpoints
 * 
 * Installation:
 * ```
 * # Windows (via Chocolatey)
 * choco install k6
 * 
 * # macOS (via Homebrew)
 * brew install k6
 * 
 * # Linux
 * sudo gpg -k
 * sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
 * echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
 * sudo apt-get update
 * sudo apt-get install k6
 * ```
 * 
 * Run tests:
 * ```
 * # Smoke test (minimal load)
 * k6 run __tests__/performance/k6-load-tests.js
 * 
 * # Load test (moderate load)
 * k6 run --vus 50 --duration 5m __tests__/performance/k6-load-tests.js
 * 
 * # Stress test (high load)
 * k6 run --vus 200 --duration 10m __tests__/performance/k6-load-tests.js
 * 
 * # Spike test
 * k6 run --stage 0s:0 --stage 10s:100 --stage 1m:100 --stage 10s:0 __tests__/performance/k6-load-tests.js
 * ```
 * 
 * @see https://k6.io/docs/
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Configuration
// ============================================================================

// Environment variables (can be overridden via CLI)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// ============================================================================
// Test Options
// ============================================================================

export const options = {
  // Test stages (load profile)
  stages: [
    { duration: '30s', target: 10 },  // Ramp-up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 25 },  // Ramp-up to 25 users
    { duration: '2m', target: 25 },   // Stay at 25 users
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],

  // Thresholds (performance requirements)
  thresholds: {
    // 95% of requests should complete within 500ms
    'http_req_duration': ['p(95)<500'],
    // 99% of requests should complete within 2000ms
    'http_req_duration{api:critical}': ['p(99)<2000'],
    // Error rate should be less than 1%
    'errors': ['rate<0.01'],
    // 95% of checks should pass
    'checks': ['rate>0.95'],
  },

  // HTTP settings
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authentication headers
 */
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-API-Key': API_KEY,
  };
}

/**
 * Make authenticated API request
 */
function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers: getAuthHeaders(),
    tags: { name: endpoint },
  };

  let response;
  if (body) {
    response = http.request(method, url, JSON.stringify(body), params);
  } else {
    response = http.request(method, url, null, params);
  }

  // Record metrics
  apiResponseTime.add(response.timings.duration);
  
  if (response.status >= 200 && response.status < 300) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }

  return response;
}

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * Authentication Test
 */
function testAuthentication() {
  group('Authentication', () => {
    const response = apiRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'testpassword123',
    });

    check(response, {
      'auth: status is 200': (r) => r.status === 200,
      'auth: has access token': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.accessToken !== undefined;
      },
      'auth: response time < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

/**
 * User Profile Test
 */
function testUserProfile() {
  group('User Profile', () => {
    // Get current user
    const getResponse = apiRequest('GET', '/api/users/me');
    
    check(getResponse, {
      'profile-get: status is 200': (r) => r.status === 200,
      'profile-get: has user data': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.id !== undefined;
      },
      'profile-get: response time < 200ms': (r) => r.timings.duration < 200,
    });

    // Update user profile
    const updateResponse = apiRequest('PATCH', '/api/users/me', {
      name: `Test User ${Date.now()}`,
    });

    check(updateResponse, {
      'profile-update: status is 200': (r) => r.status === 200,
      'profile-update: response time < 400ms': (r) => r.timings.duration < 400,
    });
  });
}

/**
 * Members List Test (Critical API)
 */
function testMembersList() {
  group('Members List', () => {
    const response = apiRequest('GET', '/api/members?limit=20&offset=0');

    check(response, {
      'members: status is 200': (r) => r.status === 200,
      'members: has data array': (r) => {
        const body = JSON.parse(r.body || '{}');
        return Array.isArray(body.data);
      },
      'members: has pagination': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.pagination !== undefined;
      },
      'members: response time < 500ms': (r) => r.timings.duration < 500,
    }, { api: 'critical' });
  });
}

/**
 * Dues Payment Test (Critical API)
 */
function testDuesPayment() {
  group('Dues Payment', () => {
    // Get payment methods
    const methodsResponse = apiRequest('GET', '/api/payments/methods');
    
    check(methodsResponse, {
      'payment-methods: status is 200': (r) => r.status === 200,
      'payment-methods: response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Create payment intent
    const intentResponse = apiRequest('POST', '/api/payments/intents', {
      amount: 50.00,
      currency: 'CAD',
      type: 'dues',
      description: 'Monthly union dues',
    });

    check(intentResponse, {
      'payment-intent: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'payment-intent: has intent ID': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.id !== undefined;
      },
      'payment-intent: response time < 800ms': (r) => r.timings.duration < 800,
    }, { api: 'critical' });
  });
}

/**
 * Grievances List Test
 */
function testGrievances() {
  group('Grievances', () => {
    const response = apiRequest('GET', '/api/grievances?status=open&limit=10');

    check(response, {
      'grievances: status is 200': (r) => r.status === 200,
      'grievances: has data': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.data !== undefined;
      },
      'grievances: response time < 600ms': (r) => r.timings.duration < 600,
    });
  });
}

/**
 * Reports Generation Test
 */
function testReports() {
  group('Reports', () => {
    const response = apiRequest('GET', '/api/reports/financial/summary?period=current_month');

    check(response, {
      'reports: status is 200': (r) => r.status === 200,
      'reports: has summary data': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.summary !== undefined;
      },
      'reports: response time < 1500ms': (r) => r.timings.duration < 1500,
    });
  });
}

/**
 * Bargaining Items Test
 */
function testBargaining() {
  group('Bargaining', () => {
    const response = apiRequest('GET', '/api/bargaining/items?status=active');

    check(response, {
      'bargaining: status is 200': (r) => r.status === 200,
      'bargaining: has items': (r) => {
        const body = JSON.parse(r.body || '{}');
        return Array.isArray(body.data);
      },
      'bargaining: response time < 400ms': (r) => r.timings.duration < 400,
    });
  });
}

/**
 * Documents List Test
 */
function testDocuments() {
  group('Documents', () => {
    const response = apiRequest('GET', '/api/documents?type=contract&limit=15');

    check(response, {
      'documents: status is 200': (r) => r.status === 200,
      'documents: has documents': (r) => {
        const body = JSON.parse(r.body || '{}');
        return Array.isArray(body.data);
      },
      'documents: response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
}

/**
 * Notifications Test
 */
function testNotifications() {
  group('Notifications', () => {
    const response = apiRequest('GET', '/api/notifications?unread=true&limit=20');

    check(response, {
      'notifications: status is 200': (r) => r.status === 200,
      'notifications: response time < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

/**
 * Health Check Test
 */
function testHealthCheck() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/api/health`);

    check(response, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 100ms': (r) => r.timings.duration < 100,
      'health: service is healthy': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.status === 'healthy' || body.status === 'ok';
      },
    });
  });
}

// ============================================================================
// Main Test Execution
// ============================================================================

export default function() {
  // Always check health first
  testHealthCheck();

  // Run authentication (10% of users)
  if (Math.random() < 0.1) {
    testAuthentication();
  }

  // User profile operations (30% of users)
  if (Math.random() < 0.3) {
    testUserProfile();
  }

  // Critical API endpoints (weighted distribution)
  const randomValue = Math.random();
  
  if (randomValue < 0.25) {
    // 25% - Members list (most common operation)
    testMembersList();
  } else if (randomValue < 0.40) {
    // 15% - Dues payment
    testDuesPayment();
  } else if (randomValue < 0.55) {
    // 15% - Grievances
    testGrievances();
  } else if (randomValue < 0.70) {
    // 15% - Documents
    testDocuments();
  } else if (randomValue < 0.80) {
    // 10% - Bargaining
    testBargaining();
  } else if (randomValue < 0.90) {
    // 10% - Reports
    testReports();
  } else {
    // 10% - Notifications
    testNotifications();
  }

  // Think time (simulate user reading/processing)
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// ============================================================================
// Teardown
// ============================================================================

export function teardown(data) {
  // Cleanup logic (if needed)
  console.log('Test execution completed');
  console.log(`Total successful requests: ${successfulRequests.value}`);
  console.log(`Total failed requests: ${failedRequests.value}`);
}
