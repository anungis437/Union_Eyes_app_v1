import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Force Majeure & Disaster Recovery Schema
 * Swiss Cold Storage + Break-Glass Emergency Access
 * Implements Shamir's Secret Sharing for multi-signature recovery
 */

// Swiss cold storage configuration
export const swissColdStorage = pgTable("swiss_cold_storage", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Vault details
  vaultProvider: varchar("vault_provider", { length: 100 }).notNull(), // "Malca-Amit", "Loomis", etc.
  vaultLocation: text("vault_location").notNull(), // Physical address in Switzerland
  vaultAccountNumber: varchar("vault_account_number", { length: 100 }),
  
  // Storage details
  storageType: varchar("storage_type", { length: 50 }).notNull(), // "encrypted_backup", "master_keys", "signing_keys"
  dataCategory: varchar("data_category", { length: 50 }).notNull(), // "database_backup", "encryption_keys", "signing_certificates"
  lastUpdated: timestamp("last_updated").notNull(),
  
  // Encryption
  encryptionAlgorithm: varchar("encryption_algorithm", { length: 50 }).notNull().default("AES-256-GCM"),
  encryptedBy: uuid("encrypted_by").notNull(),
  
  // Access control
  accessRequiresMultiSig: boolean("access_requires_multi_sig").notNull().default(true),
  minimumSignatures: integer("minimum_signatures").notNull().default(3), // 3-of-5
  totalKeyHolders: integer("total_key_holders").notNull().default(5),
  
  // Audit
  lastAccessedAt: timestamp("last_accessed_at"),
  lastAccessedBy: uuid("last_accessed_by"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Break-glass emergency system
export const breakGlassSystem = pgTable("break_glass_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Emergency scenario
  scenarioType: varchar("scenario_type", { length: 50 }).notNull(), // "total_system_failure", "ransomware", "key_compromise", "data_center_loss"
  scenarioDescription: text("scenario_description").notNull(),
  
  // Recovery plan
  recoveryPlanDocument: text("recovery_plan_document"), // S3/Azure Blob URL
  estimatedRecoveryTime: varchar("estimated_recovery_time", { length: 50 }).notNull(), // "48 hours", "72 hours"
  
  // Shamir's Secret Sharing configuration
  shamirThreshold: integer("shamir_threshold").notNull().default(3), // Need 3 of 5 keys
  shamirTotalShares: integer("shamir_total_shares").notNull().default(5),
  
  // Key holders (Board members, trusted officers)
  keyHolderId1: uuid("key_holder_id_1"),
  keyHolderId2: uuid("key_holder_id_2"),
  keyHolderId3: uuid("key_holder_id_3"),
  keyHolderId4: uuid("key_holder_id_4"),
  keyHolderId5: uuid("key_holder_id_5"),
  
  // Emergency contacts
  emergencyContact1Name: text("emergency_contact_1_name"),
  emergencyContact1Phone: varchar("emergency_contact_1_phone", { length: 20 }),
  emergencyContact1Email: varchar("emergency_contact_1_email", { length: 255 }),
  
  emergencyContact2Name: text("emergency_contact_2_name"),
  emergencyContact2Phone: varchar("emergency_contact_2_phone", { length: 20 }),
  emergencyContact2Email: varchar("emergency_contact_2_email", { length: 255 }),
  
  // Testing
  lastTestedAt: timestamp("last_tested_at"),
  testingFrequency: varchar("testing_frequency", { length: 50 }).notNull().default("quarterly"), // "monthly", "quarterly", "biannual"
  nextTestDue: timestamp("next_test_due").notNull(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // "active", "testing", "activated"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Break-glass activation log
export const breakGlassActivations = pgTable("break_glass_activations", {
  id: uuid("id").primaryKey().defaultRandom(),
  breakGlassSystemId: uuid("break_glass_system_id").notNull(),
  
  // Activation details
  activationType: varchar("activation_type", { length: 20 }).notNull(), // "real_emergency", "drill", "test"
  activationReason: text("activation_reason").notNull(),
  emergencyLevel: varchar("emergency_level", { length: 20 }).notNull(), // "critical", "high", "medium"
  
  // Timeline
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  recoveryDuration: varchar("recovery_duration", { length: 50 }), // "48h 23m"
  
  // Multi-signature authorization
  requiredSignatures: integer("required_signatures").notNull().default(3),
  signaturesReceived: integer("signatures_received").notNull().default(0),
  
  signature1UserId: uuid("signature_1_user_id"),
  signature1Timestamp: timestamp("signature_1_timestamp"),
  signature1IpAddress: varchar("signature_1_ip_address", { length: 45 }),
  
  signature2UserId: uuid("signature_2_user_id"),
  signature2Timestamp: timestamp("signature_2_timestamp"),
  signature2IpAddress: varchar("signature_2_ip_address", { length: 45 }),
  
  signature3UserId: uuid("signature_3_user_id"),
  signature3Timestamp: timestamp("signature_3_timestamp"),
  signature3IpAddress: varchar("signature_3_ip_address", { length: 45 }),
  
  signature4UserId: uuid("signature_4_user_id"),
  signature4Timestamp: timestamp("signature_4_timestamp"),
  signature4IpAddress: varchar("signature_4_ip_address", { length: 45 }),
  
  signature5UserId: uuid("signature_5_user_id"),
  signature5Timestamp: timestamp("signature_5_timestamp"),
  signature5IpAddress: varchar("signature_5_ip_address", { length: 45 }),
  
  // Authorization status
  authorizationComplete: boolean("authorization_complete").notNull().default(false),
  authorizationCompletedAt: timestamp("authorization_completed_at"),
  
  // Recovery actions
  recoveryActionsLog: jsonb("recovery_actions_log"), // Detailed log of recovery steps
  swissColdStorageAccessed: boolean("swiss_cold_storage_accessed").notNull().default(false),
  coldStorageAccessedAt: timestamp("cold_storage_accessed_at"),
  
  // Post-incident
  incidentReportUrl: text("incident_report_url"),
  lessonsLearnedUrl: text("lessons_learned_url"),
  systemUpdatesRequired: jsonb("system_updates_required"),
  
  // Audit
  activatedBy: uuid("activated_by").notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Disaster recovery drills
export const disasterRecoveryDrills = pgTable("disaster_recovery_drills", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Drill details
  drillName: text("drill_name").notNull(),
  drillType: varchar("drill_type", { length: 50 }).notNull(), // "tabletop_exercise", "simulation", "full_test", "surprise_drill"
  scenarioType: varchar("scenario_type", { length: 50 }).notNull(), // Same as break_glass_system.scenarioType
  
  // Schedule
  scheduledDate: timestamp("scheduled_date").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  duration: varchar("duration", { length: 50 }), // "2h 15m"
  
  // Participants
  participants: jsonb("participants").notNull(), // Array of user IDs
  participantCount: integer("participant_count").notNull(),
  
  // Objectives
  objectives: jsonb("objectives").notNull(), // ["Test Swiss cold storage access", "Validate multi-sig", etc.]
  objectivesMet: jsonb("objectives_met"), // Which objectives were achieved
  
  // Results
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // "scheduled", "in_progress", "completed", "failed"
  overallScore: integer("overall_score"), // 0-100
  
  // Performance metrics
  targetRecoveryTime: varchar("target_recovery_time", { length: 50 }).notNull(), // "48 hours"
  actualRecoveryTime: varchar("actual_recovery_time", { length: 50 }),
  recoveryTimeObjectiveMet: boolean("recovery_time_objective_met").notNull().default(false),
  
  // Issues identified
  issuesIdentified: jsonb("issues_identified"), // Problems found during drill
  remediationActions: jsonb("remediation_actions"), // Actions to fix issues
  remediationDeadline: timestamp("remediation_deadline"),
  
  // Documentation
  drillReportUrl: text("drill_report_url"),
  videoRecordingUrl: text("video_recording_url"),
  
  // Audit
  conductedBy: uuid("conducted_by").notNull(),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Key holder registry (for Shamir's Secret Sharing)
export const keyHolderRegistry = pgTable("key_holder_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  
  // Key holder details
  role: varchar("role", { length: 50 }).notNull(), // "board_chair", "secretary_treasurer", "president", "vp", "trustee"
  keyHolderNumber: integer("key_holder_number").notNull(), // 1-5
  
  // Shamir share (encrypted)
  shamirShareEncrypted: text("shamir_share_encrypted").notNull(), // Encrypted with user's public key
  shamirShareFingerprint: varchar("shamir_share_fingerprint", { length: 64 }).notNull(), // SHA-256 hash
  
  // Key custody
  keyIssuedAt: timestamp("key_issued_at").notNull(),
  keyExpiresAt: timestamp("key_expires_at"),
  keyRotationDue: timestamp("key_rotation_due").notNull(), // Annual rotation recommended
  
  // Training
  breakGlassTrainingCompleted: boolean("break_glass_training_completed").notNull().default(false),
  trainingCompletedAt: timestamp("training_completed_at"),
  trainingExpiresAt: timestamp("training_expires_at"), // Annual retraining
  
  // Availability
  emergencyPhone: varchar("emergency_phone", { length: 20 }).notNull(),
  emergencyEmail: varchar("emergency_email", { length: 255 }).notNull(),
  backupContactName: text("backup_contact_name"),
  backupContactPhone: varchar("backup_contact_phone", { length: 20 }),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // "active", "suspended", "expired"
  
  // Audit
  lastVerifiedAt: timestamp("last_verified_at"),
  nextVerificationDue: timestamp("next_verification_due").notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Recovery time objectives (RTO) tracking
export const recoveryTimeObjectives = pgTable("recovery_time_objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // System component
  systemComponent: varchar("system_component", { length: 100 }).notNull(), // "database", "application_servers", "authentication", etc.
  componentDescription: text("component_description"),
  
  // RTO/RPO
  rtoHours: integer("rto_hours").notNull(), // Recovery Time Objective (hours)
  rpoHours: integer("rpo_hours").notNull(), // Recovery Point Objective (hours) - acceptable data loss
  
  // Dependencies
  dependsOn: jsonb("depends_on"), // Other components this depends on
  criticalityLevel: varchar("criticality_level", { length: 20 }).notNull(), // "critical", "high", "medium", "low"
  
  // Last test
  lastTestedAt: timestamp("last_tested_at"),
  lastTestResult: varchar("last_test_result", { length: 20 }), // "passed", "failed", "partial"
  actualRecoveryTime: integer("actual_recovery_time"), // Actual time in last test (hours)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
