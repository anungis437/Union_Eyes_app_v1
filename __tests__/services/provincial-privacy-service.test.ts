import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvincialPrivacyService } from '@/services/provincial-privacy-service';
import type { ConsentRequest, BreachNotification, Province } from '@/services/provincial-privacy-service';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '@/db';

describe('ProvincialPrivacyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProvinceConfig', () => {
    it('should return config from database if exists', async () => {
      const mockConfig = {
        province: 'QC' as Province,
        lawName: 'Law 25 (Quebec)',
        consentRequired: true,
        explicitOptIn: true,
      };

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockConfig]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getProvinceConfig('QC');

      expect(result).toEqual(mockConfig);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return default config for Quebec if not in database', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getProvinceConfig('QC');

      expect(result.province).toBe('QC');
      expect(result.lawName).toBe('Law 25 (Quebec)');
      expect(result.explicitOptIn).toBe(true);
      expect(result.customRules.frenchLanguageRequired).toBe(true);
    });

    it('should return default config for Ontario with PHIPA rules', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getProvinceConfig('ON');

      expect(result.province).toBe('ON');
      expect(result.lawName).toBe('PHIPA (Ontario)');
      expect(result.customRules.healthDataSpecialRules).toBe(true);
      expect(result.customRules.lockedBoxRule).toBe(true);
    });

    it('should return default config for BC PIPA', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getProvinceConfig('BC');

      expect(result.province).toBe('BC');
      expect(result.lawName).toBe('BC PIPA');
      expect(result.rightToPortability).toBe(false);
      expect(result.customRules.impliedConsentAllowed).toBe(true);
    });

    it('should return default config for Alberta PIPA', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getProvinceConfig('AB');

      expect(result.province).toBe('AB');
      expect(result.lawName).toBe('AB PIPA');
      expect(result.customRules.impliedConsentAllowed).toBe(true);
    });

    it('should return PIPEDA config for federal provinces (MB, NB, NL, NS, NT, NU, PE, SK, YT)', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const testProvinces: Province[] = ['MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'SK', 'YT'];

      for (const province of testProvinces) {
        const result = await ProvincialPrivacyService.getProvinceConfig(province);

        expect(result.province).toBe(province);
        expect(result.lawName).toBe('PIPEDA (Federal)');
        expect(result.customRules.federalJurisdiction).toBe(true);
        expect(result.customRules.impliedConsentAllowed).toBe(true);
      }
    });
  });

  describe('recordConsent', () => {
    it('should record valid consent', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'consent-123', userId: 'user-123' }]),
      };

      (db.select as any).mockReturnValue(mockDb);
      (db.insert as any).mockReturnValue(mockInsertDb);

      const request: ConsentRequest = {
        userId: 'user-123',
        province: 'ON',
        consentType: 'data_collection',
        consentGiven: true,
        consentMethod: 'explicit_checkbox',
        consentText: 'I agree to data collection',
        consentLanguage: 'en',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await ProvincialPrivacyService.recordConsent(request);

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertDb.values).toHaveBeenCalled();
    });

    it('should reject implied consent for Quebec (Law 25)', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const request: ConsentRequest = {
        userId: 'user-123',
        province: 'QC',
        consentType: 'marketing',
        consentGiven: true,
        consentMethod: 'implied_action',
        consentText: 'Implied consent',
        consentLanguage: 'fr',
      };

      await expect(ProvincialPrivacyService.recordConsent(request)).rejects.toThrow(
        'Quebec Law 25 requires explicit consent, not implied consent'
      );
    });

    it('should set expiry for Quebec marketing consent (1 year)', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'consent-123', expiresAt: new Date() }]),
      };

      (db.select as any).mockReturnValue(mockDb);
      (db.insert as any).mockReturnValue(mockInsertDb);

      const request: ConsentRequest = {
        userId: 'user-123',
        province: 'QC',
        consentType: 'marketing',
        consentGiven: true,
        consentMethod: 'explicit_checkbox',
        consentText: 'I agree to marketing',
        consentLanguage: 'fr',
      };

      await ProvincialPrivacyService.recordConsent(request);

      expect(mockInsertDb.values).toHaveBeenCalled();
      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.expiresAt).toBeDefined();
    });

    it('should accept explicit consent for Quebec', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'consent-123' }]),
      };

      (db.select as any).mockReturnValue(mockDb);
      (db.insert as any).mockReturnValue(mockInsertDb);

      const request: ConsentRequest = {
        userId: 'user-123',
        province: 'QC',
        consentType: 'data_collection',
        consentGiven: true,
        consentMethod: 'explicit_checkbox',
        consentText: 'Consentement explicite',
        consentLanguage: 'fr',
      };

      const result = await ProvincialPrivacyService.recordConsent(request);

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('hasValidConsent', () => {
    it('should return true for valid consent', async () => {
      const mockConsent = {
        userId: 'user-123',
        province: 'ON',
        consentType: 'data_collection',
        consentGiven: true,
        revokedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockConsent]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.hasValidConsent('user-123', 'ON', 'data_collection');

      expect(result).toBe(true);
    });

    it('should return false when no consent exists', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.hasValidConsent('user-123', 'ON', 'data_collection');

      expect(result).toBe(false);
    });

    it('should return false when consent is revoked', async () => {
      const mockConsent = {
        userId: 'user-123',
        province: 'ON',
        consentType: 'data_collection',
        consentGiven: true,
        revokedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
      };

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockConsent]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.hasValidConsent('user-123', 'ON', 'data_collection');

      expect(result).toBe(false);
    });

    it('should return false when consent has expired', async () => {
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1);

      const mockConsent = {
        userId: 'user-123',
        province: 'QC',
        consentType: 'marketing',
        consentGiven: true,
        revokedAt: null,
        expiresAt: expiredDate,
        createdAt: new Date(),
      };

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockConsent]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.hasValidConsent('user-123', 'QC', 'marketing');

      expect(result).toBe(false);
    });

    it('should return true for non-expired consent', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockConsent = {
        userId: 'user-123',
        province: 'QC',
        consentType: 'marketing',
        consentGiven: true,
        revokedAt: null,
        expiresAt: futureDate,
        createdAt: new Date(),
      };

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockConsent]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.hasValidConsent('user-123', 'QC', 'marketing');

      expect(result).toBe(true);
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const mockDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db.update as any).mockReturnValue(mockDb);

      await ProvincialPrivacyService.revokeConsent('user-123', 'ON', 'marketing');

      expect(db.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('reportBreach', () => {
    it('should report a critical breach requiring regulator notification', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'breach-123' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      // Mock the triggerUrgentBreachNotification side effects

      const breach: BreachNotification = {
        breachType: 'unauthorized_access',
        severity: 'critical',
        affectedProvince: 'QC',
        affectedUserCount: 1000,
        dataTypes: ['email', 'sin', 'password'],
        breachDescription: 'Unauthorized database access',
        discoveredAt: new Date(),
        reportedBy: 'admin-123',
      };

      const result = await ProvincialPrivacyService.reportBreach(breach);

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertDb.values).toHaveBeenCalled();

      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.regulatorNotificationRequired).toBe(true);
      expect(valuesCall.severity).toBe('critical');

    });

    it('should report a low severity breach not requiring regulator notification', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'breach-124' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const breach: BreachNotification = {
        breachType: 'minor_exposure',
        severity: 'low',
        affectedProvince: 'BC',
        affectedUserCount: 10,
        dataTypes: ['email'],
        breachDescription: 'Minor email exposure',
        discoveredAt: new Date(),
        reportedBy: 'admin-123',
      };

      const result = await ProvincialPrivacyService.reportBreach(breach);

      expect(result).toBeDefined();
      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.regulatorNotificationRequired).toBe(false);
      expect(valuesCall.severity).toBe('low');
    });

    it('should require regulator notification for breaches with sensitive data types', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'breach-125' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const sensitiveDataTypes = ['sin', 'health', 'biometric', 'financial', 'password'];

      for (const dataType of sensitiveDataTypes) {
        const breach: BreachNotification = {
          breachType: 'data_exposure',
          severity: 'medium',
          affectedUserCount: 50,
          dataTypes: [dataType],
          breachDescription: `Exposure of ${dataType}`,
          discoveredAt: new Date(),
          reportedBy: 'admin-123',
        };

        await ProvincialPrivacyService.reportBreach(breach);

        const valuesCall = mockInsertDb.values.mock.calls[mockInsertDb.values.mock.calls.length - 1][0];
        expect(valuesCall.regulatorNotificationRequired).toBe(true);
      }
    });

    it('should require regulator notification for breaches affecting over 500 users', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'breach-126' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const breach: BreachNotification = {
        breachType: 'data_exposure',
        severity: 'medium',
        affectedUserCount: 501,
        dataTypes: ['email'],
        breachDescription: 'Large scale email exposure',
        discoveredAt: new Date(),
        reportedBy: 'admin-123',
      };

      await ProvincialPrivacyService.reportBreach(breach);

      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.regulatorNotificationRequired).toBe(true);
    });

    it('should trigger urgent notification for breaches within 24 hours of deadline', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'breach-127' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set discovered time to 50 hours ago (within 24 hours of 72-hour deadline)
      const discoveredAt = new Date();
      discoveredAt.setHours(discoveredAt.getHours() - 50);

      const breach: BreachNotification = {
        breachType: 'urgent_breach',
        severity: 'high',
        affectedUserCount: 100,
        dataTypes: ['email', 'phone'],
        breachDescription: 'Urgent breach',
        discoveredAt,
        reportedBy: 'admin-123',
      };

      await ProvincialPrivacyService.reportBreach(breach);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('URGENT: Breach breach-127 approaching 72-hour notification deadline')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('markBreachNotificationSent', () => {
    it('should mark user notification as sent and check deadline', async () => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 10 * 60 * 60 * 1000); // 10 hours from now

      const mockBreach = {
        id: 'breach-123',
        notificationDeadline: deadline,
      };

      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockSelectDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBreach]),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);
      (db.select as any).mockReturnValue(mockSelectDb);

      await ProvincialPrivacyService.markBreachNotificationSent('breach-123', 'users');

      expect(db.update).toHaveBeenCalledTimes(2);
      expect(mockUpdateDb.set).toHaveBeenCalledTimes(2);
    });

    it('should mark regulator notification as sent and check deadline', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours ago

      const mockBreach = {
        id: 'breach-124',
        notificationDeadline: pastDeadline,
      };

      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockSelectDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBreach]),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);
      (db.select as any).mockReturnValue(mockSelectDb);

      await ProvincialPrivacyService.markBreachNotificationSent('breach-124', 'regulator');

      expect(db.update).toHaveBeenCalledTimes(2);
      expect(mockUpdateDb.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('logDataHandling', () => {
    it('should log data handling action with all parameters', async () => {
      const mockInsertDb = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      await ProvincialPrivacyService.logDataHandling({
        userId: 'user-123',
        province: 'QC',
        actionType: 'access',
        dataCategory: 'personal',
        purpose: 'User profile update',
        legalBasis: 'consent',
        performedBy: 'admin-123',
        sharedWith: 'Third Party Corp',
        ipAddress: '192.168.1.1',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertDb.values).toHaveBeenCalled();

      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.userId).toBe('user-123');
      expect(valuesCall.province).toBe('QC');
      expect(valuesCall.actionType).toBe('access');
      expect(valuesCall.sharedWith).toBe('Third Party Corp');
    });

    it('should log data handling action without optional parameters', async () => {
      const mockInsertDb = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      await ProvincialPrivacyService.logDataHandling({
        userId: 'user-456',
        province: 'ON',
        actionType: 'delete',
        dataCategory: 'sensitive',
        purpose: 'GDPR erasure request',
        legalBasis: 'legal_obligation',
        performedBy: 'system',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertDb.values).toHaveBeenCalled();

      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.userId).toBe('user-456');
      expect(valuesCall.sharedWith).toBeUndefined();
      expect(valuesCall.ipAddress).toBeUndefined();
    });
  });

  describe('createDSAR', () => {
    it('should create a data access request', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'dsar-123', status: 'pending' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const result = await ProvincialPrivacyService.createDSAR({
        userId: 'user-123',
        requestType: 'access',
        province: 'QC',
        requestDescription: 'I want to see all my data',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create an erasure request', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'dsar-124', requestType: 'erasure' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const result = await ProvincialPrivacyService.createDSAR({
        userId: 'user-456',
        requestType: 'erasure',
        province: 'ON',
        requestDescription: 'Please delete all my data',
        requestedDataTypes: ['personal', 'sensitive'],
      });

      expect(result).toBeDefined();
      expect(result.requestType).toBe('erasure');
    });

    it('should create a portability request', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'dsar-125', requestType: 'portability' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      const result = await ProvincialPrivacyService.createDSAR({
        userId: 'user-789',
        requestType: 'portability',
        province: 'BC',
      });

      expect(result).toBeDefined();
      expect(result.requestType).toBe('portability');
    });

    it('should set 30-day response deadline', async () => {
      const mockInsertDb = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'dsar-126' }]),
      };

      (db.insert as any).mockReturnValue(mockInsertDb);

      await ProvincialPrivacyService.createDSAR({
        userId: 'user-999',
        requestType: 'rectification',
        province: 'AB',
      });

      expect(mockInsertDb.values).toHaveBeenCalled();
      const valuesCall = mockInsertDb.values.mock.calls[0][0];
      expect(valuesCall.responseDeadline).toBeDefined();
      expect(valuesCall.status).toBe('pending');
    });
  });

  describe('updateDSARStatus', () => {
    it('should update DSAR to in_progress status', async () => {
      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);

      await ProvincialPrivacyService.updateDSARStatus('dsar-123', 'in_progress', 'admin-123');

      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateDb.set).toHaveBeenCalled();

      const setCall = mockUpdateDb.set.mock.calls[0][0];
      expect(setCall.status).toBe('in_progress');
      expect(setCall.assignedTo).toBe('admin-123');
    });

    it('should update DSAR to completed and check deadline', async () => {
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 10);

      const mockDsar = {
        id: 'dsar-123',
        responseDeadline: futureDeadline,
      };

      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockSelectDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDsar]),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);
      (db.select as any).mockReturnValue(mockSelectDb);

      await ProvincialPrivacyService.updateDSARStatus('dsar-123', 'completed');

      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateDb.set).toHaveBeenCalled();

      const setCall = mockUpdateDb.set.mock.calls[0][0];
      expect(setCall.status).toBe('completed');
      expect(setCall.respondedAt).toBeDefined();
      expect(setCall.deadlineMet).toBe(true);
    });

    it('should mark deadline as missed if completed after deadline', async () => {
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 10);

      const mockDsar = {
        id: 'dsar-124',
        responseDeadline: pastDeadline,
      };

      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockSelectDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDsar]),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);
      (db.select as any).mockReturnValue(mockSelectDb);

      await ProvincialPrivacyService.updateDSARStatus('dsar-124', 'completed');

      const setCall = mockUpdateDb.set.mock.calls[0][0];
      expect(setCall.deadlineMet).toBe(false);
    });

    it('should update DSAR to denied status', async () => {
      const mockUpdateDb = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db.update as any).mockReturnValue(mockUpdateDb);

      await ProvincialPrivacyService.updateDSARStatus('dsar-125', 'denied');

      expect(db.update).toHaveBeenCalled();
      const setCall = mockUpdateDb.set.mock.calls[0][0];
      expect(setCall.status).toBe('denied');
    });
  });

  describe('getOverdueDSARs', () => {
    it('should return overdue DSARs', async () => {
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 5);

      const mockDsars = [
        { id: 'dsar-123', status: 'pending', responseDeadline: pastDeadline },
        { id: 'dsar-124', status: 'pending', responseDeadline: pastDeadline },
      ];

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDsars),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getOverdueDSARs();

      expect(result).toHaveLength(2);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return empty array when no overdue DSARs', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getOverdueDSARs();

      expect(result).toHaveLength(0);
    });
  });

  describe('getBreachesApproachingDeadline', () => {
    it('should return breaches approaching 24-hour deadline', async () => {
      const soon = new Date();
      soon.setHours(soon.getHours() + 12);

      const mockBreaches = [
        { id: 'breach-123', notificationDeadline: soon, usersNotifiedAt: null },
      ];

      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockBreaches),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getBreachesApproachingDeadline();

      expect(result).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return empty array when no approaching breaches', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockDb);

      const result = await ProvincialPrivacyService.getBreachesApproachingDeadline();

      expect(result).toHaveLength(0);
    });
  });
});
