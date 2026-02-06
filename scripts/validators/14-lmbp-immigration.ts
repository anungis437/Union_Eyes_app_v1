/**
 * LMBP Immigration Validator
 * 
 * Validates Labour Market Benefits Plan compliance:
 * - LMBP letter generation for work permits
 * - Global Skills Strategy 2-week track
 * - Skills-transfer KPIs for foreign workers
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class LMBPImmigrationValidator extends BlindSpotValidator {
  name = '14. LMBP Immigration';
  description = 'Validates Labour Market Benefits Plan compliance for foreign workers';
  category = 'legal';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasLMBPService = await this.checkLMBPService();
    const hasGSSTracking = await this.checkGSSTracking();
    const hasSkillsTransfer = await this.checkSkillsTransferKPIs();

    if (!hasLMBPService) {
      findings.push({
        file: 'lib/services/immigration',
        issue: 'No LMBP letter generation service found',
        severity: 'medium',
      });
    }

    if (!hasGSSTracking) {
      findings.push({
        file: 'lib/services/immigration',
        issue: 'No Global Skills Strategy (GSS) 2-week track support',
        severity: 'low',
      });
    }

    if (!hasSkillsTransfer) {
      findings.push({
        file: 'lib/services/training',
        issue: 'No skills-transfer KPIs for foreign worker mentorship',
        severity: 'medium',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} LMBP immigration compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('LMBP immigration compliance checks passed');
  }

  private async checkLMBPService(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{lmbp,immigration,work-permit}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkGSSTracking(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/gss|global.skills.strategy|2.week.track/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkSkillsTransferKPIs(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{skills,training,mentorship}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/kpi|skills.transfer|knowledge.transfer/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// lib/services/lmbp-immigration-service.ts
export class LMBPImmigrationService {
  async generateLMBPLetter(
    foreignWorkerId: string,
    position: string,
    localMentorId: string
  ): Promise<LMBPLetter> {
    // LMBP = Labour Market Benefits Plan
    // Required for C10 work permit exemptions
    
    const worker = await db.query.foreignWorkers.findFirst({
      where: eq(foreignWorkers.id, foreignWorkerId)
    });

    const mentor = await db.query.members.findFirst({
      where: eq(members.id, localMentorId)
    });

    const lmbpLetter = {
      letterDate: new Date(),
      workerName: worker.fullName,
      workerCountry: worker.countryOfOrigin,
      position,
      benefits: [
        {
          benefit: 'Skills Transfer to Canadian Workers',
          description: \`\${worker.fullName} will mentor \${mentor.fullName} on specialized techniques\`,
          kpi: 'Mentor 2+ Canadian workers over 12 months',
          measurement: 'Quarterly skill assessments'
        },
        {
          benefit: 'Job Creation',
          description: 'Position supports 2 additional Canadian jobs',
          kpi: 'Maintain 2:1 Canadian-to-foreign worker ratio',
          measurement: 'Monthly headcount reports'
        },
        {
          benefit: 'Technology Transfer',
          description: 'Bring specialized knowledge not available in Canada',
          kpi: 'Document and share best practices',
          measurement: 'Knowledge base contributions'
        }
      ],
      duration: '24 months',
      renewalEligibility: false,
      signedBy: 'Union President',
    };

    await db.insert(lmbpLetters).values(lmbpLetter);

    return lmbpLetter;
  }

  async trackGSSApplication(
    workerId: string,
    isGSSEligible: boolean
  ): Promise<GSSApplication> {
    // Global Skills Strategy (GSS) = 2-week processing for high-demand roles
    if (!isGSSEligible) {
      throw new Error('Worker does not meet GSS eligibility criteria');
    }

    const application = await db.insert(gssApplications).values({
      workerId,
      submittedAt: new Date(),
      targetProcessingDays: 10, // GSS 2-week track
      status: 'submitted',
      category: 'unique-and-specialized-talent',
    });

    // Monitor processing time
    await this.scheduleProcessingCheck(application.id);

    return application;
  }

  async trackSkillsTransferKPIs(
    foreignWorkerId: string
  ): Promise<SkillsTransferReport> {
    const mentorships = await db.query.mentorships.findMany({
      where: eq(mentorships.mentorId, foreignWorkerId)
    });

    const kpis = {
      canadianWorkersMentored: mentorships.length,
      targetMentorships: 2,
      percentComplete: (mentorships.length / 2) * 100,
      skillsDocumented: await this.countDocumentedSkills(foreignWorkerId),
      targetSkillsDocs: 5,
      quarterlyAssessments: await this.getQuarterlyAssessments(foreignWorkerId),
    };

    // Flag if not meeting LMBP commitments
    if (kpis.canadianWorkersMentored < kpis.targetMentorships) {
      await this.flagLMBPNonCompliance(foreignWorkerId);
    }

    return kpis;
  }

  private async flagLMBPNonCompliance(workerId: string): Promise<void> {
    // Alert HR and immigration team
    await db.insert(complianceAlerts).values({
      workerId,
      alertType: 'lmbp-non-compliance',
      description: 'Foreign worker not meeting skills-transfer KPIs',
      severity: 'high',
      createdAt: new Date(),
    });

    // Risk: Work permit may not be renewed
  }
}

// db/schema/immigration-schema.ts
export const foreignWorkers = pgTable('foreign_workers', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  countryOfOrigin: text('country_of_origin').notNull(),
  workPermitNumber: text('work_permit_number'),
  workPermitExpiry: timestamp('work_permit_expiry'),
  position: text('position').notNull(),
  isGSSEligible: boolean('is_gss_eligible').default(false),
  lmbpRequired: boolean('lmbp_required').default(true),
  localMentorId: uuid('local_mentor_id').references(() => members.id),
});

export const lmbpLetters = pgTable('lmbp_letters', {
  id: uuid('id').defaultRandom().primaryKey(),
  workerId: uuid('worker_id').references(() => foreignWorkers.id).notNull(),
  letterDate: timestamp('letter_date').notNull(),
  benefits: jsonb('benefits'), // Array of LMBP benefits
  duration: text('duration'),
  signedBy: text('signed_by'),
  pdfUrl: text('pdf_url'),
});

export const gssApplications = pgTable('gss_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  workerId: uuid('worker_id').references(() => foreignWorkers.id).notNull(),
  submittedAt: timestamp('submitted_at').notNull(),
  approvedAt: timestamp('approved_at'),
  targetProcessingDays: integer('target_processing_days').default(10),
  actualProcessingDays: integer('actual_processing_days'),
  status: text('status').notNull(), // submitted, approved, denied
  category: text('category'), // unique-and-specialized-talent
});

export const mentorships = pgTable('mentorships', {
  id: uuid('id').defaultRandom().primaryKey(),
  mentorId: uuid('mentor_id').references(() => foreignWorkers.id).notNull(),
  menteeId: uuid('mentee_id').references(() => members.id).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  skillsTransferred: text('skills_transferred').array(),
  quarterlyAssessments: jsonb('quarterly_assessments'),
});
`;
  }
}
