/**
 * Phase 5 Integration Tests
 * 
 * Tests for Communication, LMS, and Document Management integrations:
 * - Slack (Communication)
 * - Microsoft Teams (Communication)
 * - LinkedIn Learning (LMS)
 * - SharePoint (Document Management)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlackClient } from '@/lib/integrations/adapters/communication/slack-client';
import { SlackAdapter } from '@/lib/integrations/adapters/communication/slack-adapter';
import { TeamsClient } from '@/lib/integrations/adapters/communication/teams-client';
import { TeamsAdapter } from '@/lib/integrations/adapters/communication/teams-adapter';
import { LinkedInLearningClient } from '@/lib/integrations/adapters/lms/linkedin-learning-client';
import { LinkedInLearningAdapter } from '@/lib/integrations/adapters/lms/linkedin-learning-adapter';
import { SharePointClient } from '@/lib/integrations/adapters/documents/sharepoint-client';
import { SharePointAdapter } from '@/lib/integrations/adapters/documents/sharepoint-adapter';
import { IntegrationProvider } from '@/lib/integrations/types';

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Slack Client Tests
// ============================================================================
describe('SlackClient', () => {
  const mockConfig = {
    botToken: 'xoxb-test-token',
  };

  it('should successfully fetch channels', async () => {
    const mockResponse = {
      ok: true,
      channels: [
        {
          id: 'C123456',
          name: 'general',
          is_private: false,
          is_archived: false,
          created: 1609459200,
          creator: 'U123456',
          num_members: 10,
        },
      ],
      response_metadata: { next_cursor: 'next_page' },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => mockResponse,
    });

    const client = new SlackClient(mockConfig);
    const result = await client.getChannels();

    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].name).toBe('general');
    expect(result.nextCursor).toBe('next_page');
  });

  it('should handle rate limiting', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([['X-Rate-Limit-Reset', '1609459200']]),
    });

    const client = new SlackClient(mockConfig);

    await expect(client.getChannels()).rejects.toThrow('Rate limit exceeded');
  });

  it('should fetch messages from a channel', async () => {
    const mockResponse = {
      ok: true,
      messages: [
        {
          type: 'message',
          text: 'Hello, world!',
          user: 'U123456',
          ts: '1609459200.000100',
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => mockResponse,
    });

    const client = new SlackClient(mockConfig);
    const result = await client.getChannelMessages('C123456');

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe('Hello, world!');
  });

  it('should verify bot token with health check', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([
        ['content-type', 'application/json'],
      ]),
      json: async () => ({ ok: true }),
    });

    const client = new SlackClient(mockConfig);
    const health = await client.healthCheck();

    expect(health.status).toBe('ok');
  });
});

// ============================================================================
// Slack Adapter Tests
// ============================================================================
describe('SlackAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new SlackAdapter('org-123', {
      botToken: 'xoxb-test-token',
    });

    expect(adapter).toBeDefined();
  });

  it('should report correct capabilities', () => {
    const adapter = new SlackAdapter('org-123', {
      botToken: 'xoxb-test-token',
    });

    const capabilities = adapter.getCapabilities();
    expect(capabilities.supportsFullSync).toBe(true);
    expect(capabilities.supportsIncrementalSync).toBe(true);
    expect(capabilities.supportsWebhooks).toBe(true);
  });
});

// ============================================================================
// Microsoft Teams Client Tests
// ============================================================================
describe('TeamsClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    tenantId: 'test-tenant-id',
  };

  it('should authenticate successfully', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAuthResponse,
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    });

    const client = new TeamsClient(mockConfig);
    const result = await client.getTeams();

    expect(result.teams).toBeDefined();
  });

  it('should fetch teams', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    const mockTeamsResponse = {
      value: [
        {
          id: 'team-123',
          displayName: 'Engineering Team',
          description: 'Engineering department',
          isArchived: false,
          createdDateTime: '2024-01-01T00:00:00Z',
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTeamsResponse,
      });

    const client = new TeamsClient(mockConfig);
    const result = await client.getTeams();

    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].displayName).toBe('Engineering Team');
  });

  it('should handle authentication errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const client = new TeamsClient(mockConfig);

    await expect(client.getTeams()).rejects.toThrow('authentication failed');
  });
});

// ============================================================================
// Microsoft Teams Adapter Tests
// ============================================================================
describe('TeamsAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new TeamsAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
    });

    expect(adapter).toBeDefined();
  });

  it('should report correct capabilities', () => {
    const adapter = new TeamsAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
    });

    const capabilities = adapter.getCapabilities();
    expect(capabilities.supportsFullSync).toBe(true);
    expect(capabilities.supportsIncrementalSync).toBe(true);
    expect(capabilities.supportsWebhooks).toBe(true);
    expect(capabilities.rateLimitPerMinute).toBe(2000);
  });
});

// ============================================================================
// LinkedIn Learning Client Tests
// ============================================================================
describe('LinkedInLearningClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  it('should authenticate and fetch courses', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    const mockCoursesResponse = {
      elements: [
        {
          urn: 'course-123',
          title: { value: 'Introduction to Python', locale: { language: 'en', country: 'US' } },
          difficultyLevel: 'BEGINNER',
          timeToComplete: { duration: 2, unit: 'HOUR' },
          publishedAt: 1609459200000,
          lastUpdatedAt: 1609459200000,
          provider: 'LinkedIn Learning',
        },
      ],
      paging: { total: 1 },
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCoursesResponse,
      });

    const client = new LinkedInLearningClient(mockConfig);
    const result = await client.getCourses();

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].title.value).toBe('Introduction to Python');
  });

  it('should fetch enrollments with progress', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    const mockEnrollmentsResponse = {
      elements: [
        {
          learnerUrn: 'learner-123',
          courseUrn: 'course-123',
          enrolledAt: 1609459200000,
          status: 'IN_PROGRESS',
          progressPercentage: 50,
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEnrollmentsResponse,
      });

    const client = new LinkedInLearningClient(mockConfig);
    const result = await client.getEnrollments();

    expect(result.enrollments).toHaveLength(1);
    expect(result.enrollments[0].progressPercentage).toBe(50);
  });

  it('should verify credentials with health check', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      });

    const client = new LinkedInLearningClient(mockConfig);
    const health = await client.healthCheck();

    expect(health.status).toBe('ok');
  });
});

// ============================================================================
// LinkedIn Learning Adapter Tests
// ============================================================================
describe('LinkedInLearningAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new LinkedInLearningAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });

    expect(adapter).toBeDefined();
  });

  it('should report correct capabilities', () => {
    const adapter = new LinkedInLearningAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });

    const capabilities = adapter.getCapabilities();
    expect(capabilities.supportsFullSync).toBe(true);
    expect(capabilities.supportsIncrementalSync).toBe(true);
    expect(capabilities.supportsWebhooks).toBe(false);
  });
});

// ============================================================================
// SharePoint Client Tests
// ============================================================================
describe('SharePointClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    tenantId: 'test-tenant-id',
  };

  it('should authenticate and fetch sites', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    const mockSitesResponse = {
      value: [
        {
          id: 'site-123',
          displayName: 'HR Site',
          name: 'hr',
          webUrl: 'https://contoso.sharepoint.com/sites/hr',
          createdDateTime: '2024-01-01T00:00:00Z',
          lastModifiedDateTime: '2024-01-02T00:00:00Z',
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSitesResponse,
      });

    const client = new SharePointClient(mockConfig);
    const result = await client.getSites();

    expect(result.sites).toHaveLength(1);
    expect(result.sites[0].displayName).toBe('HR Site');
  });

  it('should fetch files from a library', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    const mockFilesResponse = {
      value: [
        {
          id: 'file-123',
          name: 'document.pdf',
          webUrl: 'https://contoso.sharepoint.com/sites/hr/documents/document.pdf',
          size: 1024000,
          createdDateTime: '2024-01-01T00:00:00Z',
          lastModifiedDateTime: '2024-01-02T00:00:00Z',
          file: { mimeType: 'application/pdf' },
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFilesResponse,
      });

    const client = new SharePointClient(mockConfig);
    const result = await client.getFiles('drive-123');

    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe('document.pdf');
    expect(result.files[0].size).toBe(1024000);
  });

  it('should handle rate limiting', async () => {
    const mockAuthResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
      });

    const client = new SharePointClient(mockConfig);

    await expect(client.getSites()).rejects.toThrow('Rate limit exceeded');
  });
});

// ============================================================================
// SharePoint Adapter Tests
// ============================================================================
describe('SharePointAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new SharePointAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
    });

    expect(adapter).toBeDefined();
  });

  it('should report correct capabilities', () => {
    const adapter = new SharePointAdapter('org-123', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
    });

    const capabilities = adapter.getCapabilities();
    expect(capabilities.supportsFullSync).toBe(true);
    expect(capabilities.supportsIncrementalSync).toBe(true);
    expect(capabilities.supportsWebhooks).toBe(true);
    expect(capabilities.rateLimitPerMinute).toBe(2000);
  });
});
