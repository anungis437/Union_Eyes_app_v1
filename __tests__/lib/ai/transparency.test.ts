/**
 * UnionEyes AI Transparency Tests
 * 
 * Tests for AI transparency and governance features
 * 
 * @group ai/transparency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import actual exports from the module
import { 
  unionEyesModelCard,
  AITransparencyEngine,
  AIAppealManager,
  HumanOverrideManager,
  transparencyEngine,
  appealManager,
  overrideManager,
  addAIDisclosure,
  AIDisclosure,
  ModelCard,
  AIAppeal,
  HumanOverrideRequest
} from '@/lib/ai/transparency';

describe('AI Transparency - Model Card', () => {
  describe('UnionEyes Model Card', () => {
    it('should have valid model name', () => {
      expect(unionEyesModelCard.modelName).toBeDefined();
      expect(unionEyesModelCard.modelName).toBe('UnionEyes-LLM');
    });

    it('should have model version information', () => {
      expect(unionEyesModelCard.modelVersion).toBeDefined();
      expect(unionEyesModelCard.modelVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should specify provider', () => {
      expect(unionEyesModelCard.provider).toBeDefined();
      expect(typeof unionEyesModelCard.provider).toBe('string');
    });

    it('should have intended use cases', () => {
      expect(unionEyesModelCard.intendedUse).toBeDefined();
      expect(Array.isArray(unionEyesModelCard.intendedUse)).toBe(true);
      expect(unionEyesModelCard.intendedUse.length).toBeGreaterThan(0);
    });

    it('should list limitations', () => {
      expect(unionEyesModelCard.limitations).toBeDefined();
      expect(Array.isArray(unionEyesModelCard.limitations)).toBe(true);
      expect(unionEyesModelCard.limitations.length).toBeGreaterThan(0);
    });

    it('should have training data cutoff date', () => {
      expect(unionEyesModelCard.trainingDataCutoff).toBeDefined();
    });

    it('should include governance features', () => {
      expect(unionEyesModelCard.governance).toBeDefined();
      expect(unionEyesModelCard.governance.humanOversight).toBe(true);
      expect(unionEyesModelCard.governance.auditLogging).toBe(true);
      expect(unionEyesModelCard.governance.appealAvailable).toBe(true);
    });

    it('should have model type defined', () => {
      expect(unionEyesModelCard.modelType).toBeDefined();
      expect(unionEyesModelCard.modelType).toBe('chat');
    });

    it('should have release date', () => {
      expect(unionEyesModelCard.releaseDate).toBeDefined();
    });

    it('should have description', () => {
      expect(unionEyesModelCard.description).toBeDefined();
      expect(typeof unionEyesModelCard.description).toBe('string');
    });

    it('should list known biases', () => {
      expect(unionEyesModelCard.knownBiases).toBeDefined();
      expect(Array.isArray(unionEyesModelCard.knownBiases)).toBe(true);
    });

    it('should have performance metrics', () => {
      expect(unionEyesModelCard.performance).toBeDefined();
      expect(unionEyesModelCard.performance.accuracy).toBeDefined();
      expect(unionEyesModelCard.performance.latency).toBeDefined();
      expect(unionEyesModelCard.performance.contextLength).toBeDefined();
    });

    it('should have safety measures', () => {
      expect(unionEyesModelCard.safetyMeasures).toBeDefined();
      expect(Array.isArray(unionEyesModelCard.safetyMeasures)).toBe(true);
      expect(unionEyesModelCard.safetyMeasures.length).toBeGreaterThan(0);
    });
  });
});

describe('AI Transparency - AITransparencyEngine', () => {
  let engine: AITransparencyEngine;

  beforeEach(() => {
    engine = new AITransparencyEngine();
  });

  describe('Engine Initialization', () => {
    it('should create transparency engine instance', () => {
      expect(transparencyEngine).toBeDefined();
      expect(transparencyEngine).toBeInstanceOf(AITransparencyEngine);
    });

    it('should create new engine instance', () => {
      expect(engine).toBeInstanceOf(AITransparencyEngine);
    });
  });

  describe('generateDisclosure', () => {
    it('should generate disclosure with high confidence', () => {
      const disclosure = engine.generateDisclosure({
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        confidenceScore: 0.9,
        humanReviewed: false
      });

      expect(disclosure.isAIGenerated).toBe(true);
      expect(disclosure.model).toBe('UnionEyes-LLM');
      expect(disclosure.confidenceScore).toBe(0.9);
      expect(disclosure.confidence).toBe('high');
      expect(disclosure.humanReviewed).toBe(false);
    });

    it('should generate disclosure with medium confidence', () => {
      const disclosure = engine.generateDisclosure({
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        confidenceScore: 0.6,
        humanReviewed: false
      });

      expect(disclosure.confidence).toBe('medium');
    });

    it('should generate disclosure with low confidence', () => {
      const disclosure = engine.generateDisclosure({
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        confidenceScore: 0.3,
        humanReviewed: false
      });

      expect(disclosure.confidence).toBe('low');
    });

    it('should include generated timestamp', () => {
      const disclosure = engine.generateDisclosure({
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        confidenceScore: 0.8,
        humanReviewed: false
      });

      expect(disclosure.generatedAt).toBeDefined();
      expect(new Date(disclosure.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include disclosure version', () => {
      const disclosure = engine.generateDisclosure({
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        confidenceScore: 0.8,
        humanReviewed: false
      });

      expect(disclosure.disclosureVersion).toBeDefined();
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate high confidence with good sources', () => {
      const score = engine.calculateConfidence({
        hasSources: true,
        sourceRelevance: 0.9,
        hasJurisdiction: true,
        queryClarity: 0.9,
        contextQuality: 0.9
      });

      expect(score).toBeGreaterThan(0.8);
    });

    it('should calculate low confidence with poor sources', () => {
      const score = engine.calculateConfidence({
        hasSources: false,
        sourceRelevance: 0,
        hasJurisdiction: false,
        queryClarity: 0.1,
        contextQuality: 0.1
      });

      expect(score).toBeLessThan(0.2);
    });

    it('should not exceed 1.0', () => {
      const score = engine.calculateConfidence({
        hasSources: true,
        sourceRelevance: 1.0,
        hasJurisdiction: true,
        queryClarity: 1.0,
        contextQuality: 1.0
      });

      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should not go below 0', () => {
      const score = engine.calculateConfidence({
        hasSources: false,
        sourceRelevance: 0,
        hasJurisdiction: false,
        queryClarity: 0,
        contextQuality: 0
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('AI Transparency - AIAppealManager', () => {
  describe('Appeal Manager', () => {
    it('should create appeal manager instance', () => {
      expect(appealManager).toBeDefined();
      expect(appealManager).toBeInstanceOf(AIAppealManager);
    });
  });

  describe('fileAppeal', () => {
    it('should file an appeal', async () => {
      const appeal = await appealManager.fileAppeal({
        requestId: 'req_123',
        filedBy: 'user_456',
        reason: 'Incorrect information provided',
        context: 'The AI said my grievance was time-barred but it was not'
      });

      expect(appeal).toBeDefined();
      expect(appeal.requestId).toBe('req_123');
      expect(appeal.filedBy).toBe('user_456');
      expect(appeal.reason).toBe('Incorrect information provided');
      expect(appeal.status).toBe('pending');
      expect(appeal.createdAt).toBeDefined();
    });
  });

  describe('getAppeal', () => {
    it('should retrieve filed appeal by appeal ID', async () => {
      const filed = await appealManager.fileAppeal({
        requestId: 'req_test_get',
        filedBy: 'user_456',
        reason: 'Test appeal',
        context: 'Test context'
      });

      const appeal = await appealManager.getAppeal(filed.id);
      expect(appeal).toBeDefined();
      expect(appeal?.id).toBe(filed.id);
    });

    it('should return null for non-existent appeal', async () => {
      const appeal = await appealManager.getAppeal('non_existent_appeal_id');
      expect(appeal).toBeNull();
    });
  });
});

describe('AI Transparency - HumanOverrideManager', () => {
  describe('Override Manager', () => {
    it('should create human override manager instance', () => {
      expect(overrideManager).toBeDefined();
      expect(overrideManager).toBeInstanceOf(HumanOverrideManager);
    });
  });

  describe('requestOverride', () => {
    it('should request human override', async () => {
      const override = await overrideManager.requestOverride({
        requestId: 'req_override_123',
        requestedBy: 'user_789',
        reason: 'AI response seems inaccurate',
        priority: 'high',
        category: 'accuracy'
      });

      expect(override).toBeDefined();
      expect(override.requestId).toBe('req_override_123');
      expect(override.requestedBy).toBe('user_789');
      expect(override.priority).toBe('high');
      expect(override.category).toBe('accuracy');
      expect(override.status).toBe('pending');
    });
  });

  describe('getOverride', () => {
    it('should retrieve override request', async () => {
      await overrideManager.requestOverride({
        requestId: 'req_override_test',
        requestedBy: 'user_789',
        reason: 'Test override',
        priority: 'medium',
        category: 'bias'
      });

      const override = await overrideManager.getOverride('req_override_test');
      expect(override).toBeDefined();
      expect(override?.requestId).toBe('req_override_test');
    });
  });

  describe('getPendingOverrides', () => {
    it('should list pending overrides', async () => {
      await overrideManager.requestOverride({
        requestId: 'req_pending_1',
        requestedBy: 'user_1',
        reason: 'Test 1',
        priority: 'urgent',
        category: 'safety'
      });

      const pending = await overrideManager.getPendingOverrides();
      expect(Array.isArray(pending)).toBe(true);
    });
  });
});

describe('AI Transparency - Disclosure Function', () => {
  describe('addAIDisclosure', () => {
    it('should add AI disclosure to response', () => {
      const response = 'This is an AI-generated response.';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'high',
        confidenceScore: 0.95,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain(response);
    });

    it('should include confidence percentage in disclosure', () => {
      const response = 'Test response';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'UnionEyes-LLM',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'medium',
        confidenceScore: 0.85,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('85%');
    });

    it('should include confidence level', () => {
      const response = 'Test';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'test',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'low',
        confidenceScore: 0.3,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('low');
    });

    it('should include high confidence level', () => {
      const response = 'Test';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'test',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'high',
        confidenceScore: 0.9,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('high');
    });

    it('should include AI assistant badge', () => {
      const response = 'Test';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'test',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'high',
        confidenceScore: 0.9,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('🤖 **AI Assistant**');
    });

    it('should include verify disclaimer', () => {
      const response = 'Test';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'test',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'high',
        confidenceScore: 0.9,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('verify important information');
    });

    it('should include appeal link', () => {
      const response = 'Test';
      const disclosure: AIDisclosure = {
        isAIGenerated: true,
        model: 'test',
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        confidence: 'high',
        confidenceScore: 0.9,
        humanReviewed: false,
        disclosureVersion: '1.0.0'
      };

      const result = addAIDisclosure(response, disclosure);
      expect(result).toContain('[Appeal](#)');
    });
  });
});

describe('AI Transparency - Governance Requirements', () => {
  describe('Required Features', () => {
    it('should have human oversight', () => {
      expect(unionEyesModelCard.governance.humanOversight).toBe(true);
    });

    it('should have audit logging', () => {
      expect(unionEyesModelCard.governance.auditLogging).toBe(true);
    });

    it('should have appeal mechanism available', () => {
      expect(unionEyesModelCard.governance.appealAvailable).toBe(true);
    });
  });
});

describe('AI Transparency - Model Intended Use', () => {
  describe('Intended Use Cases', () => {
    it('should list member services', () => {
      const hasMemberServices = unionEyesModelCard.intendedUse.some(u => 
        u.toLowerCase().includes('member')
      );
      expect(hasMemberServices).toBe(true);
    });

    it('should list grievance handling', () => {
      const hasGrievance = unionEyesModelCard.intendedUse.some(u => 
        u.toLowerCase().includes('grievance')
      );
      expect(hasGrievance).toBe(true);
    });

    it('should list collective bargaining', () => {
      const hasBargaining = unionEyesModelCard.intendedUse.some(u => 
        u.toLowerCase().includes('bargaining') || u.toLowerCase().includes('bargain')
      );
      expect(hasBargaining).toBe(true);
    });
  });
});

describe('AI Transparency - Model Limitations', () => {
  describe('Limitation List', () => {
    it('should list limitations', () => {
      expect(unionEyesModelCard.limitations).toBeDefined();
      expect(Array.isArray(unionEyesModelCard.limitations)).toBe(true);
    });

    it('should acknowledge not providing legal advice', () => {
      const hasLegalDisclaimer = unionEyesModelCard.limitations.some(l => 
        l.toLowerCase().includes('legal advice') ||
        l.toLowerCase().includes('consult')
      );
      expect(hasLegalDisclaimer).toBe(true);
    });

    it('should acknowledge may not have latest amendments', () => {
      const hasAmendmentsNote = unionEyesModelCard.limitations.some(l => 
        l.toLowerCase().includes('amendments') ||
        l.toLowerCase().includes('verify')
      );
      expect(hasAmendmentsNote).toBe(true);
    });

    it('should acknowledge cannot access real-time data', () => {
      const hasRealTimeNote = unionEyesModelCard.limitations.some(l => 
        l.toLowerCase().includes('real-time') ||
        l.toLowerCase().includes('current')
      );
      expect(hasRealTimeNote).toBe(true);
    });
  });
});
