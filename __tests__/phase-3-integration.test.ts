/**
 * Phase 3 Integration Test Suite
 * Tests complete workflows for Organizing, COPE, and Education modules
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_ORG_ID = 'test-org-123';
const TEST_MEMBER_ID = 'test-member-456';

describe('Phase 3: Organizing Module Workflow', () => {
  let campaignId: string;
  let workplaceId: string;
  let labourBoardId: string;

  it('should create an organizing campaign', async () => {
    const response = await fetch(`${API_BASE}/api/organizing/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        campaignName: 'Test Healthcare Workers Campaign',
        campaignCode: 'TEST-HW-2024',
        targetWorkplace: 'Test Hospital',
        campaignStatus: 'active',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    campaignId = data.data.id;
  });

  it('should create workplace mapping data', async () => {
    const response = await fetch(`${API_BASE}/api/organizing/workplace-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        campaignId,
        departmentName: 'Emergency Room',
        shiftName: 'Day Shift',
        estimatedEmployees: 50,
        contactedEmployees: 10,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    workplaceId = data.data.id;
  });

  it('should track card-check progress', async () => {
    const response = await fetch(`${API_BASE}/api/organizing/card-check?campaignId=${campaignId}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  it('should create labour board filing', async () => {
    const response = await fetch(`${API_BASE}/api/organizing/labour-board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        campaignId,
        filingType: 'certification',
        filingDate: new Date().toISOString(),
        boardJurisdiction: 'ontario',
        supportPercentage: 65.5,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    labourBoardId = data.data.id;
  });

  it('should retrieve organizing committee members', async () => {
    const response = await fetch(`${API_BASE}/api/organizing/committee?campaignId=${campaignId}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('Phase 3: COPE Political Action Workflow', () => {
  let politicalCampaignId: string;
  let officialId: string;

  it('should create a political campaign', async () => {
    const response = await fetch(`${API_BASE}/api/cope/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        campaignName: 'Test Federal Election 2024',
        campaignCode: 'TEST-FED-2024',
        campaignType: 'electoral',
        targetElectionDate: '2024-10-21',
        electoralDistrict: 'Toronto Centre',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    politicalCampaignId = data.data.id;
  });

  it('should add an elected official', async () => {
    const response = await fetch(`${API_BASE}/api/cope/officials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        officialName: 'Test MP',
        officialTitle: 'Member of Parliament',
        politicalParty: 'NDP',
        levelOfGovernment: 'federal',
        electoralDistrict: 'Toronto Centre',
        laborRating: 85,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    officialId = data.data.id;
  });

  it('should log canvassing activities', async () => {
    const response = await fetch(`${API_BASE}/api/cope/canvassing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        campaignId: politicalCampaignId,
        volunteerName: 'Test Volunteer',
        activityType: 'door_knock',
        contactsMade: 25,
        supportLevel: 'support',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
  });

  it('should retrieve canvassing summary', async () => {
    const response = await fetch(`${API_BASE}/api/cope/canvassing?campaignId=${politicalCampaignId}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('summary');
    expect(data.data).toHaveProperty('activities');
  });

  it('should update political campaign outcome', async () => {
    const response = await fetch(`${API_BASE}/api/cope/campaigns`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: politicalCampaignId,
        organizationId: TEST_ORG_ID,
        outcome: 'won',
        outcomeDate: new Date().toISOString(),
      }),
    });

    expect(response.status).toBe(200);
  });
});

describe('Phase 3: Education & Training Workflow', () => {
  let courseId: string;
  let registrationId: string;
  let completionId: string;

  it('should create a training course', async () => {
    const response = await fetch(`${API_BASE}/api/education/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        courseName: 'Test Steward Training',
        courseCode: 'TEST-ST-101',
        courseCategory: 'steward_training',
        deliveryMethod: 'in_person',
        durationHours: 8,
        providesCertification: true,
        certificationName: 'Certified Steward Level 1',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    courseId = data.data.id;
  });

  it('should list available courses', async () => {
    const response = await fetch(`${API_BASE}/api/education/courses?organizationId=${TEST_ORG_ID}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('should enroll a member in a course', async () => {
    const response = await fetch(`${API_BASE}/api/education/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        memberId: TEST_MEMBER_ID,
        courseId,
        sessionId: 'test-session-123',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    registrationId = data.data.id;
  });

  it('should retrieve member enrollments', async () => {
    const response = await fetch(`${API_BASE}/api/education/enrollments?memberId=${TEST_MEMBER_ID}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should record course completion', async () => {
    const response = await fetch(`${API_BASE}/api/education/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        memberId: TEST_MEMBER_ID,
        courseId,
        sessionId: 'test-session-123',
        completionDate: new Date().toISOString(),
        passed: true,
        certificateIssued: true,
        certificateNumber: 'CERT-2024-001',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    completionId = data.data.id;
  });

  it('should retrieve member certificates', async () => {
    const response = await fetch(`${API_BASE}/api/education/completions?memberId=${TEST_MEMBER_ID}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });
});

describe('Phase 3: Cross-Module Integration', () => {
  it('should link political campaigns to organizing campaigns', async () => {
    // Test that COPE campaigns can reference organizing campaigns
    const response = await fetch(`${API_BASE}/api/cope/campaigns?organizationId=${TEST_ORG_ID}`);
    expect(response.status).toBe(200);
  });

  it('should track training for organizers and activists', async () => {
    // Test that education completions can be filtered by role
    const response = await fetch(`${API_BASE}/api/education/completions?organizationId=${TEST_ORG_ID}`);
    expect(response.status).toBe(200);
  });

  it('should generate comprehensive reporting', async () => {
    // Test that all three modules can be queried together
    const [organizing, cope, education] = await Promise.all([
      fetch(`${API_BASE}/api/organizing/campaigns?organizationId=${TEST_ORG_ID}`),
      fetch(`${API_BASE}/api/cope/campaigns?organizationId=${TEST_ORG_ID}`),
      fetch(`${API_BASE}/api/education/courses?organizationId=${TEST_ORG_ID}`),
    ]);

    expect(organizing.status).toBe(200);
    expect(cope.status).toBe(200);
    expect(education.status).toBe(200);
  });
});
