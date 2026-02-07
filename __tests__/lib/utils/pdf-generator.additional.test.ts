import { describe, it, expect, vi } from 'vitest';
import { addFooter, addHeader, generatePDF } from '@/lib/utils/pdf-generator';

describe('pdf-generator additional coverage', () => {
  it('exposes generator helpers', () => {
    expect(generatePDF).toBeDefined();
    expect(addHeader).toBeDefined();
    expect(addFooter).toBeDefined();
  });

  it('adds header/footer with a mock document', () => {
    const doc = {
      fontSize: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      moveDown: vi.fn().mockReturnThis(),
      page: {
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        width: 612,
        height: 792,
      },
      bufferedPageRange: vi.fn().mockReturnValue({ start: 0, count: 1 }),
    };

    addHeader(doc as any, 'Header');
    addFooter(doc as any, 'Footer');

    expect(doc.text).toHaveBeenCalled();
  });
});
