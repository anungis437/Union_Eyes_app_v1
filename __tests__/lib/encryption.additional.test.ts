import { describe, it, expect, beforeAll } from 'vitest';

let encryptionService: typeof import('@/lib/encryption').encryptionService;
let encryptSIN: typeof import('@/lib/encryption').encryptSIN;
let decryptSIN: typeof import('@/lib/encryption').decryptSIN;
let formatSINForDisplay: typeof import('@/lib/encryption').formatSINForDisplay;
let migrateSINToEncrypted: typeof import('@/lib/encryption').migrateSINToEncrypted;
let generateEncryptionKey: typeof import('@/lib/encryption').generateEncryptionKey;

beforeAll(async () => {
  process.env.TEST_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  const mod = await import('@/lib/encryption');
  encryptionService = mod.encryptionService;
  encryptSIN = mod.encryptSIN;
  decryptSIN = mod.decryptSIN;
  formatSINForDisplay = mod.formatSINForDisplay;
  migrateSINToEncrypted = mod.migrateSINToEncrypted;
  generateEncryptionKey = mod.generateEncryptionKey;
});

describe('encryption', () => {
  it('exposes encryption helpers', () => {
    expect(encryptionService).toBeDefined();
    expect(typeof encryptionService.encrypt).toBe('function');
    expect(typeof encryptionService.decrypt).toBe('function');
    expect(typeof encryptionService.isEncrypted).toBe('function');
  });

  it('encrypts and decrypts a SIN', async () => {
    const encrypted = await encryptSIN('123456789');
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe('123456789');

    const decrypted = await decryptSIN(encrypted);
    expect(decrypted).toBe('123456789');
  });

  it('formats SIN for display', async () => {
    const masked = await formatSINForDisplay('123-456-789');
    expect(masked).toBe('***-***-6789');
  });

  it('migrates plaintext SIN to encrypted value', async () => {
    const encrypted = await migrateSINToEncrypted('123456789');
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe('123456789');
  });

  it('generates a base64 encryption key', () => {
    const key = generateEncryptionKey();
    const decoded = Buffer.from(key, 'base64');
    expect(decoded.length).toBe(32);
  });
});
