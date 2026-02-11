# Developer Quick Start: Phase 3 New Features

This guide provides quick reference examples for integrating the newly implemented Phase 3 features into your application.

---

## 1. Multi-Tenant Organization Hierarchy Admin

### Usage in Dashboard Pages

```typescript
import { OrganizationHierarchyAdmin } from '@/components/admin/OrganizationHierarchyAdmin';

export default function AdminPage() {
  return (
    <OrganizationHierarchyAdmin 
      organizationId="current-org-id"
      userRole="admin"
    />
  );
}
```

### API Integration

```typescript
// Fetch organization tree
const response = await fetch('/api/organizations/hierarchy?rootOrgId=org-123');
const { data } = await response.json();

// Create new organization
await fetch('/api/organizations', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Local 456',
    organizationType: 'local_union',
    parentOrganizationId: 'parent-org-id'
  })
});

// Update organization
await fetch('/api/organizations/org-123', {
  method: 'PATCH',
  body: JSON.stringify({
    name: 'Updated Name',
    parentOrganizationId: 'new-parent-id'
  })
});
```

---

## 2. Strike Fund Dashboard

### Component Integration

```typescript
import { StrikeFundDashboard } from '@/components/strike/StrikeFundDashboard';

export default function StrikePage() {
  return (
    <StrikeFundDashboard 
      strikeFundId="fund-123"
      organizationId="org-456"
    />
  );
}
```

### API Examples

```typescript
// Fetch picket lines with GPS coordinates
const response = await fetch('/api/strike/picket-lines?strikeFundId=fund-123');
const { data: picketLines } = await response.json();

// Create new picket line
await fetch('/api/strike/picket-lines', {
  method: 'POST',
  body: JSON.stringify({
    strikeFundId: 'fund-123',
    locationName: 'Main Gate',
    address: '123 Factory St',
    latitude: 43.6532,
    longitude: -79.3832,
    geofenceRadiusMeters: 50
  })
});

// Calculate weekly stipends
await fetch('/api/strike/disbursements/calculate', {
  method: 'POST',
  body: JSON.stringify({
    strikeFundId: 'fund-123',
    weekStartDate: '2025-12-01',
    weekEndDate: '2025-12-07'
  })
});
```

---

## 3. Organizing Density Heat Map

### Component Usage

```typescript
import { DensityHeatMap } from '@/components/organizing/DensityHeatMap';

export default function OrganizingPage() {
  return (
    <DensityHeatMap 
      campaignId="campaign-789"
      organizationId="org-456"
    />
  );
}
```

### API Integration

```typescript
// Fetch campaign with density stats
const response = await fetch('/api/organizing/campaigns/campaign-789');
const { data: campaign } = await response.json();

// Get department breakdown
const deptResponse = await fetch(
  '/api/organizing/workplace-mapping?campaignId=campaign-789&groupBy=department'
);
const { data: departments } = await deptResponse.json();

// Calculate density percentage
const densityPercentage = (campaign.cards_signed / campaign.total_workers) * 100;
```

---

## 4. Pension & H&W Management

### Pension Member Enrollment

```typescript
// Enroll member in pension plan
const response = await fetch('/api/pension/members', {
  method: 'POST',
  body: JSON.stringify({
    pensionPlanId: 'plan-123',
    memberId: 'member-456',
    enrollmentDate: '2025-01-01',
    beneficiaryName: 'Jane Doe',
    beneficiaryRelationship: 'spouse',
    beneficiaryPercentage: 100.00
  })
});

// Fetch members enrolled in plan
const members = await fetch('/api/pension/members?pensionPlanId=plan-123');
```

### Health & Welfare Plans

```typescript
// Create H&W plan
const response = await fetch('/api/healthwelfare/plans', {
  method: 'POST',
  body: JSON.stringify({
    organizationId: 'org-456',
    planName: 'Comprehensive Health Plan',
    planType: 'comprehensive',
    insuranceCarrier: 'Blue Cross',
    policyNumber: 'POL-12345',
    monthlyPremiumSingle: 450.00,
    monthlyPremiumFamily: 1200.00,
    annualDeductible: 2000.00,
    prescriptionCoverage: true,
    dentalCoverage: true,
    visionCoverage: true,
    coverageStartDate: '2025-01-01'
  })
});

// List organization's H&W plans
const plans = await fetch('/api/healthwelfare/plans?organizationId=org-456');
```

---

## 5. Labour Board Form Generator

### Component Integration

```typescript
import { LabourBoardFormGenerator } from '@/components/organizing/LabourBoardFormGenerator';

export default function CertificationPage() {
  return (
    <LabourBoardFormGenerator 
      campaignId="campaign-789"
      organizationId="org-456"
    />
  );
}
```

### PDF Generation

```typescript
// Generate certification form PDF
const response = await fetch('/api/organizing/forms/generate', {
  method: 'POST',
  body: JSON.stringify({
    campaignId: 'campaign-789',
    templateId: 'olrb-a1', // Ontario LRB Form A-1
    formData: {
      union_name: 'Local 123 CUPE',
      union_address: '100 Main St, Toronto, ON',
      employer_name: 'ABC Manufacturing Inc.',
      employer_address: '200 Factory Rd, Toronto, ON',
      bargaining_unit: 'All production workers',
      employee_count: '500',
      membership_evidence: '2025-12-01',
      contact_name: 'John Smith',
      contact_phone: '416-555-0100',
      contact_email: 'john@local123.ca'
    }
  })
});

// Download PDF
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'certification-application.pdf';
a.click();
```

### Form Templates Available

- `olrb-a1` - Ontario Labour Relations Board Form A-1
- `bclrb-cert` - BC Labour Relations Board Certification Application
- `cirb-cert` - Canada Industrial Relations Board Certification

---

## Database Schema Quick Reference

### Strike Fund Tables

```sql
-- Picket Lines (PostGIS geography column)
SELECT 
  id,
  location_name,
  address,
  ST_X(gps_coordinates::geometry) as longitude,
  ST_Y(gps_coordinates::geometry) as latitude,
  geofence_radius_meters
FROM picket_lines
WHERE strike_fund_id = 'fund-123';

-- Stipend Disbursements
SELECT 
  sd.id,
  m.first_name || ' ' || m.last_name as member_name,
  sd.week_start_date,
  sd.week_end_date,
  sd.hours_worked,
  sd.stipend_amount,
  sd.payment_status
FROM stipend_disbursements sd
JOIN members m ON sd.member_id = m.id
WHERE sd.strike_fund_id = 'fund-123'
ORDER BY sd.week_start_date DESC;
```

### Organization Hierarchy

```sql
-- Recursive organization tree
WITH RECURSIVE org_tree AS (
  SELECT id, name, parent_organization_id, 0 as level
  FROM hierarchical_organizations
  WHERE id = 'root-org-id'
  
  UNION ALL
  
  SELECT o.id, o.name, o.parent_organization_id, ot.level + 1
  FROM hierarchical_organizations o
  INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

### Organizing Campaign Density

```sql
-- Department density calculation
SELECT 
  department,
  COUNT(*) as total_workers,
  COUNT(*) FILTER (WHERE card_signed = true) as cards_signed,
  ROUND(
    COUNT(*) FILTER (WHERE card_signed = true)::numeric / COUNT(*) * 100, 
    2
  ) as density_percentage
FROM organizing_contacts
WHERE campaign_id = 'campaign-789'
GROUP BY department
ORDER BY density_percentage DESC;
```

---

## PostGIS Functions Reference

### Store GPS Coordinates

```sql
INSERT INTO picket_lines (location_name, gps_coordinates)
VALUES (
  'Main Gate', 
  ST_GeogFromText('POINT(-79.3832 43.6532)')
);
```

### Extract Coordinates

```sql
SELECT 
  location_name,
  ST_X(gps_coordinates::geometry) as longitude,
  ST_Y(gps_coordinates::geometry) as latitude
FROM picket_lines;
```

### Check Distance (Geofencing)

```sql
SELECT * FROM picket_lines
WHERE ST_DWithin(
  gps_coordinates,
  ST_GeogFromText('POINT(-79.3832 43.6532)'),
  50 -- meters
);
```

---

## Error Handling Patterns

### API Response Handling

```typescript
try {
  const response = await fetch('/api/pension/members', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  const result = await response.json();
  if (result.success) {
    // Handle success
  }
} catch (error) {
// Show user-friendly error message
}
```

### Form Validation

```typescript
const validateFormData = (formData: Record<string, string>) => {
  const errors: Record<string, string> = {};
  
  if (!formData.union_name) {
    errors.union_name = 'Union name is required';
  }
  
  if (!formData.employee_count || isNaN(Number(formData.employee_count))) {
    errors.employee_count = 'Valid employee count is required';
  }
  
  return errors;
};
```

---

## Testing Examples

### API Endpoint Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('Strike Picket Lines API', () => {
  it('should create picket line with GPS coordinates', async () => {
    const response = await fetch('/api/strike/picket-lines', {
      method: 'POST',
      body: JSON.stringify({
        strikeFundId: 'test-fund',
        locationName: 'Test Gate',
        latitude: 43.6532,
        longitude: -79.3832
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
  });
});
```

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { DensityHeatMap } from '@/components/organizing/DensityHeatMap';

describe('DensityHeatMap', () => {
  it('renders campaign data', async () => {
    render(
      <DensityHeatMap 
        campaignId="test-campaign"
        organizationId="test-org"
      />
    );
    
    // Wait for data to load
    await screen.findByText(/organizing campaign/i);
    
    // Verify density thresholds
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });
});
```

---

## Performance Optimization

### Pagination

```typescript
// Paginate large result sets
const response = await fetch(
  '/api/strike/disbursements?strikeFundId=fund-123&limit=50&offset=0'
);
```

### Caching

```typescript
// Use SWR for client-side caching
import useSWR from 'swr';

const { data, error } = useSWR(
  `/api/organizing/campaigns/${campaignId}`,
  fetcher,
  { refreshInterval: 30000 } // Refresh every 30s
);
```

### Materialized Views

```sql
-- Refresh materialized views for fast analytics
REFRESH MATERIALIZED VIEW CONCURRENTLY vw_strike_fund_analytics;
```

---

## Security Considerations

### RLS Enforcement

All endpoints enforce Row-Level Security:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their organization's data"
ON picket_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM strike_funds sf
    WHERE sf.id = picket_lines.strike_fund_id
    AND sf.organization_id = current_setting('app.current_organization_id')::uuid
  )
);
```

### Authentication

All protected endpoints require Clerk JWT:

```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Proceed with authenticated request
}
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Enable PostGIS extension: `CREATE EXTENSION postgis;`
- [ ] Install dependencies: `pnpm add pdf-lib -w`
- [ ] Set environment variables (no new vars required)
- [ ] Build project: `pnpm build`
- [ ] Run tests: `pnpm test`
- [ ] Deploy to staging
- [ ] Verify RLS policies active
- [ ] Test PDF generation
- [ ] Validate GPS coordinates storage

---

## Support & Documentation

- Full implementation details: `docs/implementation/PHASE_3_NEW_FEATURES.md`
- Integration tests: `__tests__/new-features-integration.test.ts`
- Platform readiness: `docs/guides/PLATFORM_READINESS_ASSESSMENT.md`

---

**Last Updated:** December 3, 2025  
**Phase:** 3 - Feature Implementation Complete  
**Next Phase:** 4 - E-Filing Integration & Advanced Analytics
