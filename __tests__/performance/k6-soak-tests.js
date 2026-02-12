/**
 * k6 Endurance/Soak Testing Suite
 * Tests system stability over extended periods
 * 
 * Run: k6 run __tests__/performance/k6-soak-tests.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const errorRate = new Rate('errors');
const memoryLeaks = new Trend('memory_growth');

export const options = {
  // Soak test: sustained moderate load for extended period
  stages: [
    { duration: '5m', target: 30 },   // Ramp up
    { duration: '60m', target: 30 },  // Sustained load (1 hour)
    { duration: '5m', target: 0 },    // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_duration{endpoint:critical}': ['p(99)<2000'],
    'errors': ['rate<0.02'], // Maximum 2% error rate
    'http_req_failed': ['rate<0.02'],
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

export default function() {
  // Simulate realistic user behavior over time
  
  // Members listing (most common)
  let response = http.get(`${BASE_URL}/api/members?limit=20`, { 
    headers: getHeaders(),
    tags: { endpoint: 'critical' },
  });
  
  check(response, {
    'members: status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(2);

  // Check notifications
  response = http.get(`${BASE_URL}/api/notifications?unread=true`, { 
    headers: getHeaders() 
  });
  
  check(response, {
    'notifications: status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(3);

  // View documents
  response = http.get(`${BASE_URL}/api/documents?limit=10`, { 
    headers: getHeaders() 
  });
  
  check(response, {
    'documents: status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(5);
}

export function teardown(data) {
  console.log('Soak test completed - check for memory leaks and degradation patterns');
}
