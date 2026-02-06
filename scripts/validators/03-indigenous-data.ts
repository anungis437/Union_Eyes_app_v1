/**
 * Indigenous Data Sovereignty Validator (OCAP®)
 * 
 * Validates compliance with OCAP® principles for First Nations data:
 * - Ownership, Control, Access, Possession
 * - On-reserve data stays on-premises (not cloud)
 * - Band Council agreements for data collection
 * - Cultural protocols for sensitive information
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class IndigenousDataValidator extends BlindSpotValidator {
  name = '3. Indigenous Data Sovereignty (OCAP)';
  description = 'Validates OCAP® principles for First Nations data governance';
  category = 'indigenous-rights';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    // Check for Indigenous data handling policies
    const hasOCAPCompliance = await this.checkOCAPCompliance();
    
    // Check for on-premise storage configuration
    const hasOnPremiseStorage = await this.checkOnPremiseStorage();
    
    // Check for Band Council consent mechanisms
    const hasBandCouncilConsent = await this.checkBandCouncilConsent();
    
    // Check for cultural sensitivity flags
    const hasCulturalProtocols = await this.checkCulturalProtocols();

    if (!hasOCAPCompliance) {
      findings.push({
        file: 'lib/services/indigenous-data',
        issue: 'No OCAP® compliance service found',
        severity: 'critical',
      });
    }

    if (!hasOnPremiseStorage) {
      findings.push({
        file: 'infrastructure/',
        issue: 'No on-reserve/on-premise storage configuration found',
        severity: 'critical',
      });
    }

    if (!hasBandCouncilConsent) {
      findings.push({
        file: 'db/schema',
        issue: 'No Band Council consent tracking found',
        severity: 'high',
      });
    }

    if (!hasCulturalProtocols) {
      findings.push({
        file: 'lib/services/data-classification',
        issue: 'No cultural sensitivity classification system found',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} Indigenous data sovereignty compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass(
      'Indigenous data sovereignty (OCAP®) compliance checks passed'
    );
  }

  private async checkOCAPCompliance(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*{indigenous,ocap,first-nations}*.ts', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkOnPremiseStorage(): Promise<boolean> {
    try {
      // Check for on-premise database configs
      const envFiles = await glob('.env*', {
        cwd: process.cwd(),
      });

      for (const file of envFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/ON_RESERVE_|ON_PREMISE_|LOCAL_STORAGE_/)) {
          return true;
        }
      }

      // Check for docker-compose on-premise services
      const dockerFiles = await glob('docker-compose*.yml', {
        cwd: process.cwd(),
      });

      for (const file of dockerFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/on-premise|on-reserve|local-postgres/)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private async checkBandCouncilConsent(): Promise<boolean> {
    try {
      const schemaFiles = await glob('db/schema/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of schemaFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/band_council|indigenous_consent|first_nations_agreement/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkCulturalProtocols(): Promise<boolean> {
    try {
      const files = await glob('lib/**/*{cultural,sensitivity,protocol}*.ts', {
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
// 1. Create OCAP® compliance service:
// lib/services/indigenous-data-service.ts
export class IndigenousDataService {
  // OWNERSHIP: Data belongs to the community
  async verifyBandCouncilOwnership(memberId: string): Promise<boolean> {
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId),
      with: { bandCouncilAgreement: true }
    });
    return member?.bandCouncilAgreement?.status === 'active';
  }

  // CONTROL: Community controls data collection, use, disclosure
  async requestDataAccess(
    requesterId: string, 
    purpose: string
  ): Promise<AccessRequest> {
    // Must get Band Council approval for any data access
    return await createAccessRequest({
      requesterId,
      purpose,
      requiresBandCouncilApproval: true,
      status: 'pending'
    });
  }

  // ACCESS: Community determines who can access data
  async checkAccessPermission(
    userId: string, 
    dataType: string
  ): Promise<boolean> {
    // Check if user has Band Council-granted access
    return await hasPermission(userId, dataType);
  }

  // POSSESSION: Data stored physically on-reserve when possible
  async routeToOnPremiseStorage(data: any): Promise<void> {
    const config = await getStorageConfig(data.reserveId);
    if (config.hasOnPremiseServer) {
      await saveToLocalServer(data, config.endpoint);
    } else {
      // Fallback: Encrypted cloud with Band Council keys
      await saveToCloud(data, { 
        encryption: 'band-council-keys',
        region: 'canada-only' 
      });
    }
  }
}

// 2. Add database schema:
// db/schema/indigenous-data-schema.ts
export const bandCouncilAgreements = pgTable('band_council_agreements', {
  id: uuid('id').defaultRandom().primaryKey(),
  bandName: text('band_name').notNull(),
  councilResolutionNumber: text('council_resolution_number'),
  signedAt: timestamp('signed_at').notNull(),
  expiresAt: timestamp('expires_at'),
  status: text('status').notNull(), // active, expired, revoked
  dataCategories: text('data_categories').array(), // employment, health, cultural
  restrictions: jsonb('restrictions'), // OCAP® restrictions
});

export const indigenousDataClassification = pgTable('indigenous_data_classification', {
  id: uuid('id').defaultRandom().primaryKey(),
  dataType: text('data_type').notNull(),
  sensitivityLevel: text('sensitivity_level').notNull(), // public, sacred, restricted
  requiresElderApproval: boolean('requires_elder_approval').default(false),
  culturalProtocols: text('cultural_protocols'),
});

// 3. On-premise storage configuration:
// docker-compose.on-reserve.yml
services:
  on-reserve-postgres:
    image: postgres:16
    volumes:
      - ./on-reserve-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: union_eyes_on_reserve
      POSTGRES_USER: band_council_admin
      POSTGRES_PASSWORD: \${ON_RESERVE_DB_PASSWORD}
    networks:
      - on-reserve-network

// 4. Environment variables:
ON_RESERVE_DATABASE_URL=postgresql://localhost:5432/union_eyes_on_reserve
ON_PREMISE_STORAGE_PATH=/mnt/band-council-server/data
INDIGENOUS_DATA_ENCRYPTION_KEY=<Band-Council-Managed-Key>

// 5. Cultural sensitivity flags:
export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  SACRED = 'sacred',        // Requires Elder approval
  RESTRICTED = 'restricted', // Band Council only
}
`;
  }
}
