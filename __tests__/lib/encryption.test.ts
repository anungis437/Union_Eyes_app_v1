/**
 * Encryption Service Tests
 * 
 * Tests for lib/encryption.ts - Azure Key Vault integration
 * 
 * Coverage:
 * - SIN encryption/decryption
 * - Validation and formatting
 * - Error handling
 * - Audit logging
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

let encryptSIN: typeof import('@/lib/encryption').encryptSIN;
let decryptSIN: typeof import('@/lib/encryption').decryptSIN;
let formatSINForDisplay: typeof import('@/lib/encryption').formatSINForDisplay;
let migrateSINToEncrypted: typeof import('@/lib/encryption').migrateSINToEncrypted;
let generateEncryptionKey: typeof import('@/lib/encryption').generateEncryptionKey;
let encryptionService: typeof import('@/lib/encryption').encryptionService;

beforeAll(async () => {
  process.env.TEST_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  const mod = await import('@/lib/encryption');
  encryptSIN = mod.encryptSIN;
  decryptSIN = mod.decryptSIN;
  formatSINForDisplay = mod.formatSINForDisplay;
  migrateSINToEncrypted = mod.migrateSINToEncrypted;
  generateEncryptionKey = mod.generateEncryptionKey;
  encryptionService = mod.encryptionService;
});

describe('Encryption Service', () => {
  describe('generateEncryptionKey', () => {
    it('should generate 32-byte base64 key', () => {
      const key = generateEncryptionKey();
      const buffer = Buffer.from(key, 'base64');
      
      expect(buffer.length).toBe(32); // 256 bits
      expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/); // Valid base64
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptSIN and decryptSIN', () => {
    it('should encrypt and decrypt valid SIN', async () => {
      const plainSIN = '123456789';
      
      const encrypted = await encryptSIN(plainSIN);
      const decrypted = await decryptSIN(encrypted);
      
      expect(decrypted).toBe(plainSIN);
    });

    it('should handle SIN with spaces and dashes', async () => {
      const formattedSIN = '123-456-789';
      const cleanSIN = '123456789';
      
      const encrypted = await encryptSIN(formattedSIN);
      const decrypted = await decryptSIN(encrypted);
      
      expect(decrypted).toBe(cleanSIN); // Should strip formatting
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plainSIN = '987654321';
      
      const encrypted1 = await encryptSIN(plainSIN);
      const encrypted2 = await encryptSIN(plainSIN);
      
      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But decrypt to same value
      const decrypted1 = await decryptSIN(encrypted1);
      const decrypted2 = await decryptSIN(encrypted2);
      
      expect(decrypted1).toBe(plainSIN);
      expect(decrypted2).toBe(plainSIN);
    });

    it('should reject invalid SIN format', async () => {
      await expect(encryptSIN('12345')).rejects.toThrow('Invalid SIN format');
      await expect(encryptSIN('ABC-DEF-GHI')).rejects.toThrow('Invalid SIN format');
      await expect(encryptSIN('')).rejects.toThrow('Invalid SIN format');
    });

    it('should reject empty encrypted SIN', async () => {
      await expect(decryptSIN('')).rejects.toThrow('No encrypted SIN provided');
    });

    it('should validate decrypted SIN format', async () => {
      // This tests internal validation after decryption
      const plainSIN = '111222333';
      const encrypted = await encryptSIN(plainSIN);
      const decrypted = await decryptSIN(encrypted);
      
      expect(decrypted).toMatch(/^\d{9}$/);
    });
  });

  describe('formatSINForDisplay', () => {
    it('should mask plaintext SIN to last 4 digits', async () => {
      const sin = '123456789';
      const masked = await formatSINForDisplay(sin, false);
      
      expect(masked).toBe('***-***-6789');
    });

    it('should decrypt and mask encrypted SIN', async () => {
      const plainSIN = '987654321';
      const encrypted = await encryptSIN(plainSIN);
      
      const masked = await formatSINForDisplay(encrypted, true);
      
      expect(masked).toBe('***-***-4321');
    });

    it('should handle empty SIN', async () => {
      const masked = await formatSINForDisplay('', false);
      
      expect(masked).toBe('***-***-****');
    });

    it('should handle invalid encrypted data gracefully', async () => {
      const masked = await formatSINForDisplay('INVALID_DATA', true);
      
      expect(masked).toBe('***-***-****');
    });
  });

  describe('migrateSINToEncrypted', () => {
    it('should encrypt plaintext SIN', async () => {
      const plainSIN = '555666777';
      
      const encrypted = await migrateSINToEncrypted(plainSIN);
      const decrypted = await decryptSIN(encrypted);
      
      expect(decrypted).toBe(plainSIN);
    });

    it('should detect already encrypted SIN', async () => {
      const plainSIN = '888999000';
      const encrypted = await encryptSIN(plainSIN);
      
      // Should not re-encrypt
      const result = await migrateSINToEncrypted(encrypted);
      
      expect(result).toBe(encrypted);
    });

    it('should reject empty SIN', async () => {
      await expect(migrateSINToEncrypted('')).rejects.toThrow('No SIN to migrate');
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted data', async () => {
      const plainSIN = '111222333';
      const encrypted = await encryptSIN(plainSIN);
      
      const isEnc = encryptionService.isEncrypted(encrypted);
      
      expect(isEnc).toBe(true);
    });

    it('should detect plaintext data', () => {
      const isEnc = encryptionService.isEncrypted('123456789');
      
      expect(isEnc).toBe(false);
    });

    it('should handle invalid base64', () => {
      const isEnc = encryptionService.isEncrypted('NOT_BASE64!!!');
      
      expect(isEnc).toBe(false);
    });
  });

  describe('hash', () => {
    it('should create consistent hash', () => {
      const plainSIN = '444555666';
      
      const hash1 = encryptionService.hash(plainSIN);
      const hash2 = encryptionService.hash(plainSIN);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should create different hashes for different inputs', () => {
      const hash1 = encryptionService.hash('111111111');
      const hash2 = encryptionService.hash('222222222');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should not reverse to original', () => {
      const plainSIN = '777888999';
      const hash = encryptionService.hash(plainSIN);
      
      expect(hash).not.toContain(plainSIN);
      expect(hash.length).toBe(64); // One-way hash
    });
  });

  describe('Encryption Service initialization', () => {
    it('should initialize without Azure Key Vault (fallback)', async () => {
      // With FALLBACK_ENCRYPTION_KEY set, should work
      const plainSIN = '999888777';
      
      const encrypted = await encryptSIN(plainSIN);
      const decrypted = await decryptSIN(encrypted);
      
      expect(decrypted).toBe(plainSIN);
    });
  });

  describe('Error handling', () => {
    it('should throw on decryption of invalid data', async () => {
      // Create valid base64 but invalid encrypted format
      const invalidEncrypted = Buffer.from('{"invalid": "format"}').toString('base64');
      
      await expect(decryptSIN(invalidEncrypted)).rejects.toThrow();
    });

    it('should throw on tampered ciphertext', async () => {
      const plainSIN = '111111111';
      const encrypted = await encryptSIN(plainSIN);
      
      // Tamper with encrypted data
      const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      parsed.ciphertext = 'TAMPERED_DATA';
      const tampered = Buffer.from(JSON.stringify(parsed)).toString('base64');
      
      await expect(decryptSIN(tampered)).rejects.toThrow();
    });
  });

  describe('Compliance and security', () => {
    it('should not log plaintext SIN', async () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');
      const logSpy = vi.spyOn(console, 'log');
      
      const plainSIN = '123456789';
      const encrypted = await encryptSIN(plainSIN);
      await decryptSIN(encrypted);
      
      // Check no logs contain the plaintext SIN
      const allCalls = [
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...logSpy.mock.calls,
      ];
      
      allCalls.forEach(call => {
        expect(JSON.stringify(call)).not.toContain(plainSIN);
      });
      
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should use AES-256-GCM encryption', async () => {
      const plainSIN = '999999999';
      const encrypted = await encryptSIN(plainSIN);
      
      const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      // Should have required GCM components
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();
      expect(parsed.ciphertext).toBeDefined();
      
      // IV should be 16 bytes (base64 encoded)
      const iv = Buffer.from(parsed.iv, 'base64');
      expect(iv.length).toBe(16);
      
      // Auth tag should be 16 bytes (base64 encoded)
      const authTag = Buffer.from(parsed.authTag, 'base64');
      expect(authTag.length).toBe(16);
    });

    it('should include key version for rotation support', async () => {
      const plainSIN = '888888888';
      const encrypted = await encryptSIN(plainSIN);
      
      const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      expect(parsed.keyVersion).toBeDefined();
      expect(parsed.keyVersion).toBe('v1');
    });
  });
});

describe('Integration Tests', () => {
  describe('Tax document generation workflow', () => {
    it('should encrypt SIN, store, and decrypt for T4A', async () => {
      // Simulate member registration - encrypt SIN
      const memberSIN = '123456789';
      const encryptedForStorage = await encryptSIN(memberSIN);
      
      // Simulate database storage
      const storedInDB = encryptedForStorage;
      
      // Simulate T4A generation - decrypt SIN
      const decryptedForT4A = await decryptSIN(storedInDB);
      
      expect(decryptedForT4A).toBe(memberSIN);
    });

    it('should provide masked SIN for display', async () => {
      const memberSIN = '987654321';
      const encrypted = await encryptSIN(memberSIN);
      
      // For UI display
      const maskedForUI = await formatSINForDisplay(encrypted, true);
      
      expect(maskedForUI).toBe('***-***-4321');
      expect(maskedForUI).not.toContain(memberSIN);
    });
  });
});

describe('Performance Tests', () => {
  it('should encrypt within 50ms', async () => {
    const plainSIN = '111222333';
    
    const start = Date.now();
    await encryptSIN(plainSIN);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
  });

  it('should decrypt within 50ms', async () => {
    const plainSIN = '444555666';
    const encrypted = await encryptSIN(plainSIN);
    
    const start = Date.now();
    await decryptSIN(encrypted);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
  });

  it('should handle batch encryption efficiently', async () => {
    const sins = Array.from({ length: 10 }, (_, i) => 
      `${i}${i}${i}${i}${i}${i}${i}${i}${i}`
    );
    
    const start = Date.now();
    await Promise.all(sins.map(sin => encryptSIN(sin)));
    const duration = Date.now() - start;
    
    // Should complete 10 encryptions in under 500ms
    expect(duration).toBeLessThan(500);
  });
});
