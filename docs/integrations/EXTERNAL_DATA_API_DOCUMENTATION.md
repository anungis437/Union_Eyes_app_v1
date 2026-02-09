# External Data Integration - API Documentation

**Version:** 1.0.0  
**Base URL:** `/api/external-data`

---

## Overview

This API provides access to external labor market data for CBA enrichment:
- **Statistics Canada**: Wages, union density, CPI/inflation, EI/CPP rates
- **Provincial LRB**: Collective agreements from Ontario and BC
- **CLC Partnership**: Per-capita benchmarks and bargaining trends

---

## Authentication

All endpoints require Clerk authentication via `Authorization` header:

```bash
Authorization: Bearer <clerk_token>
```

Cron job endpoints require `CRON_SECRET`:

```bash
Authorization: Bearer <cron_secret>
```

---

## External Data Endpoints

### GET /api/external-data

List available endpoints and data sources.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Action to perform |

**Actions:**
- `list` - List all available endpoints
- `sync-status` - Check sync history
- `wages` - Get wage data
- `union-density` - Get union density data
- `cola` - Get COLA data
- `benchmarks` - Get stored benchmarks

**Example:**
```bash
curl "https://api.example.com/api/external-data?action=list"
```

**Response:**
```json
{
  "endpoints": {
    "GET /api/external-data?action=sync-status": "Check sync status",
    "GET /api/external-data?action=wages&noc=6513&geo=35": "Get wage data",
    "GET /api/external-data?action=union-density&geo=35": "Get union density",
    "GET /api/external-data?action=cola&geo=35": "Get COLA data",
    "POST /api/external-data/sync/wages": "Sync wage data",
    "POST /api/external-data/sync/union-density": "Sync union density",
    "POST /api/external-data/sync/cola": "Sync COLA data"
  },
  "sources": [
    { "name": "Statistics Canada", "type": "api", "status": "available" },
    { "name": "Ontario LRB", "type": "scraper", "status": "pending" },
    { "name": "BC LRB", "type": "api", "status": "pending" },
    { "name": "CLC Partnership", "type": "oauth", "status": "planned" }
  ]
}
```

---

### GET /api/external-data?action=wages

Get wage data from Statistics Canada.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noc` | string | Yes | NOC code (e.g., "6513") |
| `geo` | string | No | Geography code (default: "01" for Canada) |
| `year` | number | No | Survey year |

**Example:**
```bash
curl "https://api.example.com/api/external-data?action=wages&noc=3012&geo=35&year=2024"
```

**Response:**
```json
{
  "wages": [
    {
      "GEO": "35",
      "GEOName": "Ontario",
      "NOC": "3012",
      "NOCName": "Registered nurses and registered psychiatric nurses",
      "Wages": {
        "UOM": "Hourly",
        "Value": 45.5,
        "Symbol": null,
        "Decimals": 2
      },
      "Sex": "B",
      "AgeGroup": "25-54",
      "RefDate": "2024-01",
      "Source": "Statistics Canada"
    }
  ],
  "count": 1
}
```

---

### GET /api/external-data?action=union-density

Get union density statistics.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `geo` | string | No | Geography code (default: "01") |
| `naics` | string | No | NAICS industry code |
| `year` | number | No | Survey year |

**Example:**
```bash
curl "https://api.example.com/api/external-data?action=union-density&geo=35&naics=62"
```

**Response:**
```json
{
  "unionDensity": [
    {
      "GEO": "35",
      "GEOName": "Ontario",
      "NAICS": "62",
      "NAICSName": "Health care and social assistance",
      "UnionStatus": "union_member",
      "Value": 72.5,
      "RefDate": "2024-01"
    }
  ],
  "count": 1
}
```

---

### GET /api/external-data?action=cola

Get cost of living adjustment data.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `geo` | string | No | Geography code (default: "35") |
| `startYear` | number | No | Start year (default: 2018) |
| `endYear` | number | No | End year (default: current year) |

**Example:**
```bash
curl "https://api.example.com/api/external-data?action=cola&geo=35&startYear=2020&endYear=2024"
```

**Response:**
```json
{
  "cola": [
    { "year": 2024, "inflationRate": 2.8, "cpi": 158.2, "region": "35" },
    { "year": 2023, "inflationRate": 4.1, "cpi": 153.8, "region": "35" },
    { "year": 2022, "inflationRate": 6.8, "cpi": 147.8, "region": "35" }
  ],
  "count": 3
}
```

---

### POST /api/external-data

Trigger sync operations.

**Request Body:**
```json
{
  "action": "sync-wages",
  "params": {
    "nocCodes": ["3012", "6513", "7611"],
    "geography": "35",
    "year": 2024
  }
}
```

**Actions:**

| Action | Description |
|--------|-------------|
| `sync-wages` | Sync wage data for specified NOC codes |
| `sync-union-density` | Sync union density data |
| `sync-cola` | Sync COLA data |
| `sync-contributions` | Sync EI and CPP rates |
| `full-sync` | Run all sync operations |
| `get-benchmarks` | Get benchmarks for CBA enrichment |

**Example - Full Sync:**
```bash
curl -X POST "https://api.example.com/api/external-data" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "full-sync"}'
```

**Response:**
```json
{
  "success": true,
  "results": {
    "wages": {
      "success": true,
      "syncId": "sync_1701234567_abc123",
      "recordsProcessed": 150,
      "recordsInserted": 45,
      "recordsUpdated": 100,
      "recordsFailed": 5
    },
    "unionDensity": { ... },
    "cola": { ... },
    "contributions": { ... }
  },
  "completedAt": "2026-02-09T06:00:00Z"
}
```

---

## LRB Endpoints

### GET /api/external-data/lrb

Search LRB agreements.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Action to perform |
| `employer` | string | Filter by employer name |
| `union` | string | Filter by union name |
| `jurisdiction` | string | Filter by jurisdiction (ON, BC) |
| `sector` | string | Filter by sector |
| `status` | string | Filter by status (default: active) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |

**Example:**
```bash
curl "https://api.example.com/api/external-data/lrb?action=search&employer=Hospital&jurisdiction=ON&page=1&limit=10"
```

**Response:**
```json
{
  "agreements": [
    {
      "id": "uuid-here",
      "source": "ontario_lrb",
      "sourceId": "OLRB-2024-001",
      "employerName": "Toronto General Hospital",
      "unionName": "Ontario Nurses Association",
      "bargainingUnit": "Registered Nurses",
      "effectiveDate": "2024-01-01T00:00:00Z",
      "expiryDate": "2025-12-31T00:00:00Z",
      "sector": "healthcare",
      "jurisdiction": "ON",
      "hourlyWageRange": "$45.00 - $65.00",
      "pdfUrl": "https://www.olrb.gov.on.ca/agreements/2024-001.pdf"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 5
}
```

---

### GET /api/external-data/lrb?action=wage-comparison

Get wage comparisons for an occupation.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noc` | string | Yes | NOC occupation code |
| `jurisdiction` | string | No | Province code |

**Example:**
```bash
curl "https://api.example.com/api/external-data/lrb?action=wage-comparison&noc=3012&jurisdiction=ON"
```

**Response:**
```json
{
  "nocCode": "3012",
  "jurisdiction": "ON",
  "comparisons": [
    {
      "employerName": "Toronto General Hospital",
      "unionName": "Ontario Nurses Association",
      "sector": "healthcare",
      "effectiveDate": "2024-01-01",
      "hourlyWageRange": "$45.00 - $65.00",
      "source": "ontario_lrb"
    },
    {
      "employerName": "Sunnybrook Hospital",
      "unionName": "CUPE Local 1234",
      "sector": "healthcare",
      "effectiveDate": "2024-03-01",
      "hourlyWageRange": "$43.00 - $62.00",
      "source": "ontario_lrb"
    }
  ],
  "count": 2
}
```

---

### POST /api/external-data/lrb

Trigger LRB sync operations.

**Request Body:**
```json
{
  "action": "sync-all"
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `sync-ontario` | Sync Ontario LRB agreements |
| `sync-bc` - Sync BC LRB agreements |
| `sync-all` | Sync all LRB sources |

**Example:**
```bash
curl -X POST "https://api.example.com/api/external-data/lrb" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync-ontario"}'
```

---

## Cron Endpoints

### GET /api/cron/external-data-sync

Monthly cron job for syncing external data.

**Headers:**
```
Authorization: Bearer <cron_secret>
```

**Response:**
```json
{
  "timestamp": "2026-02-09T06:00:00Z",
  "syncType": "scheduled",
  "dataSources": {
    "wages": {
      "success": true,
      "syncId": "sync_1701234567_abc123",
      "recordsProcessed": 150,
      "recordsInserted": 45,
      "recordsUpdated": 100,
      "recordsFailed": 5
    },
    "unionDensity": { ... },
    "cola": { ... },
    "contributions": { ... }
  },
  "summary": {
    "totalProcessed": 500,
    "totalInserted": 150,
    "totalUpdated": 340,
    "totalFailed": 10,
    "success": true
  },
  "duration": 120000
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid action or missing parameters"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| GET /api/external-data | 60 requests/minute |
| POST /api/external-data | 10 requests/minute |
| GET /api/external-data/lrb | 60 requests/minute |
| POST /api/external-data/lrb | 10 requests/minute |

---

## Data Freshness

| Data Source | Update Frequency |
|-------------|-----------------|
| Statistics Canada Wages | Monthly |
| Statistics Canada Union Density | Annual |
| Statistics Canada CPI | Monthly |
| Ontario LRB | Weekly |
| BC LRB | Weekly |
| CLC Partnership | Quarterly |
