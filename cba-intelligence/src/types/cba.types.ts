// CBA Types and Interfaces
export interface CBA {
  id: string;
  jurisdiction: 'federal' | 'ontario' | 'bc' | 'alberta' | 'quebec' | 'manitoba' | 'saskatchewan';
  employerName: string;
  unionName: string;
  title: string;
  effectiveDate: Date;
  expiryDate: Date;
  industrySector: string;
  employeeCount?: number;
  documentUrl: string;
  rawText: string;
  structuredData: CBAStructuredData;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CBAStructuredData {
  tableOfContents: TableOfContentsItem[];
  clauses: CBAClause[];
  schedules: Schedule[];
  appendices: Appendix[];
  metadata: CBAMetadata;
}

export interface CBAClause {
  id: string;
  cbaId: string;
  clauseType: ClauseType;
  clauseNumber: string;
  title: string;
  content: string;
  pageNumber: number;
  sectionHierarchy: string[];
  entities: ExtractedEntity[];
  embedding?: number[];
  confidenceScore: number;
  createdAt: Date;
}

export interface ClauseMatch {
  id: string;
  clauseId: string;
  cbaId: string;
  title: string;
  content: string;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'structural';
}

export type ClauseType = 
  | 'wages_compensation'
  | 'benefits_insurance'
  | 'working_conditions'
  | 'grievance_arbitration'
  | 'seniority_promotion'
  | 'health_safety'
  | 'union_rights'
  | 'management_rights'
  | 'duration_renewal'
  | 'vacation_leave'
  | 'hours_scheduling'
  | 'disciplinary_procedures'
  | 'training_development'
  | 'other';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  startPos: number;
  endPos: number;
  confidence: number;
}

export type EntityType = 
  | 'monetary_amount'
  | 'percentage'
  | 'date'
  | 'duration'
  | 'job_title'
  | 'organization'
  | 'location'
  | 'regulation_reference'
  | 'person';

export interface CBAMetadata {
  bargainingUnit: string;
  unionLocal?: string;
  numberOfEmployees: number;
  geographicScope: string;
  previousAgreementId?: string;
  negotiationHistory?: NegotiationEvent[];
}

export interface NegotiationEvent {
  date: Date;
  eventType: 'negotiation_start' | 'tentative_agreement' | 'ratification' | 'strike' | 'lockout';
  description: string;
}

export interface TableOfContentsItem {
  section: string;
  title: string;
  pageNumber: number;
  subsections?: TableOfContentsItem[];
}

export interface Schedule {
  id: string;
  title: string;
  type: 'wage_schedule' | 'benefit_schedule' | 'classification_schedule';
  content: ScheduleContent;
}

export interface ScheduleContent {
  headers: string[];
  rows: ScheduleRow[];
}

export interface ScheduleRow {
  cells: string[];
  metadata?: Record<string, any>;
}

export interface Appendix {
  id: string;
  title: string;
  content: string;
  type: 'form' | 'policy' | 'procedure' | 'reference';
}

// Search and Analysis Types
export interface CBASearchFilters {
  jurisdiction?: string[];
  employerName?: string;
  unionName?: string;
  industrySector?: string[];
  clauseTypes?: ClauseType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  employeeCountRange?: {
    min: number;
    max: number;
  };
}

export interface CBASearchResult {
  cba: CBA;
  relevantClauses: CBAClause[];
  similarityScore: number;
  highlightedText: string[];
}

export interface ClauseComparison {
  sourceClause: CBAClause;
  comparableClauses: ComparableClause[];
  analysis: ComparisonAnalysis;
}

export interface ComparableClause {
  clause: CBAClause;
  cba: CBA;
  similarityScore: number;
  differences: ClauseDifference[];
}

export interface ClauseDifference {
  type: 'wage_amount' | 'benefit_level' | 'procedure_step' | 'timeline' | 'eligibility';
  sourceValue: string;
  comparableValue: string;
  significance: 'major' | 'minor' | 'neutral';
}

export interface ComparisonAnalysis {
  summary: string;
  keyDifferences: string[];
  recommendations: string[];
  marketPosition: 'above_average' | 'average' | 'below_average';
}

// Analytics Types
export interface WageProgression {
  employerName: string;
  unionName: string;
  jobClassification: string;
  progressionSteps: WageStep[];
  currentAgreementId: string;
}

export interface WageStep {
  step: number;
  hourlyRate: number;
  effectiveDate: Date;
  requirements?: string;
}

export interface BenefitComparison {
  benefitType: string;
  employerBenefits: EmployerBenefit[];
  industryAverage: BenefitMetric;
  trend: 'improving' | 'stable' | 'declining';
}

export interface EmployerBenefit {
  employerName: string;
  benefitValue: string | number;
  cbaId: string;
  effectiveDate: Date;
}

export interface BenefitMetric {
  average: number;
  median: number;
  range: {
    min: number;
    max: number;
  };
}

export interface NegotiationPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  typicalDuration: number; // days
  associatedOutcomes: string[];
}

// API Response Types
export interface CBASearchResponse {
  results: CBASearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: CBASearchFilters;
  searchQuery?: string;
}

export interface ClauseClassificationResponse {
  clauseId: string;
  classification: ClauseType;
  confidence: number;
  entities: ExtractedEntity[];
  suggestions?: string[];
}

export interface SimilarClausesResponse {
  sourceClauseId: string;
  similarClauses: ComparableClause[];
  totalFound: number;
}

// Dashboard and UI Types
export interface DashboardMetrics {
  totalCBAs: number;
  totalClauses: number;
  jurisdictionBreakdown: JurisdictionMetric[];
  recentUpdates: CBA[];
  popularSearches: SearchMetric[];
}

export interface JurisdictionMetric {
  jurisdiction: string;
  cbaCount: number;
  lastUpdated: Date;
}

export interface SearchMetric {
  query: string;
  searchCount: number;
  lastSearched: Date;
}

// User and Access Types
export interface CBAUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  userType: 'union' | 'employer' | 'law_firm' | 'arbitrator' | 'researcher';
  accessLevel: 'basic' | 'premium' | 'enterprise';
  subscriptionEnd?: Date;
}

export interface AccessLog {
  id: string;
  userId: string;
  action: 'search' | 'view_cba' | 'download' | 'compare' | 'export';
  resourceId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// FPSLREB and Tribunal-Specific Types
export enum TribunalType {
  FPSLREB = 'fpslreb', // Federal Public Sector Labour Relations and Employment Board
  PROVINCIAL_LRB = 'provincial_lrb',
  PRIVATE_ARBITRATOR = 'private_arbitrator',
  FEDERAL_COURT = 'federal_court',
  PROVINCIAL_COURT = 'provincial_court'
}

export enum DecisionType {
  GRIEVANCE_ADJUDICATION = 'grievance_adjudication',
  COLLECTIVE_BARGAINING_DISPUTE = 'collective_bargaining_dispute',
  STAFFING_COMPLAINT = 'staffing_complaint',
  COMPLIANCE_ORDER = 'compliance_order',
  INTERPRETATION_RULING = 'interpretation_ruling',
  JURISDICTIONAL_DECISION = 'jurisdictional_decision',
  ESSENTIAL_SERVICES = 'essential_services'
}

export interface ArbitrationDecision {
  id: string;
  caseNumber: string;
  tribunal: TribunalType;
  decisionType: DecisionType;
  date: Date;
  arbitrator: string;
  panelMembers?: string[];
  parties: {
    grievor?: string;
    applicant?: string;
    union: string;
    employer: string;
  };
  outcome: 'grievance_upheld' | 'grievance_denied' | 'partial_success' | 'dismissed' | 'withdrawn' | 'settled';
  remedy?: {
    monetaryAward?: number;
    reinstatement?: boolean;
    correctiveAction?: string;
    policy_change?: string;
    training_required?: boolean;
    other?: string;
  };
  keyFindings: string[];
  precedentValue: 'high' | 'medium' | 'low';
  issueTypes: string[];
  tags: string[];
  fullText: string;
  summary: string;
  citationCount: number;
  relatedDecisions: string[];
  legalCitations: string[];
  sector: string;
  jurisdiction: string;
  language: 'en' | 'fr' | 'bilingual';
}

export interface FPSLREBCase extends ArbitrationDecision {
  // FPSLREB-specific fields
  fileNumber: string;
  hearingDates?: Date[];
  representativeFor: {
    grievor?: string;
    union?: string;
    employer?: string;
  };
  legislativeProvisions: string[];
  collectiveAgreementClauses: string[];
  grievanceLevel: 'individual' | 'group' | 'policy';
  timelinessIssues?: boolean;
  jurisdictionalChallenges?: boolean;
}

// Union Claims Integration Types
export interface CBAReference {
  id: string;
  title: string;
  unionName: string;
  employerName: string;
  jurisdiction: 'federal' | 'provincial' | 'municipal';
  sector: string;
  relevanceScore: number;
  similarClauses: ClauseMatch[];
  applicableDecisions: ArbitrationDecision[];
}

export interface ClaimPrecedentAnalysis {
  claimId: string;
  precedentMatches: ArbitrationDecision[];
  successProbability: number;
  suggestedStrategy: string;
  keyEvidence: string[];
  potentialRemedies: string[];
  arbitratorTendencies?: ArbitratorProfile;
}

export interface ArbitratorProfile {
  name: string;
  totalDecisions: number;
  grievorSuccessRate: number;
  averageAwardAmount: number;
  commonRemedies: string[];
  specializations: string[];
  decisionTimeframe: {
    average: number; // days
    range: [number, number];
  };
}
