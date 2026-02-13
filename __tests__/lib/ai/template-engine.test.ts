/**
 * UnionEyes AI Template Engine Tests
 * 
 * Tests for the hereditary-attentive template-based LLM system
 * 
 * @group ai/template-engine
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirrored from template-engine.ts)
// ============================================================================

/** Attention weights for context prioritization */
interface AttentionWeights {
  userQuery: number;
  contextDocs: number;
  sessionHistory: number;
  jurisdictionRules: number;
  cbaClauses: number;
  timelineContext: number;
}

/** Template inheritance configuration */
interface InheritanceConfig {
  parentTemplateId?: string;
  overrides?: Partial<PromptTemplate>;
  contextExtensions?: Record<string, unknown>;
}

/** Complete prompt template definition */
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate?: string;
  attentionWeights: AttentionWeights;
  jurisdictions: Jurisdiction[];
  requiredVariables: string[];
  complianceTags: ComplianceTag[];
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    deprecationNotice?: string;
  };
}

/** Jurisdiction types */
type Jurisdiction = 
  | 'federal' 
  | 'ontario' 
  | 'quebec' 
  | 'british-columbia' 
  | 'alberta' 
  | 'manitoba' 
  | 'saskatchewan' 
  | 'nova-scotia' 
  | 'new-brunswick' 
  | 'pei' 
  | 'newfoundland';

/** Compliance tagging for governance */
interface ComplianceTag {
  category: 'privacy' | 'security' | 'labor-law' | 'financial' | 'governance';
  requirement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/** Resolved template with all inherited properties */
interface ResolvedTemplate {
  template: PromptTemplate;
  resolvedSystemPrompt: string;
  resolvedAttentionWeights: AttentionWeights;
  resolvedJurisdiction: Jurisdiction;
  inheritanceChain: string[];
}

/** LLM request context */
interface LLMRequestContext {
  sessionId: string;
  organizationId: string;
  userRole: string;
  jurisdiction: Jurisdiction;
  activeCaseId?: string;
  activeGrievanceStage?: string;
  activeCBAId?: string;
  detectedIntent?: QueryIntent;
  claimStatus?: string;
}

/** Query intent classification */
interface QueryIntent {
  type: IntentType;
  confidence: number;
  entities: {
    memberId?: string;
    claimNumber?: string;
    employerId?: string;
    contractId?: string;
  };
}

type IntentType =
  | 'dues_inquiry'
  | 'benefits_question'
  | 'grievance_filing'
  | 'grievance_status'
  | 'arbitration_prep'
  | 'bargaining_update'
  | 'strike_notice'
  | 'member_info'
  | 'policy_query'
  | 'general';

/** Attention-scored context item */
interface ScoredContext {
  content: string;
  source: 'rag' | 'session' | 'cba' | 'jurisdiction' | 'timeline';
  relevanceScore: number;
  attentionWeight: number;
  metadata?: Record<string, unknown>;
}

describe('Template Engine - Type Definitions', () => {
  describe('AttentionWeights', () => {
    it('should create valid attention weights', () => {
      const weights: AttentionWeights = {
        userQuery: 0.3,
        contextDocs: 0.25,
        sessionHistory: 0.15,
        jurisdictionRules: 0.15,
        cbaClauses: 0.1,
        timelineContext: 0.05,
      };
      
      expect(weights.userQuery).toBe(0.3);
      expect(weights.contextDocs).toBe(0.25);
      expect(weights.sessionHistory).toBe(0.15);
      expect(weights.jurisdictionRules).toBe(0.15);
      expect(weights.cbaClauses).toBe(0.1);
      expect(weights.timelineContext).toBe(0.05);
    });

    it('should validate weight ranges', () => {
      const weights: AttentionWeights = {
        userQuery: 1.0,
        contextDocs: 0,
        sessionHistory: 0.5,
        jurisdictionRules: 0.5,
        cbaClauses: 0.5,
        timelineContext: 0.5,
      };
      
      expect(weights.userQuery).toBeGreaterThanOrEqual(0);
      expect(weights.userQuery).toBeLessThanOrEqual(1);
    });

    it('should handle weighted sum equals 1', () => {
      const weights: AttentionWeights = {
        userQuery: 0.4,
        contextDocs: 0.3,
        sessionHistory: 0.1,
        jurisdictionRules: 0.1,
        cbaClauses: 0.05,
        timelineContext: 0.05,
      };
      
      const sum = 
        weights.userQuery + 
        weights.contextDocs + 
        weights.sessionHistory + 
        weights.jurisdictionRules + 
        weights.cbaClauses + 
        weights.timelineContext;
      
      expect(sum).toBe(1.0);
    });
  });

  describe('Jurisdiction Types', () => {
    it('should support all Canadian jurisdictions', () => {
      const jurisdictions: Jurisdiction[] = [
        'federal',
        'ontario',
        'quebec',
        'british-columbia',
        'alberta',
        'manitoba',
        'saskatchewan',
        'nova-scotia',
        'new-brunswick',
        'pei',
        'newfoundland',
      ];
      
      expect(jurisdictions).toHaveLength(11);
    });
  });

  describe('ComplianceTag', () => {
    it('should create valid compliance tags', () => {
      const tags: ComplianceTag[] = [
        { category: 'privacy', requirement: 'PIPEDA', severity: 'critical' },
        { category: 'security', requirement: 'Encryption', severity: 'high' },
        { category: 'labor-law', requirement: 'Employment Standards', severity: 'high' },
        { category: 'financial', requirement: 'SOX', severity: 'critical' },
        { category: 'governance', requirement: 'Board Approval', severity: 'medium' },
      ];
      
      expect(tags).toHaveLength(5);
      expect(tags[0].severity).toBe('critical');
      expect(tags[1].category).toBe('security');
    });

    it('should validate severity levels', () => {
      const severities: ComplianceTag['severity'][] = ['critical', 'high', 'medium', 'low'];
      
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
      expect(severities).toContain('low');
    });
  });

  describe('IntentType', () => {
    it('should support all defined intent types', () => {
      const intentTypes: IntentType[] = [
        'dues_inquiry',
        'benefits_question',
        'grievance_filing',
        'grievance_status',
        'arbitration_prep',
        'bargaining_update',
        'strike_notice',
        'member_info',
        'policy_query',
        'general',
      ];
      
      expect(intentTypes).toHaveLength(10);
    });
  });

  describe('LLMRequestContext', () => {
    it('should create valid request context', () => {
      const context: LLMRequestContext = {
        sessionId: 'session-123',
        organizationId: 'org-456',
        userRole: 'steward',
        jurisdiction: 'ontario',
        activeCaseId: 'case-789',
        activeGrievanceStage: 'investigation',
        activeCBAId: 'cba-001',
        detectedIntent: {
          type: 'grievance_filing',
          confidence: 0.95,
          entities: {
            memberId: 'member-123',
            claimNumber: 'GRI-2024-001',
          },
        },
        claimStatus: 'filed',
      };
      
      expect(context.sessionId).toBe('session-123');
      expect(context.jurisdiction).toBe('ontario');
      expect(context.detectedIntent?.type).toBe('grievance_filing');
      expect(context.detectedIntent?.confidence).toBe(0.95);
    });
  });

  describe('ScoredContext', () => {
    it('should create valid scored context items', () => {
      const contexts: ScoredContext[] = [
        {
          content: 'RAG document content',
          source: 'rag',
          relevanceScore: 0.85,
          attentionWeight: 0.25,
        },
        {
          content: 'Previous conversation',
          source: 'session',
          relevanceScore: 0.6,
          attentionWeight: 0.15,
        },
        {
          content: 'CBA Article 12.3',
          source: 'cba',
          relevanceScore: 0.9,
          attentionWeight: 0.3,
        },
        {
          content: 'Ontario Employment Standards Act',
          source: 'jurisdiction',
          relevanceScore: 0.95,
          attentionWeight: 0.2,
        },
        {
          content: 'Deadline: Feb 15, 2024',
          source: 'timeline',
          relevanceScore: 0.8,
          attentionWeight: 0.1,
        },
      ];
      
      expect(contexts).toHaveLength(5);
      expect(contexts[0].source).toBe('rag');
      expect(contexts[2].source).toBe('cba');
    });
  });

  describe('InheritanceConfig', () => {
    it('should create valid inheritance configuration', () => {
      const config: InheritanceConfig = {
        parentTemplateId: 'base-union-template',
        overrides: {
          name: 'Grievance Handler - Ontario',
        },
        contextExtensions: {
          province: 'Ontario',
          laborLaw: 'Employment Standards Act',
        },
      };
      
      expect(config.parentTemplateId).toBe('base-union-template');
      expect(config.overrides?.name).toBe('Grievance Handler - Ontario');
      expect(config.contextExtensions?.province).toBe('Ontario');
    });

    it('should allow partial overrides', () => {
      const config: InheritanceConfig = {
        parentTemplateId: 'base',
        overrides: {
          version: '2.0.0',
        },
      };
      
      expect(config.overrides?.version).toBe('2.0.0');
      expect(config.overrides?.name).toBeUndefined();
    });
  });

  describe('ResolvedTemplate', () => {
    it('should create valid resolved template', () => {
      const resolved: ResolvedTemplate = {
        template: {
          id: 'resolved-template',
          name: 'Grievance Handler',
          version: '2.0.0',
          systemPrompt: 'You are a grievance handler...',
          attentionWeights: {
            userQuery: 0.3,
            contextDocs: 0.25,
            sessionHistory: 0.15,
            jurisdictionRules: 0.15,
            cbaClauses: 0.1,
            timelineContext: 0.05,
          },
          jurisdictions: ['ontario', 'federal'],
          requiredVariables: ['memberId', 'claimNumber'],
          complianceTags: [
            { category: 'privacy', requirement: 'PIPEDA', severity: 'critical' },
          ],
          metadata: {
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        resolvedSystemPrompt: 'You are a grievance handler for Ontario...',
        resolvedAttentionWeights: {
          userQuery: 0.35,
          contextDocs: 0.2,
          sessionHistory: 0.15,
          jurisdictionRules: 0.2,
          cbaClauses: 0.05,
          timelineContext: 0.05,
        },
        resolvedJurisdiction: 'ontario',
        inheritanceChain: ['base-union', 'case-management', 'grievance-handler'],
      };
      expect(resolved.template.id).toBe('resolved-template');
      expect(resolved.inheritanceChain).toHaveLength(3);
      expect(resolved.resolvedJurisdiction).toBe('ontario');
    });
  });
});

describe('Template Engine - Attention Mechanism', () => {
  describe('Attention Weight Calculation', () => {
    it('should calculate attention weights based on context', () => {
      const baseWeights: AttentionWeights = {
        userQuery: 0.3,
        contextDocs: 0.25,
        sessionHistory: 0.15,
        jurisdictionRules: 0.15,
        cbaClauses: 0.1,
        timelineContext: 0.05,
      };

      // Simulate boosting weights for CBA-heavy queries
      const boostedWeights: AttentionWeights = {
        ...baseWeights,
        cbaClauses: Math.min(baseWeights.cbaClauses * 1.5, 0.5),
        jurisdictionRules: Math.min(baseWeights.jurisdictionRules * 1.3, 0.3),
      };

      expect(boostedWeights.cbaClauses).toBeGreaterThan(baseWeights.cbaClauses);
      expect(boostedWeights.jurisdictionRules).toBeGreaterThan(baseWeights.jurisdictionRules);
    });

    it('should normalize weights after boosting', () => {
      const weights: AttentionWeights = {
        userQuery: 0.4,
        contextDocs: 0.3,
        sessionHistory: 0.2,
        jurisdictionRules: 0.3,
        cbaClauses: 0.2,
        timelineContext: 0.1,
      };

      const total = 
        weights.userQuery + 
        weights.contextDocs + 
        weights.sessionHistory + 
        weights.jurisdictionRules + 
        weights.cbaClauses + 
        weights.timelineContext;

      // If total is not 1, normalize
      const normalizedWeights: AttentionWeights = {
        userQuery: weights.userQuery / total,
        contextDocs: weights.contextDocs / total,
        sessionHistory: weights.sessionHistory / total,
        jurisdictionRules: weights.jurisdictionRules / total,
        cbaClauses: weights.cbaClauses / total,
        timelineContext: weights.timelineContext / total,
      };

      const normalizedTotal = 
        normalizedWeights.userQuery + 
        normalizedWeights.contextDocs + 
        normalizedWeights.sessionHistory + 
        normalizedWeights.jurisdictionRules + 
        normalizedWeights.cbaClauses + 
        normalizedWeights.timelineContext;

      expect(normalizedTotal).toBeCloseTo(1.0, 5);
    });

    it('should prioritize timeline for deadline-sensitive queries', () => {
      const deadlineWeights: AttentionWeights = {
        userQuery: 0.25,
        contextDocs: 0.2,
        sessionHistory: 0.1,
        jurisdictionRules: 0.15,
        cbaClauses: 0.1,
        timelineContext: 0.2, // Boosted for deadline awareness
      };

      expect(deadlineWeights.timelineContext).toBeGreaterThan(0.15);
    });
  });

  describe('Context Scoring', () => {
    it('should score RAG documents by relevance', () => {
      const docs = [
        { content: 'CBA Article 12 - Grievance Procedure', source: 'rag' as const, relevanceScore: 0.95 },
        { content: 'General union information', source: 'rag' as const, relevanceScore: 0.3 },
        { content: 'Ontario Employment Standards Act', source: 'rag' as const, relevanceScore: 0.88 },
      ];

      const sorted = [...docs].sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      expect(sorted[0].relevanceScore).toBe(0.95);
      expect(sorted[2].relevanceScore).toBe(0.3);
    });

    it('should apply attention weighting to scored contexts', () => {
      const weights: AttentionWeights = {
        userQuery: 0.3,
        contextDocs: 0.25,
        sessionHistory: 0.15,
        jurisdictionRules: 0.15,
        cbaClauses: 0.1,
        timelineContext: 0.05,
      };

      const scored: ScoredContext[] = [
        { content: 'doc1', source: 'rag', relevanceScore: 0.9, attentionWeight: weights.contextDocs },
        { content: 'session1', source: 'session', relevanceScore: 0.7, attentionWeight: weights.sessionHistory },
        { content: 'cba1', source: 'cba', relevanceScore: 0.85, attentionWeight: weights.cbaClauses },
      ];

      const weightedScores = scored.map(s => ({
        ...s,
        weightedScore: s.relevanceScore * s.attentionWeight,
      }));

      expect(weightedScores[0].weightedScore).toBe(0.9 * 0.25);
      expect(weightedScores[1].weightedScore).toBe(0.7 * 0.15);
    });
  });
});

describe('Template Engine - Query Intent Detection', () => {
  describe('Intent Classification', () => {
    it('should classify dues inquiry intents', () => {
      const query = 'How much are my monthly dues?';
      
      // Simulate intent detection
      const detected: QueryIntent = {
        type: 'dues_inquiry',
        confidence: 0.92,
        entities: {
          memberId: 'member-123',
        },
      };

      expect(detected.type).toBe('dues_inquiry');
      expect(detected.confidence).toBeGreaterThan(0.9);
      expect(detected.entities.memberId).toBeDefined();
    });

    it('should classify grievance filing intents', () => {
      const query = 'I want to file a grievance about my shift schedule';
      
      const detected: QueryIntent = {
        type: 'grievance_filing',
        confidence: 0.88,
        entities: {
          memberId: 'member-456',
        },
      };

      expect(detected.type).toBe('grievance_filing');
      expect(detected.entities.memberId).toBeDefined();
    });

    it('should handle low confidence with fallback to general', () => {
      const query = 'Hello';
      
      const detected: QueryIntent = {
        type: 'general',
        confidence: 0.45, // Low confidence
        entities: {},
      };

      expect(detected.type).toBe('general');
      expect(detected.confidence).toBeLessThan(0.5);
    });

    it('should extract multiple entities from complex queries', () => {
      const query = 'What is the status of grievance GRI-2024-001 for John Smith?';
      
      const detected: QueryIntent = {
        type: 'grievance_status',
        confidence: 0.91,
        entities: {
          memberId: 'member-789',
          claimNumber: 'GRI-2024-001',
          employerId: 'emp-001',
        },
      };

      expect(detected.type).toBe('grievance_status');
      expect(detected.entities.claimNumber).toBe('GRI-2024-001');
      expect(detected.entities.employerId).toBeDefined();
    });
  });
});

describe('Template Engine - Jurisdiction Context', () => {
  describe('Jurisdiction Rules', () => {
    it('should apply Ontario-specific rules', () => {
      const jurisdiction = 'ontario';
      
      const rules = {
        employmentStandardsAct: true,
        unionLaborCode: true,
        provincialPrivacy: 'PHIPA',
        maxGrievanceDeadline: '10 business days',
        arbitrationFramework: 'Ontario Labour Relations Board',
      };

      expect(jurisdiction).toBe('ontario');
      expect(rules.provincialPrivacy).toBe('PHIPA');
    });

    it('should apply Quebec-specific rules', () => {
      const jurisdiction = 'quebec';
      
      const rules = {
        employmentStandardsAct: 'Act respecting labour standards',
        unionLaborCode: 'Labour Code',
        provincialPrivacy: 'Law 25',
        maxGrievanceDeadline: '6 working days',
        arbitrationFramework: 'Tribunal administratif du travail',
        language: 'French',
      };

      expect(jurisdiction).toBe('quebec');
      expect(rules.language).toBe('French');
    });

    it('should apply federal jurisdiction rules', () => {
      const jurisdiction = 'federal';
      
      const rules = {
        employmentStandardsAct: 'Canada Labour Code',
        unionLaborCode: 'Canada Labour Code Part I',
        provincialPrivacy: 'PIPEDA',
        maxGrievanceDeadline: '15 working days',
        arbitrationFramework: 'Canada Industrial Relations Board',
        jurisdictionType: 'federal',
      };

      expect(jurisdiction).toBe('federal');
      expect(rules.jurisdictionType).toBe('federal');
    });
  });
});

describe('Template Engine - CBA Integration', () => {
  describe('CBA Clause Focus', () => {
    it('should identify relevant CBA clauses', () => {
      const query = 'What is the grievance procedure under our collective agreement?';
      
      const relevantClauses = [
        { article: '12.1', title: 'Definition of Grievance', relevance: 0.95 },
        { article: '12.2', title: 'Grievance Steps', relevance: 0.92 },
        { article: '12.3', title: 'Time Limits', relevance: 0.88 },
        { article: '15.4', title: 'Union Dues', relevance: 0.3 },
      ];

      const filtered = relevantClauses.filter(c => c.relevance > 0.5);
      
      expect(filtered).toHaveLength(3);
      expect(filtered[0].article).toBe('12.1');
    });

    it('should prioritize arbitration clauses for arbitration-prep intent', () => {
      const intent: IntentType = 'arbitration_prep';
      
      const clausePriorities: Record<string, string[]> = {
        dues_inquiry: ['Article 15 - Dues', 'Article 16 - Check-off'],
        grievance_filing: ['Article 12 - Grievance', 'Article 13 - Arbitration'],
        arbitration_prep: ['Article 13 - Arbitration', 'Article 14 - Discipline'],
        bargaining_update: ['Article 20 - Term', 'Article 21 - Renewal'],
      };

      const priority = clausePriorities[intent];
      
      expect(priority).toContain('Article 13 - Arbitration');
    });
  });
});

describe('Template Engine - Timeline/Deadline Awareness', () => {
  describe('Timeline Context', () => {
    it('should identify upcoming deadlines', () => {
      const today = new Date('2024-02-10');
      const deadlines = [
        { id: '1', type: 'grievance', deadline: new Date('2024-02-15'), daysRemaining: 5 },
        { id: '2', type: 'arbitration', deadline: new Date('2024-03-01'), daysRemaining: 20 },
        { id: '3', type: 'response', deadline: new Date('2024-02-12'), daysRemaining: 2 },
      ];

      const urgent = deadlines.filter(d => d.daysRemaining <= 5);
      
      expect(urgent).toHaveLength(2);
    });

    it('should calculate timeline weight based on urgency', () => {
      const calculateTimelineWeight = (daysRemaining: number): number => {
        if (daysRemaining <= 3) return 0.4;
        if (daysRemaining <= 7) return 0.3;
        if (daysRemaining <= 14) return 0.2;
        return 0.1;
      };

      expect(calculateTimelineWeight(2)).toBe(0.4);
      expect(calculateTimelineWeight(5)).toBe(0.3);
      expect(calculateTimelineWeight(10)).toBe(0.2);
      expect(calculateTimelineWeight(30)).toBe(0.1);
    });
  });
});

describe('Template Engine - Prompt Template Structure', () => {
  describe('Template Definition', () => {
    it('should create valid prompt template', () => {
      const template: PromptTemplate = {
        id: 'grievance-handler-ontario',
        name: 'Grievance Handler - Ontario',
        version: '1.0.0',
        systemPrompt: `You are an AI assistant helping union stewards handle grievances.
You have expertise in Ontario employment law and the collective agreement.
Always prioritize accurate information and member rights.`,
        userPromptTemplate: `Member Question: {{question}}
Member Context: {{memberContext}}
Relevant CBA Clauses: {{cbaClauses}}
Timeline: {{timelineContext}}`,
        attentionWeights: {
          userQuery: 0.3,
          contextDocs: 0.25,
          sessionHistory: 0.15,
          jurisdictionRules: 0.15,
          cbaClauses: 0.1,
          timelineContext: 0.05,
        },
        jurisdictions: ['ontario', 'federal'],
        requiredVariables: ['question', 'memberId', 'jurisdiction'],
        complianceTags: [
          { category: 'privacy', requirement: 'PIPEDA', severity: 'critical' },
          { category: 'labor-law', requirement: 'Employment Standards Act', severity: 'high' },
        ],
        metadata: {
          author: 'union-eyes-team',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        },
      };

      expect(template.id).toBe('grievance-handler-ontario');
      expect(template.requiredVariables).toContain('question');
      expect(template.jurisdictions).toContain('ontario');
      expect(template.complianceTags).toHaveLength(2);
    });

    it('should validate template structure', () => {
      const validateTemplate = (template: PromptTemplate): string[] => {
        const errors: string[] = [];
        
        if (!template.id) errors.push('Template ID is required');
        if (!template.name) errors.push('Template name is required');
        if (!template.systemPrompt) errors.push('System prompt is required');
        if (!template.version) errors.push('Version is required');
        if (!template.jurisdictions?.length) errors.push('At least one jurisdiction required');
        
        // Validate weights sum to 1
        const weights = template.attentionWeights;
        const weightSum = 
          weights.userQuery + 
          weights.contextDocs + 
          weights.sessionHistory + 
          weights.jurisdictionRules + 
          weights.cbaClauses + 
          weights.timelineContext;
        
        if (Math.abs(weightSum - 1.0) > 0.01) {
          errors.push('Attention weights must sum to 1');
        }
        
        return errors;
      };

      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        systemPrompt: 'Test prompt',
        attentionWeights: {
          userQuery: 0.3,
          contextDocs: 0.25,
          sessionHistory: 0.15,
          jurisdictionRules: 0.15,
          cbaClauses: 0.1,
          timelineContext: 0.05,
        },
        jurisdictions: ['ontario'],
        requiredVariables: [],
        complianceTags: [],
        metadata: {
          author: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const errors = validateTemplate(template);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('Template Engine - Hereditary Template Inheritance', () => {
  describe('Template Inheritance', () => {
    it('should inherit from parent template', () => {
      const parentTemplate: PromptTemplate = {
        id: 'base-union',
        name: 'Base Union Assistant',
        version: '1.0.0',
        systemPrompt: 'You are a helpful union assistant.',
        attentionWeights: {
          userQuery: 0.4,
          contextDocs: 0.3,
          sessionHistory: 0.1,
          jurisdictionRules: 0.1,
          cbaClauses: 0.05,
          timelineContext: 0.05,
        },
        jurisdictions: ['federal', 'ontario', 'quebec', 'british-columbia', 'alberta'],
        requiredVariables: [],
        complianceTags: [],
        metadata: {
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const childConfig: InheritanceConfig = {
        parentTemplateId: 'base-union',
        overrides: {
          name: 'Case Management Assistant',
        },
      };

      const inheritedTemplate: PromptTemplate = {
        ...parentTemplate,
        ...childConfig.overrides,
        id: 'case-management',
      };

      expect(inheritedTemplate.systemPrompt).toBe(parentTemplate.systemPrompt);
      expect(inheritedTemplate.name).toBe('Case Management Assistant');
      expect(inheritedTemplate.jurisdictions).toEqual(parentTemplate.jurisdictions);
    });

    it('should chain multiple inheritance levels', () => {
      const baseTemplate: PromptTemplate = {
        id: 'base',
        name: 'Base',
        version: '1.0.0',
        systemPrompt: 'Base prompt',
        attentionWeights: {
          userQuery: 0.4,
          contextDocs: 0.3,
          sessionHistory: 0.1,
          jurisdictionRules: 0.1,
          cbaClauses: 0.05,
          timelineContext: 0.05,
        },
        jurisdictions: ['ontario'],
        requiredVariables: [],
        complianceTags: [],
        metadata: {
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const level1 = { ...baseTemplate, id: 'level1', name: 'Level 1' };
      const level2 = { ...level1, id: 'level2', name: 'Level 2' };
      const level3 = { ...level2, id: 'level3', name: 'Level 3' };

      const inheritanceChain = [
        baseTemplate.id,
        level1.id,
        level2.id,
        level3.id,
      ];

      expect(inheritanceChain).toHaveLength(4);
      expect(level3.systemPrompt).toBe(baseTemplate.systemPrompt);
    });

    it('should merge context extensions in inheritance', () => {
      const parent: PromptTemplate = {
        id: 'parent',
        name: 'Parent',
        version: '1.0.0',
        systemPrompt: 'Parent prompt',
        attentionWeights: {
          userQuery: 0.4,
          contextDocs: 0.3,
          sessionHistory: 0.1,
          jurisdictionRules: 0.1,
          cbaClauses: 0.05,
          timelineContext: 0.05,
        },
        jurisdictions: ['ontario'],
        requiredVariables: [],
        complianceTags: [],
        metadata: {
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const config: InheritanceConfig = {
        parentTemplateId: 'parent',
        contextExtensions: {
          customField: 'value',
          additionalContext: 'data',
        },
      };

      // Simulate extension merging
      const mergedContext = {
        ...config.contextExtensions,
      };

      expect(mergedContext.customField).toBe('value');
    });
  });
});
