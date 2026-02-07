import { describe, it, expect } from 'vitest';
import { generatePDF } from '@/lib/utils/pdf-generator';

describe('PDF Generator', () => {
  it('should generate a PDF buffer for claims report', async () => {
    const buffer = await generatePDF({
      title: 'Claims Report',
      template: 'claims-report',
      data: [
        {
          claimNumber: 'C-100',
          subject: 'Overtime pay',
          status: 'open',
          priority: 'high',
          createdAt: new Date('2025-01-01'),
        },
      ],
    });

    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('should generate usage and financial reports with optional sections', async () => {
    const usageBuffer = await generatePDF({
      title: 'Usage Report',
      template: 'usage-report',
      data: {
        period: { start: '2025-01-01', end: '2025-01-31' },
        claims: { total: 2, byStatus: { open: 1 }, byPriority: { high: 1 } },
        members: { total: 10, active: 9, new: 1 },
        grievances: { total: 1, resolved: 0 },
      },
    });

    const financialBuffer = await generatePDF({
      title: 'Financial Report',
      template: 'financial-report',
      data: {
        period: { start: '2025-01-01', end: '2025-01-31' },
        revenue: 1200,
        expenses: 900,
      },
    });

    expect(usageBuffer.byteLength).toBeGreaterThan(0);
    expect(financialBuffer.byteLength).toBeGreaterThan(0);
  });

  it('should generate a generic report when no template is provided', async () => {
    const buffer = await generatePDF({
      title: 'Generic Report',
      data: { message: 'hello' },
    });

    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
