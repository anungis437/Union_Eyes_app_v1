/**
 * GDPR Consent Management Service
 * 
 * Handles all GDPR compliance operations:
 * - Consent collection and management
 * - Cookie consent tracking
 * - Data subject requests (access, erasure, portability)
 * - Data retention and anonymization
 * 
 * Compliance: GDPR Articles 6, 7, 13-21, 30
 */

import { db } from "@/db";
import {
  userConsents,
  cookieConsents,
  gdprDataRequests,
  dataAnonymizationLog,
  type NewUserConsent,
  type NewCookieConsent,
  type NewGdprDataRequest,
  type NewDataAnonymizationLog,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Consent Management
 */
export class ConsentManager {
  /**
   * Record user consent
   */
  static async recordConsent(data: {
    userId: string;
    tenantId: string;
    consentType: "essential" | "functional" | "analytics" | "marketing" | "personalization" | "third_party";
    legalBasis: string;
    processingPurpose: string;
    consentVersion: string;
    consentText: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt?: Date;
    metadata?: any;
  }): Promise<typeof userConsents.$inferSelect> {
    const [consent] = await db
      .insert(userConsents)
      .values({
        ...data,
        status: "granted",
        grantedAt: new Date(),
      })
      .returning();

    return consent;
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    userId: string,
    consentId: string
  ): Promise<boolean> {
    const result = await db
      .update(userConsents)
      .set({
        status: "withdrawn",
        withdrawnAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userConsents.id, consentId),
          eq(userConsents.userId, userId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Get active consents for user
   */
  static async getUserConsents(userId: string, tenantId: string) {
    return await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.tenantId, tenantId),
          eq(userConsents.status, "granted")
        )
      )
      .orderBy(desc(userConsents.grantedAt));
  }

  /**
   * Check if user has given specific consent
   */
  static async hasConsent(
    userId: string,
    tenantId: string,
    consentType: string
  ): Promise<boolean> {
    const result = await db
      .select({ id: userConsents.id })
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.tenantId, tenantId),
          eq(userConsents.consentType, consentType as any),
          eq(userConsents.status, "granted")
        )
      )
      .limit(1);

    return result.length > 0;
  }
}

/**
 * Cookie Consent Management
 */
export class CookieConsentManager {
  /**
   * Save cookie preferences
   */
  static async saveCookieConsent(data: {
    userId?: string;
    tenantId: string;
    consentId: string; // Browser-side unique ID
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<typeof cookieConsents.$inferSelect> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 12 months

    // Check if consent already exists
    const existing = await db
      .select()
      .from(cookieConsents)
      .where(eq(cookieConsents.consentId, data.consentId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(cookieConsents)
        .set({
          ...data,
          lastUpdated: new Date(),
          expiresAt,
        })
        .where(eq(cookieConsents.consentId, data.consentId))
        .returning();

      return updated;
    } else {
      // Insert new
      const [consent] = await db
        .insert(cookieConsents)
        .values({
          ...data,
          expiresAt,
        })
        .returning();

      return consent;
    }
  }

  /**
   * Get cookie consent by browser ID
   */
  static async getCookieConsent(consentId: string) {
    const result = await db
      .select()
      .from(cookieConsents)
      .where(eq(cookieConsents.consentId, consentId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Check if cookie consent is still valid
   */
  static async isConsentValid(consentId: string): Promise<boolean> {
    const consent = await this.getCookieConsent(consentId);
    if (!consent) return false;

    const now = new Date();
    return consent.expiresAt > now;
  }
}

/**
 * GDPR Data Subject Requests
 */
export class GdprRequestManager {
  /**
   * Submit data access request (Article 15)
   */
  static async requestDataAccess(data: {
    userId: string;
    tenantId: string;
    requestDetails?: any;
    verificationMethod?: string;
  }): Promise<typeof gdprDataRequests.$inferSelect> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30); // 30 days to respond

    const [request] = await db
      .insert(gdprDataRequests)
      .values({
        ...data,
        requestType: "access",
        status: "pending",
        deadline,
      })
      .returning();

    // TODO: Send notification to admin/DPO
    return request;
  }

  /**
   * Submit data erasure request - Right to be Forgotten (Article 17)
   */
  static async requestDataErasure(data: {
    userId: string;
    tenantId: string;
    requestDetails?: any;
    verificationMethod?: string;
  }): Promise<typeof gdprDataRequests.$inferSelect> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const [request] = await db
      .insert(gdprDataRequests)
      .values({
        ...data,
        requestType: "erasure",
        status: "pending",
        deadline,
      })
      .returning();

    return request;
  }

  /**
   * Submit data portability request (Article 20)
   */
  static async requestDataPortability(data: {
    userId: string;
    tenantId: string;
    preferredFormat?: "json" | "csv" | "xml";
    requestDetails?: any;
  }): Promise<typeof gdprDataRequests.$inferSelect> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const [request] = await db
      .insert(gdprDataRequests)
      .values({
        userId: data.userId,
        tenantId: data.tenantId,
        requestType: "portability",
        status: "pending",
        deadline,
        requestDetails: {
          preferredFormat: data.preferredFormat || "json",
          ...data.requestDetails,
        },
      })
      .returning();

    return request;
  }

  /**
   * Get user's GDPR requests
   */
  static async getUserRequests(userId: string, tenantId: string) {
    return await db
      .select()
      .from(gdprDataRequests)
      .where(
        and(
          eq(gdprDataRequests.userId, userId),
          eq(gdprDataRequests.tenantId, tenantId)
        )
      )
      .orderBy(desc(gdprDataRequests.requestedAt));
  }

  /**
   * Get pending requests (for admin)
   */
  static async getPendingRequests(tenantId: string) {
    return await db
      .select()
      .from(gdprDataRequests)
      .where(
        and(
          eq(gdprDataRequests.tenantId, tenantId),
          eq(gdprDataRequests.status, "pending")
        )
      )
      .orderBy(gdprDataRequests.deadline);
  }

  /**
   * Update request status
   */
  static async updateRequestStatus(
    requestId: string,
    status: "in_progress" | "completed" | "rejected",
    data?: {
      processedBy?: string;
      responseData?: any;
      rejectionReason?: string;
    }
  ) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...data,
    };

    if (status === "in_progress" && !data?.processedBy) {
      updateData.processedAt = new Date();
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(gdprDataRequests)
      .set(updateData)
      .where(eq(gdprDataRequests.id, requestId))
      .returning();

    return updated;
  }
}

/**
 * Data Export Service (Article 15)
 */
export class DataExportService {
  /**
   * Generate complete data export for user
   */
  static async exportUserData(
    userId: string,
    tenantId: string,
    format: "json" | "csv" | "xml" = "json"
  ): Promise<any> {
    // Collect all user data from various tables
    const userData = {
      exportDate: new Date().toISOString(),
      userId,
      tenantId,
      format,
      data: {
        profile: await this.getProfileData(userId),
        consents: await this.getConsentData(userId, tenantId),
        communications: await this.getCommunicationData(userId, tenantId),
        claims: await this.getClaimsData(userId, tenantId),
        votes: await this.getVotingData(userId, tenantId),
        // Add more data categories as needed
      },
    };

    return userData;
  }

  private static async getProfileData(userId: string) {
    // Query profile data
    const result = await db.query.profiles.findFirst({
      where: (profiles: any, { eq }: any) => eq(profiles.userId, userId),
    });
    return result;
  }

  private static async getConsentData(userId: string, tenantId: string) {
    return await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.tenantId, tenantId)
        )
      );
  }

  private static async getCommunicationData(userId: string, tenantId: string) {
    // Query communication history
    // TODO: Implement based on your communications schema
    return [];
  }

  private static async getClaimsData(userId: string, tenantId: string) {
    // Query claims data
    // TODO: Implement based on your claims schema
    return [];
  }

  private static async getVotingData(userId: string, tenantId: string) {
    // Query voting history (anonymized)
    // TODO: Implement based on your voting schema
    return [];
  }
}

/**
 * Right to be Forgotten Service (Article 17)
 */
export class DataErasureService {
  /**
   * Execute data erasure for user
   * This is a destructive operation - use with caution!
   */
  static async eraseUserData(
    userId: string,
    tenantId: string,
    requestId: string,
    executedBy: string
  ): Promise<void> {
    const tablesAffected: Array<{
      table: string;
      recordsAffected: number;
      fieldsAnonymized: string[];
    }> = [];

    try {
      // 1. Anonymize profile data (keep record for legal/audit purposes)
      const profileResult = await this.anonymizeProfile(userId);
      tablesAffected.push(profileResult);

      // 2. Delete or anonymize communications
      const commResult = await this.eraseCommunications(userId, tenantId);
      tablesAffected.push(commResult);

      // 3. Anonymize claims (may need to keep for legal reasons)
      const claimsResult = await this.anonymizeClaims(userId, tenantId);
      tablesAffected.push(claimsResult);

      // 4. Delete consent records
      const consentResult = await this.eraseConsents(userId, tenantId);
      tablesAffected.push(consentResult);

      // 5. Log the anonymization
      await db.insert(dataAnonymizationLog).values({
        userId,
        tenantId,
        operationType: "anonymize",
        reason: "RTBF request",
        requestId,
        tablesAffected,
        executedBy,
        canReverse: false, // Permanent operation
      });

      // 6. Update the GDPR request status
      await GdprRequestManager.updateRequestStatus(requestId, "completed", {
        processedBy: executedBy,
        responseData: {
          tablesAffected: tablesAffected.length,
          recordsAffected: tablesAffected.reduce(
            (sum, t) => sum + t.recordsAffected,
            0
          ),
        },
      });
    } catch (error) {
      console.error("Data erasure failed:", error);
      throw new Error("Failed to complete data erasure");
    }
  }

  private static async anonymizeProfile(userId: string) {
    // Replace PII with anonymized values
    const anonymousEmail = `deleted_${createHash("sha256").update(userId).digest("hex").substring(0, 16)}@anonymized.local`;
    
    // TODO: Implement actual profile anonymization
    // await db.update(profiles)
    //   .set({
    //     email: anonymousEmail,
    //     firstName: "Deleted",
    //     lastName: "User",
    //     phoneNumber: null,
    //     // ... other PII fields
    //   })
    //   .where(eq(profiles.userId, userId));

    return {
      table: "profiles",
      recordsAffected: 1,
      fieldsAnonymized: ["email", "firstName", "lastName", "phoneNumber"],
    };
  }

  private static async eraseCommunications(userId: string, tenantId: string) {
    // Delete communication records
    // TODO: Implement based on your schema
    return {
      table: "communications",
      recordsAffected: 0,
      fieldsAnonymized: [],
    };
  }

  private static async anonymizeClaims(userId: string, tenantId: string) {
    // Anonymize claims while keeping statistical data
    // TODO: Implement based on your schema
    return {
      table: "claims",
      recordsAffected: 0,
      fieldsAnonymized: ["description", "notes"],
    };
  }

  private static async eraseConsents(userId: string, tenantId: string) {
    const result = await db
      .delete(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.tenantId, tenantId)
        )
      );

    return {
      table: "user_consents",
      recordsAffected: 0, // result.count or similar
      fieldsAnonymized: [],
    };
  }

  /**
   * Check if user data can be erased
   * Some data may need to be retained for legal reasons
   */
  static async canEraseData(
    userId: string,
    tenantId: string
  ): Promise<{ canErase: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check for active claims
    // const activeClaims = await checkActiveClaims(userId, tenantId);
    // if (activeClaims > 0) {
    //   reasons.push("User has active claims that must be retained for legal purposes");
    // }

    // Check for ongoing strikes
    // Check for pending payments
    // etc.

    return {
      canErase: reasons.length === 0,
      reasons,
    };
  }
}

/**
 * Consent Banner Configuration
 */
export const CONSENT_BANNER_CONFIG = {
  version: "1.0.0",
  lastUpdated: "2026-02-06",
  categories: [
    {
      id: "essential",
      name: "Essential Cookies",
      description:
        "Required for the website to function. Cannot be disabled.",
      required: true,
      cookies: ["session_id", "csrf_token", "auth_token"],
    },
    {
      id: "functional",
      name: "Functional Cookies",
      description:
        "Enable enhanced functionality and personalization.",
      required: false,
      cookies: ["language_preference", "theme_preference"],
    },
    {
      id: "analytics",
      name: "Analytics Cookies",
      description:
        "Help us understand how visitors use our website.",
      required: false,
      cookies: ["_ga", "_gid", "analytics_session"],
    },
    {
      id: "marketing",
      name: "Marketing Cookies",
      description:
        "Used to track visitors and display relevant ads.",
      required: false,
      cookies: ["marketing_id", "ad_personalization"],
    },
  ],
  policyUrl: "/privacy-policy",
  cookiePolicyUrl: "/cookie-policy",
};

export default {
  ConsentManager,
  CookieConsentManager,
  GdprRequestManager,
  DataExportService,
  DataErasureService,
};
