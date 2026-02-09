# Analytics Platform - Complete User Guide

**Union Claims Management System**  
**Version**: 1.0  
**Last Updated**: November 15, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard Guide](#dashboard-guide)
4. [Advanced Features](#advanced-features)
5. [Performance & Optimization](#performance--optimization)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## Overview

The Analytics Platform provides comprehensive insights into your union's claims management operations. With four specialized dashboards and 17 API endpoints, you can monitor performance, track financial health, and optimize operational efficiency.

### Key Features

- **Real-time Analytics**: Live data updates across all dashboards
- **Multi-dimensional Analysis**: Claims, members, financial, and operational metrics
- **Exportable Reports**: PDF, Excel, and CSV export capabilities
- **Tenant Isolation**: Secure multi-tenant architecture
- **Performance Optimized**: Sub-second query performance with intelligent caching

### Quick Stats

- **4 Dashboards**: Claims, Members, Financial, Operational
- **22 KPIs**: Comprehensive performance indicators
- **17 API Endpoints**: Full programmatic access
- **16 Interactive Tabs**: Detailed drill-down capabilities

---

## Getting Started

### Accessing Analytics

1. **Login** to your Union Claims Management account
2. Navigate to **Analytics** in the main menu
3. Select your desired dashboard:
   - **Claims Analytics**: Case volume and resolution tracking
   - **Member Analytics**: Membership insights and engagement
   - **Financial Analytics**: Cost control and ROI analysis
   - **Operational Analytics**: Efficiency and SLA monitoring

### Dashboard Controls

All dashboards feature consistent controls:

- **Date Range Selector**: Choose from 30/90/180/365 days
- **Tab Navigation**: Switch between different views
- **Export Options**: Download data as PDF/Excel/CSV
- **Refresh Button**: Update data on demand

---

## Dashboard Guide

### 1. Claims Analytics Dashboard

**Path**: `/analytics/claims`

**Purpose**: Monitor claim volumes, resolution rates, and case trends

#### Key Performance Indicators (KPIs)

| KPI | Description | Calculation |
|-----|-------------|-------------|
| **Total Claims** | All claims in system | `COUNT(*)` |
| **Active Claims** | Currently open cases | `COUNT(status IN active_statuses)` |
| **Resolution Rate** | Percentage of resolved claims | `(resolved / total) × 100` |
| **Avg Resolution Time** | Days to close | `AVG(closed_at - created_at)` |

#### Tabs

**📊 Overview**

- **Trend Chart**: Claim volume over time
- **Status Distribution**: Pie chart of claim statuses
- **Category Breakdown**: Claims by type
- **Use Case**: Identify patterns and seasonal trends

**📈 Performance**

- **Resolution Metrics**: Time-to-close analysis
- **Steward Performance**: Individual productivity
- **SLA Compliance**: On-time resolution tracking
- **Use Case**: Monitor team efficiency

**📅 Timeline**

- **Monthly Trends**: Long-term pattern analysis
- **Year-over-Year Comparison**: Growth tracking
- **Forecast**: Predictive modeling
- **Use Case**: Strategic planning

**🎯 Priorities**

- **High-Priority Cases**: Critical claim tracking
- **Aging Analysis**: Overdue case identification
- **Alert Dashboard**: Urgent action items
- **Use Case**: Tactical case management

---

### 2. Member Analytics Dashboard

**Path**: `/analytics/members`

**Purpose**: Track membership growth, engagement, and demographics

#### Key Performance Indicators (KPIs)

| KPI | Description | Calculation |
|-----|-------------|-------------|
| **Total Members** | Active membership count | `COUNT(status = 'active')` |
| **New Members** | Recent signups | `COUNT(created_at > date)` |
| **Active Members** | Members with recent claims | `COUNT(DISTINCT member_id)` |
| **Engagement Rate** | Members filing claims | `(active / total) × 100` |

#### Tabs

**👥 Overview**

- **Growth Chart**: Membership trends
- **Status Distribution**: Active/inactive split
- **Demographics**: Age, location, occupation
- **Use Case**: Understand member base composition

**📊 Engagement**

- **Activity Heatmap**: Engagement patterns
- **Claim Frequency**: Average claims per member
- **High-Activity Members**: Top claimants
- **Use Case**: Identify engagement opportunities

**📍 Demographics**

- **Geographic Distribution**: Member locations
- **Occupation Breakdown**: Job categories
- **Age Demographics**: Member age ranges
- **Use Case**: Targeted outreach and services

---

### 3. Financial Analytics Dashboard

**Path**: `/analytics/financial`

**Purpose**: Monitor financial health, costs, and ROI

#### Key Performance Indicators (KPIs)

| KPI | Description | Formula |
|-----|-------------|---------|
| **Total Claim Value** | Sum of all claims | `SUM(claim_amount)` |
| **Total Settlements** | Money recovered | `SUM(settlement_amount WHERE won)` |
| **Total Costs** | Legal + court costs | `SUM(legal_costs + court_costs)` |
| **Net Value** | Profit/loss | `settlements - costs` |
| **Win Rate** | Successful outcomes | `(won / resolved) × 100` |
| **Avg Settlement** | Per-claim recovery | `AVG(settlement_amount)` |

#### Tabs

**💰 Financial Overview**

- **Claim Values Trend**: Value over time (area chart)
- **Settlements Trend**: Recoveries timeline
- **Costs Trend**: Spending analysis
- **Net Value**: Profitability tracking
- **Use Case**: Monitor overall financial health

**🎯 Settlement Analysis**

- **Distribution by Outcome**: Win/loss breakdown (pie chart)
- **Settlement by Time**: Resolution speed vs value (bar chart)
- **Recovery Rate**: Percentage of claimed value recovered
- **Use Case**: Evaluate case outcomes

**💸 Cost Analysis**

- **Cost Breakdown**: Legal vs court vs admin (pie chart)
- **Category Costs**: Spending by claim type (bar chart)
- **Efficiency Metrics**: Cost per case, cost per resolution
- **Use Case**: Control and optimize spending

**📊 Category Performance**

- **ROI by Category**: Most profitable claim types (bar chart)
- **Profitability Comparison**: Category-wise profit margins
- **Trend Analysis**: Category performance over time
- **Use Case**: Resource allocation decisions

#### Financial Calculations Explained

**Return on Investment (ROI)**

```
ROI = ((Settlements - Costs) / Costs) × 100
```

Example: $50,000 settlements - $20,000 costs = $30,000 net  
ROI = ($30,000 / $20,000) × 100 = 150%

**Recovery Rate**

```
Recovery Rate = (Settlements / Claim Value) × 100
```

Example: $50,000 recovered from $100,000 claimed  
Recovery Rate = ($50,000 / $100,000) × 100 = 50%

**Cost Efficiency**

```
Cost Efficiency = Total Costs / Resolved Claims
```

Example: $100,000 costs / 50 resolved claims  
Cost Efficiency = $2,000 per claim

---

### 4. Operational Analytics Dashboard

**Path**: `/analytics/operational`

**Purpose**: Monitor operational efficiency, SLA compliance, and resource utilization

#### Key Performance Indicators (KPIs)

| KPI | Description | Formula |
|-----|-------------|---------|
| **Queue Size** | Active claims waiting | `COUNT(status IN active_statuses)` |
| **Avg Wait Time** | Hours in queue | `AVG(NOW() - created_at)` |
| **SLA Compliance** | On-time resolutions | `(on_time / resolved) × 100` |
| **Workload Balance** | Distribution evenness | `100 - (std_dev / mean × 100)` |

#### Tabs

**📋 Queue Status**

- **Priority Distribution**: Claims by urgency (bar chart)
- **Aging Analysis**: Time in queue (bar chart)
- **Queue Details Table**: Detailed claim list with alerts
- **Alert Indicators**: Red/yellow/green status
- **Use Case**: Prioritize work and identify bottlenecks

**👷 Workload Distribution**

- **Steward Distribution**: Cases per steward (bar chart)
- **Utilization Table**: Capacity vs assigned (table with color coding)
- **Color Coding**: Red >90%, Yellow >75%, Green <75%
- **Avg Response Time**: Time to first action
- **Use Case**: Balance workload and identify overload

**⏱️ SLA Tracking**

- **Compliance Trend**: Daily SLA performance (line chart)
- **On-Time vs Overdue**: Stacked area chart
- **Target Variance**: Distance from goal
- **30-Day Rolling Average**: Smooth trend line
- **Use Case**: Monitor service level compliance

**🚨 Bottleneck Detection**

- **Automated Detection**: AI-identified slowdowns
- **Severity Indicators**: High/medium/low flags
- **Process Stages**: Where delays occur
- **Recommendations**: Automated improvement suggestions
- **Use Case**: Proactive process optimization

#### Operational Calculations Explained

**SLA Compliance**

```
SLA Compliance = (Claims Resolved ≤ 30 Days / Total Resolved) × 100
```

Target: ≥ 85% compliance

**Workload Balance**

```
Balance = 100 - (Standard Deviation / Mean × 100)
```

- 100% = Perfectly balanced
- 80-100% = Well balanced
- 60-80% = Moderately balanced
- <60% = Unbalanced, needs redistribution

**Utilization**

```
Utilization = (Active Cases / Capacity) × 100
```

- <75% = Healthy capacity
- 75-90% = Busy but manageable
- >90% = Overloaded, needs help

**Bottleneck Detection Algorithm**

```
IF avg_duration > P75 × 1.5 THEN severity = HIGH
IF avg_duration > P75 × 1.2 THEN severity = MEDIUM
ELSE severity = LOW
```

(P75 = 75th percentile duration for that stage)

---

## Advanced Features

### Date Range Filtering

All dashboards support flexible date ranges:

- **30 Days**: Last month performance
- **90 Days**: Quarterly analysis
- **180 Days**: Semi-annual review
- **365 Days**: Annual summary
- **Custom Range**: Pick specific dates

### Period Comparison

Automatically compares current period vs previous equal period:

- **Example**: If viewing last 30 days, shows comparison vs prior 30 days
- **Change Indicators**: ↑ increase, ↓ decrease, — no change
- **Percentage Change**: Quantified improvement/decline

### Export Capabilities

**PDF Export**

- Full dashboard snapshot
- Includes all charts and KPIs
- Date range and filters applied
- Use: Executive reports, presentations

**Excel Export**

- Raw data tables
- Pivot-ready format
- Includes formulas
- Use: Deep analysis, custom reporting

**CSV Export**

- Lightweight data export
- Import into other tools
- Comma-separated values
- Use: Integration, batch processing

### Real-Time Updates

- **Auto-Refresh**: Dashboards update automatically
- **Manual Refresh**: Click refresh icon anytime
- **Cache Duration**: 5-minute data freshness
- **Live Indicators**: Green dot = live data

---

## Performance & Optimization

### Caching System

The platform uses intelligent caching for fast performance:

**Cache TTL (Time To Live)**

- Dashboard metrics: 2 minutes
- Detailed analytics: 5 minutes
- Historical data: 15 minutes

**Cache Invalidation**

- Automatic: When data changes
- Manual: Click "Refresh" button
- Scheduled: Nightly cache warming

### Pre-Computed Aggregations

Daily aggregations run at 2 AM:

- Previous day metrics computed
- Materialized views refreshed
- Database statistics updated

**Benefits**:

- Faster query performance
- Reduced database load
- Consistent response times

### Database Optimization

**Indexes Created**:

- Tenant + date combinations
- Status + category lookups
- Composite indexes for common queries

**Materialized Views**:

- `analytics_daily_summary`: Daily claim aggregations
- `analytics_member_summary`: Member statistics

**Performance Targets**:

- Page load: <2 seconds
- API response: <500ms (cached), <2s (uncached)
- Chart rendering: <1 second

---

## Troubleshooting

### Common Issues

**Dashboard Not Loading**

- **Cause**: Network timeout or server error
- **Solution**: Refresh page, check internet connection
- **Escalate**: If persists >5 minutes, contact support

**Data Seems Outdated**

- **Cause**: Cache not refreshed
- **Solution**: Click manual refresh button
- **Note**: Cache updates every 5 minutes automatically

**Export Not Working**

- **Cause**: Browser popup blocker or large dataset
- **Solution**: Allow popups, try smaller date range
- **Alternative**: Use CSV export for large datasets

**Slow Performance**

- **Cause**: Large date range, uncached data
- **Solution**: Use smaller date ranges (30-90 days)
- **Optimization**: Wait for cache warm-up (first query slower)

### Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| "Unauthorized" | Session expired | Log in again |
| "No data available" | Empty dataset | Check date range/filters |
| "Query timeout" | Database overload | Retry in 1-2 minutes |
| "Rate limit exceeded" | Too many requests | Wait 60 seconds |

### Performance Tips

1. **Use Smaller Date Ranges**: 30-90 days for fastest performance
2. **Leverage Caching**: Repeat queries served from cache
3. **Schedule Reports**: Run large exports during off-hours
4. **Export Strategically**: CSV for raw data, PDF for presentations
5. **Monitor During Business Hours**: Real-time data most valuable

---

## API Reference

See [API Documentation](./API_DOCUMENTATION.md) for complete endpoint reference.

### Quick Reference

**Claims Analytics**

- `GET /api/analytics/claims` - Summary metrics
- `GET /api/analytics/claims/trends` - Time-series data
- `GET /api/analytics/claims/by-category` - Category breakdown
- `GET /api/analytics/claims/by-status` - Status distribution

**Member Analytics**

- `GET /api/analytics/members` - Member summary
- `GET /api/analytics/members/growth` - Growth trends
- `GET /api/analytics/members/engagement` - Activity metrics

**Financial Analytics**

- `GET /api/analytics/financial` - Financial summary
- `GET /api/analytics/financial/trends` - Financial time-series
- `GET /api/analytics/financial/outcomes` - Settlement analysis
- `GET /api/analytics/financial/categories` - ROI by category
- `GET /api/analytics/financial/costs` - Cost breakdown

**Operational Analytics**

- `GET /api/analytics/operational` - Operational summary
- `GET /api/analytics/operational/queues` - Queue metrics
- `GET /api/analytics/operational/workload` - Steward utilization
- `GET /api/analytics/operational/sla` - SLA compliance
- `GET /api/analytics/operational/bottlenecks` - Bottleneck detection

---

## Support

### Getting Help

- **Documentation**: This guide + API docs
- **In-App Help**: Click "?" icon on any dashboard
- **Email Support**: <analytics@unionclaims.com>
- **Response Time**: 24-48 hours

### Feature Requests

Submit enhancement requests through:

1. In-app feedback form
2. Email: <features@unionclaims.com>
3. Include use case and priority

---

**Document Version**: 1.0  
**Last Updated**: November 15, 2025  
**Next Review**: February 15, 2026
