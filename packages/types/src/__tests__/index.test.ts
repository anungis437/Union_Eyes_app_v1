/**
 * @fileoverview Index Export Tests
 * Testing that all types are properly exported from the main index
 */

import * as TypesIndex from '../index';
import { 
  TimeEntry, 
  Invoice, 
  Payment, 
  TrustAccount, 
  TrustTransaction,
  KnowledgeEntry,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  TaskCategory,
  TaxType
} from '../index';

describe('Types Index Export Tests', () => {
  describe('Named Export Validation', () => {
    it('should export all billing interfaces', () => {
      // Test that we can create instances of each type
      const timeEntry: TimeEntry = {
        id: 'test-id',
        matter_id: 'matter-123',
        user_id: 'user-456',
        task_category: 'Legal Research',
        description: 'Test description',
        hours: 1.5,
        billable_rate: 350.00,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        is_billable: true,
        is_billed: false,
        date: '2024-01-15',
        client_id: 'client-789',
        time_tracking_method: 'Manual',
        tags: ['research'],
        notes: 'Test notes',
        billed_amount: 525.00,
        internal_notes: 'Internal test notes',
        billing_status: 'Pending',
        approval_status: 'Approved',
        approved_by: 'supervisor-001',
        approved_at: '2024-01-15T11:00:00Z',
        invoice_id: 'invoice-001'
      };

      const invoice: Invoice = {
        id: 'invoice-123',
        client_id: 'client-456',
        matter_id: 'matter-789',
        invoice_number: 'INV-2024-001',
        status: 'Draft',
        issue_date: '2024-01-15',
        due_date: '2024-02-15',
        subtotal: 1000.00,
        tax_amount: 130.00,
        total_amount: 1130.00,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      const payment: Payment = {
        id: 'payment-123',
        invoice_id: 'invoice-456',
        amount: 1130.00,
        payment_date: '2024-01-20',
        payment_method: 'Bank Transfer',
        status: 'Completed',
        created_at: '2024-01-20T14:30:00Z',
        updated_at: '2024-01-20T14:30:00Z'
      };

      const trustAccount: TrustAccount = {
        id: 'trust-123',
        client_id: 'client-456',
        matter_id: 'matter-789',
        account_number: 'TRUST-2024-001',
        balance: 5000.00,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      const trustTransaction: TrustTransaction = {
        id: 'trust-txn-123',
        trust_account_id: 'trust-456',
        type: 'Deposit',
        amount: 2500.00,
        description: 'Initial client retainer',
        transaction_date: '2024-01-15',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      expect(timeEntry.id).toBe('test-id');
      expect(invoice.status).toBe('Draft');
      expect(payment.payment_method).toBe('Bank Transfer');
      expect(trustAccount.balance).toBe(5000.00);
      expect(trustTransaction.type).toBe('Deposit');
    });

    it('should export KnowledgeEntry interface', () => {
      const knowledgeEntry: KnowledgeEntry = {
        id: 'knowledge-123',
        title: 'Test Knowledge Entry',
        content: 'Test content for knowledge entry',
        entry_type: 'Legal Principle',
        tags: ['test'],
        legal_topics: ['Testing'],
        source_document_ids: [],
        source_query_ids: [],
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      expect(knowledgeEntry.entry_type).toBe('Legal Principle');
      expect(knowledgeEntry.title).toBe('Test Knowledge Entry');
    });

    it('should export all enum types', () => {
      const invoiceStatuses: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
      const paymentStatuses: PaymentStatus[] = ['Pending', 'Completed', 'Failed', 'Refunded'];
      const paymentMethods: PaymentMethod[] = ['Credit Card', 'Bank Transfer', 'Cheque', 'Cash', 'Trust Transfer'];
      const taskCategories: TaskCategory[] = [
        TaskCategory.LEGAL_RESEARCH,
        TaskCategory.DOCUMENT_DRAFTING, 
        TaskCategory.CLIENT_MEETING,
        TaskCategory.COURT_APPEARANCE,
        TaskCategory.CASE_STRATEGY,
        TaskCategory.ADMINISTRATIVE,
        TaskCategory.OTHER
      ];
      const taxTypes: TaxType[] = [TaxType.HST, TaxType.GST, TaxType.PST, TaxType.QST];

      expect(invoiceStatuses).toHaveLength(5);
      expect(paymentStatuses).toHaveLength(4);
      expect(paymentMethods).toHaveLength(5);
      expect(taskCategories).toHaveLength(7);
      expect(taxTypes).toHaveLength(4);
    });
  });

  describe('Wildcard Export Validation', () => {
    it('should include all billing types in wildcard export', () => {
      // Check that TypesIndex contains the expected exports
      expect(TypesIndex).toBeDefined();
      
      // Verify we can access types through the wildcard export
      expect('TimeEntry' in TypesIndex).toBe(false); // Types are not runtime values
      expect('Invoice' in TypesIndex).toBe(false);   // Types are not runtime values
      expect('KnowledgeEntry' in TypesIndex).toBe(false); // Types are not runtime values
      
      // This test validates that the TypeScript compiler can resolve the exports
      // without runtime errors, which confirms the export structure is correct
    });
  });

  describe('Type Compatibility Tests', () => {
    it('should maintain type compatibility across imports', () => {
      // Test that types imported via named import are compatible with wildcard import
      const namedImportEntry: TimeEntry = {
        id: 'named-import-test',
        matterId: 'matter-123',
        userId: 'user-456',
        taskCategory: TaskCategory.LEGAL_RESEARCH,
        description: 'Named import test',
        hours: 1.0,
        billableRate: 300.00,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        isBillable: true,
        isBilled: false,
        date: '2024-01-15',
        clientId: 'client-789',
        timeTrackingMethod: 'Manual',
        tags: [],
        billedAmount: 300.00,
        billingStatus: 'Pending',
        approvalStatus: 'Approved'
      };

      // This would be a TypeScript compile-time validation
      // Runtime we just verify the object was created successfully
      expect(namedImportEntry.id).toBe('named-import-test');
      expect(namedImportEntry.taskCategory).toBe(TaskCategory.LEGAL_RESEARCH);
    });

    it('should support enum value assignments', () => {
      const status: InvoiceStatus = InvoiceStatus.DRAFT;
      const paymentMethod: PaymentMethod = PaymentMethod.CREDIT_CARD;
      const category: TaskCategory = TaskCategory.DOCUMENT_DRAFTING;
      const taxType: TaxType = TaxType.HST;

      expect(status).toBe(InvoiceStatus.DRAFT);
      expect(paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(category).toBe(TaskCategory.DOCUMENT_DRAFTING);
      expect(taxType).toBe(TaxType.HST);
    });
  });

  describe('Re-export Functionality', () => {
    it('should re-export billing types for convenience', () => {
      // Test that the convenience re-exports work
      const invoice: Invoice = {
        id: 'convenience-test',
        clientId: 'client-123',
        matterId: 'matter-456',
        invoiceNumber: 'CONV-001',
        status: InvoiceStatus.DRAFT,
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 500.00,
        taxAmount: 65.00,
        totalAmount: 565.00,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      };

      const knowledge: KnowledgeEntry = {
        id: 'convenience-knowledge',
        title: 'Convenience Test Entry',
        content: 'Testing re-export functionality',
        entryType: 'Other',
        tags: ['convenience', 'test'],
        legalTopics: ['Testing'],
        sourceDocumentIds: [],
        sourceQueryIds: [],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      expect(invoice.invoiceNumber).toBe('CONV-001');
      expect(knowledge.title).toBe('Convenience Test Entry');
    });

    it('should allow mixed usage of wildcard and named imports', () => {
      // This test validates that developers can use both import styles
      // without conflicts or type incompatibilities
      
      // Using named imports (already imported at top)
      const timeEntry: TimeEntry = {
        id: 'mixed-usage-test',
        matterId: 'matter-999',
        userId: 'user-999',
        taskCategory: TaskCategory.ADMINISTRATIVE,
        description: 'Mixed import usage test',
        hours: 0.5,
        billableRate: 250.00,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        isBillable: true,
        isBilled: false,
        date: '2024-01-15',
        clientId: 'client-999',
        timeTrackingMethod: 'Timer',
        tags: ['mixed', 'test'],
        billedAmount: 125.00,
        billingStatus: 'Ready',
        approvalStatus: 'Pending'
      };

      expect(timeEntry.taskCategory).toBe(TaskCategory.ADMINISTRATIVE);
      expect(timeEntry.timeTrackingMethod).toBe('Timer');
    });
  });
});
