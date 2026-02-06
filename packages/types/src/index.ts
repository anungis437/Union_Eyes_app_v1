// Export all types
export * from './billing';
export * from './KnowledgeEntry';

// Re-export commonly used types for convenience
export type {
  TimeEntry,
  Invoice,
  Payment,
  TrustAccount,
  TrustTransaction,
  Client,
  Matter,
  BillingRate,
  Expense,
  BillingConfiguration,
  TaxCalculation,
  User,
  Firm,
  ActiveTimer,
  TimeTrackingRequest,
  TimeEntryUpdateRequest
} from './billing';
