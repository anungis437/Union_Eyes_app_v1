# Q1 2025 Advanced Analytics - Setup Instructions

## Overview

This deployment implements Q1 2025 Advanced Analytics features:

- Predictive analytics & ML forecasting
- Custom KPI dashboard builder
- AI-powered insights
- Comparative analysis & benchmarking

## Prerequisites

- PostgreSQL database
- Node.js 18+ with pnpm
- Clerk authentication configured
- Azure OpenAI or OpenAI API access

## Installation Steps

### 1. Install Dependencies

```bash
# Install required npm packages
pnpm add simple-statistics recharts @hookform/react-hook-form @hookform/resolvers zod

# Install dev dependencies if needed
pnpm add -D @types/simple-statistics
```

### 2. Run Database Migration

```bash
# Apply analytics schema migration
pnpm drizzle-kit push:pg

# Or if using migrations directly
psql -d your_database -f db/migrations/067_advanced_analytics_q1_2025.sql
```

### 3. Configure Environment Variables

Add to your `.env` or `.env.local`:

```env
# Existing variables...

# Cron job authentication (for automated analytics)
CRON_SECRET=your-secure-random-secret-here

# Optional: Configure analytics settings
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_BATCH_SIZE=100
```

### 4. Configure Cron Job (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/analytics/daily-metrics",
      "schedule": "0 2 * * *"
    }
  ]
}
```

For other platforms:

- **AWS**: Use EventBridge scheduled rules
- **Azure**: Use Azure Functions timer triggers
- **Self-hosted**: Use system cron or PM2 cron

### 5. Verify Installation

#### Check Database Schema

```sql
-- Verify analytics tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'analytics_%';

-- Expected output:
-- analytics_metrics
-- kpi_configurations
-- ml_predictions
-- trend_analyses
-- insight_recommendations
-- comparative_analyses
```

#### Test API Endpoints

```bash
# Test metrics calculation
curl -X POST http://localhost:3000/api/analytics/metrics \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"org-123","periodType":"day"}'

# Test KPI creation
curl -X POST http://localhost:3000/api/analytics/kpis \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId":"org-123",
    "name":"Test KPI",
    "metricType":"claims_volume",
    "dataSource":"claims",
    "visualizationType":"number"
  }'
```

### 6. Access Analytics Dashboard

Navigate to: `https://your-domain.com/analytics`

## Features Overview

### 1. Predictive Analytics

- **Linear Regression Forecasting**: Trend-based predictions
- **Moving Average**: Baseline forecasting
- **Ensemble Method**: Combined model predictions
- **Confidence Intervals**: 95% confidence scoring

### 2. Custom KPI Dashboard

- **KPI Builder**: Visual form to create custom KPIs
- **Multiple Visualizations**: Number, gauge, line, bar, pie charts
- **Threshold Alerts**: Warning and critical thresholds
- **Email Notifications**: Alert recipients configuration

### 3. AI Insights

- **Automated Generation**: Daily insight analysis
- **Priority Classification**: Critical, high, medium, low
- **Action Workflow**: Acknowledge, dismiss, complete
- **Recommendations**: AI-generated action items

### 4. Comparative Analysis

- **Peer Comparison**: Compare with similar organizations
- **Industry Benchmarks**: Position in industry percentile
- **Gap Analysis**: Identify improvement areas
- **Trend Tracking**: Performance over time

## Usage Examples

### Creating a Custom KPI

1. Navigate to Analytics > Custom KPIs tab
2. Click "Create KPI" button
3. Fill in configuration:
   - Name: "Monthly Claims Volume"
   - Metric Type: Claims Volume
   - Data Source: Claims
   - Visualization: Bar Chart
   - Target Value: 200
   - Warning Threshold: 180
   - Critical Threshold: 220
4. Enable alerts and add recipients
5. Save KPI

### Viewing Predictions

1. Navigate to Analytics > Predictions tab
2. Select metric type (e.g., "Claims Volume")
3. View 7-day, 30-day, or 90-day forecasts
4. See confidence intervals and trend analysis

### Comparative Analysis

1. Navigate to Analytics > Compare tab
2. Select metric to compare
3. Choose time range
4. View peer rankings, industry benchmark, and gap analysis
5. Review recommendations for improvement

## API Reference

### Metrics API

- **POST** `/api/analytics/metrics` - Calculate metrics
- **GET** `/api/analytics/metrics?organizationId=xxx` - Retrieve metrics

### Predictions API

- **POST** `/api/analytics/predictions` - Generate predictions
- **GET** `/api/analytics/predictions?organizationId=xxx` - Get predictions

### Trends API

- **POST** `/api/analytics/trends` - Analyze trends
- **GET** `/api/analytics/trends?organizationId=xxx` - Get trend analyses

### KPIs API

- **GET** `/api/analytics/kpis?organizationId=xxx` - List KPIs
- **POST** `/api/analytics/kpis` - Create KPI
- **PUT** `/api/analytics/kpis/:id` - Update KPI
- **DELETE** `/api/analytics/kpis/:id` - Delete KPI

### Insights API

- **GET** `/api/analytics/insights?organizationId=xxx` - List insights
- **PATCH** `/api/analytics/insights/:id` - Update insight status
- **POST** `/api/analytics/insights` - Create insight

### Comparative API

- **GET** `/api/analytics/comparative?organizationId=xxx&metric=xxx` - Get comparison
- **POST** `/api/analytics/comparative` - Generate comparison

## Troubleshooting

### Migration Fails

```bash
# Check database connection
psql -d your_database -c "SELECT version();"

# Verify user permissions
psql -d your_database -c "SELECT current_user;"

# Check for existing tables
psql -d your_database -c "\dt analytics_*"
```

### API Endpoints Return 500

- Check environment variables are set
- Verify database connection
- Check Clerk authentication is configured
- Review server logs for detailed errors

### No Data Showing in Dashboard

- Run manual metrics calculation via API
- Check RLS policies allow user access
- Verify organizationId is correct
- Check browser console for errors

### Cron Job Not Running

- Verify CRON_SECRET is set
- Check cron configuration in vercel.json
- Test cron endpoint manually:

  ```bash
  curl -X POST http://localhost:3000/api/cron/analytics/daily-metrics \
    -H "Authorization: Bearer your-cron-secret"
  ```

## Performance Optimization

### Database Indexes

All necessary indexes are included in the migration:

- `organizationId` on all tables
- `metricType` + `periodType` on analytics_metrics
- `createdAt` descending for time-series queries
- Composite indexes for common query patterns

### Caching Recommendations

```typescript
// Implement Redis caching for frequently accessed data
// Example: Cache metrics for 5 minutes
const cacheKey = `metrics:${organizationId}:${periodType}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Calculate metrics...
await redis.setex(cacheKey, 300, JSON.stringify(metrics));
```

### Query Optimization

- Use pagination for large result sets
- Filter by date ranges to limit data
- Use appropriate indexes
- Consider materialized views for complex aggregations

## Security Considerations

1. **Row-Level Security**: All tables have RLS policies
2. **Organization Isolation**: Data scoped to organization
3. **Role-Based Access**: Different permissions for roles
4. **API Authentication**: All endpoints require authentication
5. **Cron Job Security**: Protected by CRON_SECRET

## Maintenance

### Regular Tasks

- **Daily**: Automated via cron job
  - Calculate daily metrics
  - Generate weekly predictions
  - Detect trends and anomalies
  - Create insights for critical items

- **Weekly**: Manual review
  - Review critical insights
  - Verify KPI thresholds
  - Check comparative analysis

- **Monthly**: Optimization
  - Archive old metrics (>1 year)
  - Review and optimize queries
  - Update industry benchmarks

### Data Retention

```sql
-- Archive old metrics (example)
DELETE FROM analytics_metrics 
WHERE "createdAt" < NOW() - INTERVAL '1 year';

-- Archive old predictions
DELETE FROM ml_predictions 
WHERE "createdAt" < NOW() - INTERVAL '6 months';
```

## Next Steps

After completing Q1 2025 Advanced Analytics:

1. **Q3 2025**: Integration Platform
   - REST API v2 with webhooks
   - Integration marketplace
   - Data sync engine

2. **Q4 2025**: AI Enhancements
   - RAG system with vector database
   - Document generation
   - Multilingual support

3. **2026**: Advanced Features
   - Video conferencing
   - E-signatures
   - Knowledge base

## Support

For issues or questions:

1. Check this documentation
2. Review error logs
3. Test API endpoints manually
4. Verify database schema and permissions
5. Check environment variables

## File Structure

```
db/migrations/
  └── 067_advanced_analytics_q1_2025.sql
  └── schema.ts (updated with analytics tables)

database/schema/
  └── analytics.ts

lib/ml/
  └── predictive-analytics.ts

actions/
  └── analytics-actions.ts

app/api/analytics/
  ├── predictions/route.ts
  ├── trends/route.ts
  ├── metrics/route.ts
  ├── kpis/route.ts
  ├── insights/route.ts
  └── comparative/route.ts

app/api/cron/analytics/
  └── daily-metrics/route.ts

app/[locale]/(dashboard)/analytics/
  └── page.tsx

components/analytics/
  ├── analytics-dashboard.tsx
  ├── metric-card.tsx
  ├── trend-chart.tsx
  ├── insights-panel.tsx
  ├── kpi-grid.tsx
  ├── kpi-builder-dialog.tsx
  └── comparative-analysis.tsx
```

---

**Status**: Q1 2025 Advanced Analytics - Complete ✅
**Next Phase**: Q1 2025 AI Insights Integration (Task 4)
