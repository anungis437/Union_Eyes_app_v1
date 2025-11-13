/**
 * @fileoverview Database Types - TypeScript interfaces matching Supabase schema
 * Generated from: packages/supabase/migrations/001_create_billing_tables.sql
 * 
 * These types provide type safety when interacting with the Supabase database
 * and ensure consistency between frontend components and backend data.
 */

// =========================================================================
// UTILITY TYPES
// =========================================================================

export type UUID = string;
export type Timestamp = string; // ISO timestamp string
export type Currency = 'CAD' | 'USD';
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

// =========================================================================
// CORE ENTITY TYPES
// =========================================================================

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: JsonObject;
  website?: string;
  logo_url?: string;
  settings: JsonObject;
  subscription_tier: 'basic' | 'professional' | 'enterprise';
  subscription_expires_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
  is_active: boolean;
}

export interface User {
  id: UUID;
  organization_id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'lawyer' | 'paralegal' | 'clerk' | 'user';
  title?: string;
  phone?: string;
  hourly_rate?: number;
  overhead_rate?: number;
  bar_number?: string;
  jurisdiction?: string;
  avatar_url?: string;
  settings: JsonObject;
  last_login_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_active: boolean;
}

export interface Client {
  id: UUID;
  organization_id: UUID;
  client_number: string;
  type: 'individual' | 'corporation' | 'government';
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  address?: JsonObject;
  billing_address?: JsonObject;
  tax_number?: string;
  preferred_language: 'en' | 'fr';
  payment_terms: number;
  credit_limit: number;
  hourly_rate_override?: number;
  notes?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'archived';
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
}

export interface MatterType {
  id: UUID;
  organization_id: UUID;
  name: string;
  code: string;
  description?: string;
  default_hourly_rate?: number;
  time_entry_templates: JsonArray;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Matter {
  id: UUID;
  organization_id: UUID;
  client_id: UUID;
  matter_type_id?: UUID;
  matter_number: string;
  title: string;
  description?: string;
  responsible_lawyer_id: UUID;
  originating_lawyer_id?: UUID;
  status: 'active' | 'closed' | 'on_hold' | 'archived';
  opened_date: string; // Date string
  closed_date?: string;
  statute_date?: string;
  next_review_date?: string;
  hourly_rate?: number;
  flat_fee?: number;
  contingency_rate?: number;
  budget_amount?: number;
  budget_warning_threshold: number;
  retainer_amount: number;
  trust_balance: number;
  billing_method: 'hourly' | 'flat_fee' | 'contingency' | 'pro_bono';
  billing_frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  tags?: string[];
  notes?: string;
  custom_fields: JsonObject;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
}

// =========================================================================
// TIME TRACKING TYPES
// =========================================================================

export interface TimeEntry {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  client_id: UUID;
  matter_id: UUID;
  entry_date: string; // Date string
  start_time?: Timestamp;
  end_time?: Timestamp;
  duration_minutes: number;
  description: string;
  task_code?: string;
  hourly_rate: number;
  billable_amount: number;
  is_billable: boolean;
  is_billed: boolean;
  invoice_id?: UUID;
  timer_id?: UUID;
  source: 'manual' | 'timer' | 'import' | 'mobile';
  location?: string;
  notes?: string;
  tags?: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
}

export interface ActiveTimer {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  client_id: UUID;
  matter_id: UUID;
  description: string;
  hourly_rate: number;
  start_time: Timestamp;
  pause_duration_minutes: number;
  is_paused: boolean;
  last_pause_time?: Timestamp;
  task_code?: string;
  location?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TimeEntryTemplate {
  id: UUID;
  organization_id: UUID;
  user_id?: UUID;
  matter_type_id?: UUID;
  name: string;
  description: string;
  task_code?: string;
  estimated_duration_minutes?: number;
  default_hourly_rate?: number;
  is_billable: boolean;
  tags?: string[];
  usage_count: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
}

// =========================================================================
// BILLING & INVOICING TYPES
// =========================================================================

export interface Invoice {
  id: UUID;
  organization_id: UUID;
  client_id: UUID;
  matter_id?: UUID;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';
  issue_date: string; // Date string
  due_date: string; // Date string
  payment_terms: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  retainer_applied: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  currency: Currency;
  notes?: string;
  terms_and_conditions?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
  sent_at?: Timestamp;
  sent_by?: UUID;
}

export interface InvoiceLineItem {
  id: UUID;
  invoice_id: UUID;
  time_entry_id?: UUID;
  line_type: 'time' | 'expense' | 'flat_fee' | 'adjustment';
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  is_taxable: boolean;
  sort_order: number;
  created_at: Timestamp;
}

export interface Payment {
  id: UUID;
  organization_id: UUID;
  client_id: UUID;
  invoice_id?: UUID;
  payment_date: string; // Date string
  payment_method: string;
  payment_processor?: string;
  processor_transaction_id?: string;
  amount: number;
  currency: Currency;
  reference_number?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processed_at?: Timestamp;
  created_at: Timestamp;
  created_by?: UUID;
}

// =========================================================================
// TRUST ACCOUNTING TYPES (IOLTA Compliance)
// =========================================================================

export interface TrustAccount {
  id: UUID;
  organization_id: UUID;
  account_name: string;
  account_number: string;
  bank_name: string;
  account_type: 'trust' | 'operating' | 'savings';
  currency: Currency;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TrustTransaction {
  id: UUID;
  organization_id: UUID;
  trust_account_id: UUID;
  client_id: UUID;
  matter_id: UUID;
  transaction_date: string; // Date string
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string;
  reference_number?: string;
  source_document?: string;
  invoice_id?: UUID;
  payment_id?: UUID;
  transfer_to_trust_account_id?: UUID;
  is_reconciled: boolean;
  reconciled_at?: Timestamp;
  reconciled_by?: UUID;
  created_at: Timestamp;
  created_by?: UUID;
  notes?: string;
}

export interface TrustLedger {
  id: UUID;
  organization_id: UUID;
  client_id: UUID;
  matter_id: UUID;
  trust_account_id: UUID;
  balance: number;
  last_transaction_date?: string; // Date string
  last_transaction_id?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =========================================================================
// EXPENSE TYPES
// =========================================================================

export interface Expense {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  client_id?: UUID;
  matter_id?: UUID;
  expense_date: string; // Date string
  category: string;
  description: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  currency: Currency;
  exchange_rate: number;
  is_billable: boolean;
  is_billed: boolean;
  markup_percentage: number;
  billable_amount?: number;
  receipt_url?: string;
  vendor_name?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'billed';
  approved_at?: Timestamp;
  approved_by?: UUID;
  invoice_id?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =========================================================================
// AUDIT & COMPLIANCE TYPES
// =========================================================================

export interface AuditLog {
  id: UUID;
  organization_id: UUID;
  table_name: string;
  record_id: UUID;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: JsonObject;
  new_values?: JsonObject;
  changed_fields?: string[];
  user_id?: UUID;
  ip_address?: string;
  user_agent?: string;
  timestamp: Timestamp;
  session_id?: UUID;
}

// =========================================================================
// VIEW TYPES (For Financial Reports)
// =========================================================================

export interface ClientAging {
  client_id: UUID;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  current_balance: number;
  overdue_30: number;
  overdue_60: number;
  overdue_90: number;
  total_outstanding: number;
}

export interface MatterFinancials {
  matter_id: UUID;
  matter_number: string;
  title: string;
  client_name?: string;
  total_time_billed: number;
  total_expenses_billed: number;
  total_invoiced: number;
  total_collected: number;
  budget_amount?: number;
  budget_variance?: number;
  trust_balance: number;
}

// =========================================================================
// FORM & COMPONENT TYPES
// =========================================================================

export interface TimeEntryFormData {
  description: string;
  duration_minutes: number;
  entry_date: Date;
  matter_id: UUID;
  client_id: UUID;
  hourly_rate: number;
  is_billable: boolean;
  task_code?: string;
  notes?: string;
}

export interface TimerData {
  id: UUID;
  description: string;
  start_time: Date;
  duration_minutes: number;
  hourly_rate: number;
  matter_id: UUID;
  client_id: UUID;
  is_running: boolean;
  is_paused: boolean;
}

export interface InvoiceFormData {
  client_id: UUID;
  matter_id?: UUID;
  issue_date: Date;
  due_date: Date;
  payment_terms: number;
  notes?: string;
  line_items: InvoiceLineItemData[];
  retainer_applied?: number;
  trust_transfer_amount?: number;
}

export interface InvoiceLineItemData {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  line_type: 'time' | 'expense' | 'flat_fee' | 'adjustment';
  time_entry_id?: UUID;
}

export interface TrustTransactionFormData {
  client_id: UUID;
  matter_id: UUID;
  trust_account_id: UUID;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'adjustment';
  amount: number;
  description: string;
  transaction_date: Date;
  reference_number?: string;
  notes?: string;
}

// =========================================================================
// SEARCH & FILTER TYPES
// =========================================================================

export interface TimeEntryFilters {
  user_id?: UUID;
  client_id?: UUID;
  matter_id?: UUID;
  start_date?: Date;
  end_date?: Date;
  is_billable?: boolean;
  is_billed?: boolean;
  task_codes?: string[];
}

export interface InvoiceFilters {
  client_id?: UUID;
  matter_id?: UUID;
  status?: Invoice['status'][];
  issue_date_start?: Date;
  issue_date_end?: Date;
  due_date_start?: Date;
  due_date_end?: Date;
  amount_min?: number;
  amount_max?: number;
}

export interface TrustTransactionFilters {
  client_id?: UUID;
  matter_id?: UUID;
  trust_account_id?: UUID;
  transaction_type?: TrustTransaction['transaction_type'][];
  start_date?: Date;
  end_date?: Date;
  is_reconciled?: boolean;
  amount_min?: number;
  amount_max?: number;
}

// =========================================================================
// API RESPONSE TYPES
// =========================================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: JsonObject;
  };
  success: boolean;
}

export interface BulkOperationResult {
  success_count: number;
  error_count: number;
  errors?: Array<{
    index: number;
    message: string;
  }>;
}

// =========================================================================
// DOCUMENT AND AI TYPES
// =========================================================================

export interface Document {
  id: UUID;
  organization_id: UUID;
  matter_id?: UUID;
  client_id?: UUID;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  extracted_text?: string;
  content?: string;
  document_type?: string;
  practice_area?: string;
  status: 'processing' | 'ready' | 'error';
  metadata?: JsonObject;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
}

export interface ClassificationTraining {
  id: UUID;
  text: string;
  document_type: string;
  practice_area?: string;
  verified: boolean;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface DocumentClassification {
  id: UUID;
  document_id: UUID;
  document_type: string;
  confidence: number;
  practice_area?: string;
  alternatives?: JsonArray;
  metadata?: JsonObject;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DocumentAnalysis {
  id: UUID;
  document_id: UUID;
  analysis_data: JsonObject;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface DocumentExtraction {
  id: UUID;
  document_id: UUID;
  fields: JsonObject;
  structured_data: JsonObject;
  extraction_metadata?: JsonObject;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =========================================================================
// SUPABASE SPECIFIC TYPES
// =========================================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Client, 'id' | 'created_at'>>;
      };
      matters: {
        Row: Matter;
        Insert: Omit<Matter, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Matter, 'id' | 'created_at'>>;
      };
      time_entries: {
        Row: TimeEntry;
        Insert: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TimeEntry, 'id' | 'created_at'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Invoice, 'id' | 'created_at'>>;
      };
      trust_transactions: {
        Row: TrustTransaction;
        Insert: Omit<TrustTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<TrustTransaction, 'id' | 'created_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Document, 'id' | 'created_at'>>;
      };
      classification_training: {
        Row: ClassificationTraining;
        Insert: Omit<ClassificationTraining, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ClassificationTraining, 'id' | 'created_at'>>;
      };
      document_classifications: {
        Row: DocumentClassification;
        Insert: Omit<DocumentClassification, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DocumentClassification, 'id' | 'created_at'>>;
      };
      document_analysis: {
        Row: DocumentAnalysis;
        Insert: Omit<DocumentAnalysis, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DocumentAnalysis, 'id' | 'created_at'>>;
      };
      document_extraction: {
        Row: DocumentExtraction;
        Insert: Omit<DocumentExtraction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DocumentExtraction, 'id' | 'created_at'>>;
      };
      // ... other tables would follow the same pattern
    };
    Views: {
      client_aging: {
        Row: ClientAging;
      };
      matter_financials: {
        Row: MatterFinancials;
      };
    };
    Functions: {
      get_user_organization_id: {
        Args: Record<string, never>;
        Returns: UUID;
      };
      can_access_matter: {
        Args: { matter_id: UUID };
        Returns: boolean;
      };
      can_access_client: {
        Args: { client_id: UUID };
        Returns: boolean;
      };
    };
  };
}

// =========================================================================
// EXPORT SUMMARY
// =========================================================================

// All types are already exported individually above
// This file provides comprehensive TypeScript types for the CourtLens billing system
// matching the Supabase database schema with full type safety.