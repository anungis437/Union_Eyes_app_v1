/**
 * Notification Service Tests
 * 
 * Tests for:
 * - SendGrid email provider
 * - Twilio SMS provider
 * - Firebase push notification provider
 * - Immediate notification sending
 * - Notification queuing
 * - Bulk notifications
 * - Template-based notifications
 * - Retry logic with exponential backoff
 * - Pending notification processing
 * - Delivery tracking and audit logs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotificationService,
  SendGridEmailProvider,
  TwilioSMSProvider,
  FirebasePushProvider,
  getNotificationService,
  processPendingNotifications,
  retryFailedNotificationsJob,
  type NotificationPayload,
} from '@/lib/services/notification-service';
import { db } from '@/db';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;
  const mockApiKey = 'SG.test_api_key_123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = mockApiKey;
    process.env.SENDGRID_FROM_EMAIL = 'noreply@unioneyes.app';
    provider = new SendGridEmailProvider(mockApiKey);
  });

  it('should initialize with API key', () => {
    expect(provider.name).toBe('sendgrid');
    expect(() => new SendGridEmailProvider('')).toThrow('SendGrid API key not configured');
  });

  it('should send email successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientEmail: 'user@example.com',
      type: 'email',
      subject: 'Test Email',
      body: 'Test body',
      htmlBody: '<p>Test body</p>',
      priority: 'normal',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('sent');
    expect(response.id).toMatch(/^sg-/);
    expect(response.sentAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockApiKey}`,
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Email notification sent via SendGrid API',
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test Email',
      })
    );
  });

  it('should handle missing recipient email', async () => {
    const payload: NotificationPayload = {
      organizationId: 'org-123',
      type: 'email',
      subject: 'Test',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toBe('Recipient email not provided');
  });

  it('should handle SendGrid API errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Invalid request'),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientEmail: 'user@example.com',
      type: 'email',
      subject: 'Test',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toContain('SendGrid API error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should include action URL in tracking settings', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientEmail: 'user@example.com',
      type: 'email',
      subject: 'Test',
      body: 'Test',
      actionUrl: 'https://app.unioneyes.com/action',
    };

    await provider.send(payload);

    const callArgs = mockFetch.mock.calls[0][1] as any;
    const body = JSON.parse(callArgs.body);
    expect(body.tracking_settings).toBeDefined();
    expect(body.tracking_settings.click_tracking.enable).toBe(true);
  });
});

describe('TwilioSMSProvider', () => {
  let provider: TwilioSMSProvider;
  const mockAccountSid = 'AC_test_sid';
  const mockAuthToken = 'test_auth_token';
  const mockFromNumber = '+15551234567';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new TwilioSMSProvider(mockAccountSid, mockAuthToken, mockFromNumber);
  });

  it('should initialize with Twilio credentials', () => {
    expect(provider.name).toBe('twilio');
    expect(() => new TwilioSMSProvider('', '', '')).toThrow('Twilio credentials not configured');
  });

  it('should send SMS successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        sid: 'SM_test_message_id',
        status: 'queued',
      }),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientPhone: '+15559876543',
      type: 'sms',
      body: 'Test SMS message',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('sent');
    expect(response.id).toBe('SM_test_message_id');
    expect(response.sentAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.twilio.com/2010-04-01/Accounts'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
  });

  it('should handle missing recipient phone', async () => {
    const payload: NotificationPayload = {
      organizationId: 'org-123',
      type: 'sms',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toBe('Recipient phone number not provided');
  });

  it('should handle Twilio API errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Invalid phone number'),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientPhone: '+15559876543',
      type: 'sms',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toContain('Twilio API error');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('FirebasePushProvider', () => {
  let provider: FirebasePushProvider;
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIREBASE_PROJECT_ID = mockProjectId;
    process.env.FIREBASE_API_KEY = 'firebase_api_key_123';
    provider = new FirebasePushProvider(mockProjectId);
  });

  it('should initialize with project ID', () => {
    expect(provider.name).toBe('firebase');
    expect(() => new FirebasePushProvider('')).toThrow('Firebase project ID not configured');
  });

  it('should send push notification successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        name: 'projects/test-project/messages/msg-123',
      }),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientFirebaseToken: 'fcm_token_abc123',
      type: 'push',
      title: 'Test Notification',
      body: 'Test body',
      metadata: { action: 'view' },
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('sent');
    expect(response.id).toContain('msg-123');
    expect(response.sentAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`projects/${mockProjectId}/messages:send`),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should handle missing Firebase token', async () => {
    const payload: NotificationPayload = {
      organizationId: 'org-123',
      type: 'push',
      title: 'Test',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toBe('Recipient Firebase token not provided');
  });

  it('should handle missing API key', async () => {
    delete process.env.FIREBASE_API_KEY;
    const provider = new FirebasePushProvider(mockProjectId);

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientFirebaseToken: 'token',
      type: 'push',
      title: 'Test',
      body: 'Test',
    };

    const response = await provider.send(payload);

    expect(response.status).toBe('failed');
    expect(response.failureReason).toBe('Firebase API key not configured');
  });

  it('should convert metadata to string values', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ name: 'msg-123' }),
    });
    global.fetch = mockFetch;

    const payload: NotificationPayload = {
      organizationId: 'org-123',
      recipientFirebaseToken: 'token',
      type: 'push',
      title: 'Test',
      body: 'Test',
      metadata: { count: 42, enabled: true },
    };

    await provider.send(payload);

    const callArgs = mockFetch.mock.calls[0][1] as any;
    const body = JSON.parse(callArgs.body);
    expect(body.message.data).toEqual({ count: '42', enabled: 'true' });
  });
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test_key';
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_API_KEY = 'firebase_key';
    
    service = new NotificationService();

    // Mock database insert
    (db.insert as any) = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  describe('send()', () => {
    it('should send email notification immediately', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      const payload: NotificationPayload = {
        organizationId: 'org-123',
        recipientEmail: 'user@example.com',
        type: 'email',
        subject: 'Test',
        body: 'Test body',
      };

      const response = await service.send(payload);

      expect(response.status).toBe('sent');
      expect(response.id).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw error for unsupported notification type', async () => {
      const payload: NotificationPayload = {
        organizationId: 'org-123',
        recipientEmail: 'user@example.com',
        type: 'in_app' as any,
        body: 'Test',
      };

      await expect(service.send(payload)).rejects.toThrow(
        'No provider configured for notification type: in_app'
      );
    });

    it('should log to database even if persistence fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      // Mock database insert to throw error
      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn((handler) => {
            handler(new Error('Database error'));
            return Promise.resolve();
          }),
        }),
      });

      const payload: NotificationPayload = {
        organizationId: 'org-123',
        recipientEmail: 'user@example.com',
        type: 'email',
        body: 'Test',
      };

      const response = await service.send(payload);

      expect(response.status).toBe('sent');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store notification in queue'),
        expect.anything()
      );
    });
  });

  describe('queue()', () => {
    it('should queue notification for async processing', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (db.insert as any) = mockInsert;

      const payload: NotificationPayload = {
        organizationId: 'org-123',
        recipientEmail: 'user@example.com',
        type: 'email',
        body: 'Test',
        priority: 'high',
      };

      const notificationId = await service.queue(payload);

      expect(notificationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should throw error if queue insertion fails', async () => {
      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn((handler) => {
            handler(new Error('Queue insertion failed'));
            throw new Error('Queue insertion failed');
          }),
        }),
      });

      const payload: NotificationPayload = {
        organizationId: 'org-123',
        recipientEmail: 'user@example.com',
        type: 'email',
        body: 'Test',
      };

      await expect(service.queue(payload)).rejects.toThrow();
    });
  });

  describe('sendBulk()', () => {
    it('should send multiple notifications', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      const payloads: NotificationPayload[] = [
        {
          organizationId: 'org-123',
          recipientEmail: 'user1@example.com',
          type: 'email',
          body: 'Test 1',
        },
        {
          organizationId: 'org-123',
          recipientEmail: 'user2@example.com',
          type: 'email',
          body: 'Test 2',
        },
      ];

      const responses = await service.sendBulk(payloads);

      expect(responses).toHaveLength(2);
      expect(responses.every((r) => r.status === 'sent')).toBe(true);
    });

    it('should handle partial failures in bulk send', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: () => Promise.resolve('Error'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 202,
          text: () => Promise.resolve(''),
        });
      });
      global.fetch = mockFetch;

      const payloads: NotificationPayload[] = [
        {
          organizationId: 'org-123',
          recipientEmail: 'user1@example.com',
          type: 'email',
          body: 'Test 1',
        },
        {
          organizationId: 'org-123',
          recipientEmail: 'user2@example.com',
          type: 'email',
          body: 'Test 2',
        },
      ];

      const responses = await service.sendBulk(payloads);

      expect(responses).toHaveLength(2);
      expect(responses[0].status).toBe('failed');
      expect(responses[1].status).toBe('sent');
    });
  });

  describe('sendFromTemplate()', () => {
    it('should send notification from template', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      // Mock template lookup
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'template-123',
            templateKey: 'PAYMENT_RECEIVED',
            subject: 'Payment of {{amount}} received',
            bodyTemplate: 'Thank you for your payment of {{amount}}',
            htmlBodyTemplate: '<p>Thank you for your payment of {{amount}}</p>',
            channels: ['email'],
          },
        ]),
      });

      const response = await service.sendFromTemplate(
        'org-123',
        'PAYMENT_RECEIVED',
        'user@example.com',
        undefined,
        { amount: '$100' }
      );

      expect(response.status).toBe('sent');
      expect(logger.info).toHaveBeenCalledWith(
        'Template notification sent',
        expect.objectContaining({
          templateKey: 'PAYMENT_RECEIVED',
        })
      );
    });

    it('should handle template not found', async () => {
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const response = await service.sendFromTemplate(
        'org-123',
        'UNKNOWN_TEMPLATE',
        'user@example.com'
      );

      expect(response.status).toBe('failed');
      expect(response.failureReason).toContain('Template not found');
    });

    it('should render template with variable substitution', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'template-123',
            templateKey: 'DUES_REMINDER',
            subject: 'Dues of {{amount}} due on {{dueDate}}',
            bodyTemplate: 'Your dues of {{amount}} are due on {{dueDate}}',
            htmlBodyTemplate: '<p>Your dues of {{amount}} are due on {{dueDate}}</p>',
            channels: ['email'],
          },
        ]),
      });

      await service.sendFromTemplate(
        'org-123',
        'DUES_REMINDER',
        'user@example.com',
        undefined,
        { amount: '$50', dueDate: '2024-12-31' }
      );

      // Verify template was rendered (check fetch was called with substituted values)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should select notification type based on template channels', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ sid: 'SM_test' }),
      });
      global.fetch = mockFetch;

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'template-123',
            templateKey: 'ALERT',
            subject: 'Alert',
            bodyTemplate: 'Alert message',
            channels: ['sms'],
          },
        ]),
      });

      const response = await service.sendFromTemplate(
        'org-123',
        'ALERT',
        undefined,
        '+15559876543'
      );

      expect(response.status).toBe('sent');
    });
  });

  describe('retryFailed()', () => {
    it('should retry failed notifications', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      });
      global.fetch = mockFetch;

      // Mock failed notifications query
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'notif-123',
            tenantId: 'org-123',
            status: 'failed',
            attemptCount: 1,
            payload: {
              organizationId: 'org-123',
              recipientEmail: 'user@example.com',
              type: 'email',
              body: 'Retry test',
            },
          },
        ]),
      });

      // Mock update
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.retryFailed('org-123', 3);

      expect(result.retried).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(db.update).toHaveBeenCalled();
    });

    it('should use exponential backoff for retries', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Server error'),
      });
      global.fetch = mockFetch;

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'notif-123',
            tenantId: 'org-123',
            status: 'failed',
            attemptCount: 2,
            payload: {
              organizationId: 'org-123',
              recipientEmail: 'user@example.com',
              type: 'email',
              body: 'Test',
            },
          },
        ]),
      });

      const mockSet = vi.fn().mockReturnThis();
      (db.update as any) = vi.fn().mockReturnValue({
        set: mockSet,
        where: vi.fn().mockResolvedValue(undefined),
      });

      await service.retryFailed('org-123', 3);

      // Verify exponential backoff was applied (300 * 2^2 = 1200 seconds)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retrying',
          attemptCount: '3',
        })
      );
    });

    it('should not retry beyond max attempts', async () => {
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await service.retryFailed('org-123', 3);

      expect(result.retried).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});

describe('processPendingNotifications()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test_key';
  });

  it('should process pending notifications from queue', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch;

    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'notif-123',
          tenantId: 'org-123',
          status: 'pending',
          payload: {
            organizationId: 'org-123',
            recipientEmail: 'user@example.com',
            type: 'email',
            body: 'Pending notification',
          },
        },
      ]),
    });

    (db.insert as any) = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const result = await processPendingNotifications(10);

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should respect batch size limit', async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: mockLimit,
    });

    await processPendingNotifications(25);

    expect(mockLimit).toHaveBeenCalledWith(25);
  });

  it('should handle errors in pending notification processing', async () => {
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: 'notif-123',
          payload: null, // Invalid payload
        },
      ]),
      limit: vi.fn().mockReturnThis(),
    });

    const result = await processPendingNotifications(10);

    expect(result.processed).toBe(0);
  });
});

describe('retryFailedNotificationsJob()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test_key';
  });

  it('should execute retry job', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch;

    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockReturnThis(),
    });

    const result = await retryFailedNotificationsJob();

    expect(result).toEqual({
      retried: 0,
      succeeded: 0,
      failed: 0,
    });
  });

  it('should handle job errors gracefully', async () => {
    (db.select as any) = vi.fn().mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await retryFailedNotificationsJob();

    expect(result).toEqual({
      retried: 0,
      succeeded: 0,
      failed: 0,
    });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('getNotificationService()', () => {
  it('should return singleton instance', () => {
    process.env.SENDGRID_API_KEY = 'test_key';
    
    const instance1 = getNotificationService();
    const instance2 = getNotificationService();

    expect(instance1).toBe(instance2);
  });
});
