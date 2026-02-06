/**
 * Skill Succession Validator
 * 
 * Validates union steward succession planning:
 * - Auto-onboarding for new stewards
 * - Micro-credentials system
 * - VR training modules
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class SkillSuccessionValidator extends BlindSpotValidator {
  name = '10. Skill Succession';
  description = 'Validates steward onboarding and training automation';
  category = 'operations';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasOnboarding = await this.checkOnboarding();
    const hasCredentials = await this.checkCredentials();
    const hasTraining = await this.checkTraining();

    if (!hasOnboarding) {
      findings.push({
        file: 'lib/services/onboarding',
        issue: 'No auto-onboarding system for new stewards',
        severity: 'medium',
      });
    }

    if (!hasCredentials) {
      findings.push({
        file: 'lib/services/credentials',
        issue: 'No micro-credentials tracking system',
        severity: 'medium',
      });
    }

    if (!hasTraining) {
      findings.push({
        file: 'lib/services/training',
        issue: 'No training modules system found',
        severity: 'low',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} skill succession gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Skill succession checks passed');
  }

  private async checkOnboarding(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*onboard*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkCredentials(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{credential,certification,badge}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkTraining(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{training,learning,course}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// lib/services/steward-succession-service.ts
export class StewardSuccessionService {
  async onboardNewSteward(
    memberId: string,
    roleType: 'shop-steward' | 'chief-steward' | 'trustee'
  ): Promise<OnboardingPlan> {
    // Automatically create onboarding checklist
    const onboardingSteps = await this.getOnboardingSteps(roleType);
    
    await db.insert(stewardOnboarding).values({
      memberId,
      roleType,
      startDate: new Date(),
      steps: onboardingSteps,
      completionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      mentorAssigned: await this.assignMentor(memberId, roleType),
    });

    // Send welcome email with training resources
    await this.sendOnboardingEmail(memberId, roleType);

    return {
      steps: onboardingSteps,
      estimatedHours: this.calculateTrainingHours(onboardingSteps),
      mentor: await this.assignMentor(memberId, roleType),
    };
  }

  async awardMicroCredential(
    memberId: string,
    credentialType: string,
    evidenceUrl?: string
  ): Promise<Credential> {
    const credential = await db.insert(memberCredentials).values({
      memberId,
      credentialType,
      awardedAt: new Date(),
      evidenceUrl,
      blockchainHash: await this.mintCredentialNFT(memberId, credentialType),
    });

    // Update member's skill profile
    await this.updateSkillProfile(memberId, credentialType);

    return credential;
  }

  async trackTrainingProgress(
    memberId: string
  ): Promise<TrainingProgress> {
    const completed = await db.query.trainingModules.findMany({
      where: and(
        eq(trainingModules.memberId, memberId),
        eq(trainingModules.status, 'completed')
      ),
    });

    const inProgress = await db.query.trainingModules.findMany({
      where: and(
        eq(trainingModules.memberId, memberId),
        eq(trainingModules.status, 'in_progress')
      ),
    });

    const required = await this.getRequiredTraining(memberId);

    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      requiredCount: required.length,
      completionPercentage: (completed.length / required.length) * 100,
      nextDeadline: required[0]?.deadline,
    };
  }

  private async getOnboardingSteps(roleType: string): Promise<OnboardingStep[]> {
    const baseSteps = [
      { name: 'Complete role orientation video', hours: 1 },
      { name: 'Read collective agreement', hours: 4 },
      { name: 'Shadow experienced steward', hours: 8 },
      { name: 'Complete grievance handling training', hours: 6 },
    ];

    if (roleType === 'chief-steward') {
      baseSteps.push(
        { name: 'Leadership skills workshop', hours: 8 },
        { name: 'Conflict resolution certification', hours: 12 }
      );
    }

    return baseSteps;
  }

  private async mintCredentialNFT(
    memberId: string,
    credentialType: string
  ): Promise<string> {
    // Optional: Mint credential as NFT for portability
    // Use blockchain for tamper-proof credentials
    const hash = \`0x\${Buffer.from(\`\${memberId}-\${credentialType}-\${Date.now()}\`).toString('hex')}\`;
    return hash;
  }
}

// db/schema/succession-schema.ts
export const stewardOnboarding = pgTable('steward_onboarding', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  roleType: text('role_type').notNull(),
  startDate: timestamp('start_date').notNull(),
  completionDeadline: timestamp('completion_deadline'),
  completedAt: timestamp('completed_at'),
  mentorId: uuid('mentor_id').references(() => members.id),
  steps: jsonb('steps'), // Array of onboarding tasks
  progress: integer('progress').default(0), // Percentage
});

export const memberCredentials = pgTable('member_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  credentialType: text('credential_type').notNull(),
  awardedAt: timestamp('awarded_at').notNull(),
  expiresAt: timestamp('expires_at'),
  evidenceUrl: text('evidence_url'),
  blockchainHash: text('blockchain_hash'), // NFT hash for portability
  issuedBy: uuid('issued_by').references(() => members.id),
});

export const trainingModules = pgTable('training_modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  moduleName: text('module_name').notNull(),
  moduleType: text('module_type'), // video, vr, quiz, shadowing
  status: text('status').notNull(), // not_started, in_progress, completed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  score: integer('score'),
  deadline: timestamp('deadline'),
  isRequired: boolean('is_required').default(false),
});
`;
  }
}
