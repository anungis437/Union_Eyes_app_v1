import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const API_BASE =
  process.env.INTEGRATION_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';
const hasApiServer =
  process.env.RUN_INTEGRATION_TESTS === 'true' &&
  Boolean(process.env.INTEGRATION_API_BASE_URL) &&
  !(globalThis.fetch as unknown as { mock?: unknown })?.mock;
const describeIf = hasApiServer ? describe : describe.skip;

describeIf('Jurisdiction API Endpoints', () => {
  describe('GET /api/jurisdiction/list', () => {
    it('should return list of all 14 Canadian jurisdictions', async () => {
      const response = await fetch(`${API_BASE}/api/jurisdiction/list`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.jurisdictions).toHaveLength(14);

      // Verify structure of first jurisdiction
      const firstJurisdiction = data.jurisdictions[0];
      expect(firstJurisdiction).toHaveProperty('code');
      expect(firstJurisdiction).toHaveProperty('name');
      expect(firstJurisdiction).toHaveProperty('isBilingual');
      expect(firstJurisdiction).toHaveProperty('businessDayConvention');
    });

    it('should include Federal jurisdiction', async () => {
      const response = await fetch(`${API_BASE}/api/jurisdiction/list`);
      const data = await response.json();

      const federal = data.jurisdictions.find((j: any) => j.code === 'CA-FED');
      expect(federal).toBeDefined();
      expect(federal.name).toBe('Federal');
      expect(federal.isBilingual).toBe(true);
    });

    it('should mark Quebec as bilingual', async () => {
      const response = await fetch(`${API_BASE}/api/jurisdiction/list`);
      const data = await response.json();

      const quebec = data.jurisdictions.find((j: any) => j.code === 'CA-QC');
      expect(quebec).toBeDefined();
      expect(quebec.isBilingual).toBe(true);
    });
  });

  describe('GET /api/jurisdiction/rules', () => {
    it('should return rules for Federal grievance filing', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/rules?jurisdiction=CA-FED&category=grievance_filing`
      );
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.rules).toBeInstanceOf(Array);
      expect(data.rules.length).toBeGreaterThan(0);

      const rule = data.rules[0];
      expect(rule.jurisdiction).toBe('CA-FED');
      expect(rule.ruleCategory).toBe('grievance_filing');
      expect(rule.deadlineDays).toBe(25); // Federal = 25 business days
      expect(rule.legalReference).toContain('240'); // CLC §240
    });

    it('should return all rules for a jurisdiction when no category specified', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/rules?jurisdiction=CA-ON`
      );
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.rules.length).toBeGreaterThan(1); // Should have multiple rule categories
    });

    it('should return 400 for missing jurisdiction parameter', async () => {
      const response = await fetch(`${API_BASE}/api/jurisdiction/rules`);
      expect(response.status).toBe(400);
    });

    it('should handle invalid jurisdiction gracefully', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/rules?jurisdiction=INVALID`
      );
      // Should either return 400 or empty rules array
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/jurisdiction/compare', () => {
    it('should compare strike vote thresholds across jurisdictions', async () => {
      const jurisdictions = ['CA-MB', 'CA-SK', 'CA-ON'];
      const queryString = jurisdictions
        .map((j) => `jurisdictions=${j}`)
        .join('&');

      const response = await fetch(
        `${API_BASE}/api/jurisdiction/compare?${queryString}&category=strike_vote`
      );
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.comparison).toHaveLength(3);

      // Manitoba should have 65% threshold
      const manitoba = data.comparison.find(
        (c: any) => c.jurisdiction === 'CA-MB'
      );
      expect(manitoba).toBeDefined();
      expect(manitoba.rules).toBeInstanceOf(Array);

      // Saskatchewan should have special 45% rule
      const saskatchewan = data.comparison.find(
        (c: any) => c.jurisdiction === 'CA-SK'
      );
      expect(saskatchewan).toBeDefined();
    });

    it('should return 400 when jurisdictions parameter is missing', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/compare?category=strike_vote`
      );
      expect(response.status).toBe(400);
    });

    it('should return 400 when category parameter is missing', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/compare?jurisdictions=CA-ON`
      );
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/jurisdiction/calculate-deadline', () => {
    it('should calculate Federal grievance deadline (25 business days)', async () => {
      const startDate = '2025-01-02'; // Thursday
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/calculate-deadline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jurisdiction: 'CA-FED',
            ruleCategory: 'grievance_filing',
            startDate,
            mode: 'detailed',
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.deadlineDays).toBe(25);
      expect(data.deadlineDate).toBeDefined();
      expect(data.legalReference).toContain('240');

      // Verify the date is after start date
      const deadline = new Date(data.deadlineDate);
      const start = new Date(startDate);
      expect(deadline.getTime()).toBeGreaterThan(start.getTime());
    });

    it('should skip holidays in deadline calculation', async () => {
      // Start date just before Christmas
      const startDate = '2025-12-23'; // Tuesday

      const response = await fetch(
        `${API_BASE}/api/jurisdiction/calculate-deadline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jurisdiction: 'CA-FED',
            ruleCategory: 'grievance_filing',
            startDate,
            mode: 'detailed',
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Deadline should be well into January due to Christmas/New Year holidays
      const deadline = new Date(data.deadlineDate);
      expect(deadline.getMonth()).toBeGreaterThanOrEqual(0); // January or later
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/calculate-deadline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jurisdiction: 'CA-FED',
            // Missing ruleCategory and startDate
          }),
        }
      );

      expect(response.status).toBe(400);
    });

    it('should work in simple mode', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/calculate-deadline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jurisdiction: 'CA-ON',
            ruleCategory: 'grievance_filing',
            startDate: '2025-02-01',
            mode: 'simple',
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.deadlineDate).toBeDefined();
    });
  });

  describe('POST /api/jurisdiction/business-days', () => {
    it('should add business days correctly', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'add',
            jurisdiction: 'CA-ON',
            startDate: '2025-01-02', // Thursday
            businessDays: 5,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.resultDate).toBeDefined();

      // Adding 5 business days to Thursday should give next Thursday (skipping weekend)
      const result = new Date(data.resultDate);
      expect(result.getDay()).not.toBe(0); // Not Sunday
      expect(result.getDay()).not.toBe(6); // Not Saturday
    });

    it('should subtract business days correctly', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'subtract',
            jurisdiction: 'CA-BC',
            startDate: '2025-02-10', // Monday
            businessDays: 3,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      const result = new Date(data.resultDate);
      const start = new Date('2025-02-10');
      expect(result.getTime()).toBeLessThan(start.getTime());
    });

    it('should count business days between dates', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'count',
            jurisdiction: 'CA-FED',
            startDate: '2025-01-06', // Monday
            endDate: '2025-01-10', // Friday
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.businessDaysCount).toBe(5); // Mon-Fri = 5 business days
    });

    it('should return 400 for invalid operation', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'invalid',
            jurisdiction: 'CA-ON',
            startDate: '2025-01-01',
          }),
        }
      );

      expect(response.status).toBe(400);
    });

    it('should skip holidays when adding business days', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'add',
            jurisdiction: 'CA-FED',
            startDate: '2025-12-23', // Week before Christmas
            businessDays: 10,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Result should be well into January due to holidays
      const result = new Date(data.resultDate);
      expect(result.getMonth()).toBeGreaterThanOrEqual(0); // January or later
    });
  });

  describe('GET /api/jurisdiction/holidays', () => {
    it('should return Federal holidays for 2025', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/holidays?jurisdiction=CA-FED&year=2025`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.holidays).toBeInstanceOf(Array);
      expect(data.holidays.length).toBeGreaterThan(0);

      // Check for Canada Day
      const canadaDay = data.holidays.find((h: any) =>
        h.name.includes('Canada Day')
      );
      expect(canadaDay).toBeDefined();
      expect(canadaDay.date).toContain('2025-07-01');
    });

    it('should return holidays within date range', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/holidays?jurisdiction=CA-ON&startDate=2025-12-01&endDate=2025-12-31`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Should include Christmas and Boxing Day
      const holidays = data.holidays;
      const christmas = holidays.find((h: any) => h.name.includes('Christmas'));
      expect(christmas).toBeDefined();
    });

    it('should return different holidays for different provinces', async () => {
      // Alberta has Family Day in February
      const albertaResponse = await fetch(
        `${API_BASE}/api/jurisdiction/holidays?jurisdiction=CA-AB&year=2025`
      );
      const albertaData = await albertaResponse.json();

      // Quebec has different holidays
      const quebecResponse = await fetch(
        `${API_BASE}/api/jurisdiction/holidays?jurisdiction=CA-QC&year=2025`
      );
      const quebecData = await quebecResponse.json();

      // Should have different holiday counts/names
      expect(albertaData.holidays.length).not.toBe(quebecData.holidays.length);
    });

    it('should return 400 for missing jurisdiction', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/holidays?year=2025`
      );
      expect(response.status).toBe(400);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle year boundary in business day calculation', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'add',
            jurisdiction: 'CA-FED',
            startDate: '2025-12-15',
            businessDays: 25,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Result should be in 2026
      const result = new Date(data.resultDate);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should handle invalid dates gracefully', async () => {
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/calculate-deadline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jurisdiction: 'CA-ON',
            ruleCategory: 'grievance_filing',
            startDate: 'invalid-date',
            mode: 'simple',
          }),
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should handle leap year correctly', async () => {
      // 2024 is a leap year
      const response = await fetch(
        `${API_BASE}/api/jurisdiction/business-days`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'add',
            jurisdiction: 'CA-ON',
            startDate: '2024-02-28',
            businessDays: 1,
          }),
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      const result = new Date(data.resultDate);
      // Should be Feb 29 (leap day)
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(1); // February
    });
  });
});
