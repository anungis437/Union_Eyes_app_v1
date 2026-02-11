# External Data Integration Plan - CBA Enrichment Sources

**Date:** February 9, 2026  
**Status:** Planning  
**Priority:** P2 (Enhancement)  

---

## Executive Summary

This plan outlines the integration of public Canadian and international labor data sources into the Union Eyes platform to enrich CBA Intelligence, arbitration precedents, and wage benchmarking features.

**Goals:**

- Enrich 200+ CBA records with external wage data
- Enable real-time arbitration decision lookup
- Provide union density and coverage benchmarking
- Automate compliance alerts based on regulatory updates

**Timeline:** 12-18 weeks  
**Budget:** $15-30K (excluding CLC partnership)  
**Team:** 2-3 developers  

---

## Data Sources Overview

### Tier 1: High Value, Low Effort

| Source | Data Type | Update Frequency | Access Method |
|--------|-----------|-----------------|---------------|
| Statistics Canada | Wages, demographics, union density | Monthly | REST API |
| Labour Programme Data | Employment standards | Quarterly | CSV downloads |

### Tier 2: High Value, Medium Effort

| Source | Data Type | Update Frequency | Access Method |
|--------|-----------|-----------------|---------------|
| Ontario LRB | CBA summaries, decisions | Weekly | Bulk download |
| BC LRB | Collective agreements | Weekly | Bulk download |
| CIRB | Federal decisions | Weekly | Bulk download |

### Tier 3: Partnership Required

| Source | Data Type | Timeline |
|--------|-----------|----------|
| CLC | Per-capita data, benchmarks | 3-6 months |
| Provincial federations | Regional benchmarks | 6-12 months |

---

## Architecture Design

### Integration Layer

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    External Data Gateway                        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”‚
â”‚  â”‚ Statistics    â”‚  â”‚ LRB Bulk      â”‚  â”‚ CLC Partner  â”‚        â”‚
â”‚  â”‚ Canada API    â”‚  â”‚ Downloads     â”‚  â”‚ API          â”‚        â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜        â”‚
â”‚         â”‚                 â”‚                 â”‚                  â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â”‚
â”‚                      â”‚                                          â”‚
â”‚              â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”                                  â”‚
â”‚              â”‚  Data        â”‚                                  â”‚
â”‚              â”‚  Normalizer  â”‚                                  â”‚
â”‚              â”‚  Service     â”‚                                  â”‚
â”‚              â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜                                  â”‚
â”‚                     â”‚                                           â”‚
â”‚         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                               â”‚
â”‚         â”‚          â”‚          â”‚                               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â” â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â” â”Œâ”€â”€â”€â–¼â”€â”€â”€â”€â”                         â”‚
â”‚  â”‚ Cache   â”‚ â”‚ Enrich   â”‚ â”‚ Alerts  â”‚                         â”‚
â”‚  â”‚ Layer   â”‚ â”‚ Engine   â”‚ â”‚ Engine  â”‚                         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Data Flow

```
1. External Source â†’ Fetch â†’ Validate â†’ Normalize â†’ Cache
2. Normalized Data â†’ Enrichment Engine â†’ Application Queries
3. Source Updates â†’ Change Detection â†’ Alert Generation
```

---

## Implementation Steps

### Phase 1: Statistics Canada Integration (Weeks 1-3)

#### 1.1 API Registration and Setup

```bash
# Register for Statistics Canada API
# URL: https://www.statcan.gc.ca/eng/api
# No cost for educational/government use
```

**Environment Variables:**

```bash
STATCAN_API_KEY=your_api_key
STATCAN_BASE_URL=https://api.statcan.gc.ca
```

#### 1.2 Client Implementation

**File:** `lib/services/external-data/statcan-client.ts`

```typescript
import { z } from 'zod';

// Response schemas
export const WageDataSchema = z.object({
  GEO: z.string(),           // Geography (01 = Canada)
  NAICS: z.string(),          // Industry code
  Occupation: z.string(),     // NOC code
  Wages: z.object({
    median: z.number(),
    mean: z.number(),
    p10: z.number(),
    p25: z.number(),
    p75: z.number(),
    p90: z.number(),
  }),
  SurveyYear: z.number(),
});

export type WageData = z.infer<typeof WageDataSchema>;

export class StatisticsCanadaClient {
  private baseUrl = process.env.STATCAN_BASE_URL;
  private apiKey = process.env.STATCAN_API_KEY;

  /**
   * Fetch wage data by NOC code and geography
   */
  async getWageData(params: {
    nocCode: string;              // e.g., "6513" (Food Counter Attendants)
    geography: '01' | '35' | '59'; // Canada, Ontario, BC
    surveyYear?: number;          // Default: latest
  }): Promise<WageData[]> {
    const endpoint = `${this.baseUrl}/ind-econ/wages`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codes: [params.nocCode],
        geo: params.geography,
        year: params.surveyYear || new Date().getFullYear() - 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Statistics Canada API error: ${response.status}`);
    }

    const data = await response.json();
    return WageDataSchema.array().parse(data);
  }

  /**
   * Get union density by industry
   */
  async getUnionDensity(params: {
    naicsCode: string;           // Industry code
    geography: string;
    timeFrame?: number;          // Years back
  }): Promise<{
    unionized: number;
    totalEmployees: number;
    densityPercentage: number;
  }> {
    const endpoint = `${this.baseUrl}/labour-union-density`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        naics: params.naicsCode,
        geo: params.geography,
        years: params.timeFrame || 5,
      }),
    });

    return response.json();
  }

  /**
   * Get cost of living adjustments by region
   */
  async getCOLAData(params: {
    geography: string;
    industry?: string;
  }): Promise<{
    year: number;
    colaPercentage: number;
    inflationRate: number;
  }[]> {
    const endpoint = `${this.baseUrl}/ind-econ/cola`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        geo: params.geography,
        naics: params.industry,
      }),
    });

    return response.json();
  }
}
```

#### 1.3 Database Schema Extensions

**File:** `db/schema/external-data-schema.ts`

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, text, jsonb, integer, index } from 'drizzle-orm/pg-core';

/**
 * External wage benchmarks
 */
export const wageBenchmarks = pgTable('wage_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Source identification
  source: varchar('source', { length: 50 }).notNull(), // 'statcan', 'bls'
  sourceId: varchar('source_id', { length: 100 }),     // External ID
  
  // Geographic scope
  geography: varchar('geography', { length: 10 }).notNull(), // 'CA', 'ON', 'BC'
  
  // Industry/Occupation mapping
  naicsCode: varchar('naics_code', { length: 10 }),   // Industry code
  nocCode: varchar('noc_code', { length: 10 }),         // Occupation code
  
  // Wage data
  medianWage: numeric('median_wage', { precision: 10, scale: 2 }).notNull(),
  meanWage: numeric('mean_wage', { precision: 10, scale: 2 }),
  p10Wage: numeric('p10_wage', { precision: 10, scale: 2 }),
  p25Wage: numeric('p25_wage', { precision: 10, scale: 2 }),
  p75Wage: numeric('p75_wage', { precision: 10, scale: 2 }),
  p90Wage: numeric('p90_wage', { precision: 10, scale: 2 }),
  
  // Metadata
  surveyYear: integer('survey_year').notNull(),
  effectiveDate: timestamp('effective_date').notNull(),
  expiresAt: timestamp('expires_at'),                    // When this data expires
  
  // JSON for additional fields
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxNocGeography: index('wage_benchmarks_noc_geo_idx').on(
    table.nocCode, table.geography
  ),
  idxSource: index('wage_benchmarks_source_idx').on(table.source),
  idxEffective: index('wage_benchmarks_effective_idx').on(table.effectiveDate),
}));
```

#### 1.4 Enrichment Service

**File:** `lib/services/enrichment/statcan-enrichment-service.ts`

```typescript
import { db } from '@/db';
import { wageBenchmarks } from '@/db/schema/external-data-schema';
import { StatisticsCanadaClient } from './statcan-client';
import { eq, and, desc } from 'drizzle-orm';

export class StatisticsCanadaEnrichmentService {
  private client = new StatisticsCanadaClient();
  
  /**
   * Enrich a CBA with wage benchmark data
   */
  async enrichCBA(cbaId: string, nocCode: string, geography: string) {
    // Fetch latest wage data
    const wageData = await this.client.getWageData({
      nocCode,
      geography: this.mapGeography(geography),
    });
    
    if (!wageData || wageData.length === 0) {
      return null;
    }
    
    const latestData = wageData[0];
    
    // Store in database
    const [benchmark] = await db.insert(wageBenchmarks).values({
      source: 'statcan',
      geography,
      nocCode,
      medianWage: latestData.Wages.median,
      meanWage: latestData.Wages.mean,
      p10Wage: latestData.Wages.p10,
      p25Wage: latestData.Wages.p25,
      p75Wage: latestData.Wages.p75,
      p90Wage: latestData.Wages.p90,
      surveyYear: latestData.SurveyYear,
      effectiveDate: new Date(),
      metadata: {
        sourceUrl: 'https://www.statcan.gc.ca',
        rawData: latestData,
      },
    }).returning();
    
    return benchmark;
  }
  
  /**
   * Get wage comparison for a CBA
   */
  async getWageComparison(cbaId: string, nocCode: string, geography: string) {
    const [benchmark] = await db
      .select()
      .from(wageBenchmarks)
      .where(
        and(
          eq(wageBenchmarks.nocCode, nocCode),
          eq(wageBenchmarks.geography, geography)
        )
      )
      .orderBy(desc(wageBenchmarks.effectiveDate))
      .limit(1);
    
    return benchmark;
  }
  
  /**
   * Map jurisdiction to Statistics Canada geography codes
   */
  private mapGeography(jurisdiction: string): '01' | '35' | '59' {
    const mapping: Record<string, '01' | '35' | '59'> = {
      'CA': '01',           // Canada
      'FEDERAL': '01',
      'ON': '35',           // Ontario
      'ONTARIO': '35',
      'BC': '59',           // British Columbia
      'BRITISH_COLUMBIA': '59',
    };
    
    return mapping[jurisdiction.toUpperCase()] || '01';
  }
}
```

#### 1.5 API Routes

**File:** `app/api/enrichment/wages/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withSecureAPI } from '@/lib/middleware/api-security';
import { StatisticsCanadaEnrichmentService } from '@/lib/services/enrichment/statcan-enrichment-service';

export const GET = withSecureAPI(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const nocCode = searchParams.get('nocCode');
  const geography = searchParams.get('geography');
  
  if (!nocCode || !geography) {
    return NextResponse.json(
      { error: 'nocCode and geography are required' },
      { status: 400 }
    );
  }
  
  const service = new StatisticsCanadaEnrichmentService();
  const comparison = await service.getWageComparison(
    'current-cba-id', // Would come from context
    nocCode,
    geography
  );
  
  if (!comparison) {
    return NextResponse.json(
      { error: 'No benchmark data available' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    benchmark: comparison,
    comparisonDate: comparison.effectiveDate,
  });
});
```

---

### Phase 2: Provincial LRB Integration (Weeks 4-8)

#### 2.1 Ontario LRB Bulk Data

**Source:** Ontario Ministry of Labour - Collective Agreement database  
**URL:** `https://www.olrb.gov.on.ca/collective-agreements`  
**Format:** CSV, updated weekly  
**Volume:** ~5,000 active CBAs

**Download Script:**

```typescript
// lib/services/external-data/lrb-ontario-downloader.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as https from 'https';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

export class OntarioLRBDownloader {
  private s3Client = new S3Client({ region: process.env.AWS_REGION });
  private downloadUrl = 'https://www.olrb.gov.on.ca/ca_export.csv';
  
  /**
   * Download latest CBA data from Ontario LRB
   */
  async downloadLatest(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream('/tmp/ontario_cbas.csv');
      
      https.get(this.downloadUrl, (response) => {
        response.pipe(file);
        
        file.on('finish', async () => {
          file.close();
          
          // Parse CSV
          const fileContent = fs.readFileSync('/tmp/ontario_cbas.csv', 'utf-8');
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
          });
          
          resolve(records);
        });
      }).on('error', (err) => {
        fs.unlink('/tmp/ontario_cbas.csv', () => {});
        reject(err);
      });
    });
  }
  
  /**
   * Process and normalize records
   */
  async processRecords(records: any[]): Promise<any[]> {
    return records.map(record => ({
      // Map LRB columns to UnionEyes schema
      externalId: record['Agreement ID'],
      employerName: record['Employer Name'],
      unionName: record['Union Name'],
      sector: record['Sector'],
      expiryDate: new Date(record['Expiry Date']),
      wageIncreases: this.parseWageTable(record['Wage Schedule'] || ''),
      jurisdiction: 'ONTARIO',
      sourceUrl: `https://www.olrb.gov.on.ca/agreement/${record['Agreement ID']}`,
      downloadedAt: new Date(),
    }));
  }
  
  private parseWageTable(wageTable: string): any {
    // Parse wage progression table from CSV
    // Returns array of { year: number, wage: number, increase: number }
    try {
      return JSON.parse(wageTable);
    } catch {
      return [];
    }
  }
}
```

#### 2.2 BC LRB Integration

**Source:** BC Labour Relations Board  
**URL:** `https://www.lrb.bc.ca/publications/collective-agreements/`  
**Format:** JSON API (with registration)  
**Volume:** ~3,000 active CBAs

```typescript
// lib/services/external-data/lrb-bc-client.ts

export class BCLRBDownloader {
  private baseUrl = 'https://api.lrb.bc.gov.bc.ca/v1';
  private apiKey = process.env.LRB_BC_API_KEY;
  
  async getCollectiveAgreements(params: {
    page?: number;
    limit?: number;
    sector?: string;
    status?: 'active' | 'expired' | 'all';
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    hasMore: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/agreements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
      searchParams: params,
    });
    
    return response.json();
  }
}
```

#### 2.3 Unified LRB Service

**File:** `lib/services/external-data/lrb-unified-service.ts`

```typescript
import { OntarioLRBDownloader } from './lrb-ontario-downloader';
import { BCLRBDownloader } from './lrb-bc-client';
import { db } from '@/db';
import { lrbAgreements } from '@/db/schema/external-data-schema';

export class LRBUnifiedService {
  private ontario = new OntarioLRBDownloader();
  private bc = new BCLRBDownloader();
  
  /**
   * Sync all LRB data (weekly cron job)
   */
  async syncAllSources() {
     param($m) $level = $m.Groups[1].Value; if ($level -eq 'log' -or $level -eq 'info') { 'logger.info(' } elseif ($level -eq 'warn') { 'logger.warn(' } elseif ($level -eq 'error') { 'logger.error(' } else { 'logger.debug(' } '[LRB] Starting full sync...');
    
    // Ontario
    const ontarioRecords = await this.ontario.downloadLatest();
    const ontarioProcessed = await this.ontario.processRecords(ontarioRecords);
    
    // Bulk upsert to database
    for (const record of ontarioProcessed) {
      await db.insert(lrbAgreements)
        .values(record)
        .onConflictDoUpdate({
          target: lrbAgreements.externalId,
          set: record,
        });
    }
    
    // BC
    let bcPage = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await this.bc.getCollectiveAgreements({
        page: bcPage,
        limit: 100,
        status: 'active',
      });
      
      for (const record of response.data) {
        await db.insert(lrbAgreements).values(this.mapBCRecord(record));
      }
      
      hasMore = response.hasMore;
      bcPage++;
    }
    
     param($m) $level = $m.Groups[1].Value; if ($level -eq 'log' -or $level -eq 'info') { 'logger.info(' } elseif ($level -eq 'warn') { 'logger.warn(' } elseif ($level -eq 'error') { 'logger.error(' } else { 'logger.debug(' } `[LRB] Sync complete. Ontario: ${ontarioProcessed.length}, BC: ${bcPage * 100}`);
  }
  
  /**
   * Find similar CBAs by employer type and sector
   */
  async findSimilarCBAs(params: {
    sector: string;
    employerType: string;
    geography: string;
    limit?: number;
  }) {
    return db.select()
      .from(lrbAgreements)
      .where(
        and(
          eq(lrbAgreements.sector, params.sector),
          eq(lrbAgreements.jurisdiction, params.geography)
        )
      )
      .limit(params.limit || 10);
  }
}
```

---

### Phase 3: CLC Partnership Integration (Weeks 9-12)

#### 3.1 Partnership Requirements

**Data to Request:**

1. Per-capita rate schedules by affiliate
2. Benchmark data (average dues, coverage rates)
3. Compliance threshold indicators
4. CLC Convention resolutions database

**Technical Requirements:**

- OAuth 2.0 authentication
- VPN or secure tunnel for sensitive data
- Data processing agreement (DPA)

#### 3.2 API Client Structure

```typescript
// lib/services/external-data/clc-partner-client.ts

export class CLCPartnerClient {
  private baseUrl = process.env.CLC_API_URL;
  private clientId = process.env.CLC_CLIENT_ID;
  private clientSecret = process.env.CLC_CLIENT_SECRET;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  /**
   * OAuth 2.0 authentication
   */
  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }
    
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read:percapita read:benchmarks read:resolutions',
      }),
    });
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    
    return this.accessToken;
  }
  
  /**
   * Get per-capita rates for an affiliate
   */
  async getPerCapitaRates(affiliateCode: string): Promise<{
    effectiveDate: Date;
    rates: {
      goodStandingMember: number;
      perCapitaTax: number;
      clcPortion: number;
    }[];
  }> {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.baseUrl}/v1/affiliates/${affiliateCode}/per-capita`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    return response.json();
  }
  
  /**
   * Get benchmark comparison data
   */
  async getBenchmarks(params: {
    affiliateCode?: string;
    region?: string;
    sector?: string;
  }): Promise<{
    averageDues: number;
    duesRange: { min: number; max: number };
    coverageRate: number;
    comparableAffiliates: number;
  }> {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.baseUrl}/v1/benchmarks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    return response.json();
  }
}
```

---

## Database Schema

### Main External Data Schema

**File:** `db/schema/external-data-schema.ts`

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, text, jsonb, integer, boolean, index, foreignKey } from 'drizzle-orm/pg-core';
import { organizations } from './schema-organizations';

/**
 * External data source configuration
 */
export const externalDataSources = pgTable('external_data_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),      // 'Statistics Canada', 'Ontario LRB'
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'api', 'bulk_download', 'partner'
  baseUrl: varchar('base_url', { length: 500 }),
  apiKeyEncrypted: varchar('api_key_encrypted', { length: 500 }), // Encrypted
  authType: varchar('auth_type', { length: 50 }).default('none'), // 'none', 'oauth', 'api_key'
  refreshSchedule: varchar('refresh_schedule'), // Cron expression
  lastSyncAt: timestamp('last_sync_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Statistics Canada wage benchmarks
 */
export const wageBenchmarks = pgTable('wage_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => externalDataSources.id),
  source: varchar('source', { length: 50 }).notNull(), // 'statcan', 'bls'
  
  // Geographic scope
  geography: varchar('geography', { length: 10 }).notNull(), // 'CA', 'ON', 'BC'
  
  // Industry/Occupation mapping
  naicsCode: varchar('naics_code', { length: 10 }),
  nocCode: varchar('noc_code', { length: 10 }),
  sector: varchar('sector', { length: 100 }),
  
  // Wage data
  medianWage: numeric('median_wage', { precision: 10, scale: 2 }),
  meanWage: numeric('mean_wage', { precision: 10, scale: 2 }),
  p10Wage: numeric('p10_wage', { precision: 10, scale: 2 }),
  p25Wage: numeric('p25_wage', { precision: 10, scale: 2 }),
  p75Wage: numeric('p75_wage', { precision: 10, scale: 2 }),
  p90Wage: numeric('p90_wage', { precision: 10, scale: 2 }),
  hourlyWage: numeric('hourly_wage', { precision: 10, scale: 2 }),
  annualSalary: numeric('annual_salary', { precision: 12, scale: 2 }),
  
  // Time period
  surveyYear: integer('survey_year').notNull(),
  effectiveDate: timestamp('effective_date').notNull(),
  expiresAt: timestamp('expires_at'),
  
  // Source metadata
  sourceUrl: varchar('source_url', { length: 500 }),
  rawData: jsonb('raw_data'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxNocGeography: index('wage_benchmarks_noc_geo_idx').on(
    table.nocCode, table.geography
  ),
  idxSource: index('wage_benchmarks_source_idx').on(table.source),
  idxEffective: index('wage_benchmarks_effective_idx').on(table.effectiveDate),
}));

/**
 * LRB collective agreements
 */
export const lrbAgreements = pgTable('lrb_agreements', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => externalDataSources.id),
  
  // External identifiers
  externalId: varchar('external_id', { length: 100 }).unique(),
  sourceUrl: varchar('source_url', { length: 500 }),
  
  // Agreement details
  employerName: varchar('employer_name', { length: 255 }).notNull(),
  unionName: varchar('union_name', { length: 255 }),
  sector: varchar('sector', { length: 100 }),
  jurisdiction: varchar('jurisdiction', { length: 10 }).notNull(), // 'ON', 'BC', 'FED'
  
  // Dates
  effectiveDate: timestamp('effective_date'),
  expiryDate: timestamp('expiry_date'),
  ratificationDate: timestamp('ratification_date'),
  
  // Wage progression
  wageProgression: jsonb('wage_progression').default([]), // [{ year, wage, increase }]
  hourlyRateStart: numeric('hourly_rate_start', { precision: 10, scale: 2 }),
  hourlyRateEnd: numeric('hourly_rate_end', { precision: 10, scale: 2 }),
  
  // Benefits
  benefitsSummary: jsonb('benefits_summary').default({}),
  
  // Status
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'expired', 'pending'
  
  downloadedAt: timestamp('downloaded_at').defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  idxJurisdiction: index('lrb_agreements_jurisdiction_idx').on(table.jurisdiction),
  idxSector: index('lrb_agreements_sector_idx').on(table.sector),
  idxEmployer: index('lrb_agreements_employer_idx').on(table.employerName),
  idxExpiry: index('lrb_agreements_expiry_idx').on(table.expiryDate),
}));

/**
 * CLC partnership data
 */
export const clcBenchmarkData = pgTable('clc_benchmark_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Affiliate information
  affiliateCode: varchar('affiliate_code', { length: 50 }).notNull(),
  affiliateName: varchar('affiliate_name', { length: 255 }),
  
  // Benchmark metrics
  averageDues: numeric('average_dues', { precision: 10, scale: 2 }),
  duesRangeMin: numeric('dues_range_min', { precision: 10, scale: 2 }),
  duesRangeMax: numeric('dues_range_max', { precision: 10, scale: 2 }),
  coverageRate: numeric('coverage_rate', { precision: 5, scale: 2 }),
  perCapitaRate: numeric('per_capita_rate', { precision: 10, scale: 4 }),
  clcPortion: numeric('clc_portion', { precision: 10, scale: 4 }),
  
  // Comparison context
  region: varchar('region', { length: 50 }),
  sector: varchar('sector', { length: 100 }),
  comparableAffiliates: integer('comparable_affiliates'),
  
  // Metadata
  effectiveDate: timestamp('effective_date').notNull(),
  expiresAt: timestamp('expires_at'),
  sourceUrl: varchar('source_url', { length: 500 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  idxAffiliate: index('clc_benchmark_affiliate_idx').on(table.affiliateCode),
  idxOrg: index('clc_benchmark_org_idx').on(table.organizationId),
  idxEffective: index('clc_benchmark_effective_idx').on(table.effectiveDate),
}));

/**
 * Enrichment audit log
 */
export const enrichmentAuditLog = pgTable('enrichment_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // What was enriched
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'cba', 'clause', 'precedent'
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  
  // Source
  sourceId: uuid('source_id').references(() => externalDataSources.id),
  source: varchar('source', { length: 50 }).notNull(),
  
  // Result
  success: boolean('success').notNull(),
  recordsEnriched: integer('records_enriched').default(1),
  errorMessage: text('error_message'),
  
  // Timing
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Cron Jobs and Scheduling

### Scheduled Tasks

**File:** `lib/cron/external-data-sync.ts`

```typescript
import { CronJob } from 'cron';
import { StatisticsCanadaEnrichmentService } from '@/lib/services/enrichment/statcan-enrichment-service';
import { LRBUnifiedService } from '@/lib/services/external-data/lrb-unified-service';
import { CLCPartnerClient } from '@/lib/services/external-data/clc-partner-client';
import { logger } from '@/lib/logger';

// Statistics Canada - Monthly (first day of month at 2 AM)
new CronJob('0 2 1 * *', async () => {
  logger.info('[CRON] Starting Statistics Canada sync...');
  const service = new StatisticsCanadaEnrichmentService();
  await service.syncAllNOCs();
  logger.info('[CRON] Statistics Canada sync complete');
});

// Provincial LRB - Weekly (Sunday at 3 AM)
new CronJob('0 3 * * 0', async () => {
  logger.info('[CRON] Starting LRB data sync...');
  const service = new LRBUnifiedService();
  await service.syncAllSources();
  logger.info('[CRON] LRB sync complete');
});

// CLC Partnership - Daily (4 AM)
new CronJob('0 4 * * *', async () => {
  logger.info('[CRON] Starting CLC benchmark sync...');
  const client = new CLCPartnerClient();
  await client.syncBenchmarks();
  logger.info('[CRON] CLC sync complete');
});

export { CronJob };
```

---

## API Endpoints

### Enrichment API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/enrichment/wages` | GET | Get wage benchmark for NOC/geography |
| `/api/enrichment/wages` | POST | Trigger wage data fetch |
| `/api/enrichment/lrb/search` | GET | Search LRB agreements |
| `/api/enrichment/lrb/sync` | POST | Trigger LRB sync (admin) |
| `/api/enrichment/clc/benchmarks` | GET | Get CLC benchmark data |
| `/api/enrichment/status` | GET | Get sync status and last run |

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/services/external-data/statcan-client.test.ts

describe('StatisticsCanadaClient', () => {
  let client: StatisticsCanadaClient;
  
  beforeEach(() => {
    client = new StatisticsCanadaClient();
  });
  
  describe('getWageData', () => {
    it('should fetch and parse wage data correctly', async () => {
      const result = await client.getWageData({
        nocCode: '6513',
        geography: '01',
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('Wages.median');
      expect(result[0]).toHaveProperty('SurveyYear');
    });
    
    it('should throw error for invalid NOC code', async () => {
      await expect(
        client.getWageData({
          nocCode: 'INVALID',
          geography: '01',
        })
      ).rejects.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/external-data.test.ts

describe('External Data Integration', () => {
  it('should enrich CBA with Statistics Canada data', async () => {
    const enrichmentService = new StatisticsCanadaEnrichmentService();
    
    const result = await enrichmentService.enrichCBA(
      'test-cba-id',
      '6513',
      'ON'
    );
    
    expect(result).toBeDefined();
    expect(result.medianWage).toBeGreaterThan(0);
  });
  
  it('should find similar CBAs from LRB data', async () => {
    const lrbService = new LRBUnifiedService();
    
    const similar = await lrbService.findSimilarCBAs({
      sector: 'Healthcare',
      employerType: 'Hospital',
      geography: 'ON',
      limit: 5,
    });
    
    expect(Array.isArray(similar)).toBe(true);
    expect(similar.length).toBeLessThanOrEqual(5);
  });
});
```

---

## Security Considerations

### Data Protection

1. **API Keys**: Store encrypted in Azure Key Vault
2. **PII in External Data**: Filter and redact before storage
3. **Audit Logging**: Log all data retrievals

### Compliance

1. **Statistics Canada**: Attribution required in UI
2. **LRB Data**: Terms of use compliance
3. **CLC Partnership**: Data processing agreement required

### Rate Limiting

```typescript
// Apply rate limiting to external API calls
const rateLimiter = {
  statcan: { limit: 100, window: '1 minute' },
  lrb: { limit: 10, window: '1 minute' },
  clc: { limit: 60, window: '1 minute' },
};
```

---

## Success Metrics

### KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| CBA Enrichment Rate | 80% | CBAs with wage benchmarks |
| LRB Coverage | 90% | Ontario + BC agreements |
| Data Freshness | < 7 days | Age of data |
| API Uptime | 99.5% | External APIs |
| Query Response Time | < 500ms | P95 latency |

### Monitoring

```typescript
// Metrics to track
const metrics = {
  enrichmentSuccessRate: 'percentage of successful enrichments',
  syncDuration: 'time to sync all sources',
  apiLatency: 'external API call duration',
  cacheHitRate: 'percentage of queries from cache',
  dataAgeHours: 'age of most recent data',
};
```

---

## Budget Estimate

| Item | Cost | Timeline |
|------|------|----------|
| Statistics Canada API | $0 | Weeks 1-3 |
| BC LRB API Registration | $500/year | Week 4 |
| Development (Phases 1-2) | $20-25K | Weeks 1-8 |
| CLC Partnership Setup | $5-10K | Weeks 9-12 |
| Ongoing maintenance | $2K/month | Post-launch |

---

## Timeline Summary

```
Week 1-3:   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ Statistics      â”‚
            â”‚ Canada API      â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Week 4-6:   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ Ontario LRB      â”‚
            â”‚ Integration      â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Week 6-8:   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ BC LRB &        â”‚
            â”‚ Unified Service  â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Week 9-10:  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ CLC Partnership  â”‚
            â”‚ Setup           â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Week 11-12: â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ Testing &        â”‚
            â”‚ Documentation    â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Next Steps

1. **Week 1**: Register for Statistics Canada API key
2. **Week 2**: Implement statcan-client.ts
3. **Week 3**: Create wage benchmark schema and API
4. **Week 4**: Register for BC LRB API access
5. **Week 5-8**: Complete LRB integrations
6. **Week 9**: Initiate CLC partnership discussions

---

**Document Version:** 1.0  
**Last Updated:** February 9, 2026  
**Next Review:** March 9, 2026
