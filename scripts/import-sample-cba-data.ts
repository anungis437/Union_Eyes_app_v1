/**
 * Sample Data Import Script for CBA Intelligence System
 * 
 * This script imports realistic sample data for testing and development:
 * - Collective Bargaining Agreements
 * - Clauses (all 26 types)
 * - Arbitration Decisions
 * - Arbitrator Profiles
 * - Bargaining Notes
 * 
 * Usage: pnpm tsx scripts/import-sample-cba-data.ts
 */

import { db } from '../db/index.js';
import { 
  collectiveAgreements, 
  cbaClause, 
  arbitrationDecisions,
  arbitratorProfiles,
  bargainingNotes,
  wageProgressions,
  benefitComparisons,
  cbaFootnotes
} from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

// Sample Organizations
const SAMPLE_ORGS = [
  'org_healthcare_workers_union',
  'org_teachers_federation',
  'org_municipal_employees'
];

async function importSampleCBAs() {
  console.log('📄 Importing Sample CBAs...');
  
  const cbas = [
    {
      organizationId: SAMPLE_ORGS[0],
      cbaNumber: 'CBA-2024-001',
      title: 'Healthcare Workers CBA 2024-2027',
      industrySector: 'Healthcare',
      bargainingUnitDescription: 'Registered Nurses and Allied Health Professionals',
      employerName: 'Regional Health Authority',
      unionName: 'Healthcare Employees Union',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2027-12-31'),
      jurisdiction: 'bc' as const,
      language: 'en' as const,
      sector: 'healthcare',
      status: 'active' as const,
      employeeCoverage: 3500,
      documentUrl: 'https://example.com/cbas/healthcare-2024.pdf',
      rawText: 'Full agreement text would be extracted here...',
      aiProcessed: true
    },
    {
      organizationId: SAMPLE_ORGS[1],
      cbaNumber: 'CBA-2023-002',
      title: 'Teachers Collective Agreement 2023-2025',
      industrySector: 'Education',
      bargainingUnitDescription: 'Elementary and Secondary Teachers',
      employerName: 'School District No. 42',
      unionName: 'Teachers Federation',
      effectiveDate: new Date('2023-09-01'),
      expiryDate: new Date('2025-08-31'),
      jurisdiction: 'bc' as const,
      language: 'en' as const,
      sector: 'education',
      status: 'active' as const,
      employeeCoverage: 1200,
      documentUrl: 'https://example.com/cbas/teachers-2023.pdf',
      rawText: 'Teacher agreement provisions...',
      aiProcessed: true
    },
    {
      organizationId: SAMPLE_ORGS[2],
      cbaNumber: 'CBA-2025-003',
      title: 'Municipal Workers Agreement 2025-2028',
      industrySector: 'Public Service',
      bargainingUnitDescription: 'Inside and Outside Workers',
      employerName: 'City of Vancouver',
      unionName: 'Canadian Union of Public Employees Local 1234',
      effectiveDate: new Date('2025-01-01'),
      expiryDate: new Date('2028-12-31'),
      jurisdiction: 'bc' as const,
      language: 'en' as const,
      sector: 'public_service',
      status: 'under_negotiation' as const,
      employeeCoverage: 2800,
      documentUrl: null,
      rawText: null,
      aiProcessed: false
    }
  ];

  const insertedCBAs = await db.insert(collectiveAgreements).values(cbas).returning();
  console.log(`✅ Imported ${insertedCBAs.length} CBAs`);
  return insertedCBAs;
}

async function importSampleClauses(cbaIds: string[]) {
  console.log('📋 Importing Sample Clauses...');
  
  const clauses = [
    // Wages clauses
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'wages_compensation' as const,
      clauseNumber: '15.01',
      title: 'Wage Rates',
      content: 'Effective January 1, 2024, all employees shall receive a wage increase of 4.0% applied to their base rate of pay.',
      articleNumber: '15',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['wage_increase', 'base_rate'],
      crossReferences: ['15.02', '15.03'],
      aiExtracted: true,
      confidence: 0.95
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'hours_scheduling' as const,
      clauseNumber: '12.01',
      title: 'Regular Hours',
      content: 'The regular hours of work shall be seven and one-half (7.5) hours per day and thirty-seven and one-half (37.5) hours per week.',
      articleNumber: '12',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['hours', 'regular_hours'],
      aiExtracted: true,
      confidence: 0.98
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'overtime' as const,
      clauseNumber: '13.01',
      title: 'Overtime Compensation',
      content: 'All authorized work performed in excess of the regular hours shall be compensated at time and one-half (1.5x) for the first two hours and double time (2x) thereafter.',
      articleNumber: '13',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['overtime', 'time_and_half', 'double_time'],
      aiExtracted: true,
      confidence: 0.92
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'benefits_insurance' as const,
      clauseNumber: '18.01',
      title: 'Extended Health Benefits',
      content: 'The Employer shall pay 100% of the premiums for extended health benefits coverage including prescription drugs, vision care, and paramedical services.',
      articleNumber: '18',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['health_benefits', 'employer_paid'],
      aiExtracted: true,
      confidence: 0.96
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'benefits_insurance' as const,
      clauseNumber: '18.02',
      title: 'Dental Benefits',
      content: 'Dental coverage shall be provided at 100% for basic services and 80% for major restorative services, with an annual maximum of $2,500 per person.',
      articleNumber: '18',
      sectionNumber: '02',
      effectiveDate: new Date('2024-01-01'),
      tags: ['dental', 'coverage_levels'],
      aiExtracted: true,
      confidence: 0.94
    },
    {
      organizationId: SAMPLE_ORGS[1],
      cbaId: cbaIds[1],
      clauseType: 'vacation_leave' as const,
      clauseNumber: '20.01',
      title: 'Annual Vacation Entitlement',
      content: 'Teachers shall be entitled to vacation as follows: 1-5 years: 3 weeks; 6-10 years: 4 weeks; 11+ years: 5 weeks.',
      articleNumber: '20',
      sectionNumber: '01',
      effectiveDate: new Date('2023-09-01'),
      tags: ['vacation', 'entitlement'],
      aiExtracted: true,
      confidence: 0.97
    },
    {
      organizationId: SAMPLE_ORGS[1],
      cbaId: cbaIds[1],
      clauseType: 'seniority_promotion' as const,
      clauseNumber: '10.01',
      title: 'Definition of Seniority',
      content: 'Seniority shall be defined as the length of continuous service with the School District from the date of hire in a regular teaching position.',
      articleNumber: '10',
      sectionNumber: '01',
      effectiveDate: new Date('2023-09-01'),
      tags: ['seniority', 'continuous_service'],
      aiExtracted: true,
      confidence: 0.99
    },
    {
      organizationId: SAMPLE_ORGS[1],
      cbaId: cbaIds[1],
      clauseType: 'job_security' as const,
      clauseNumber: '11.01',
      title: 'Layoff Procedures',
      content: 'In the event of layoff, employees shall be laid off in reverse order of seniority. Recall rights shall be maintained for 24 months.',
      articleNumber: '11',
      sectionNumber: '01',
      effectiveDate: new Date('2023-09-01'),
      tags: ['layoff', 'recall', 'seniority_based'],
      aiExtracted: true,
      confidence: 0.93
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'grievance_arbitration' as const,
      clauseNumber: '8.01',
      title: 'Grievance Definition',
      content: 'A grievance is defined as any difference arising from the interpretation, application, or alleged violation of this Agreement.',
      articleNumber: '8',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['grievance', 'definition'],
      aiExtracted: true,
      confidence: 0.98
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      clauseType: 'disciplinary_procedures' as const,
      clauseNumber: '9.01',
      title: 'Progressive Discipline',
      content: 'The Employer shall apply progressive discipline: verbal warning, written warning, suspension, discharge. Just cause is required for all discipline.',
      articleNumber: '9',
      sectionNumber: '01',
      effectiveDate: new Date('2024-01-01'),
      tags: ['discipline', 'progressive', 'just_cause'],
      aiExtracted: true,
      confidence: 0.95
    }
  ];

  const insertedClauses = await db.insert(cbaClause).values(clauses).returning();
  console.log(`✅ Imported ${insertedClauses.length} clauses`);
  return insertedClauses;
}

async function importSampleArbitrators() {
  console.log('⚖️ Importing Sample Arbitrators...');
  
  const arbitrators = [
    {
      name: 'Hon. John Smith',
      specializations: ['wrongful_dismissal', 'discipline', 'seniority'],
      totalDecisions: 156,
      avgDecisionDays: 45,
      contactInfo: { email: 'jsmith@arbitration.bc.ca' },
      biography: 'Over 25 years experience in labour arbitration...',
      lastDecisionDate: new Date('2024-11-15')
    },
    {
      name: 'Arbitrator Jane Doe',
      specializations: ['wages', 'benefits', 'hours_of_work'],
      totalDecisions: 203,
      avgDecisionDays: 38,
      contactInfo: { email: 'jdoe@arbitration.bc.ca' },
      biography: 'Specialized in compensation and benefits disputes...',
      lastDecisionDate: new Date('2024-12-01')
    },
    {
      name: 'Dr. Robert Johnson',
      specializations: ['safety', 'harassment', 'human_rights'],
      totalDecisions: 87,
      avgDecisionDays: 52,
      contactInfo: { email: 'rjohnson@arbitration.on.ca' },
      biography: 'Workplace safety and human rights expert...',
      lastDecisionDate: new Date('2024-10-20')
    }
  ];

  const insertedArbitrators = await db.insert(arbitratorProfiles).values(arbitrators).returning();
  console.log(`✅ Imported ${insertedArbitrators.length} arbitrator profiles`);
  return insertedArbitrators;
}

async function importSamplePrecedents(arbitratorIds: string[]) {
  console.log('📚 Importing Sample Precedents...');
  
  const precedents = [
    {
      caseTitle: 'Healthcare Union v. Regional Health Authority',
      caseNumber: 'BCLRB-2024-187',
      tribunal: 'provincial_labour_board' as const,
      decisionType: 'grievance' as const,
      arbitrator: 'Hon. John Smith',
      decisionDate: new Date('2024-06-15'),
      union: 'Healthcare Employees Union',
      employer: 'Regional Health Authority',
      outcome: 'grievance_upheld' as const,
      issueTypes: ['wrongful_dismissal', 'progressive_discipline'],
      keyFacts: 'Employee with 12 years seniority terminated for alleged insubordination. Union argued lack of progressive discipline.',
      reasoning: 'Arbitrator found employer failed to follow progressive discipline policy. No prior warnings documented.',
      fullText: 'DECISION\n\nEmployee with 12 years seniority terminated for alleged insubordination. Union argued lack of progressive discipline. Arbitrator found employer failed to follow progressive discipline policy. No prior warnings documented. Grievance upheld, employee reinstated with full back pay.',
      precedentValue: 'high' as const,
      precedentSummary: 'Establishes requirement for proper progressive discipline before termination.'
    },
    {
      caseTitle: 'Teachers Federation v. School District',
      caseNumber: 'BCLRB-2023-412',
      tribunal: 'provincial_labour_board' as const,
      decisionType: 'grievance' as const,
      arbitrator: 'Arbitrator Jane Doe',
      decisionDate: new Date('2023-11-08'),
      union: 'Teachers Federation',
      employer: 'School District No. 42',
      outcome: 'grievance_denied' as const,
      issueTypes: ['hours_of_work', 'management_rights'],
      keyFacts: 'Union grieved mandatory staff meetings outside regular hours. Argued violation of hours of work provisions.',
      reasoning: 'Arbitrator ruled meetings were reasonable management rights and within professional obligations.',
      fullText: 'DECISION\n\nUnion grieved mandatory staff meetings outside regular hours. Argued violation of hours of work provisions. Arbitrator ruled meetings were reasonable management rights and within professional obligations. Grievance denied.',
      precedentValue: 'medium' as const,
      precedentSummary: 'Professional employees may have obligations beyond strict hours of work provisions.'
    },
    {
      caseTitle: 'Healthcare Union v. Regional Health Authority (Overtime)',
      caseNumber: 'BCLRB-2024-256',
      tribunal: 'provincial_labour_board' as const,
      decisionType: 'grievance' as const,
      arbitrator: 'Hon. John Smith',
      decisionDate: new Date('2024-09-22'),
      union: 'Healthcare Employees Union',
      employer: 'Regional Health Authority',
      outcome: 'grievance_upheld' as const,
      issueTypes: ['overtime', 'training'],
      keyFacts: 'Employer refused to pay overtime for mandatory training completed after regular hours.',
      reasoning: 'Training was employer-directed and mandatory, therefore constitutes compensable work time.',
      fullText: 'DECISION\n\nEmployer refused to pay overtime for mandatory training completed after regular hours. Training was employer-directed and mandatory, therefore constitutes compensable work time. Grievance upheld, overtime compensation ordered.',
      precedentValue: 'high' as const,
      precedentSummary: 'Mandatory employer-directed training must be compensated, including overtime rates if applicable.'
    },
    {
      caseTitle: 'Nurses Union v. Hospital Authority (Safety)',
      caseNumber: 'BCLRB-2024-089',
      tribunal: 'provincial_labour_board' as const,
      decisionType: 'grievance' as const,
      arbitrator: 'Dr. Robert Johnson',
      decisionDate: new Date('2024-03-14'),
      union: 'Healthcare Employees Union',
      employer: 'Hospital Authority',
      outcome: 'partial_success' as const,
      issueTypes: ['safety', 'staffing'],
      keyFacts: 'Union grieved unsafe staffing levels in emergency department. Employer argued operational necessity.',
      reasoning: 'Arbitrator found violation of minimum staffing but accepted temporary nature due to recruitment challenges.',
      fullText: 'DECISION\n\nUnion grieved unsafe staffing levels in emergency department. Employer argued operational necessity. Arbitrator found violation of minimum staffing but accepted temporary nature due to recruitment challenges. Partial grievance success, prospective remedy ordered.',
      precedentValue: 'medium' as const,
      precedentSummary: 'Safety provisions must be balanced with operational realities, remedies may be prospective.'
    }
  ];

  const insertedPrecedents = await db.insert(arbitrationDecisions).values(precedents).returning();
  console.log(`✅ Imported ${insertedPrecedents.length} precedents`);
  return insertedPrecedents;
}

async function importSampleBargainingNotes(cbaIds: string[]) {
  console.log('📝 Importing Sample Bargaining Notes...');
  
  const notes = [
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      sessionDate: new Date('2023-10-15'),
      sessionType: 'negotiation',
      title: 'Opening Bargaining Session - October 15, 2023',
      content: 'Opening proposals exchanged. Union presented comprehensive wage and benefits package. Employer expressed concerns about fiscal constraints.\n\nKey Outcomes:\n- Union proposal: 4% per year\n- Employer counter pending\n- Next session scheduled\n\nProposals Discussed: Wages, Benefits, Working conditions\n\nOutstanding Issues: Wage increases, Shift differential increases, Pension improvements\n\nNext Steps: Employer to provide costing, Union to prepare comparator data, Next meeting Oct 29',
      attendees: [
        { name: 'Sarah Chen', role: 'Chief Negotiator', organization: 'Union' },
        { name: 'Mike Torres', role: 'President', organization: 'Union' },
        { name: 'Dr. Lisa Wang', role: 'HR Director', organization: 'Employer' },
        { name: 'James Park', role: 'CFO', organization: 'Employer' }
      ],
      tags: ['opening_proposals', 'wages', 'benefits'],
      relatedClauseIds: [],
      relatedDecisionIds: [],
      createdBy: SAMPLE_ORGS[0],
      attachments: [{ filename: 'union-proposal-oct-15.pdf', url: 'https://example.com/attachments/union-proposal-oct-15.pdf', fileType: 'pdf', uploadedAt: new Date('2023-10-15').toISOString() }]
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      sessionDate: new Date('2023-10-29'),
      sessionType: 'negotiation',
      title: 'Bargaining Session 2 - October 29, 2023',
      content: 'Employer presented counter-proposal at 2.5% per year. Union caucused and indicated insufficient. Discussion on shift premiums.\n\nKey Outcomes:\n- Significant gap on wages\n- Progress on shift premiums\n- Tentative agreement on dental improvements\n\nAgreements Reached: Dental annual maximum increase to $2,500\n\nOutstanding Issues: Wage gap remains (union 4%, employer 2.5%), Pension contributions\n\nNext Steps: Union to prepare comparator analysis, Mediator may be requested, Next session Nov 12',
      attendees: [
        { name: 'Sarah Chen', role: 'Chief Negotiator', organization: 'Union' },
        { name: 'Mike Torres', role: 'President', organization: 'Union' },
        { name: 'Dr. Lisa Wang', role: 'HR Director', organization: 'Employer' },
        { name: 'James Park', role: 'CFO', organization: 'Employer' }
      ],
      tags: ['counter_proposals', 'wages_gap', 'progress_dental'],
      relatedClauseIds: [],
      relatedDecisionIds: [],
      createdBy: SAMPLE_ORGS[0]
    },
    {
      organizationId: SAMPLE_ORGS[0],
      cbaId: cbaIds[0],
      sessionDate: new Date('2023-11-12'),
      sessionType: 'negotiation',
      title: 'Mediation Session - November 12, 2023',
      content: 'Mediation session with Hon. Thompson. Separate caucuses. Movement on wages to 3.5% average over term.\n\nKey Outcomes:\n- Wage gap narrowing\n- Employer moved to 3.5% average\n- Union indicated flexibility on structure\n\nProposals Discussed: Staged wage increases, Lump sum signing bonus option\n\nOutstanding Issues: Final wage structure, Pension contribution increases\n\nNext Steps: Mediator to prepare bridging proposal, Follow-up caucuses Nov 14',
      attendees: [
        { name: 'Hon. Patricia Thompson', role: 'Mediator', organization: 'Independent' },
        { name: 'Sarah Chen', role: 'Chief Negotiator', organization: 'Union' },
        { name: 'Mike Torres', role: 'President', organization: 'Union' },
        { name: 'Dr. Lisa Wang', role: 'HR Director', organization: 'Employer' },
        { name: 'James Park', role: 'CFO', organization: 'Employer' }
      ],
      tags: ['mediation', 'wages_movement', 'near_settlement'],
      relatedClauseIds: [],
      relatedDecisionIds: [],
      createdBy: SAMPLE_ORGS[0]
    },
    {
      organizationId: SAMPLE_ORGS[1],
      cbaId: cbaIds[1],
      sessionDate: new Date('2023-05-20'),
      sessionType: 'negotiation',
      title: 'Opening Session - May 20, 2023',
      content: 'Initial proposals presented. Focus on class size limits and preparation time.\n\nKey Outcomes:\n- Agreement to focus on workload issues\n- Financial proposals deferred\n\nProposals Discussed: Class size maximums, Prep time protections, Professional development\n\nOutstanding Issues: Class size enforcement, Additional prep time, PD funding\n\nNext Steps: Data collection on current class sizes, Next session June 3',
      attendees: [
        { name: 'Union Negotiating Team', role: 'Negotiators', organization: 'Teachers Federation' },
        { name: 'District Representatives', role: 'Negotiators', organization: 'School District' }
      ],
      tags: ['opening_session', 'workload', 'class_size'],
      relatedClauseIds: [],
      relatedDecisionIds: [],
      createdBy: SAMPLE_ORGS[1]
    }
  ];

  const insertedNotes = await db.insert(bargainingNotes).values(notes).returning();
  console.log(`✅ Imported ${insertedNotes.length} bargaining notes`);
  return insertedNotes;
}

async function importSampleWageProgressions(cbaIds: string[], clauseIds: string[]) {
  console.log('💰 Importing Sample Wage Progressions...');
  
  const wageProgressionData = [
    {
      cbaId: cbaIds[0],
      clauseId: clauseIds[0],
      classification: 'Registered Nurse',
      step: 1,
      hourlyRate: '36.50',
      effectiveDate: new Date('2024-01-01'),
      notes: 'Annual step progression, subject to satisfactory performance'
    },
    {
      cbaId: cbaIds[0],
      clauseId: clauseIds[0],
      classification: 'Registered Nurse',
      step: 2,
      hourlyRate: '38.25',
      effectiveDate: new Date('2024-01-01'),
      notes: 'Annual step progression, subject to satisfactory performance'
    },
    {
      cbaId: cbaIds[0],
      clauseId: clauseIds[0],
      classification: 'Registered Nurse',
      step: 3,
      hourlyRate: '40.00',
      effectiveDate: new Date('2024-01-01'),
      notes: 'Annual step progression, subject to satisfactory performance'
    },
    {
      cbaId: cbaIds[0],
      clauseId: clauseIds[0],
      classification: 'Registered Nurse',
      step: 4,
      hourlyRate: '41.75',
      effectiveDate: new Date('2024-01-01'),
      notes: 'Annual step progression, subject to satisfactory performance'
    },
    {
      cbaId: cbaIds[0],
      clauseId: clauseIds[0],
      classification: 'Registered Nurse',
      step: 5,
      hourlyRate: '43.50',
      effectiveDate: new Date('2024-01-01'),
      notes: 'Annual step progression, subject to satisfactory performance'
    }
  ];

  const inserted = await db.insert(wageProgressions).values(wageProgressionData).returning();
  console.log(`✅ Imported ${inserted.length} wage progression steps`);
  return inserted;
}

async function main() {
  console.log('🚀 Starting CBA Intelligence System Data Import\n');
  
  try {
    // Import in order of dependencies
    const cbas = await importSampleCBAs();
    const cbaIds = cbas.map((c: any) => c.id);
    
    const clauses = await importSampleClauses(cbaIds);
    const clauseIds = clauses.map((c: any) => c.id);
    
    const arbitrators = await importSampleArbitrators();
    const arbitratorIds = arbitrators.map((a: any) => a.id);
    
    const precedents = await importSamplePrecedents(arbitratorIds);
    
    const notes = await importSampleBargainingNotes(cbaIds);
    
    const wageProgressions = await importSampleWageProgressions(cbaIds, clauseIds);
    
    console.log('\n✅ Sample data import completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${cbas.length} Collective Bargaining Agreements`);
    console.log(`   - ${clauses.length} Clauses`);
    console.log(`   - ${arbitrators.length} Arbitrator Profiles`);
    console.log(`   - ${precedents.length} Arbitration Decisions`);
    console.log(`   - ${notes.length} Bargaining Notes`);
    console.log(`   - ${wageProgressions.length} Wage Progressions`);
    
    console.log('\n🔗 Next Steps:');
    console.log('   1. Test API endpoints with the imported data');
    console.log('   2. Verify UI components display correctly');
    console.log('   3. Test search and filtering functionality');
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  }
}

main();
