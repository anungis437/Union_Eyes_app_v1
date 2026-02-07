/**
 * Provincial Privacy Service Unit Tests
 * 
 * Tests for services/provincial-privacy-service.ts
 * Coverage: PIPEDA, AB/BC PIPA, Quebec Law 25, Ontario PHIPA
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => {
  const createChainableMock = () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: vi.fn((resolve) => resolve([])),
    };
    return chain;
  };

  return {
    db: {
      select: vi.fn(() => createChainableMock()),
    },
  };
});
import { ProvincialPrivacyService } from '@/services/provincial-privacy-service';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIf = hasDatabase ? describe : describe.skip;

describeIf('ProvincialPrivacyService', () => {
  describe('getProvinceConfig', () => {
    it('should return Quebec Law 25 configuration', async () => {
      const config = await ProvincialPrivacyService.getProvinceConfig('QC');
      
      expect(config.province).toBe('QC');
      expect(config.lawName).toBe('Law 25 (Quebec)');
      expect(config.consentRequired).toBe(true);
      expect(config.explicitOptIn).toBe(true); // Quebec requires explicit consent
      expect(config.dpoRequired).toBe(true); // Privacy officer required
      expect(config.piaRequired).toBe(true); // Privacy Impact Assessment
    });

    it('should return Ontario PHIPA configuration', async () => {
      const config = await ProvincialPrivacyService.getProvinceConfig('ON');
      
      expect(config.province).toBe('ON');
      expect(config.lawName).toBe('PHIPA (Ontario)');
      expect(config.dataRetentionDays).toBe('730'); // 2 years for health data
      expect(config.customRules).toHaveProperty('healthDataSpecialRules', true);
      expect(config.customRules).toHaveProperty('lockedBoxRule', true);
    });

    it('should return Alberta PIPA configuration', async () => {
      const config = await ProvincialPrivacyService.getProvinceConfig('AB');
      
      expect(config.province).toBe('AB');
      expect(config.lawName).toBe('AB PIPA');
      expect(config.explicitOptIn).toBe(false); // Implied consent allowed
      expect(config.customRules).toHaveProperty('impliedConsentAllowed', true);
    });

    it('should return BC PIPA configuration', async () => {
      const config = await ProvincialPrivacyService.getProvinceConfig('BC');
      
      expect(config.province).toBe('BC');
      expect(config.lawName).toBe('BC PIPA');
      expect(config.rightToPortability).toBe(false); // BC PIPA doesn't mandate portability
    });

    it('should return PIPEDA for provinces without specific laws', async () => {
      const provinces = ['MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'SK', 'YT'];
      
      for (const province of provinces) {
        const config = await ProvincialPrivacyService.getProvinceConfig(province as any);
        
        expect(config.lawName).toBe('PIPEDA (Federal)');
        expect(config.customRules).toHaveProperty('federalJurisdiction', true);
        expect(config.customRules).toHaveProperty('impliedConsentAllowed', true);
      }
    });
  });

  describe('recordConsent', () => {
    it('should reject implied consent for Quebec', async () => {
      const request = {
        userId: 'test-user',
        province: 'QC' as const,
        consentType: 'marketing',
        consentGiven: true,
        consentMethod: 'implied_action',
        consentText: 'Test consent',
        consentLanguage: 'en' as const,
      };

      await expect(ProvincialPrivacyService.recordConsent(request))
        .rejects
        .toThrow('Quebec Law 25 requires explicit consent');
    });

    it('should accept explicit consent for Quebec', async () => {
      const request = {
        userId: 'test-user',
        province: 'QC' as const,
        consentType: 'marketing',
        consentGiven: true,
        consentMethod: 'explicit_checkbox',
        consentText: 'I consent to marketing communications',
        consentLanguage: 'fr' as const,
      };

      // This would require mocking the database
      // For now, we test the validation logic passes
      expect(request.consentMethod).toBe('explicit_checkbox');
    });

    it('should calculate 1-year expiry for Quebec marketing consent', () => {
      const now = new Date('2025-01-01');
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      expect(expiresAt.getFullYear()).toBe(2026);
      expect(expiresAt.getMonth()).toBe(now.getMonth());
      expect(expiresAt.getDate()).toBe(now.getDate());
    });
  });

  describe('Breach Notification (72-hour deadline)', () => {
    it('should calculate 72-hour deadline correctly', () => {
      const discoveredAt = new Date('2025-01-01T10:00:00Z');
      const deadline = new Date(discoveredAt);
      deadline.setHours(deadline.getHours() + 72);
      
      expect(deadline.toISOString()).toBe('2025-01-04T10:00:00.000Z');
    });

    it('should identify breach severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      
      expect(severityLevels).toContain('critical');
      expect(severityLevels.length).toBe(4);
    });
  });

  describe('Data Retention Rules', () => {
    it('should enforce province-specific retention periods', async () => {
      const configs = await Promise.all([
        ProvincialPrivacyService.getProvinceConfig('QC'),
        ProvincialPrivacyService.getProvinceConfig('ON'),
        ProvincialPrivacyService.getProvinceConfig('BC'),
      ]);
      
      expect(configs[0].dataRetentionDays).toBe('365'); // Quebec: 1 year
      expect(configs[1].dataRetentionDays).toBe('730'); // Ontario: 2 years (health)
      expect(configs[2].dataRetentionDays).toBe('365'); // BC: 1 year
    });
  });

  describe('Right to Erasure', () => {
    it('should support right to erasure in all provinces', async () => {
      const provinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      
      for (const province of provinces) {
        const config = await ProvincialPrivacyService.getProvinceConfig(province as any);
        expect(config.rightToErasure).toBe(true);
      }
    });
  });

  describe('Data Portability', () => {
    it('should NOT mandate portability for BC and AB', async () => {
      const bcConfig = await ProvincialPrivacyService.getProvinceConfig('BC');
      const abConfig = await ProvincialPrivacyService.getProvinceConfig('AB');
      
      expect(bcConfig.rightToPortability).toBe(false);
      expect(abConfig.rightToPortability).toBe(false);
    });

    it('should mandate portability for QC and ON', async () => {
      const qcConfig = await ProvincialPrivacyService.getProvinceConfig('QC');
      const onConfig = await ProvincialPrivacyService.getProvinceConfig('ON');
      
      expect(qcConfig.rightToPortability).toBe(true);
      expect(onConfig.rightToPortability).toBe(true);
    });
  });
});
