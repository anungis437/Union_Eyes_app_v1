# PDF Receipt Generation System

## Overview

The system now supports professional PDF receipt generation for completed dues payments. Receipts can be generated on-demand, downloaded directly, or automatically attached to billing emails.

## Components

### 1. Receipt Template (`components/pdf/receipt-template.tsx`)

Professional PDF template built with `@react-pdf/renderer` that includes:

- Union branding (logo, name, contact information)
- Member information
- Payment details with itemized breakdown
- Payment method and reference
- Billing period and due date
- Professional styling and layout

### 2. Receipt API Endpoint (`app/api/dues/receipt/[id]/route.ts`)

**GET** `/api/dues/receipt/[transactionId]`

Query parameters:

- `format` (optional): Response format
  - `json` (default): Returns receipt data as JSON
  - `pdf`: Returns PDF file for direct download
  - `pdf-url`: Generates PDF, uploads to Vercel Blob Storage, returns URL

**Example Usage:**

```typescript
// Get receipt as JSON
const response = await fetch('/api/dues/receipt/txn_123');
const data = await response.json();

// Download PDF directly
window.open('/api/dues/receipt/txn_123?format=pdf', '_blank');

// Get PDF URL for sharing
const response = await fetch('/api/dues/receipt/txn_123?format=pdf-url');
const { pdfUrl } = await response.json();
```

### 3. Email Integration (`app/api/billing/send-invoice/route.ts`)

**POST** `/api/billing/send-invoice`

Request body:

```json
{
  "templateId": "template_id",
  "memberId": "member_id",
  "transactionId": "transaction_id",
  "includePdf": true,
  "data": {
    "custom_variable": "value"
  }
}
```

When `includePdf: true` is set and a completed transaction is provided, the system will:

1. Generate a PDF receipt using the transaction data
2. Attach the PDF to the email automatically
3. Send the email with the template content + PDF attachment

## Receipt Data Structure

```typescript
interface ReceiptData {
  // Receipt info
  receiptNumber: string;        // REC-XXXXXXXX
  paymentDate: string;          // "January 15, 2024"
  generatedAt?: string;         // Timestamp of generation

  // Union info
  unionName: string;
  unionAddress?: string;
  unionPhone?: string;
  unionEmail?: string;
  unionLogo?: string;           // URL to logo image

  // Member info
  memberName: string;           // "John Doe"
  memberNumber: string;         // Member ID
  memberEmail?: string;

  // Payment details
  duesAmount: string;           // "150.00"
  lateFee?: string;             // "10.00" (optional)
  processingFee?: string;       // "3.50" (optional)
  totalAmount: string;          // "163.50"

  // Payment method
  paymentMethod: string;        // "Credit Card", "ACH", etc.
  paymentReference: string;     // Payment ID or reference

  // Period info
  billingPeriod?: string;       // "01/01/2024 - 01/31/2024"
  dueDate?: string;             // "01/15/2024"

  // Notes
  notes?: string;
}
```

## Implementation Details

### PDF Generation

Uses `@react-pdf/renderer` library for server-side PDF generation:

- Professional layout with A4 page size
- Responsive styling with flexbox
- Section-based organization
- Payment status badge
- Itemized payment breakdown with totals

### Storage

PDFs generated with `format=pdf-url` are stored in Vercel Blob Storage:

- Path: `receipts/{tenantId}/{receiptNumber}.pdf`
- Access: Public (shareable URLs)
- Content-Type: `application/pdf`

### Security

- Receipts can only be generated for completed transactions
- Users can only access receipts for their own transactions (via Clerk authentication)
- Multi-tenant filtering ensures users only see receipts from their union

## Future Enhancements

- [ ] Get union branding (logo, colors) from tenant settings
- [ ] Add QR code for receipt verification
- [ ] Support for multiple languages/locales
- [ ] Batch receipt generation for multiple transactions
- [ ] Receipt archive/history view
- [ ] Digital signature for official receipts
- [ ] Custom receipt templates per tenant

## Dependencies

- `@react-pdf/renderer` (^4.3.1): PDF generation
- `@vercel/blob`: Cloud storage for PDFs
- `resend`: Email delivery with attachments

## Testing

To test the PDF generation:

1. Complete a payment transaction
2. Generate receipt in different formats:

   ```bash
   # Get JSON data
   curl http://localhost:3000/api/dues/receipt/txn_123
   
   # Download PDF
   curl http://localhost:3000/api/dues/receipt/txn_123?format=pdf -o receipt.pdf
   
   # Get blob URL
   curl http://localhost:3000/api/dues/receipt/txn_123?format=pdf-url
   ```

3. Send invoice with PDF attachment:

   ```bash
   curl -X POST http://localhost:3000/api/billing/send-invoice \
     -H "Content-Type: application/json" \
     -d '{
       "templateId": "template_id",
       "memberId": "member_id",
       "transactionId": "txn_123",
       "includePdf": true
     }'
   ```

## Troubleshooting

**PDF generation fails:**

- Verify `@react-pdf/renderer` is installed: `pnpm list @react-pdf/renderer`
- Check transaction exists and has status='completed'
- Verify all required receipt data fields are populated

**PDF email attachment fails:**

- Check Resend API key is configured: `process.env.RESEND_API_KEY`
- Verify recipient email address is valid
- Check email attachments size limit (Resend supports up to 10MB total)

**Blob storage upload fails:**

- Verify Vercel Blob token is configured
- Check blob storage quota and limits
- Ensure PDF buffer is properly generated before upload
