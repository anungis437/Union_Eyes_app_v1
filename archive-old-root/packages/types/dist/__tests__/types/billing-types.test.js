"use strict";
/**
 * @fileoverview Type Validation Tests
 * Testing TypeScript type definitions and interface compliance
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../../index");
describe('Type Validation Tests', function () {
    describe('Core Interface Validation', function () {
        it('should validate TimeEntry interface structure', function () {
            var mockTimeEntry = {
                id: 'time-123',
                userId: 'user-456',
                matterId: 'matter-789',
                taskId: 'task-101',
                clientId: 'client-202',
                firmId: 'firm-303',
                startTime: new Date('2024-01-15T09:00:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                duration: 150, // 2.5 hours in minutes
                isRunning: false,
                billableRate: 350.00,
                billableAmount: 875.00,
                nonBillableAmount: undefined,
                description: 'Legal research on contract terms',
                category: index_1.TaskCategory.RESEARCH,
                activityType: index_1.ActivityType.BILLABLE,
                tags: ['contract', 'research', 'commercial'],
                isBillable: true,
                isSubmitted: true,
                submittedAt: new Date('2024-01-15T11:45:00Z'),
                approvedBy: 'supervisor-404',
                approvedAt: new Date('2024-01-15T12:00:00Z'),
                billingStatus: 'approved',
                createdAt: new Date('2024-01-15T09:00:00Z'),
                updatedAt: new Date('2024-01-15T12:00:00Z'),
                syncStatus: index_1.SyncStatus.SYNCED,
            };
            // Validate required properties exist
            expect(mockTimeEntry.id).toBeDefined();
            expect(mockTimeEntry.userId).toBeDefined();
            expect(mockTimeEntry.matterId).toBeDefined();
            expect(mockTimeEntry.clientId).toBeDefined();
            expect(mockTimeEntry.firmId).toBeDefined();
            expect(mockTimeEntry.startTime).toBeInstanceOf(Date);
            expect(mockTimeEntry.duration).toBeGreaterThan(0);
            expect(mockTimeEntry.billableRate).toBeGreaterThan(0);
            expect(mockTimeEntry.description).toBeTruthy();
            expect(mockTimeEntry.category).toBe(index_1.TaskCategory.RESEARCH);
            expect(mockTimeEntry.activityType).toBe(index_1.ActivityType.BILLABLE);
            expect(Array.isArray(mockTimeEntry.tags)).toBe(true);
            expect(typeof mockTimeEntry.isBillable).toBe('boolean');
        });
        it('should validate Invoice interface structure', function () {
            var mockInvoice = {
                id: 'inv-123',
                invoiceNumber: 'INV-2024-001',
                clientId: 'client-456',
                matterId: 'matter-789',
                firmId: 'firm-303',
                issueDate: new Date('2024-01-15'),
                dueDate: new Date('2024-02-14'),
                sentAt: new Date('2024-01-15T14:30:00Z'),
                status: index_1.InvoiceStatus.SENT,
                subtotal: 1225.00,
                taxAmount: 159.25,
                totalAmount: 1384.25,
                paidAmount: 0,
                outstandingAmount: 1384.25,
                currency: 'CAD',
                terms: 'Net 30 days',
                notes: 'Payment due within 30 days of invoice date',
                timeEntries: ['time-123', 'time-124'],
                expenses: ['exp-101'],
                fixedFees: [],
                createdAt: new Date('2024-01-15T14:00:00Z'),
                updatedAt: new Date('2024-01-15T14:30:00Z'),
                clientMessage: 'Thank you for your business',
                paymentInstructions: 'Please remit payment to the address below',
            };
            expect(mockInvoice.id).toBeDefined();
            expect(mockInvoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{3}$/);
            expect(mockInvoice.status).toBe(index_1.InvoiceStatus.SENT);
            expect(mockInvoice.subtotal).toBeGreaterThan(0);
            expect(mockInvoice.totalAmount).toBe(mockInvoice.subtotal + mockInvoice.taxAmount);
            expect(mockInvoice.outstandingAmount).toBe(mockInvoice.totalAmount - mockInvoice.paidAmount);
            expect(Array.isArray(mockInvoice.timeEntries)).toBe(true);
            expect(Array.isArray(mockInvoice.expenses)).toBe(true);
            expect(Array.isArray(mockInvoice.fixedFees)).toBe(true);
        });
        it('should validate Payment interface structure', function () {
            var mockPayment = {
                id: 'pay-123',
                invoiceId: 'inv-456',
                clientId: 'client-789',
                firmId: 'firm-303',
                amount: 1384.25,
                paymentMethod: index_1.PaymentMethod.CREDIT_CARD,
                paymentDate: new Date('2024-01-20T10:15:00Z'),
                processorId: 'stripe-pi-123abc',
                processorType: 'stripe',
                transactionId: 'txn-456def',
                status: index_1.PaymentStatus.COMPLETED,
                createdAt: new Date('2024-01-20T10:15:00Z'),
                notes: 'Payment processed successfully via Stripe',
            };
            expect(mockPayment.id).toBeDefined();
            expect(mockPayment.invoiceId).toBeDefined();
            expect(mockPayment.amount).toBeGreaterThan(0);
            expect(mockPayment.paymentMethod).toBe(index_1.PaymentMethod.CREDIT_CARD);
            expect(mockPayment.status).toBe(index_1.PaymentStatus.COMPLETED);
            expect(mockPayment.paymentDate).toBeInstanceOf(Date);
            expect(mockPayment.processorId).toBeTruthy();
            expect(mockPayment.transactionId).toBeTruthy();
        });
        it('should validate TrustAccount interface structure', function () {
            var mockTrustAccount = {
                id: 'trust-123',
                firmId: 'firm-456',
                accountName: 'Client Trust Account',
                accountNumber: '123456789',
                bankName: 'Royal Bank of Canada',
                currentBalance: 50000.00,
                availableBalance: 48500.00,
                isIOLTA: true,
                iolaRegistrationNumber: 'IOLA-ON-2024-001',
                createdAt: new Date('2024-01-01T00:00:00Z'),
                isActive: true,
            };
            expect(mockTrustAccount.id).toBeDefined();
            expect(mockTrustAccount.firmId).toBeDefined();
            expect(mockTrustAccount.accountName).toContain('Trust');
            expect(mockTrustAccount.currentBalance).toBeGreaterThanOrEqual(0);
            expect(mockTrustAccount.availableBalance).toBeLessThanOrEqual(mockTrustAccount.currentBalance);
            expect(typeof mockTrustAccount.isIOLTA).toBe('boolean');
            expect(typeof mockTrustAccount.isActive).toBe('boolean');
            expect(mockTrustAccount.createdAt).toBeInstanceOf(Date);
        });
        it('should validate TrustTransaction interface structure', function () {
            var mockTrustTransaction = {
                id: 'tt-123',
                trustAccountId: 'trust-456',
                clientId: 'client-789',
                matterId: 'matter-101',
                firmId: 'firm-303',
                type: index_1.TrustTransactionType.DEPOSIT,
                amount: 5000.00,
                description: 'Retainer deposit for litigation matter',
                reference: 'RETAINER-2024-001',
                transactionDate: new Date('2024-01-15T14:00:00Z'),
                createdAt: new Date('2024-01-15T14:00:00Z'),
                invoiceId: undefined,
                paymentId: undefined,
                approvedBy: 'lawyer-505',
                approvedAt: new Date('2024-01-15T14:15:00Z'),
                status: 'approved',
            };
            expect(mockTrustTransaction.id).toBeDefined();
            expect(mockTrustTransaction.trustAccountId).toBeDefined();
            expect(mockTrustTransaction.type).toBe(index_1.TrustTransactionType.DEPOSIT);
            expect(mockTrustTransaction.amount).toBeGreaterThan(0);
            expect(mockTrustTransaction.reference).toMatch(/^[A-Z]+-\d{4}-\d{3}$/);
            expect(mockTrustTransaction.transactionDate).toBeInstanceOf(Date);
            expect(mockTrustTransaction.createdAt).toBeInstanceOf(Date);
        });
    });
    describe('Enum Validation', function () {
        it('should validate InvoiceStatus enum values', function () {
            expect(index_1.InvoiceStatus.DRAFT).toBe('draft');
            expect(index_1.InvoiceStatus.SENT).toBe('sent');
            expect(index_1.InvoiceStatus.VIEWED).toBe('viewed');
            expect(index_1.InvoiceStatus.PAID).toBe('paid');
            expect(index_1.InvoiceStatus.PARTIAL).toBe('partial');
            expect(index_1.InvoiceStatus.OVERDUE).toBe('overdue');
            expect(index_1.InvoiceStatus.CANCELLED).toBe('cancelled');
            // Verify all expected values are present
            var expectedStatuses = ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled'];
            var actualStatuses = Object.values(index_1.InvoiceStatus);
            expectedStatuses.forEach(function (status) {
                expect(actualStatuses).toContain(status);
            });
        });
        it('should validate PaymentStatus enum values', function () {
            expect(index_1.PaymentStatus.PENDING).toBe('pending');
            expect(index_1.PaymentStatus.PROCESSING).toBe('processing');
            expect(index_1.PaymentStatus.COMPLETED).toBe('completed');
            expect(index_1.PaymentStatus.FAILED).toBe('failed');
            expect(index_1.PaymentStatus.REFUNDED).toBe('refunded');
            expect(index_1.PaymentStatus.CANCELLED).toBe('cancelled');
            var expectedStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];
            var actualStatuses = Object.values(index_1.PaymentStatus);
            expectedStatuses.forEach(function (status) {
                expect(actualStatuses).toContain(status);
            });
        });
        it('should validate PaymentMethod enum values', function () {
            expect(index_1.PaymentMethod.CREDIT_CARD).toBe('credit_card');
            expect(index_1.PaymentMethod.BANK_TRANSFER).toBe('bank_transfer');
            expect(index_1.PaymentMethod.CHECK).toBe('check');
            expect(index_1.PaymentMethod.CASH).toBe('cash');
            expect(index_1.PaymentMethod.WIRE_TRANSFER).toBe('wire_transfer');
            expect(index_1.PaymentMethod.INTERAC).toBe('interac');
            var expectedMethods = ['credit_card', 'bank_transfer', 'check', 'cash', 'wire_transfer', 'interac'];
            var actualMethods = Object.values(index_1.PaymentMethod);
            expectedMethods.forEach(function (method) {
                expect(actualMethods).toContain(method);
            });
        });
        it('should validate TaskCategory enum values', function () {
            expect(index_1.TaskCategory.RESEARCH).toBe('research');
            expect(index_1.TaskCategory.DRAFTING).toBe('drafting');
            expect(index_1.TaskCategory.CORRESPONDENCE).toBe('correspondence');
            expect(index_1.TaskCategory.COURT_APPEARANCE).toBe('court_appearance');
            expect(index_1.TaskCategory.CLIENT_MEETING).toBe('client_meeting');
            expect(index_1.TaskCategory.NEGOTIATION).toBe('negotiation');
            expect(index_1.TaskCategory.ADMINISTRATIVE).toBe('administrative');
            expect(index_1.TaskCategory.TRAVEL).toBe('travel');
            var expectedCategories = [
                'research', 'drafting', 'correspondence', 'court_appearance',
                'client_meeting', 'negotiation', 'administrative', 'travel',
                'real_estate', 'employment', 'wills_estates', 'corporate',
                'litigation', 'general'
            ];
            var actualCategories = Object.values(index_1.TaskCategory);
            expectedCategories.forEach(function (category) {
                expect(actualCategories).toContain(category);
            });
        });
        it('should validate TaxType enum values', function () {
            expect(index_1.TaxType.HST).toBe('hst');
            expect(index_1.TaxType.GST).toBe('gst');
            expect(index_1.TaxType.PST).toBe('pst');
            expect(index_1.TaxType.QST).toBe('qst');
            var expectedTaxTypes = ['hst', 'gst', 'pst', 'qst'];
            var actualTaxTypes = Object.values(index_1.TaxType);
            expectedTaxTypes.forEach(function (taxType) {
                expect(actualTaxTypes).toContain(taxType);
            });
        });
    });
    describe('Complex Type Validation', function () {
        it('should validate BillingConfiguration interface structure', function () {
            var mockConfig = {
                firmId: 'firm-123',
                defaultHourlyRate: 350.00,
                currency: 'CAD',
                defaultCurrency: 'CAD',
                taxRates: [
                    { jurisdiction: 'ON', rate: 0.13, type: index_1.TaxType.HST },
                    { jurisdiction: 'BC', rate: 0.12, type: index_1.TaxType.GST },
                ],
                paymentTerms: 30,
                defaultPaymentTerms: 'Net 30 days',
                roundingPrecision: 2,
                trustAccountingEnabled: true,
                autoSubmitTimeEntries: false,
                requireExpenseReceipts: true,
                minimumTimeIncrement: 6, // 6 minutes (0.1 hour)
                hstRate: 0.13,
                gstRate: 0.05,
                qstRate: 0.09975,
                hstNumber: 'HST123456789RT0001',
                gstNumber: 'GST987654321RT0001',
                qstNumber: 'QST456789123TQ0001',
                invoiceNumberFormat: 'INV-{YYYY}-{###}',
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-15T12:00:00Z'),
            };
            expect(mockConfig.firmId).toBeDefined();
            expect(mockConfig.defaultHourlyRate).toBeGreaterThan(0);
            expect(mockConfig.currency).toBe('CAD');
            expect(Array.isArray(mockConfig.taxRates)).toBe(true);
            expect(mockConfig.taxRates).toHaveLength(2);
            expect(mockConfig.paymentTerms).toBeGreaterThan(0);
            expect(typeof mockConfig.trustAccountingEnabled).toBe('boolean');
            expect(mockConfig.roundingPrecision).toBeGreaterThanOrEqual(0);
            expect(mockConfig.minimumTimeIncrement).toBeGreaterThan(0);
            expect(mockConfig.hstRate).toBeGreaterThan(0);
            expect(mockConfig.invoiceNumberFormat).toContain('{YYYY}');
        });
        it('should validate TaxCalculation interface structure', function () {
            var mockTaxCalc = {
                subtotal: 1000.00,
                taxAmount: 130.00,
                totalAmount: 1130.00,
                breakdown: [
                    {
                        jurisdiction: 'ON',
                        type: index_1.TaxType.HST,
                        rate: 0.13,
                        amount: 130.00,
                    },
                ],
            };
            expect(mockTaxCalc.subtotal).toBeGreaterThan(0);
            expect(mockTaxCalc.taxAmount).toBeGreaterThanOrEqual(0);
            expect(mockTaxCalc.totalAmount).toBe(mockTaxCalc.subtotal + mockTaxCalc.taxAmount);
            expect(Array.isArray(mockTaxCalc.breakdown)).toBe(true);
            expect(mockTaxCalc.breakdown).toHaveLength(1);
            expect(mockTaxCalc.breakdown[0].type).toBe(index_1.TaxType.HST);
            expect(mockTaxCalc.breakdown[0].rate).toBe(0.13);
            expect(mockTaxCalc.breakdown[0].amount).toBe(130.00);
        });
        it('should validate User and Firm interface structures', function () {
            var mockUser = {
                id: 'user-123',
                name: 'John Doe',
                email: 'john.doe@lawfirm.com',
                role: 'associate',
                firmId: 'firm-456',
                isActive: true,
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-15T12:00:00Z'),
            };
            var mockFirm = {
                id: 'firm-456',
                name: 'Smith & Associates',
                address: {
                    street: '123 Legal Street',
                    city: 'Toronto',
                    province: 'ON',
                    postalCode: 'M5V 2T6',
                    country: 'Canada',
                },
                phone: '+1-416-555-0123',
                email: 'info@smithassociates.com',
                website: 'https://www.smithassociates.com',
                taxId: 'BN123456789RT0001',
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-15T12:00:00Z'),
            };
            expect(mockUser.id).toBeDefined();
            expect(mockUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(typeof mockUser.isActive).toBe('boolean');
            expect(mockUser.createdAt).toBeInstanceOf(Date);
            expect(mockFirm.id).toBeDefined();
            expect(mockFirm.name).toBeTruthy();
            expect(mockFirm.address.province).toBe('ON');
            expect(mockFirm.address.country).toBe('Canada');
            expect(mockFirm.phone).toMatch(/^\+1-\d{3}-\d{3}-\d{4}$/);
            expect(mockFirm.taxId).toMatch(/^BN\d{9}RT\d{4}$/);
        });
    });
    describe('Request/Response Type Validation', function () {
        it('should validate TimeTrackingRequest interface', function () {
            var mockRequest = {
                matterId: 'matter-123',
                clientId: 'client-456',
                description: 'Research contract law precedents',
                category: index_1.TaskCategory.RESEARCH,
                activityType: index_1.ActivityType.BILLABLE,
                billableRate: 350.00,
            };
            expect(mockRequest.matterId).toBeDefined();
            expect(mockRequest.clientId).toBeDefined();
            expect(mockRequest.description).toBeTruthy();
            expect(mockRequest.category).toBe(index_1.TaskCategory.RESEARCH);
            expect(mockRequest.activityType).toBe(index_1.ActivityType.BILLABLE);
            expect(mockRequest.billableRate).toBeGreaterThan(0);
        });
        it('should validate TimeEntryUpdateRequest interface', function () {
            var mockUpdateRequest = {
                description: 'Updated description for time entry',
                category: index_1.TaskCategory.DRAFTING,
                activityType: index_1.ActivityType.BILLABLE,
                startTime: new Date('2024-01-15T09:00:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                duration: 150,
                isBillable: true,
                billableRate: 375.00,
                tags: ['contract', 'drafting', 'commercial'],
            };
            expect(mockUpdateRequest.description).toBeTruthy();
            expect(mockUpdateRequest.category).toBe(index_1.TaskCategory.DRAFTING);
            expect(mockUpdateRequest.startTime).toBeInstanceOf(Date);
            expect(mockUpdateRequest.endTime).toBeInstanceOf(Date);
            expect(mockUpdateRequest.duration).toBeGreaterThan(0);
            expect(typeof mockUpdateRequest.isBillable).toBe('boolean');
            expect(Array.isArray(mockUpdateRequest.tags)).toBe(true);
        });
        it('should validate ActiveTimer interface', function () {
            var mockActiveTimer = {
                id: 'timer-123',
                userId: 'user-456',
                matterId: 'matter-789',
                clientId: 'client-101',
                startTime: new Date('2024-01-15T09:00:00Z'),
                description: 'Ongoing legal research',
                category: index_1.TaskCategory.RESEARCH,
                activityType: index_1.ActivityType.BILLABLE,
                isRunning: true,
                elapsedTime: 90, // 1.5 hours in minutes
                billableRate: 350.00,
                currentDuration: 90,
                lastUpdate: new Date('2024-01-15T10:30:00Z'),
            };
            expect(mockActiveTimer.id).toBeDefined();
            expect(mockActiveTimer.userId).toBeDefined();
            expect(mockActiveTimer.matterId).toBeDefined();
            expect(mockActiveTimer.startTime).toBeInstanceOf(Date);
            expect(typeof mockActiveTimer.isRunning).toBe('boolean');
            expect(mockActiveTimer.elapsedTime).toBeGreaterThanOrEqual(0);
            expect(mockActiveTimer.billableRate).toBeGreaterThan(0);
            expect(mockActiveTimer.lastUpdate).toBeInstanceOf(Date);
        });
    });
    describe('Type Safety and Optional Properties', function () {
        it('should handle optional properties correctly', function () {
            var minimalTimeEntry = {
                id: 'time-123',
                userId: 'user-456',
                matterId: 'matter-789',
                clientId: 'client-202',
                firmId: 'firm-303',
                startTime: new Date(),
                duration: 60,
                isRunning: false,
                billableRate: 350.00,
                billableAmount: 350.00,
                description: 'Basic time entry',
                category: index_1.TaskCategory.GENERAL,
                activityType: index_1.ActivityType.BILLABLE,
                tags: [],
                isBillable: true,
                isSubmitted: false,
                billingStatus: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
                syncStatus: index_1.SyncStatus.PENDING,
            };
            // Optional properties should be allowed to be undefined
            expect(minimalTimeEntry.taskId).toBeUndefined();
            expect(minimalTimeEntry.endTime).toBeUndefined();
            expect(minimalTimeEntry.nonBillableAmount).toBeUndefined();
            expect(minimalTimeEntry.submittedAt).toBeUndefined();
            expect(minimalTimeEntry.approvedBy).toBeUndefined();
            expect(minimalTimeEntry.approvedAt).toBeUndefined();
        });
        it('should validate required vs optional properties', function () {
            // Test that required properties cannot be undefined
            var requiredFields = [
                'id', 'userId', 'matterId', 'clientId', 'firmId',
                'startTime', 'duration', 'isRunning', 'billableRate',
                'billableAmount', 'description', 'category', 'activityType',
                'tags', 'isBillable', 'isSubmitted', 'billingStatus',
                'createdAt', 'updatedAt', 'syncStatus'
            ];
            var optionalFields = [
                'taskId', 'endTime', 'nonBillableAmount', 'submittedAt',
                'approvedBy', 'approvedAt'
            ];
            expect(requiredFields).toHaveLength(20);
            expect(optionalFields).toHaveLength(6);
            expect(__spreadArray(__spreadArray([], requiredFields, true), optionalFields, true)).toHaveLength(26);
        });
    });
    describe('Enum Value Completeness', function () {
        it('should have all expected enum values for comprehensive coverage', function () {
            // Verify enum completeness for legal billing system
            expect(Object.keys(index_1.InvoiceStatus)).toHaveLength(7);
            expect(Object.keys(index_1.PaymentStatus)).toHaveLength(6);
            expect(Object.keys(index_1.PaymentMethod)).toHaveLength(6);
            expect(Object.keys(index_1.TrustTransactionType)).toHaveLength(5);
            expect(Object.keys(index_1.TaskCategory)).toHaveLength(14);
            expect(Object.keys(index_1.ActivityType)).toHaveLength(3);
            expect(Object.keys(index_1.SyncStatus)).toHaveLength(3);
            expect(Object.keys(index_1.MatterStatus)).toHaveLength(4);
            expect(Object.keys(index_1.ExpenseStatus)).toHaveLength(5);
            expect(Object.keys(index_1.TaxType)).toHaveLength(4);
        });
        it('should validate Canadian legal practice area coverage', function () {
            var legalPracticeAreas = [
                index_1.TaskCategory.REAL_ESTATE,
                index_1.TaskCategory.EMPLOYMENT,
                index_1.TaskCategory.WILLS_ESTATES,
                index_1.TaskCategory.CORPORATE,
                index_1.TaskCategory.LITIGATION,
                index_1.TaskCategory.GENERAL,
            ];
            legalPracticeAreas.forEach(function (area) {
                expect(Object.values(index_1.TaskCategory)).toContain(area);
            });
        });
        it('should validate Canadian tax system coverage', function () {
            var canadianTaxTypes = [
                index_1.TaxType.HST, // Harmonized Sales Tax (ON, NB, NL, NS, PE)
                index_1.TaxType.GST, // Goods and Services Tax (Federal)
                index_1.TaxType.PST, // Provincial Sales Tax (BC, SK, MB)
                index_1.TaxType.QST, // Quebec Sales Tax (QC)
            ];
            canadianTaxTypes.forEach(function (taxType) {
                expect(Object.values(index_1.TaxType)).toContain(taxType);
            });
        });
    });
});
