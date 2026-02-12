/**
 * k6 Stress Testing Suite
 * Tests system behavior under extreme load conditions
 * 
 * Run: k6 run __tests__/performance/k6-stress-tests.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  // Stress test profile: gradually increase load beyond normal capacity
  stages: [
    { duration: '2m', target: 50 },   // Ramp to normal load
    { duration: '3m', target: 50 },   // Stay at normal
    { duration: '2m', target: 100 },  // Increase to 2x
    { duration: '3m', target: 100 },  // Stay at 2x
    { duration: '2m', target: 200 },  // Increase to 4x
    { duration: '3m', target: 200 },  // Stay at 4x (stress point)
    { duration: '2m', target: 300 },  // Extreme load
    { duration: '3m', target: 300 },  // Stay at extreme
    { duration: '5m', target: 0 },    // Gradual ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'errors': ['rate<0.05'], // Allow 5% error rate under stress
    'http_req_failed': ['rate<0.05'],
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

export default function() {
  // Critical endpoints under stress
  const endpoints = [
    '/api/members?limit=20',
    '/api/grievances?status=open',
    '/api/payments/methods',
    '/api/documents?limit=10',
    '/api/health',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`, { headers: getHeaders() });

  apiResponseTime.add(response.timings.duration);
  
  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429, // Allow rate limiting
    'response time acceptable': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);

  sleep(0.1); // Minimal think time to maximize stress
}
