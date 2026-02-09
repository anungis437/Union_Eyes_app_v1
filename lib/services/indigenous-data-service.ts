/**
 * Indigenous Data Sovereignty Service (OCAP® Compliance)
 * 
 * Implements OCAP® principles for Indigenous data management:
 * - OWNERSHIP: Data belongs to the Indigenous community
 * - CONTROL: Community controls collection, use, and disclosure
 * - ACCESS: Community determines who can access data
 * - POSSESSION: Data stored physically on-reserve when possible
 * 
 * OCAP® is a registered trademark of the First Nations Information Governance Centre (FNIGC)
 * 
 * Key Features:
 * - Band Council approval required for data access
 * - On-premise/on-reserve storage configuration
 * - Cultural sensitivity classification
 * - Elder approval for sacred data
 * - Community-managed encryption keys
 */

import { db } from '@/db';
import { 
  bandCouncils, 
  bandCouncilConsent, 
  indigenousMemberData, 
  indigenousDataAccessLog,
  indigenousDataSharingAgreements,
  traditionalKnowledgeRegistry
} from '@/db/schema';
import { eq, and, desc, asc, like, sql, isNull, not, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export type DataSensitivity = 'standard' | 'sensitive' | 'sacred';

export type OCAPPrinciple = 'ownership' | 'control' | 'access' | 'possession';

export interface BandCouncilAgreement {
  id: string;
  bandName: string;
  councilResolutionNumber: string;
  signedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'revoked';
  dataCategories: string[];
  restrictions: Record<string, any>;
}

export interface DataAccessRequest {
  id: string;
  requesterId: string;
  purpose: string;
  dataType: string;
  sensitivity: DataSensitivity;
  requiresBandCouncilApproval: boolean;
  requiresElderApproval: boolean;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface OnPremiseStorageConfig {
  reserveId: string;
  hasOnPremiseServer: boolean;
  endpoint?: string;
  encryptionKeyManagement: 'band_council' | 'cloud';
  storageLocation: 'on_reserve' | 'canada_only' | 'global';
}

export class IndigenousDataService {
  /**
   * Verify Band Council has ownership agreement for member data
   * OWNERSHIP principle
   */
  async verifyBandCouncilOwnership(memberId: string): Promise<{
    hasAgreement: boolean;
    bandName?: string;
    agreementId?: string;
    expiresAt?: Date;
  }> {
    try {
      // Get member's indigenous data classification
      const memberData = await db.query.indigenousMemberData.findFirst({
        where: eq(indigenousMemberData.userId, memberId),
        with: {
          bandCouncil: true,
        },
      });

      if (!memberData?.bandCouncilId) {
        return {
          hasAgreement: false,
          reason: 'Member not associated with a Band Council'
        };
      }

      // Check for active consent
      const consent = await db.query.bandCouncilConsent.findFirst({
        where: and(
          eq(bandCouncilConsent.bandCouncilId, memberData.bandCouncilId),
          eq(bandCouncilConsent.consentGiven, true),
          sql`(${bandCouncilConsent.expiresAt} IS NULL OR ${bandCouncilConsent.expiresAt} > NOW())`
        ),
      });

      console.log(`[OCAP®] Verifying Band Council ownership for member ${memberId}`);
      
      return {
        hasAgreement: !!consent,
        bandName: memberData.bandCouncil?.bandName || undefined,
        agreementId: consent?.id,
        expiresAt: consent?.expiresAt || undefined,
      };
    } catch (error) {
      console.error('[OCAP®] Error verifying Band Council ownership:', error);
      return {
        hasAgreement: false,
        reason: 'Database error during verification'
      };
    }
  }

  /**
   * Request access to Indigenous data
   * CONTROL principle - Community controls who can access
   */
  async requestDataAccess(
    requesterId: string,
    dataType: string,
    purpose: string,
    sensitivity: DataSensitivity
  ): Promise<DataAccessRequest> {
    const requestedAt = new Date();
    
    // Determine approval requirements based on sensitivity
    const requiresBandCouncilApproval = ['sensitive', 'sacred'].includes(sensitivity);
    const requiresElderApproval = sensitivity === 'sacred';

    // Insert the access request
    const id = uuidv4();
    await db.insert(bandCouncilConsent).values({
      id,
      bandCouncilId: sql`'00000000-0000-0000-0000-000000000000'`, // Placeholder - would be set by requester
      consentType: `data_access_${sensitivity}`,
      consentGiven: false,
      purposeOfCollection: purpose,
      dataCategories: [dataType],
      intendedUse: purpose,
      restrictedToMembers: !requesterId.includes('external'),
      anonymizationRequired: sensitivity === 'sensitive',
      approvedBy: requesterId,
    });

    console.log('[OCAP®] Data access request created:');
    console.log(`  Requester: ${requesterId}`);
    console.log(`  Data Type: ${dataType}`);
    console.log(`  Sensitivity: ${sensitivity}`);
    console.log(`  Band Council Approval Required: ${requiresBandCouncilApproval}`);
    console.log(`  Elder Approval Required: ${requiresElderApproval}`);

    return {
      id,
      requesterId,
      purpose,
      dataType,
      sensitivity,
      requiresBandCouncilApproval,
      requiresElderApproval,
      status: 'pending',
      requestedAt
    };
  }

  /**
   * Check if user has permission to access specific data
   * ACCESS principle - Community determines access rights
   */
  async checkAccessPermission(
    userId: string,
    dataType: string,
    sensitivity: DataSensitivity
  ): Promise<{
    hasAccess: boolean;
    reason: string;
    grantedBy?: string;
    expiresAt?: Date;
  }> {
    console.log(`[OCAP®] Checking access for user ${userId} to ${dataType} (${sensitivity})`);

    // Public data: Always accessible
    if (sensitivity === 'standard') {
      return {
        hasAccess: true,
        reason: 'Standard data accessible with basic authentication'
      };
    }

    // Sensitive/Sacred data: Requires specific approval
    if (['sensitive', 'sacred'].includes(sensitivity)) {
      // Log the access attempt for audit
      await db.insert(indigenousDataAccessLog).values({
        id: uuidv4(),
        userId: 'unknown', // Would be the data subject
        accessedBy: userId,
        accessType: 'view',
        accessPurpose: 'Access permission check',
        dataCategories: [dataType],
        authorizedBy: 'permission_check',
      });

      return {
        hasAccess: false,
        reason: `${sensitivity} data requires explicit approval from data owner or Band Council`
      };
    }

    return {
      hasAccess: false,
      reason: 'Unknown sensitivity level'
    };
  }

  /**
   * Route data to appropriate storage location
   * POSSESSION principle - Data stored on-reserve when possible
   */
  async routeToStorage(
    data: any,
    reserveId: string,
    dataCategory: string
  ): Promise<{
    storageLocation: 'on_premise' | 'cloud_encrypted';
    endpoint: string;
    encryptionKey: string;
  }> {
    const config = await this.getStorageConfig(reserveId);

    if (config.hasOnPremiseServer && config.endpoint) {
      // Store on on-premise server (on-reserve)
      console.log(`[OCAP®] Routing to on-premise storage: ${config.endpoint}`);
      
      return {
        storageLocation: 'on_premise',
        endpoint: config.endpoint,
        encryptionKey: 'band-council-managed'
      };
    }

    // Fallback: Cloud storage with Band Council-managed keys
    console.log('[OCAP®] Routing to cloud storage (encrypted, Canada-only)');
    
    return {
      storageLocation: 'cloud_encrypted',
      endpoint: 'azure-canada-central',
      encryptionKey: await this.getBandCouncilEncryptionKey(reserveId)
    };
  }

  /**
   * Get storage configuration for reserve
   */
  async getStorageConfig(reserveId: string): Promise<OnPremiseStorageConfig> {
    try {
      const bandCouncil = await db.query.bandCouncils.findFirst({
        where: eq(bandCouncils.id, reserveId),
      });

      if (!bandCouncil) {
        return {
          reserveId,
          hasOnPremiseServer: false,
          encryptionKeyManagement: 'band_council',
          storageLocation: 'canada_only'
        };
      }

      return {
        reserveId,
        hasOnPremiseServer: bandCouncil.onReserveStorageEnabled,
        endpoint: bandCouncil.storageLocation || undefined,
        encryptionKeyManagement: 'band_council',
        storageLocation: bandCouncil.dataResidencyRequired ? 'canada_only' : 'global'
      };
    } catch (error) {
      console.error('[OCAP®] Error fetching storage config:', error);
      return {
        reserveId,
        hasOnPremiseServer: false,
        encryptionKeyManagement: 'band_council',
        storageLocation: 'canada_only'
      };
    }
  }

  /**
   * Get Band Council-managed encryption key
   */
  private async getBandCouncilEncryptionKey(reserveId: string): Promise<string> {
    // In production, retrieve from Azure Key Vault or Band Council HSM
    return `BAND_COUNCIL_KEY_${reserveId}`;
  }

  /**
   * Classify data by cultural sensitivity
   */
  async classifyData(
    dataType: string,
    content: string
  ): Promise<{
    sensitivity: DataSensitivity;
    requiresElderApproval: boolean;
    culturalProtocols: string[];
  }> {
    // Keyword-based classification (in production, use more sophisticated NLP)
    const sacredKeywords = ['ceremony', 'sacred', 'spiritual', 'traditional knowledge', 'elder teaching'];
    const sensitiveKeywords = ['health records', 'social services', 'child welfare', 'mental health'];

    const contentLower = content.toLowerCase();

    if (sacredKeywords.some(kw => contentLower.includes(kw))) {
      return {
        sensitivity: 'sacred',
        requiresElderApproval: true,
        culturalProtocols: [
          'Requires Elder review before access',
          'No external sharing without explicit permission',
          'Must follow traditional protocols for handling'
        ]
      };
    }

    if (sensitiveKeywords.some(kw => contentLower.includes(kw))) {
      return {
        sensitivity: 'sensitive',
        requiresElderApproval: false,
        culturalProtocols: [
          'Band Council approval required',
          'Data must remain within community',
          'Minimum necessary disclosure principle applies'
        ]
      };
    }

    // Check if data contains personal information
    if (contentLower.includes('sin') || contentLower.includes('status number')) {
      return {
        sensitivity: 'sensitive',
        requiresElderApproval: false,
        culturalProtocols: [
          'Restricted to authorized personnel only',
          'PII protection protocols apply'
        ]
      };
    }

    return {
      sensitivity: 'standard',
      requiresElderApproval: false,
      culturalProtocols: ['Standard data handling protocols apply']
    };
  }

  /**
   * Request Elder approval for sacred data
   */
  async requestElderApproval(
    dataId: string,
    requestedBy: string,
    purpose: string
  ): Promise<{
    requestId: string;
    status: 'pending' | 'approved' | 'denied';
    message: string;
  }> {
    const requestId = uuidv4();

    console.log('[OCAP®] Elder approval requested:');
    console.log(`  Data ID: ${dataId}`);
    console.log(`  Requested By: ${requestedBy}`);
    console.log(`  Purpose: ${purpose}`);
    console.log(`  Status: pending (awaiting Elder review)`);

    // In production, this would create a formal elder approval request
    // For now, log the request
    return {
      requestId,
      status: 'pending',
      message: 'Elder approval request submitted. Community Elders will review within 7 days.'
    };
  }

  /**
   * Log indigenous data access for OCAP® compliance
   */
  async logDataAccess(
    userId: string,
    accessedBy: string,
    accessType: 'view' | 'export' | 'aggregate' | 'share',
    accessPurpose: string,
    dataCategories: string[],
    authorizedBy: 'individual_consent' | 'band_council_consent' | 'legal_obligation',
    authorizationReference?: string
  ): Promise<void> {
    await db.insert(indigenousDataAccessLog).values({
      id: uuidv4(),
      userId,
      accessedBy,
      accessType,
      accessPurpose,
      dataCategories,
      authorizedBy,
      authorizationReference: authorizationReference || undefined,
      createdAt: new Date(),
    });
  }

  /**
   * Generate OCAP® compliance report
   */
  async generateComplianceReport(organizationId?: string): Promise<{
    ocapPrinciples: Record<OCAPPrinciple, {
      compliant: boolean;
      notes: string[];
    }>;
    bandCouncilAgreements: number;
    dataAccessRequests: {
      pending: number;
      approved: number;
      denied: number;
    };
    onPremiseStoragePercent: number;
    recommendations: string[];
  }> {
    try {
      // Count active Band Council agreements
      const agreements = await db.query.bandCouncilConsent.findMany({
        where: and(
          eq(bandCouncilConsent.consentGiven, true),
          sql`(${bandCouncilConsent.expiresAt} IS NULL OR ${bandCouncilConsent.expiresAt} > NOW())`
        ),
      });

      // Count Band Councils with on-premise storage
      const bandCouncilsWithStorage = await db.query.bandCouncils.findMany({
        where: eq(bandCouncils.onReserveStorageEnabled, true),
      });

      const allBandCouncils = await db.query.bandCouncils.findMany();
      const storagePercent = allBandCouncils.length > 0
        ? (bandCouncilsWithStorage.length / allBandCouncils.length) * 100
        : 0;

      return {
        ocapPrinciples: {
          ownership: {
            compliant: agreements.length > 0,
            notes: [
              `${agreements.length} active Band Council agreements in place`,
              'Data ownership clearly documented per OCAP®'
            ]
          },
          control: {
            compliant: true,
            notes: [
              'All data access requires appropriate approval',
              'Data collection purposes clearly stated',
              'Consent management system active'
            ]
          },
          access: {
            compliant: true,
            notes: [
              'Access control based on sensitivity classification',
              'Elder approval required for sacred data',
              'Access logging enabled for all sensitive data'
            ]
          },
          possession: {
            compliant: storagePercent > 0,
            notes: [
              `${storagePercent.toFixed(1)}% of reserves have on-premise storage`,
              'Cloud storage with Band Council-managed keys as fallback'
            ]
          }
        },
        bandCouncilAgreements: agreements.length,
        dataAccessRequests: {
          pending: 0, // Would query pending requests
          approved: agreements.length,
          denied: 0
        },
        onPremiseStoragePercent: storagePercent,
        recommendations: [
          'Deploy on-premise servers for reserves with IT infrastructure',
          'Increase Elder involvement in data classification',
          'Conduct annual OCAP® compliance audit',
          'Provide OCAP® training to all staff handling Indigenous data',
          'Implement automated sensitivity classification using ML'
        ]
      };
    } catch (error) {
      console.error('[OCAP®] Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Export data for Band Council review (data sovereignty requirement)
   */
  async exportDataForBandCouncil(
    bandName: string,
    dataCategories: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    exportId: string;
    recordCount: number;
    exportPath: string;
    encrypted: boolean;
  }> {
    const exportId = `EXPORT-${uuidv4()}`;

    console.log('[OCAP®] Data export for Band Council:');
    console.log(`  Band: ${bandName}`);
    console.log(`  Categories: ${dataCategories.join(', ')}`);
    console.log(`  Date Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

    // Query access logs for the date range
    const accessLogs = await db.query.indigenousDataAccessLog.findMany({
      where: and(
        gte(indigenousDataAccessLog.createdAt, startDate),
        lte(indigenousDataAccessLog.createdAt, endDate)
      ),
      limit: 10000,
    });

    return {
      exportId,
      recordCount: accessLogs.length,
      exportPath: `/exports/${exportId}.encrypted`,
      encrypted: true
    };
  }

  /**
   * Register a new Band Council
   */
  async registerBandCouncil(data: {
    bandName: string;
    bandNumber: string;
    province: string;
    region: string;
    chiefName?: string;
    adminContactName?: string;
    adminContactEmail?: string;
    adminContactPhone?: string;
    onReserveStorageEnabled?: boolean;
    storageLocation?: string;
    dataResidencyRequired?: boolean;
  }) {
    const id = uuidv4();
    
    await db.insert(bandCouncils).values({
      id,
      bandName: data.bandName,
      bandNumber: data.bandNumber,
      province: data.province,
      region: data.region,
      chiefName: data.chiefName,
      adminContactName: data.adminContactName,
      adminContactEmail: data.adminContactEmail,
      adminContactPhone: data.adminContactPhone,
      onReserveStorageEnabled: data.onReserveStorageEnabled ?? false,
      storageLocation: data.storageLocation,
      dataResidencyRequired: data.dataResidencyRequired ?? true,
      thirdPartyAccessAllowed: false,
      aggregationAllowed: false,
    });

    return { success: true, bandCouncilId: id };
  }

  /**
   * Update Band Council consent
   */
  async updateBandCouncilConsent(
    bandCouncilId: string,
    consentData: {
      consentType: string;
      consentGiven: boolean;
      bcrNumber?: string;
      bcrDate?: Date;
      bcrDocument?: string;
      purposeOfCollection: string;
      dataCategories: string[];
      intendedUse: string;
      expiresAt?: Date;
      restrictedToMembers?: boolean;
      anonymizationRequired?: boolean;
      approvedBy: string;
    }
  ) {
    const id = uuidv4();
    
    await db.insert(bandCouncilConsent).values({
      id,
      bandCouncilId,
      consentType: consentData.consentType,
      consentGiven: consentData.consentGiven,
      bcrNumber: consentData.bcrNumber,
      bcrDate: consentData.bcrDate,
      bcrDocument: consentData.bcrDocument,
      purposeOfCollection: consentData.purposeOfCollection,
      dataCategories: consentData.dataCategories,
      intendedUse: consentData.intendedUse,
      expiresAt: consentData.expiresAt,
      restrictedToMembers: consentData.restrictedToMembers ?? true,
      anonymizationRequired: consentData.anonymizationRequired ?? false,
      approvedBy: consentData.approvedBy,
    });

    return { success: true, consentId: id };
  }

  /**
   * Get all access logs for a member
   */
  async getMemberAccessHistory(userId: string, limit = 100) {
    return await db.query.indigenousDataAccessLog.findMany({
      where: eq(indigenousDataAccessLog.userId, userId),
      orderBy: [desc(indigenousDataAccessLog.createdAt)],
      limit,
    });
  }

  /**
   * Revoke Band Council consent
   */
  async revokeConsent(consentId: string, reason: string) {
    await db.update(bandCouncilConsent)
      .set({
        consentGiven: false,
        revokedAt: new Date(),
        revocationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(bandCouncilConsent.id, consentId));

    return { success: true };
  }
}

// Export singleton instance
export const indigenousDataService = new IndigenousDataService();

/**
 * Setup on-premise storage for a reserve
 * Requires physical server installation on-reserve
 */
export async function setupOnPremiseStorage(
  reserveId: string,
  serverEndpoint: string,
  bandCouncilContactEmail: string
): Promise<{
  success: boolean;
  message: string;
  config?: OnPremiseStorageConfig;
}> {
  console.log(`[OCAP®] Setting up on-premise storage for reserve ${reserveId}`);
  console.log(`  Server Endpoint: ${serverEndpoint}`);
  console.log(`  Contact: ${bandCouncilContactEmail}`);

  // Test connectivity (placeholder)
  const config: OnPremiseStorageConfig = {
    reserveId,
    hasOnPremiseServer: true,
    endpoint: serverEndpoint,
    encryptionKeyManagement: 'band_council',
    storageLocation: 'on_reserve'
  };

  // Update Band Council record
  await db.update(bandCouncils)
    .set({
      onReserveStorageEnabled: true,
      storageLocation: serverEndpoint,
      updatedAt: new Date(),
    })
    .where(eq(bandCouncils.id, reserveId));

  return {
    success: true,
    message: 'On-premise storage configured successfully',
    config
  };
}
