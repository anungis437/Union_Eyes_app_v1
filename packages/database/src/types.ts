/**
 * Database Type Exports
 * Centralized type exports for packages/database
 */

// Re-export types from client-safe helpers
import type { CAJurisdiction } from '../../../lib/jurisdiction-helpers-client';
export type { CAJurisdiction };

// Additional database types
export type JurisdictionRuleType = 
  | 'grievance_deadline'
  | 'arbitration_deadline'
  | 'notice_period'
  | 'documentation_requirement'
  | 'filing_procedure'
  | 'appeal_process';

export type OrganizationType =
  | 'national'
  | 'provincial'
  | 'local'
  | 'sector';

export interface JurisdictionRule {
  id: string;
  jurisdiction: CAJurisdiction;
  ruleType: JurisdictionRuleType;
  ruleCategory: string;
  ruleName: string;
  ruleDescription: string;
  legalReference: string;
  ruleParameters: Record<string, any>;
  version: number;
  effectiveDate: Date;
  expiryDate?: Date | null;
  organizationType?: OrganizationType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JurisdictionRuleFilters {
  jurisdiction?: CAJurisdiction;
  ruleType?: JurisdictionRuleType;
  category?: string;
  includeExpired?: boolean;
}
