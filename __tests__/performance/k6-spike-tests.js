/**
 * k6 Spike Testing Suite
 * Tests system behavior under sudden traffic spikes
 * 
 * Run: k6 run __tests__/performance/k6-spike-tests.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const errorRate = new Rate('errors');

export const options = {
  // Spike test: sudden burst of traffic
  stages: [
    { duration: '30s', target: 10 },   // Baseline
    { duration: '10s', target: 200 },  // Sudden spike
    { duration: '1m', target: 200 },   // Maintain spike
    { duration: '10s', target: 10 },   // Drop back down
    { duration: '30s', target: 10 },   // Recovery
  ],

  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'errors': ['rate<0.1'], // Allow 10% errors during spike
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

export default function() {
  const response = http.get(`${BASE_URL}/api/members?limit=20`, { headers: getHeaders() });

  check(response, {
    'status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2);
}
