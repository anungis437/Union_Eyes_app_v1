# Analytics API Documentation

**Union Claims Management System**  
**Version**: 1.0  
**Base URL**: `/api/analytics`

---

## Authentication

All API endpoints require authentication via JWT token:

```
Authorization: Bearer <token>
```

Tenant isolation is automatically enforced based on authenticated user's tenant.

---

## Claims Analytics

### GET /api/analytics/claims

Get summary metrics for claims analytics.

**Query Parameters**:

- `days` (optional): Number of days to analyze (default: 30)

**Response**:

```json
{
  "current": {
    "totalClaims": 156,
    "activeClaims": 42,
    "resolvedClaims": 98,
    "avgResolutionTime": 18.5,
    "resolutionRate": 62.8
  },
  "previous": {
    "totalClaims": 142,
    "activeClaims": 38,
    "resolvedClaims": 89,
    "avgResolutionTime": 21.2,
    "resolutionRate": 59.2
  },
  "change": {
    "totalClaims": 9.9,
    "activeClaims": 10.5,
    "resolvedClaims": 10.1,
    "avgResolutionTime": -12.7,
    "resolutionRate": 6.1
  }
}
```

**Metrics**:

- `totalClaims`: Total claim count
- `activeClaims`: Claims in progress
- `resolvedClaims`: Closed claims
- `avgResolutionTime`: Average days to resolve
- `resolutionRate`: Percentage resolved

---

### GET /api/analytics/claims/trends

Get time-series claim data.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)
- `groupBy` (optional): 'daily' | 'weekly' | 'monthly' (default: 'weekly')

**Response**:

```json
[
  {
    "date": "2025-10-01",
    "newClaims": 12,
    "resolvedClaims": 8,
    "activeClaims": 42
  },
  {
    "date": "2025-10-08",
    "newClaims": 15,
    "resolvedClaims": 11,
    "activeClaims": 46
  }
]
```

**Use Case**: Trend charts, forecasting

---

### GET /api/analytics/claims/by-category

Get claim breakdown by category.

**Query Parameters**:

- `days` (optional): Number of days (default: 30)

**Response**:

```json
[
  {
    "category": "workplace_injury",
    "count": 45,
    "percentage": 28.8,
    "avgResolutionTime": 16.2,
    "resolutionRate": 71.1
  },
  {
    "category": "discrimination",
    "count": 32,
    "percentage": 20.5,
    "avgResolutionTime": 22.8,
    "resolutionRate": 59.4
  }
]
```

---

### GET /api/analytics/claims/by-status

Get claim distribution by status.

**Query Parameters**:

- `days` (optional): Number of days (default: 30)

**Response**:

```json
[
  {
    "status": "under_review",
    "count": 18,
    "percentage": 11.5,
    "avgAge": 8.3
  },
  {
    "status": "assigned",
    "count": 24,
    "percentage": 15.4,
    "avgAge": 12.1
  }
]
```

---

## Member Analytics

### GET /api/analytics/members

Get member analytics summary.

**Query Parameters**:

- `days` (optional): Number of days (default: 30)

**Response**:

```json
{
  "current": {
    "totalMembers": 1250,
    "newMembers": 42,
    "activeMembers": 156,
    "engagementRate": 12.5
  },
  "previous": {
    "totalMembers": 1208,
    "newMembers": 38,
    "activeMembers": 142,
    "engagementRate": 11.8
  },
  "change": {
    "totalMembers": 3.5,
    "newMembers": 10.5,
    "activeMembers": 9.9,
    "engagementRate": 5.9
  }
}
```

**Metrics**:

- `totalMembers`: Active member count
- `newMembers`: New signups in period
- `activeMembers`: Members with claims filed
- `engagementRate`: Percentage active

---

### GET /api/analytics/members/growth

Get member growth trends.

**Query Parameters**:

- `days` (optional): Number of days (default: 180)
- `groupBy` (optional): 'daily' | 'weekly' | 'monthly' (default: 'monthly')

**Response**:

```json
[
  {
    "date": "2025-09-01",
    "totalMembers": 1180,
    "newMembers": 28,
    "churnedMembers": 3,
    "netGrowth": 25
  },
  {
    "date": "2025-10-01",
    "totalMembers": 1208,
    "newMembers": 32,
    "churnedMembers": 4,
    "netGrowth": 28
  }
]
```

---

### GET /api/analytics/members/engagement

Get member engagement metrics.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)

**Response**:

```json
{
  "byActivity": [
    {
      "claimCount": 1,
      "memberCount": 98,
      "percentage": 62.8
    },
    {
      "claimCount": 2,
      "memberCount": 32,
      "percentage": 20.5
    }
  ],
  "topMembers": [
    {
      "memberId": "uuid",
      "memberNumber": "M12345",
      "claimCount": 5,
      "lastActivity": "2025-11-10"
    }
  ]
}
```

---

## Financial Analytics

### GET /api/analytics/financial

Get financial summary metrics.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)

**Response**:

```json
{
  "current": {
    "totalClaims": 156,
    "totalValue": 1850000,
    "totalSettlements": 1240000,
    "totalCosts": 420000,
    "avgValue": 11859,
    "winRate": 68.4,
    "netValue": 820000,
    "recoveryRate": 67.0
  },
  "previous": {
    "totalClaims": 142,
    "totalValue": 1680000,
    "totalSettlements": 1050000,
    "totalCosts": 380000,
    "avgValue": 11831,
    "winRate": 64.8,
    "netValue": 670000,
    "recoveryRate": 62.5
  },
  "change": {
    "totalClaims": 9.9,
    "totalValue": 10.1,
    "totalSettlements": 18.1,
    "totalCosts": 10.5,
    "avgValue": 0.2,
    "winRate": 5.6,
    "netValue": 22.4,
    "recoveryRate": 7.2
  }
}
```

**Calculations**:

- `netValue = settlements - costs`
- `winRate = (won / resolved) × 100`
- `recoveryRate = (settlements / claimValue) × 100`

---

### GET /api/analytics/financial/trends

Get financial time-series data.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)
- `groupBy` (optional): 'daily' | 'weekly' | 'monthly' (default: 'weekly')

**Response**:

```json
[
  {
    "date": "2025-10-01",
    "claimValue": 185000,
    "settlements": 124000,
    "costs": 42000,
    "netValue": 82000
  },
  {
    "date": "2025-10-08",
    "claimValue": 198000,
    "settlements": 135000,
    "costs": 45000,
    "netValue": 90000
  }
]
```

---

### GET /api/analytics/financial/outcomes

Get settlement analysis by resolution outcome.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)

**Response**:

```json
[
  {
    "outcome": "won",
    "count": 67,
    "totalSettlements": 980000,
    "avgSettlement": 14627,
    "totalCosts": 285000,
    "avgCosts": 4254,
    "netValue": 695000
  },
  {
    "outcome": "settled",
    "count": 21,
    "totalSettlements": 260000,
    "avgSettlement": 12381,
    "totalCosts": 95000,
    "avgCosts": 4524,
    "netValue": 165000
  },
  {
    "outcome": "lost",
    "count": 10,
    "totalSettlements": 0,
    "avgSettlement": 0,
    "totalCosts": 40000,
    "avgCosts": 4000,
    "netValue": -40000
  }
]
```

---

### GET /api/analytics/financial/categories

Get financial performance by claim category with ROI.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)

**Response**:

```json
[
  {
    "category": "workplace_injury",
    "count": 45,
    "totalValue": 650000,
    "settlements": 480000,
    "costs": 180000,
    "winRate": 75.6,
    "roi": 166.7,
    "change": 12.4
  },
  {
    "category": "discrimination",
    "count": 32,
    "totalValue": 520000,
    "settlements": 310000,
    "costs": 140000,
    "winRate": 62.5,
    "roi": 121.4,
    "change": -5.2
  }
]
```

**Calculations**:

- `roi = ((settlements - costs) / costs) × 100`
- `change`: Percentage change vs previous period

---

### GET /api/analytics/financial/costs

Get detailed cost breakdown and efficiency metrics.

**Query Parameters**:

- `days` (optional): Number of days (default: 90)

**Response**:

```json
[
  {
    "category": "workplace_injury",
    "legalCosts": 120000,
    "courtCosts": 35000,
    "adminCosts": 25000,
    "totalCosts": 180000,
    "claimCount": 45,
    "avgCostPerClaim": 4000,
    "percentage": 42.9
  },
  {
    "category": "discrimination",
    "legalCosts": 95000,
    "courtCosts": 28000,
    "adminCosts": 17000,
    "totalCosts": 140000,
    "claimCount": 32,
    "avgCostPerClaim": 4375,
    "percentage": 33.3
  }
]
```

---

## Operational Analytics

### GET /api/analytics/operational

Get operational efficiency summary.

**Query Parameters**:

- `days` (optional): Number of days (default: 30)

**Response**:

```json
{
  "current": {
    "queueSize": 42,
    "avgWaitTime": 36.5,
    "slaCompliance": 84.2,
    "workloadBalance": 78.5
  },
  "previous": {
    "queueSize": 38,
    "avgWaitTime": 42.1,
    "slaCompliance": 81.8,
    "workloadBalance": 72.3
  },
  "change": {
    "queueSize": 10.5,
    "avgWaitTime": -13.3,
    "slaCompliance": 2.9,
    "workloadBalance": 8.6
  }
}
```

**Metrics**:

- `queueSize`: Active claims count
- `avgWaitTime`: Hours in queue (average)
- `slaCompliance`: Percentage resolved within 30 days
- `workloadBalance`: Distribution evenness (higher = better)

---

### GET /api/analytics/operational/queues

Get queue metrics by priority level.

**Query Parameters**: None

**Response**:

```json
[
  {
    "priority": "critical",
    "count": 5,
    "avgAge": 18.2,
    "oldest": 42.5
  },
  {
    "priority": "high",
    "count": 12,
    "avgAge": 24.8,
    "oldest": 68.3
  },
  {
    "priority": "medium",
    "count": 18,
    "avgAge": 36.5,
    "oldest": 120.4
  },
  {
    "priority": "low",
    "count": 7,
    "avgAge": 52.1,
    "oldest": 180.2
  }
]
```

**All times in hours**

---

### GET /api/analytics/operational/workload

Get steward workload distribution and utilization.

**Query Parameters**: None

**Response**:

```json
[
  {
    "stewardId": "uuid",
    "stewardName": "John Doe",
    "activeCases": 18,
    "capacity": 20,
    "utilization": 90.0,
    "avgResponseTime": 4.2
  },
  {
    "stewardId": "uuid",
    "stewardName": "Jane Smith",
    "activeCases": 12,
    "capacity": 20,
    "utilization": 60.0,
    "avgResponseTime": 3.1
  }
]
```

**Metrics**:

- `utilization = (activeCases / capacity) × 100`
- `avgResponseTime`: Hours to first action

**Color Coding**:

- Red: utilization > 90%
- Yellow: utilization > 75%
- Green: utilization ≤ 75%

---

### GET /api/analytics/operational/sla

Get SLA compliance tracking over time.

**Query Parameters**:

- `days` (optional): Number of days (default: 30)

**Response**:

```json
[
  {
    "date": "2025-11-01",
    "onTime": 8,
    "overdue": 2,
    "compliance": 80.0
  },
  {
    "date": "2025-11-02",
    "onTime": 6,
    "overdue": 1,
    "compliance": 85.7
  }
]
```

**SLA Definition**: Claims resolved within 30 days of creation

**Target**: ≥ 85% compliance

---

### GET /api/analytics/operational/bottlenecks

Get automated bottleneck detection results.

**Query Parameters**: None

**Response**:

```json
[
  {
    "stage": "investigation",
    "count": 32,
    "avgDuration": 168.5,
    "severity": "high"
  },
  {
    "stage": "pending_documentation",
    "count": 18,
    "avgDuration": 96.2,
    "severity": "medium"
  }
]
```

**Detection Algorithm**:

- **High**: avg_duration > P75 × 1.5
- **Medium**: avg_duration > P75 × 1.2
- **Low**: Otherwise

**Filters**:

- Minimum 5 claims in stage
- Minimum 48 hours average duration

---

## Error Responses

All endpoints return consistent error formats:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Status Codes**:

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

---

## Rate Limiting

- **Limit**: 100 requests per minute per tenant
- **Headers**:
  - `X-RateLimit-Limit`: Total allowed
  - `X-RateLimit-Remaining`: Remaining calls
  - `X-RateLimit-Reset`: Reset timestamp

---

## Caching

- **TTL**: 5 minutes for most endpoints
- **Cache Key**: Based on tenant + endpoint + parameters
- **Invalidation**: Automatic on data changes
- **Headers**:
  - `X-Cache-Hit`: true/false

---

## Changelog

### v1.0 (November 15, 2025)

- Initial release
- 17 endpoints across 4 categories
- Full authentication and tenant isolation
- Caching and performance optimization

---

**Support**: <api@unionclaims.com>  
**Documentation Updated**: November 15, 2025
