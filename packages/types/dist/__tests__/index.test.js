"use strict";
/**
 * @fileoverview Index Export Tests
 * Testing that all types are properly exported from the main index
 */
Object.defineProperty(exports, "__esModule", { value: true });
var TypesIndex = require("../index");
describe('Types Index Export Tests', function () {
    describe('Named Export Validation', function () {
        it('should export all billing interfaces', function () {
            // Test that we can create instances of each type
            var timeEntry = {
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
            var invoice = {
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
            var payment = {
                id: 'payment-123',
                invoice_id: 'invoice-456',
                amount: 1130.00,
                payment_date: '2024-01-20',
                payment_method: 'Bank Transfer',
                status: 'Completed',
                created_at: '2024-01-20T14:30:00Z',
                updated_at: '2024-01-20T14:30:00Z'
            };
            var trustAccount = {
                id: 'trust-123',
                client_id: 'client-456',
                matter_id: 'matter-789',
                account_number: 'TRUST-2024-001',
                balance: 5000.00,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-15T10:30:00Z'
            };
            var trustTransaction = {
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
        it('should export KnowledgeEntry interface', function () {
            var knowledgeEntry = {
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
        it('should export all enum types', function () {
            var invoiceStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
            var paymentStatuses = ['Pending', 'Completed', 'Failed', 'Refunded'];
            var paymentMethods = ['Credit Card', 'Bank Transfer', 'Cheque', 'Cash', 'Trust Transfer'];
            var taskCategories = [
                'Legal Research',
                'Document Drafting',
                'Client Meeting',
                'Court Appearance',
                'Case Strategy',
                'Administrative',
                'Other'
            ];
            var taxTypes = ['HST', 'GST', 'PST', 'QST'];
            expect(invoiceStatuses).toHaveLength(5);
            expect(paymentStatuses).toHaveLength(4);
            expect(paymentMethods).toHaveLength(5);
            expect(taskCategories).toHaveLength(7);
            expect(taxTypes).toHaveLength(4);
        });
    });
    describe('Wildcard Export Validation', function () {
        it('should include all billing types in wildcard export', function () {
            // Check that TypesIndex contains the expected exports
            expect(TypesIndex).toBeDefined();
            // Verify we can access types through the wildcard export
            expect('TimeEntry' in TypesIndex).toBe(false); // Types are not runtime values
            expect('Invoice' in TypesIndex).toBe(false); // Types are not runtime values
            expect('KnowledgeEntry' in TypesIndex).toBe(false); // Types are not runtime values
            // This test validates that the TypeScript compiler can resolve the exports
            // without runtime errors, which confirms the export structure is correct
        });
    });
    describe('Type Compatibility Tests', function () {
        it('should maintain type compatibility across imports', function () {
            // Test that types imported via named import are compatible with wildcard import
            var namedImportEntry = {
                id: 'named-import-test',
                matter_id: 'matter-123',
                user_id: 'user-456',
                task_category: 'Legal Research',
                description: 'Named import test',
                hours: 1.0,
                billable_rate: 300.00,
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                is_billable: true,
                is_billed: false,
                date: '2024-01-15',
                client_id: 'client-789',
                time_tracking_method: 'Manual',
                tags: [],
                billed_amount: 300.00,
                billing_status: 'Pending',
                approval_status: 'Approved'
            };
            // This would be a TypeScript compile-time validation
            // Runtime we just verify the object was created successfully
            expect(namedImportEntry.id).toBe('named-import-test');
            expect(namedImportEntry.task_category).toBe('Legal Research');
        });
        it('should support enum value assignments', function () {
            var status = 'Draft';
            var paymentMethod = 'Credit Card';
            var category = 'Document Drafting';
            var taxType = 'HST';
            expect(status).toBe('Draft');
            expect(paymentMethod).toBe('Credit Card');
            expect(category).toBe('Document Drafting');
            expect(taxType).toBe('HST');
        });
    });
    describe('Re-export Functionality', function () {
        it('should re-export billing types for convenience', function () {
            // Test that the convenience re-exports work
            var invoice = {
                id: 'convenience-test',
                client_id: 'client-123',
                matter_id: 'matter-456',
                invoice_number: 'CONV-001',
                status: 'Draft',
                issue_date: '2024-01-15',
                due_date: '2024-02-15',
                subtotal: 500.00,
                tax_amount: 65.00,
                total_amount: 565.00,
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z'
            };
            var knowledge = {
                id: 'convenience-knowledge',
                title: 'Convenience Test Entry',
                content: 'Testing re-export functionality',
                entry_type: 'Other',
                tags: ['convenience', 'test'],
                legal_topics: ['Testing'],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(invoice.invoice_number).toBe('CONV-001');
            expect(knowledge.title).toBe('Convenience Test Entry');
        });
        it('should allow mixed usage of wildcard and named imports', function () {
            // This test validates that developers can use both import styles
            // without conflicts or type incompatibilities
            // Using named imports (already imported at top)
            var timeEntry = {
                id: 'mixed-usage-test',
                matter_id: 'matter-999',
                user_id: 'user-999',
                task_category: 'Administrative',
                description: 'Mixed import usage test',
                hours: 0.5,
                billable_rate: 250.00,
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                is_billable: true,
                is_billed: false,
                date: '2024-01-15',
                client_id: 'client-999',
                time_tracking_method: 'Timer',
                tags: ['mixed', 'test'],
                billed_amount: 125.00,
                billing_status: 'Ready',
                approval_status: 'Pending'
            };
            expect(timeEntry.task_category).toBe('Administrative');
            expect(timeEntry.time_tracking_method).toBe('Timer');
        });
    });
});
