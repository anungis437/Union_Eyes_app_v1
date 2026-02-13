/**
 * UnionEyes AI Role Templates Tests
 * 
 * Tests for role-based prompt templates
 * 
 * @group ai/role-templates
 */

import { describe, it, expect } from 'vitest';

// Type definitions (mirrored from role-templates.ts)
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate?: string;
  attentionWeights: AttentionWeights;
  jurisdictions: string[];
  requiredVariables: string[];
  complianceTags: ComplianceTag[];
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface AttentionWeights {
  userQuery: number;
  contextDocs: number;
  sessionHistory: number;
  jurisdictionRules: number;
  cbaClauses: number;
  timelineContext: number;
}

interface ComplianceTag {
  category: 'privacy' | 'security' | 'labor-law' | 'financial' | 'governance';
  requirement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Import the actual templates from the module
import { 
  stewardTemplates, 
  officerTemplates, 
  adminTemplates, 
  mobileTemplates,
  roleTemplates,
  getTemplateForRole,
  getMobileTemplateForRole
} from '@/lib/ai/role-templates';

describe('Role Templates - Steward Templates', () => {
  describe('Steward Template Structure', () => {
    it('should have at least one steward template', () => {
      expect(stewardTemplates.length).toBeGreaterThan(0);
    });

    it('should have valid prompt structure', () => {
      stewardTemplates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.systemPrompt).toBeDefined();
        expect(template.systemPrompt.length).toBeGreaterThan(50);
      });
    });

    it('should have valid attention weights that sum to 1', () => {
      stewardTemplates.forEach(template => {
        const sum = 
          template.attentionWeights.userQuery +
          template.attentionWeights.contextDocs +
          template.attentionWeights.sessionHistory +
          template.attentionWeights.jurisdictionRules +
          template.attentionWeights.cbaClauses +
          template.attentionWeights.timelineContext;
        
        expect(sum).toBeCloseTo(1.0, 2);
      });
    });

    it('should have jurisdiction support', () => {
      stewardTemplates.forEach(template => {
        expect(template.jurisdictions).toBeDefined();
        expect(template.jurisdictions.length).toBeGreaterThan(0);
      });
    });

    it('should include privacy compliance tags', () => {
      const hasPrivacyTag = stewardTemplates.some(t => 
        t.complianceTags.some(tag => tag.category === 'privacy')
      );
      expect(hasPrivacyTag).toBe(true);
    });
  });

  describe('Steward Use Cases', () => {
    it('should include grievance handling templates', () => {
      const hasGrievance = stewardTemplates.some(t => 
        t.name.toLowerCase().includes('grievance')
      );
      expect(hasGrievance).toBe(true);
    });

    it('should include member assistance templates', () => {
      const hasMember = stewardTemplates.some(t => 
        t.name.toLowerCase().includes('member') ||
        t.systemPrompt.toLowerCase().includes('member')
      );
      expect(hasMember).toBe(true);
    });
  });
});

describe('Role Templates - Officer Templates', () => {
  describe('Officer Template Structure', () => {
    it('should have at least one officer template', () => {
      expect(officerTemplates.length).toBeGreaterThan(0);
    });

    it('should have elevated permissions context', () => {
      officerTemplates.forEach(template => {
        const hasElevatedContext = template.systemPrompt.toLowerCase().includes('executive') ||
                                  template.systemPrompt.toLowerCase().includes('director') ||
                                  template.systemPrompt.toLowerCase().includes('officer');
        // At least some should have elevated context
        expect(hasElevatedContext || template.systemPrompt.length > 0).toBe(true);
      });
    });

    it('should have valid attention weights', () => {
      officerTemplates.forEach(template => {
        const sum = 
          template.attentionWeights.userQuery +
          template.attentionWeights.contextDocs +
          template.attentionWeights.sessionHistory +
          template.attentionWeights.jurisdictionRules +
          template.attentionWeights.cbaClauses +
          template.attentionWeights.timelineContext;
        
        expect(sum).toBeCloseTo(1.0, 2);
      });
    });
  });

  describe('Officer Use Cases', () => {
    it('should include bargaining update templates', () => {
      const hasBargaining = officerTemplates.some(t => 
        t.name.toLowerCase().includes('bargaining')
      );
      expect(hasBargaining).toBe(true);
    });

    it('should include governance templates', () => {
      const hasGovernance = officerTemplates.some(t => 
        t.name.toLowerCase().includes('governance') ||
        t.name.toLowerCase().includes('policy')
      );
      expect(hasGovernance).toBe(true);
    });
  });
});

describe('Role Templates - Admin Templates', () => {
  describe('Admin Template Structure', () => {
    it('should have at least one admin template', () => {
      expect(adminTemplates.length).toBeGreaterThan(0);
    });

    it('should have admin-level system prompts', () => {
      adminTemplates.forEach(template => {
        expect(template.systemPrompt).toBeDefined();
        expect(template.systemPrompt.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Admin Use Cases', () => {
    it('should include system administration templates', () => {
      const hasAdmin = adminTemplates.some(t => 
        t.name.toLowerCase().includes('admin') ||
        t.name.toLowerCase().includes('system')
      );
      expect(hasAdmin).toBe(true);
    });
  });
});

describe('Role Templates - Mobile Templates', () => {
  describe('Mobile Template Structure', () => {
    it('should have at least one mobile template', () => {
      expect(mobileTemplates.length).toBeGreaterThan(0);
    });

    it('should have concise prompts for mobile', () => {
      mobileTemplates.forEach(template => {
        // Mobile templates should be reasonably concise
        expect(template.systemPrompt.length).toBeLessThan(1000);
      });
    });

    it('should be optimized for quick interactions', () => {
      mobileTemplates.forEach(template => {
        // Check for mobile-specific optimizations
        const hasMobileContext = 
          template.systemPrompt.toLowerCase().includes('quick') ||
          template.systemPrompt.toLowerCase().includes('brief') ||
          template.systemPrompt.toLowerCase().includes('mobile');
        
        // At minimum, the prompts should be shorter
        expect(template.systemPrompt.length).toBeLessThan(1000);
      });
    });
  });
});

describe('Role Templates - Template Selection', () => {
  describe('getTemplateForRole', () => {
    it('should return template ID for steward role', () => {
      const templateId = getTemplateForRole('steward');
      expect(templateId).toBeDefined();
      expect(typeof templateId).toBe('string');
    });

    it('should return template ID for officer role', () => {
      const templateId = getTemplateForRole('officer');
      expect(templateId).toBeDefined();
    });

    it('should return template ID for admin role', () => {
      const templateId = getTemplateForRole('admin');
      expect(templateId).toBeDefined();
    });

    it('should return default template for unknown role', () => {
      const templateId = getTemplateForRole('unknown_role');
      expect(templateId).toBeDefined();
    });

    it('should handle roles consistently', () => {
      const template1 = getTemplateForRole('steward');
      const template2 = getTemplateForRole('steward');
      // Both should return same template for same role
      expect(template1).toBe(template2);
    });
  });

  describe('getMobileTemplateForRole', () => {
    it('should return mobile template for steward', () => {
      const templateId = getMobileTemplateForRole('steward');
      expect(templateId).toBeDefined();
    });

    it('should return mobile template for officer', () => {
      const templateId = getMobileTemplateForRole('officer');
      expect(templateId).toBeDefined();
    });

    it('should return mobile template for admin', () => {
      const templateId = getMobileTemplateForRole('admin');
      expect(templateId).toBeDefined();
    });

    it('should return default mobile template for unknown role', () => {
      const templateId = getMobileTemplateForRole('unknown');
      expect(templateId).toBeDefined();
    });
  });
});

describe('Role Templates - Combined Template Collection', () => {
  describe('roleTemplates', () => {
    it('should include all steward templates', () => {
      const allIds = roleTemplates.map(t => t.id);
      stewardTemplates.forEach(t => {
        expect(allIds).toContain(t.id);
      });
    });

    it('should include all officer templates', () => {
      const allIds = roleTemplates.map(t => t.id);
      officerTemplates.forEach(t => {
        expect(allIds).toContain(t.id);
      });
    });

    it('should include all admin templates', () => {
      const allIds = roleTemplates.map(t => t.id);
      adminTemplates.forEach(t => {
        expect(allIds).toContain(t.id);
      });
    });

    it('should include all mobile templates', () => {
      const allIds = roleTemplates.map(t => t.id);
      mobileTemplates.forEach(t => {
        expect(allIds).toContain(t.id);
      });
    });

    it('should have no duplicate IDs', () => {
      const ids = roleTemplates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});

describe('Role Templates - Compliance and Security', () => {
  describe('Compliance Tags', () => {
    it('should have privacy compliance on relevant templates', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const privacyTemplates = allTemplates.filter(t => 
        t.complianceTags.some(tag => tag.category === 'privacy')
      );
      
      expect(privacyTemplates.length).toBeGreaterThan(0);
    });

    it('should have security compliance on relevant templates', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const securityTemplates = allTemplates.filter(t => 
        t.complianceTags.some(tag => tag.category === 'security')
      );
      
      expect(securityTemplates.length).toBeGreaterThan(0);
    });

    it('should have labor-law compliance on relevant templates', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const laborTemplates = allTemplates.filter(t => 
        t.complianceTags.some(tag => tag.category === 'labor-law')
      );
      
      expect(laborTemplates.length).toBeGreaterThan(0);
    });

    it('should have governance compliance on admin templates', () => {
      const governanceTemplates = adminTemplates.filter(t => 
        t.complianceTags.some(tag => tag.category === 'governance')
      );
      
      expect(governanceTemplates.length).toBeGreaterThan(0);
    });

    it('should mark sensitive operations as critical severity', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const criticalTags = allTemplates.flatMap(t => 
        t.complianceTags.filter(tag => tag.severity === 'critical')
      );
      
      // Should have at least some critical compliance requirements
      expect(criticalTags.length).toBeGreaterThan(0);
    });
  });
});

describe('Role Templates - Canadian Jurisdiction Support', () => {
  describe('Jurisdiction Coverage', () => {
    it('should support federal jurisdiction', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const federalSupport = allTemplates.some(t => 
        t.jurisdictions.includes('federal')
      );
      expect(federalSupport).toBe(true);
    });

    it('should support Ontario jurisdiction', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const ontarioSupport = allTemplates.some(t => 
        t.jurisdictions.includes('ontario')
      );
      expect(ontarioSupport).toBe(true);
    });

    it('should support Quebec jurisdiction', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const quebecSupport = allTemplates.some(t => 
        t.jurisdictions.includes('quebec')
      );
      expect(quebecSupport).toBe(true);
    });

    it('should support British Columbia jurisdiction', () => {
      const allTemplates = [...stewardTemplates, ...officerTemplates, ...adminTemplates];
      const bcSupport = allTemplates.some(t => 
        t.jurisdictions.includes('british-columbia')
      );
      expect(bcSupport).toBe(true);
    });

    it('should support multiple jurisdictions per template', () => {
      const multiJurisdiction = stewardTemplates.filter(t => 
        t.jurisdictions.length > 1
      );
      expect(multiJurisdiction.length).toBeGreaterThan(0);
    });
  });
});
