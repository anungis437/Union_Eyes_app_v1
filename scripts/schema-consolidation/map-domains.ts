/**
 * Schema Domain Mapper
 * 
 * Maps existing schema files to proposed domain structure
 * Generates the consolidation plan with file groupings
 */

import fs from 'fs/promises';
import path from 'path';

interface DomainMapping {
  domain: string;
  description: string;
  schemas: string[];
  estimatedLines: number;
  priority: number;
}

/**
 * Define the target domain structure
 */
const DOMAIN_MAPPINGS: DomainMapping[] = [
  {
    domain: 'member',
    description: 'Member profiles and user management',
    schemas: [
      'profiles-schema.ts',
      'organization-members-schema.ts',
      'pending-profiles-schema.ts',
      'user-management-schema.ts',
    ],
    estimatedLines: 800,
    priority: 1,
  },
  {
    domain: 'claims',
    description: 'Claims, grievances, and deadlines',
    schemas: [
      'claims-schema.ts',
      'grievance-schema.ts',
      'deadlines-schema.ts',
      'grievance-workflow-schema.ts',
    ],
    estimatedLines: 900,
    priority: 2,
  },
  {
    domain: 'agreements',
    description: 'Collective bargaining agreements',
    schemas: [
      'collective-agreements-schema.ts',
      'cba-schema.ts',
      'cba-clauses-schema.ts',
      'cba-intelligence-schema.ts',
      'shared-clause-library-schema.ts',
    ],
    estimatedLines: 1000,
    priority: 3,
  },
  {
    domain: 'finance',
    description: 'Financial transactions and accounting',
    schemas: [
      'dues-transactions-schema.ts',
      'autopay-settings-schema.ts',
      'financial-payments-schema.ts',
      'chart-of-accounts-schema.ts',
      'strike-fund-tax-schema.ts',
      'transfer-pricing-schema.ts',
    ],
    estimatedLines: 900,
    priority: 4,
  },
  {
    domain: 'governance',
    description: 'Governance, voting, and organizational structure',
    schemas: [
      'governance-schema.ts',
      'founder-conflict-schema.ts',
      'voting-schema.ts',
    ],
    estimatedLines: 600,
    priority: 5,
  },
  {
    domain: 'communications',
    description: 'Member communications and engagement',
    schemas: [
      'messages-schema.ts',
      'notifications-schema.ts',
      'newsletter-schema.ts',
      'sms-communications-schema.ts',
      'survey-polling-schema.ts',
      'communication-analytics-schema.ts',
      'push-notifications.ts',
    ],
    estimatedLines: 1200,
    priority: 6,
  },
  {
    domain: 'documents',
    description: 'Document storage and management',
    schemas: [
      'documents-schema.ts',
      'member-documents-schema.ts',
      'e-signature-schema.ts',
      'signature-workflows-schema.ts',
    ],
    estimatedLines: 700,
    priority: 7,
  },
  {
    domain: 'scheduling',
    description: 'Calendar, events, and training',
    schemas: [
      'calendar-schema.ts',
      'education-training-schema.ts',
    ],
    estimatedLines: 400,
    priority: 8,
  },
  {
    domain: 'compliance',
    description: 'Regulatory compliance and privacy',
    schemas: [
      'provincial-privacy-schema.ts',
      'gdpr-compliance-schema.ts',
      'geofence-privacy-schema.ts',
      'indigenous-data-schema.ts',
      'lmbp-immigration-schema.ts',
      'force-majeure-schema.ts',
      'employer-non-interference-schema.ts',
      'whiplash-prevention-schema.ts',
      'certification-management-schema.ts',
    ],
    estimatedLines: 1100,
    priority: 9,
  },
  {
    domain: 'data',
    description: 'External data integration',
    schemas: [
      'wage-benchmarks-schema.ts',
      'lrb-agreements-schema.ts',
      'arbitration-precedents-schema.ts',
      'congress-memberships-schema.ts',
    ],
    estimatedLines: 600,
    priority: 10,
  },
  {
    domain: 'ml',
    description: 'Machine learning and AI',
    schemas: [
      'ml-predictions-schema.ts',
      'ai-chatbot-schema.ts',
    ],
    estimatedLines: 400,
    priority: 11,
  },
  {
    domain: 'analytics',
    description: 'Analytics and reporting',
    schemas: [
      'analytics.ts',
      'analytics-reporting-schema.ts',
      'reports-schema.ts',
    ],
    estimatedLines: 500,
    priority: 12,
  },
  {
    domain: 'infrastructure',
    description: 'System infrastructure and integrations',
    schemas: [
      'audit-security-schema.ts',
      'feature-flags-schema.ts',
      'user-uuid-mapping-schema.ts',
      'alerting-automation-schema.ts',
      'automation-rules-schema.ts',
      'recognition-rewards-schema.ts',
      'award-templates-schema.ts',
      'organizing-tools-schema.ts',
      'sharing-permissions-schema.ts',
      'cms-website-schema.ts',
      'erp-integration-schema.ts',
      'clc-partnership-schema.ts',
      'clc-sync-schema.ts',
      'clc-per-capita-schema.ts',
      'clc-sync-audit-schema.ts',
      'international-address-schema.ts',
      'social-media-schema.ts',
      'joint-trust-fmv-schema.ts',
      'defensibility-packs-schema.ts',
      'accessibility-schema.ts',
    ],
    estimatedLines: 3000,
    priority: 13,
  },
];

/**
 * Schemas to be deprecated/removed
 */
const DEPRECATED_SCHEMAS = [
  'tenant-management-schema.ts',  // Replaced by organization schemas
  'organization-members-schema.ts', // Commented out, using Phase 5A version
];

/**
 * Generate domain mapping report
 */
async function generateMappingReport(): Promise<void> {
  console.log('\n🗺️  Schema Domain Consolidation Map\n');
  console.log('='.repeat(80));
  
  // Summary
  const totalSchemas = DOMAIN_MAPPINGS.reduce((sum, d) => sum + d.schemas.length, 0);
  const totalLines = DOMAIN_MAPPINGS.reduce((sum, d) => sum + d.estimatedLines, 0);
  
  console.log('\n📊 Consolidation Summary:');
  console.log(`   Current structure: 70+ schema files`);
  console.log(`   Target structure: ${DOMAIN_MAPPINGS.length} domain modules`);
  console.log(`   Schemas mapped: ${totalSchemas}`);
  console.log(`   Deprecated schemas: ${DEPRECATED_SCHEMAS.length}`);
  console.log(`   Estimated total lines: ${totalLines.toLocaleString()}`);
  
  // Domain breakdown
  console.log('\n📁 Domain Structure:\n');
  
  for (const domain of DOMAIN_MAPPINGS) {
    console.log(`   ${domain.priority}. domains/${domain.domain}/`);
    console.log(`      ${domain.description}`);
    console.log(`      Files: ${domain.schemas.length} | Est. lines: ${domain.estimatedLines}`);
    console.log(`      Schemas:`);
    domain.schemas.forEach(schema => {
      console.log(`        - ${schema}`);
    });
    console.log('');
  }
  
  // Deprecated list
  console.log('\n🗑️  Schemas to Remove:');
  DEPRECATED_SCHEMAS.forEach((schema, idx) => {
    console.log(`   ${idx + 1}. ${schema}`);
  });
  
  // Migration order
  console.log('\n📅 Recommended Migration Order:');
  console.log('   Phase 1: Member domain (smallest, high impact)');
  console.log('   Phase 2: Claims domain (medium complexity)');
  console.log('   Phase 3: Finance + Governance (related domains)');
  console.log('   Phase 4: Communications (largest single domain)');
  console.log('   Phase 5: Documents + Scheduling (straightforward)');
  console.log('   Phase 6: Compliance + Data (many small files)');
  console.log('   Phase 7: ML + Analytics (low coupling)');
  console.log('   Phase 8: Infrastructure (largest, handle last)');
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Mapping complete!\n');
}

/**
 * Validate that all schema files are accounted for
 */
async function validateMapping(): Promise<void> {
  const SCHEMA_DIR = path.join(process.cwd(), 'db', 'schema');
  const allFiles = await fs.readdir(SCHEMA_DIR);
  const schemaFiles = allFiles.filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  const mappedSchemas = new Set<string>();
  DOMAIN_MAPPINGS.forEach(domain => {
    domain.schemas.forEach(schema => mappedSchemas.add(schema));
  });
  DEPRECATED_SCHEMAS.forEach(schema => mappedSchemas.add(schema));
  
  const unmappedSchemas = schemaFiles.filter(f => !mappedSchemas.has(f));
  
  if (unmappedSchemas.length > 0) {
    console.log('\n⚠️  Warning: Unmapped schemas found:');
    unmappedSchemas.forEach(schema => console.log(`   - ${schema}`));
    console.log('\n   These schemas need to be assigned to a domain or marked as deprecated.');
  } else {
    console.log('\n✅ All schema files are accounted for in the consolidation plan');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await generateMappingReport();
    await validateMapping();
    
    // Write JSON mapping
    const reportPath = path.join(process.cwd(), 'schema-domain-mapping.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          currentFiles: '70+',
          targetDomains: DOMAIN_MAPPINGS.length,
          deprecatedSchemas: DEPRECATED_SCHEMAS.length,
        },
        domains: DOMAIN_MAPPINGS,
        deprecated: DEPRECATED_SCHEMAS,
      }, null, 2)
    );
    
    console.log(`📄 Detailed JSON mapping written to: ${reportPath}\n`);
  } catch (error) {
    console.error('❌ Error during mapping:', error);
    process.exit(1);
  }
}

main();
