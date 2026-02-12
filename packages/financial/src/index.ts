/**
 * Financial Package Index
 * Exports all financial management functionality
 */

export * from './calculation-engine';
export { default as DuesCalculationEngine } from './calculation-engine';

export * from './remittance-parser';
export { default as RemittanceParser } from './remittance-parser';

export { default as ReconciliationEngine, type DuesTransaction, type ReconciliationResult, type ReconciliationInput } from './reconciliation-engine';

// ERP Integration
export * from './erp/types';
export * from './erp/connector-interface';
export * from './erp/gl-integration';
export * from './erp/banking-integration';

// ERP Connectors
export { QuickBooksOnlineConnector } from './erp/connectors/quickbooks-online';
export { XeroConnector } from './erp/connectors/xero';
