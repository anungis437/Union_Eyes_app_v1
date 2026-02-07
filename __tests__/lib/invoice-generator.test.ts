/**
 * Invoice Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { InvoiceGenerator } from '@/lib/services/invoice-generator';

const baseData = {
  invoiceNumber: 'INV-1001',
  invoiceDate: new Date('2024-01-01'),
  dueDate: new Date('2024-01-15'),
  customerName: 'Alex Member',
  customerEmail: 'alex@example.com',
  unionName: 'Local 123',
  unionAddress: {
    line1: '123 Union St',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M1M1M1',
    country: 'CA',
  },
  lineItems: [
    {
      description: 'Union Dues - Jan',
      quantity: 1,
      unitPrice: new Decimal('25.00'),
      amount: new Decimal('25.00'),
    },
  ],
  subtotal: new Decimal('25.00'),
  totalAmount: new Decimal('25.00'),
};

describe('InvoiceGenerator', () => {
  it('should generate HTML with paid stamp when fully paid', () => {
    const html = InvoiceGenerator.generateHTML({
      ...baseData,
      amountPaid: new Decimal('25.00'),
    });

    expect(html).toContain('INV-1001');
    expect(html).toContain('Local 123');
    expect(html).toContain('PAID IN FULL');
    expect(html).toContain('Union Dues - Jan');
  });

  it('should generate HTML with amount due when unpaid', () => {
    const html = InvoiceGenerator.generateHTML({
      ...baseData,
      amountPaid: new Decimal('0.00'),
      amountDue: new Decimal('25.00'),
    });

    expect(html).toContain('Amount Due');
    expect(html).toContain('$25.00 CAD');
  });

  it('should generate dues invoice HTML', () => {
    const html = InvoiceGenerator.generateDuesInvoice({
      memberName: 'Alex Member',
      memberEmail: 'alex@example.com',
      invoiceNumber: 'INV-2001',
      duesAmount: new Decimal('30.00'),
      period: 'Feb 2024',
      dueDate: new Date('2024-02-15'),
      unionInfo: {
        name: 'Local 123',
        address: baseData.unionAddress,
        email: 'info@local123.org',
      },
    });

    expect(html).toContain('INV-2001');
    expect(html).toContain('Union Dues - Feb 2024');
    expect(html).toContain('Local 123');
  });

  it('should return a buffer for PDF generation', async () => {
    const html = '<html><body>Invoice</body></html>';
    const buffer = await InvoiceGenerator.generatePDF(html);

    expect(buffer.toString('utf-8')).toBe(html);
  });
});
