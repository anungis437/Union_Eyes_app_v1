export * from "./profiles-schema";
export * from "./pending-profiles-schema";
export * from "./collective-agreements-schema";
export * from "./cba-clauses-schema";
export * from "./claims-schema";
export * from "./voting-schema";
export * from "./user-management-schema";
export * from "./user-uuid-mapping-schema";
export * from "./tenant-management-schema";
export * from "./audit-security-schema";
export * from "./cba-intelligence-schema";
// export * from "./organization-members-schema"; // Commented out - using Phase 5A version from schema-organizations instead
export * from "./notifications-schema";
export * from "./calendar-schema";
export * from "./deadlines-schema";
export * from "./reports-schema";

// Phase 5A: CLC Organizations
export * from "../schema-organizations";

// Phase 5B: Inter-Union Features
export * from "./shared-clause-library-schema";
export * from "./arbitration-precedents-schema";
export * from "./sharing-permissions-schema";

// CLC Per-Capita Remittances
export * from "./clc-per-capita-schema";

// Phase 1.5: Messages System
export * from "./messages-schema";

// Phase 5: Member Communications - SMS Integration
export * from "./sms-communications-schema";

// Phase 5: Member Communications - Surveys & Polls
export * from "./survey-polling-schema";

// Phase 5: Member Communications - Newsletter System
export * from "./newsletter-schema";

// Phase 5: Member Communications - Push Notifications
export * from "./push-notifications";

// Phase 5: Member Communications - Analytics & Engagement
export * from "./communication-analytics-schema";

// Phase 6: Advanced Grievance Management
export * from "./grievance-workflow-schema";

// Education & Training System
export * from "./education-training-schema";

// Q1 2025: Advanced Analytics
export * from "../../database/schema/analytics";

// Document Management System
export * from "./documents-schema";

// Machine Learning & Predictions
// NOTE: ML predictions now part of Q1 2025 analytics schema (exported above)
// export * from "./ml-predictions-schema";

// Recognition & Rewards System
export * from "./recognition-rewards-schema";

// P1: Critical Compliance Validators
export * from "./provincial-privacy-schema";
export * from "./indigenous-data-sovereignty-schema";
export * from "./strike-fund-tax-reporting-schema";
export * from "./force-majeure-schema";

// P2: High-Impact Compliance Validators
export * from "./geofence-privacy-schema";
export * from "./transfer-pricing-schema";
export * from "./founder-conflict-schema";
export * from "./joint-trust-fmv-schema";

// P3: Documentation & Lower-Priority Compliance Validators
export * from "./certification-management-schema";
export * from "./employer-non-interference-schema";
export * from "./whiplash-prevention-schema";
