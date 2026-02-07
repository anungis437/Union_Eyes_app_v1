/**
 * Coverage hints (from coverage-final.json)
 * - Uncovered lines: 24
 * - Uncovered functions: (anonymous_0)
 */

import { describe, it, expect } from 'vitest';
import { documentFolders, documents } from '@/lib/../db/schema/documents-schema';

describe('documents-schema', () => {
  describe('documentFolders', () => {
    it('is defined', () => {
      expect(documentFolders).toBeDefined();
    });
  });

  describe('documents', () => {
    it('is defined', () => {
      expect(documents).toBeDefined();
    });
  });
});
