"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageType = exports.messageStatus = exports.membership = exports.memberStatus = exports.memberRole = exports.labourSector = exports.jurisdictionRuleType = exports.indigenousIdentityType = exports.hwPlanType = exports.hwClaimStatus = exports.grievanceWorkflowStatus = exports.grievanceStepType = exports.grievanceStageType = exports.governmentLevel = exports.genderIdentityType = exports.extensionStatus = exports.eventType = exports.eventStatus = exports.essentialServiceDesignation = exports.equityGroupType = exports.entityType = exports.documentVersionStatus = exports.digestFrequency = exports.deliveryStatus = exports.deliveryMethod = exports.decisionType = exports.deadlineStatus = exports.deadlinePriority = exports.courseDifficulty = exports.courseDeliveryMethod = exports.courseCategory = exports.contactSupportLevel = exports.communicationChannel = exports.clauseType = exports.claimType = exports.claimStatus = exports.claimPriority = exports.certificationStatus = exports.certificationMethod = exports.certificationApplicationStatus = exports.cbaStatus = exports.cbaLanguage = exports.cbaJurisdiction = exports.calendarPermission = exports.caJurisdiction = exports.billStatus = exports.attendeeStatus = exports.assignmentStatus = exports.assignmentRole = exports.alertSeverity = void 0;
exports.voterEligibility = exports.unionPosition = exports.tribunalType = exports.transitionTriggerType = exports.templateCategory = exports.taxSlipType = exports.syncStatus = exports.strikeVoteRequirement = exports.signatureType = exports.signatureStatus = exports.settlementStatus = exports.sessionStatus = exports.scheduleFrequency = exports.roomStatus = exports.role = exports.reportType = exports.reportFormat = exports.reportCategory = exports.registrationStatus = exports.pushPriority = exports.pushPlatform = exports.pushNotificationStatus = exports.pushDeliveryStatus = exports.precedentValue = exports.politicalParty = exports.politicalCampaignType = exports.politicalCampaignStatus = exports.politicalActivityType = exports.pensionPlanType = exports.pensionPlanStatus = exports.pensionClaimType = exports.paymentProvider = exports.payEquityStatus = exports.outcome = exports.organizingCampaignType = exports.organizingCampaignStatus = exports.organizingActivityType = exports.organizationType = exports.organizationStatus = exports.organizationRelationshipType = exports.notificationType = exports.notificationStatus = exports.notificationScheduleStatus = exports.notificationChannel = exports.newsletterSubscriberStatus = exports.newsletterRecipientStatus = exports.newsletterListType = exports.newsletterEngagementEvent = exports.newsletterCampaignStatus = exports.newsletterBounceType = void 0;
exports.arbitrationPrecedents = exports.clauseComparisonsHistory = exports.arrears = exports.jurisdictionRulesSummary = exports.jurisdictionTemplates = exports.picketTracking = exports.donations = exports.userNotificationPreferences = exports.notificationLog = exports.notificationTemplates = exports.notificationQueue = exports.arrearsCases = exports.hardshipApplications = exports.publicDonations = exports.stipendDisbursements = exports.picketAttendance = exports.fundEligibility = exports.strikeFunds = exports.duesRules = exports.employerRemittances = exports.memberDuesAssignments = exports.claimUpdates = exports.caseSummaries = exports.organizationMembers = exports.aiFeedbackSummary = exports.aiUsageByTenant = exports.aiFeedback = exports.aiQueryLogs = exports.aiQueries = exports.aiChunks = exports.aiDocuments = exports.cbaContacts = exports.claimPrecedentAnalysis = exports.cbaFootnotes = exports.bargainingNotes = exports.arbitrationDecisions = exports.wageProgressions = exports.signatureWorkflows = exports.digitalSignatures = exports.pendingProfiles = exports.profiles = exports.insightRecommendations = exports.arbitratorProfiles = exports.clauseComparisons = exports.benefitComparisons = exports.cbaVersionHistory = exports.cbaClauses = exports.collectiveAgreements = exports.votingNotifications = exports.votingOptions = void 0;
exports.claimDeadlines = exports.deadlineRules = exports.reportShares = exports.scheduledReports = exports.reportExecutions = exports.reportTemplates = exports.reports = exports.piiAccessLog = exports.membersWithPii = exports.members = exports.encryptionKeys = exports.messageNotifications = exports.complianceValidations = exports.statutoryHolidays = exports.jurisdictionRules = exports.messageParticipants = exports.messageReadReceipts = exports.votingKeyAccessLog = exports.organizationHierarchyAudit = exports.messages = exports.votingSessionKeys = exports.vAnnualRemittanceSummary = exports.vPendingRemittances = exports.voteMerkleTree = exports.blockchainAuditAnchors = exports.votingSessionAuditors = exports.signatureAuditLog = exports.trustedCertificateAuthorities = exports.votingAuditors = exports.messageThreads = exports.transactionClcMappings = exports.clcChartOfAccounts = exports.perCapitaRemittances = exports.comparativeAnalyses = exports.organizations = exports.claims = exports.votes = exports.votingSessions = exports.userUuidMapping = exports.clauseLibraryTags = exports.attestationTemplates = exports.organizationTree = exports.tenantManagementView = exports.organizationRelationships = exports.crossOrgAccessLog = exports.organizationSharingGrants = exports.organizationSharingSettings = exports.precedentCitations = exports.precedentTags = exports.sharedClauseLibrary = void 0;
exports.memberDemographics = exports.vCopeMemberSummary = exports.vTaxSlipSummary = exports.copeContributions = exports.craXmlBatches = exports.taxSlips = exports.trendAnalyses = exports.taxYearConfigurations = exports.vMemberBenefitEligibility = exports.vHwClaimsAging = exports.vPensionFundingSummary = exports.trustComplianceReports = exports.hwBenefitClaims = exports.hwBenefitEnrollments = exports.hwBenefitPlans = exports.pensionActuarialValuations = exports.pensionBenefitClaims = exports.pensionTrusteeMeetings = exports.analyticsMetrics = exports.pensionTrustees = exports.modelMetadata = exports.pensionTrusteeBoards = exports.pensionContributions = exports.mlPredictions = exports.pensionHoursBanks = exports.pensionPlans = exports.courseRegistrations = exports.courseSessions = exports.inAppNotifications = exports.trainingCourses = exports.vLegislativePriorities = exports.vElectedOfficialEngagement = exports.vPoliticalCampaignDashboard = exports.politicalActivities = exports.legislationTracking = exports.electedOfficials = exports.memberPoliticalParticipation = exports.memberDocuments = exports.notificationHistory = exports.eventReminders = exports.externalCalendarConnections = exports.calendarSharing = exports.roomBookings = exports.meetingRooms = exports.eventAttendees = exports.calendarEvents = exports.calendars = exports.holidays = exports.deadlineAlerts = exports.deadlineExtensions = void 0;
exports.duesAssignments = exports.kpiConfigurations = exports.vTrainingProgramProgress = exports.vCertificationExpiryTracking = exports.vCourseSessionDashboard = exports.vMemberTrainingTranscript = exports.programEnrollments = exports.duesTransactions = exports.trainingPrograms = exports.memberCertifications = exports.politicalCampaigns = exports.vWorkplaceContactMap = exports.organizingVolunteers = exports.certificationApplications = exports.vOrganizingCampaignDashboard = exports.organizingActivities = exports.tenants = exports.organizingContacts = exports.organizingCampaigns = exports.vPayEquityPipeline = exports.vEquityStatisticsAnonymized = exports.statcanSubmissions = exports.equitySnapshots = exports.payEquityComplaints = exports.vCriticalDeadlines = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Define custom type for PostgreSQL tsvector
const tsvector = (0, pg_core_1.customType)({ dataType() { return 'tsvector'; } });
exports.alertSeverity = (0, pg_core_1.pgEnum)("alert_severity", ['info', 'warning', 'urgent', 'critical']);
exports.assignmentRole = (0, pg_core_1.pgEnum)("assignment_role", ['primary_officer', 'secondary_officer', 'legal_counsel', 'external_arbitrator', 'management_rep', 'witness', 'observer']);
exports.assignmentStatus = (0, pg_core_1.pgEnum)("assignment_status", ['assigned', 'accepted', 'in_progress', 'completed', 'reassigned', 'declined']);
exports.attendeeStatus = (0, pg_core_1.pgEnum)("attendee_status", ['invited', 'accepted', 'declined', 'tentative', 'no_response']);
exports.billStatus = (0, pg_core_1.pgEnum)("bill_status", ['introduced', 'first_reading', 'second_reading', 'committee_review', 'third_reading', 'passed_house', 'senate_review', 'royal_assent', 'enacted', 'defeated', 'withdrawn']);
exports.caJurisdiction = (0, pg_core_1.pgEnum)("ca_jurisdiction", ['CA-FED', 'CA-ON', 'CA-QC', 'CA-BC', 'CA-AB', 'CA-SK', 'CA-MB', 'CA-NB', 'CA-NS', 'CA-PE', 'CA-NL', 'CA-YT', 'CA-NT', 'CA-NU', 'federal', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);
exports.calendarPermission = (0, pg_core_1.pgEnum)("calendar_permission", ['owner', 'editor', 'viewer', 'none']);
exports.cbaJurisdiction = (0, pg_core_1.pgEnum)("cba_jurisdiction", ['federal', 'ontario', 'bc', 'alberta', 'quebec', 'manitoba', 'saskatchewan', 'nova_scotia', 'new_brunswick', 'pei', 'newfoundland', 'northwest_territories', 'yukon', 'nunavut']);
exports.cbaLanguage = (0, pg_core_1.pgEnum)("cba_language", ['en', 'fr', 'bilingual']);
exports.cbaStatus = (0, pg_core_1.pgEnum)("cba_status", ['active', 'expired', 'under_negotiation', 'ratified_pending', 'archived']);
exports.certificationApplicationStatus = (0, pg_core_1.pgEnum)("certification_application_status", ['draft', 'filed', 'under_review', 'hearing_scheduled', 'vote_ordered', 'vote_completed', 'decision_pending', 'certified', 'dismissed', 'withdrawn']);
exports.certificationMethod = (0, pg_core_1.pgEnum)("certification_method", ['automatic', 'vote_required', 'mandatory_vote']);
exports.certificationStatus = (0, pg_core_1.pgEnum)("certification_status", ['active', 'expiring_soon', 'expired', 'revoked', 'suspended']);
exports.claimPriority = (0, pg_core_1.pgEnum)("claim_priority", ['low', 'medium', 'high', 'critical']);
exports.claimStatus = (0, pg_core_1.pgEnum)("claim_status", ['submitted', 'under_review', 'assigned', 'investigation', 'pending_documentation', 'resolved', 'rejected', 'closed']);
exports.claimType = (0, pg_core_1.pgEnum)("claim_type", ['grievance_discipline', 'grievance_schedule', 'grievance_pay', 'workplace_safety', 'discrimination_age', 'discrimination_gender', 'discrimination_race', 'discrimination_disability', 'discrimination_other', 'harassment_sexual', 'harassment_workplace', 'wage_dispute', 'contract_dispute', 'retaliation', 'wrongful_termination', 'other', 'harassment_verbal', 'harassment_physical']);
exports.clauseType = (0, pg_core_1.pgEnum)("clause_type", ['wages_compensation', 'benefits_insurance', 'working_conditions', 'grievance_arbitration', 'seniority_promotion', 'health_safety', 'union_rights', 'management_rights', 'duration_renewal', 'vacation_leave', 'hours_scheduling', 'disciplinary_procedures', 'training_development', 'pension_retirement', 'overtime', 'job_security', 'technological_change', 'workplace_rights', 'other']);
exports.communicationChannel = (0, pg_core_1.pgEnum)("communication_channel", ['email', 'sms', 'push', 'newsletter', 'in_app']);
exports.contactSupportLevel = (0, pg_core_1.pgEnum)("contact_support_level", ['strong_supporter', 'supporter', 'undecided', 'soft_opposition', 'strong_opposition', 'unknown']);
exports.courseCategory = (0, pg_core_1.pgEnum)("course_category", ['steward_training', 'leadership_development', 'health_and_safety', 'collective_bargaining', 'grievance_handling', 'labor_law', 'political_action', 'organizing', 'equity_and_inclusion', 'financial_literacy', 'workplace_rights', 'public_speaking', 'conflict_resolution', 'meeting_facilitation', 'member_engagement', 'general']);
exports.courseDeliveryMethod = (0, pg_core_1.pgEnum)("course_delivery_method", ['in_person', 'virtual_live', 'self_paced_online', 'hybrid', 'webinar', 'workshop', 'conference_session']);
exports.courseDifficulty = (0, pg_core_1.pgEnum)("course_difficulty", ['beginner', 'intermediate', 'advanced', 'all_levels']);
exports.deadlinePriority = (0, pg_core_1.pgEnum)("deadline_priority", ['low', 'medium', 'high', 'critical']);
exports.deadlineStatus = (0, pg_core_1.pgEnum)("deadline_status", ['pending', 'completed', 'missed', 'extended', 'waived']);
exports.decisionType = (0, pg_core_1.pgEnum)("decision_type", ['grievance', 'unfair_practice', 'certification', 'judicial_review', 'interpretation', 'scope_bargaining', 'other']);
exports.deliveryMethod = (0, pg_core_1.pgEnum)("delivery_method", ['email', 'sms', 'push', 'in_app']);
exports.deliveryStatus = (0, pg_core_1.pgEnum)("delivery_status", ['pending', 'sent', 'delivered', 'failed', 'bounced']);
exports.digestFrequency = (0, pg_core_1.pgEnum)("digest_frequency", ['immediate', 'daily', 'weekly', 'never']);
exports.documentVersionStatus = (0, pg_core_1.pgEnum)("document_version_status", ['draft', 'pending_review', 'approved', 'rejected', 'superseded']);
exports.entityType = (0, pg_core_1.pgEnum)("entity_type", ['monetary_amount', 'percentage', 'date', 'time_period', 'job_position', 'location', 'person', 'organization', 'legal_reference', 'other']);
exports.equityGroupType = (0, pg_core_1.pgEnum)("equity_group_type", ['women', 'visible_minority', 'indigenous', 'persons_with_disabilities', 'lgbtq2plus', 'newcomer', 'youth', 'prefer_not_to_say']);
exports.essentialServiceDesignation = (0, pg_core_1.pgEnum)("essential_service_designation", ['prohibited', 'restricted', 'minimum_service']);
exports.eventStatus = (0, pg_core_1.pgEnum)("event_status", ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled']);
exports.eventType = (0, pg_core_1.pgEnum)("event_type", ['meeting', 'appointment', 'deadline', 'reminder', 'task', 'hearing', 'mediation', 'negotiation', 'training', 'other']);
exports.extensionStatus = (0, pg_core_1.pgEnum)("extension_status", ['pending', 'approved', 'denied', 'cancelled']);
exports.genderIdentityType = (0, pg_core_1.pgEnum)("gender_identity_type", ['man', 'woman', 'non_binary', 'two_spirit', 'gender_fluid', 'agender', 'other', 'prefer_not_to_say']);
exports.governmentLevel = (0, pg_core_1.pgEnum)("government_level", ['federal', 'provincial_territorial', 'municipal', 'school_board', 'regional']);
exports.grievanceStageType = (0, pg_core_1.pgEnum)("grievance_stage_type", ['filed', 'intake', 'investigation', 'step_1', 'step_2', 'step_3', 'mediation', 'pre_arbitration', 'arbitration', 'resolved', 'withdrawn', 'denied', 'settled']);
exports.grievanceStepType = (0, pg_core_1.pgEnum)("grievance_step_type", ['informal', 'formal_written', 'mediation', 'arbitration']);
exports.grievanceWorkflowStatus = (0, pg_core_1.pgEnum)("grievance_workflow_status", ['active', 'draft', 'archived']);
exports.hwClaimStatus = (0, pg_core_1.pgEnum)("hw_claim_status", ['submitted', 'received', 'pending_review', 'under_investigation', 'approved', 'partially_approved', 'denied', 'paid', 'appealed', 'appeal_denied', 'appeal_approved']);
exports.hwPlanType = (0, pg_core_1.pgEnum)("hw_plan_type", ['health_medical', 'dental', 'vision', 'prescription', 'disability_short_term', 'disability_long_term', 'life_insurance', 'accidental_death', 'critical_illness', 'employee_assistance']);
exports.indigenousIdentityType = (0, pg_core_1.pgEnum)("indigenous_identity_type", ['first_nations_status', 'first_nations_non_status', 'inuit', 'metis', 'multiple_indigenous_identities', 'prefer_not_to_say']);
exports.jurisdictionRuleType = (0, pg_core_1.pgEnum)("jurisdiction_rule_type", ['certification', 'strike_vote', 'grievance_arbitration', 'essential_services', 'replacement_workers', 'collective_agreement', 'unfair_labour_practice', 'bargaining_rights', 'union_security', 'dues_checkoff']);
exports.labourSector = (0, pg_core_1.pgEnum)("labour_sector", ['healthcare', 'education', 'public_service', 'trades', 'manufacturing', 'transportation', 'retail', 'hospitality', 'technology', 'construction', 'utilities', 'telecommunications', 'financial_services', 'agriculture', 'arts_culture', 'other']);
exports.memberRole = (0, pg_core_1.pgEnum)("member_role", ['member', 'steward', 'officer', 'admin']);
exports.memberStatus = (0, pg_core_1.pgEnum)("member_status", ['active', 'inactive', 'on-leave']);
exports.membership = (0, pg_core_1.pgEnum)("membership", ['free', 'pro']);
exports.messageStatus = (0, pg_core_1.pgEnum)("message_status", ['sent', 'delivered', 'read']);
exports.messageType = (0, pg_core_1.pgEnum)("message_type", ['text', 'file', 'system']);
exports.newsletterBounceType = (0, pg_core_1.pgEnum)("newsletter_bounce_type", ['hard', 'soft', 'technical']);
exports.newsletterCampaignStatus = (0, pg_core_1.pgEnum)("newsletter_campaign_status", ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']);
exports.newsletterEngagementEvent = (0, pg_core_1.pgEnum)("newsletter_engagement_event", ['open', 'click', 'unsubscribe', 'spam_report']);
exports.newsletterListType = (0, pg_core_1.pgEnum)("newsletter_list_type", ['manual', 'dynamic', 'segment']);
exports.newsletterRecipientStatus = (0, pg_core_1.pgEnum)("newsletter_recipient_status", ['pending', 'sent', 'delivered', 'bounced', 'failed']);
exports.newsletterSubscriberStatus = (0, pg_core_1.pgEnum)("newsletter_subscriber_status", ['subscribed', 'unsubscribed', 'bounced']);
exports.notificationChannel = (0, pg_core_1.pgEnum)("notification_channel", ['email', 'sms', 'push', 'in_app', 'in-app', 'multi']);
exports.notificationScheduleStatus = (0, pg_core_1.pgEnum)("notification_schedule_status", ['scheduled', 'sent', 'cancelled', 'failed']);
exports.notificationStatus = (0, pg_core_1.pgEnum)("notification_status", ['pending', 'sent', 'failed', 'partial']);
exports.notificationType = (0, pg_core_1.pgEnum)("notification_type", ['payment_confirmation', 'payment_failed', 'payment_reminder', 'donation_received', 'stipend_approved', 'stipend_disbursed', 'low_balance_alert', 'arrears_warning', 'strike_announcement', 'picket_reminder']);
exports.organizationRelationshipType = (0, pg_core_1.pgEnum)("organization_relationship_type", ['affiliate', 'federation', 'local', 'chapter', 'region', 'district', 'joint_council', 'merged_from', 'split_from']);
exports.organizationStatus = (0, pg_core_1.pgEnum)("organization_status", ['active', 'inactive', 'suspended', 'archived']);
exports.organizationType = (0, pg_core_1.pgEnum)("organization_type", ['congress', 'federation', 'union', 'local', 'region', 'district']);
exports.organizingActivityType = (0, pg_core_1.pgEnum)("organizing_activity_type", ['house_visit', 'phone_call', 'text_message', 'workplace_conversation', 'organizing_meeting', 'blitz', 'workplace_action', 'card_signing_session', 'community_event', 'rally', 'picket', 'press_conference', 'social_media_campaign']);
exports.organizingCampaignStatus = (0, pg_core_1.pgEnum)("organizing_campaign_status", ['research', 'pre_campaign', 'active', 'card_check', 'certification_pending', 'certification_vote', 'won', 'lost', 'suspended', 'abandoned']);
exports.organizingCampaignType = (0, pg_core_1.pgEnum)("organizing_campaign_type", ['new_workplace', 'raid', 'expansion', 'decertification_defense', 'voluntary_recognition', 'card_check_majority']);
exports.outcome = (0, pg_core_1.pgEnum)("outcome", ['grievance_upheld', 'grievance_denied', 'partial_success', 'dismissed', 'withdrawn', 'settled']);
exports.payEquityStatus = (0, pg_core_1.pgEnum)("pay_equity_status", ['intake', 'under_review', 'investigation', 'mediation', 'arbitration', 'resolved', 'dismissed', 'withdrawn', 'appealed']);
exports.paymentProvider = (0, pg_core_1.pgEnum)("payment_provider", ['stripe', 'whop']);
exports.pensionClaimType = (0, pg_core_1.pgEnum)("pension_claim_type", ['retirement_pension', 'early_retirement', 'disability_pension', 'survivor_benefit', 'death_benefit', 'lump_sum_withdrawal', 'pension_transfer']);
exports.pensionPlanStatus = (0, pg_core_1.pgEnum)("pension_plan_status", ['active', 'frozen', 'closed', 'under_review']);
exports.pensionPlanType = (0, pg_core_1.pgEnum)("pension_plan_type", ['defined_benefit', 'defined_contribution', 'hybrid', 'target_benefit', 'multi_employer']);
exports.politicalActivityType = (0, pg_core_1.pgEnum)("political_activity_type", ['meeting_with_mp', 'meeting_with_staff', 'phone_call', 'letter_writing', 'email_campaign', 'petition_drive', 'lobby_day', 'town_hall', 'press_conference', 'rally', 'canvassing', 'phone_banking', 'door_knocking', 'social_media_campaign', 'committee_presentation', 'delegation']);
exports.politicalCampaignStatus = (0, pg_core_1.pgEnum)("political_campaign_status", ['planning', 'active', 'paused', 'completed', 'cancelled']);
exports.politicalCampaignType = (0, pg_core_1.pgEnum)("political_campaign_type", ['electoral', 'legislative', 'issue_advocacy', 'ballot_initiative', 'get_out_the_vote', 'voter_registration', 'political_education', 'coalition_building']);
exports.politicalParty = (0, pg_core_1.pgEnum)("political_party", ['liberal', 'conservative', 'ndp', 'green', 'bloc_quebecois', 'peoples_party', 'independent', 'other']);
exports.precedentValue = (0, pg_core_1.pgEnum)("precedent_value", ['high', 'medium', 'low']);
exports.pushDeliveryStatus = (0, pg_core_1.pgEnum)("push_delivery_status", ['pending', 'sent', 'delivered', 'failed', 'clicked', 'dismissed']);
exports.pushNotificationStatus = (0, pg_core_1.pgEnum)("push_notification_status", ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']);
exports.pushPlatform = (0, pg_core_1.pgEnum)("push_platform", ['ios', 'android', 'web']);
exports.pushPriority = (0, pg_core_1.pgEnum)("push_priority", ['low', 'normal', 'high', 'urgent']);
exports.registrationStatus = (0, pg_core_1.pgEnum)("registration_status", ['registered', 'waitlisted', 'confirmed', 'attended', 'completed', 'incomplete', 'no_show', 'cancelled', 'withdrawn']);
exports.reportCategory = (0, pg_core_1.pgEnum)("report_category", ['claims', 'members', 'financial', 'compliance', 'performance', 'custom']);
exports.reportFormat = (0, pg_core_1.pgEnum)("report_format", ['pdf', 'excel', 'csv', 'json', 'html']);
exports.reportType = (0, pg_core_1.pgEnum)("report_type", ['custom', 'template', 'system', 'scheduled']);
exports.role = (0, pg_core_1.pgEnum)("role", ['super_admin', 'org_admin', 'manager', 'member', 'free_user']);
exports.roomStatus = (0, pg_core_1.pgEnum)("room_status", ['available', 'booked', 'maintenance', 'unavailable']);
exports.scheduleFrequency = (0, pg_core_1.pgEnum)("schedule_frequency", ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
exports.sessionStatus = (0, pg_core_1.pgEnum)("session_status", ['scheduled', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']);
exports.settlementStatus = (0, pg_core_1.pgEnum)("settlement_status", ['proposed', 'under_review', 'accepted', 'rejected', 'finalized']);
exports.signatureStatus = (0, pg_core_1.pgEnum)("signature_status", ['pending', 'signed', 'rejected', 'expired', 'revoked']);
exports.signatureType = (0, pg_core_1.pgEnum)("signature_type", ['financial_attestation', 'document_approval', 'meeting_minutes', 'contract_signing', 'policy_approval', 'election_certification', 'grievance_settlement', 'collective_agreement']);
exports.strikeVoteRequirement = (0, pg_core_1.pgEnum)("strike_vote_requirement", ['simple_majority', 'secret_ballot', 'membership_quorum']);
exports.syncStatus = (0, pg_core_1.pgEnum)("sync_status", ['synced', 'pending', 'failed', 'disconnected']);
exports.taxSlipType = (0, pg_core_1.pgEnum)("tax_slip_type", ['t4a', 't4a_box_016', 't4a_box_018', 't4a_box_048', 'cope_receipt', 'rl_1', 'rl_24']);
exports.templateCategory = (0, pg_core_1.pgEnum)("template_category", ['general', 'announcement', 'event', 'update', 'custom']);
exports.transitionTriggerType = (0, pg_core_1.pgEnum)("transition_trigger_type", ['manual', 'automatic', 'deadline', 'approval', 'rejection']);
exports.tribunalType = (0, pg_core_1.pgEnum)("tribunal_type", ['fpslreb', 'provincial_labour_board', 'private_arbitrator', 'court_federal', 'court_provincial', 'other']);
exports.unionPosition = (0, pg_core_1.pgEnum)("union_position", ['strong_support', 'support', 'neutral', 'oppose', 'strong_oppose', 'monitoring']);
exports.voterEligibility = (0, pg_core_1.pgTable)("voter_eligibility", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    isEligible: (0, pg_core_1.boolean)("is_eligible").default(true),
    eligibilityReason: (0, pg_core_1.text)("eligibility_reason"),
    votingWeight: (0, pg_core_1.numeric)("voting_weight", { precision: 5, scale: 2 }).default('1.0'),
    canDelegate: (0, pg_core_1.boolean)("can_delegate").default(false),
    delegatedTo: (0, pg_core_1.uuid)("delegated_to"),
    restrictions: (0, pg_core_1.text)("restrictions").array(),
    verificationStatus: (0, pg_core_1.varchar)("verification_status", { length: 20 }).default('pending'),
    voterMetadata: (0, pg_core_1.jsonb)("voter_metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        voterEligibilitySessionIdVotingSessionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "voter_eligibility_session_id_voting_sessions_id_fk"
        }).onDelete("cascade"),
    };
});
exports.votingOptions = (0, pg_core_1.pgTable)("voting_options", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull(),
    text: (0, pg_core_1.varchar)("text", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    orderIndex: (0, pg_core_1.integer)("order_index").default(0).notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        votingOptionsSessionIdVotingSessionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "voting_options_session_id_voting_sessions_id_fk"
        }).onDelete("cascade"),
    };
});
exports.votingNotifications = (0, pg_core_1.pgTable)("voting_notifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 200 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    recipientId: (0, pg_core_1.uuid)("recipient_id").notNull(),
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }).default('medium'),
    deliveryMethod: (0, pg_core_1.text)("delivery_method").array().default(["RAY['push'::tex"]),
    isRead: (0, pg_core_1.boolean)("is_read").default(false),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    readAt: (0, pg_core_1.timestamp)("read_at", { withTimezone: true, mode: 'string' }),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxVotingNotificationsCreatedAt: (0, pg_core_1.index)("idx_voting_notifications_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxVotingNotificationsUpdatedAt: (0, pg_core_1.index)("idx_voting_notifications_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
        votingNotificationsSessionIdVotingSessionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "voting_notifications_session_id_voting_sessions_id_fk"
        }).onDelete("cascade"),
    };
});
exports.collectiveAgreements = (0, pg_core_1.pgTable)("collective_agreements", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    cbaNumber: (0, pg_core_1.varchar)("cba_number", { length: 100 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    jurisdiction: (0, exports.cbaJurisdiction)("jurisdiction").notNull(),
    language: (0, exports.cbaLanguage)("language").default('en').notNull(),
    employerName: (0, pg_core_1.varchar)("employer_name", { length: 300 }).notNull(),
    employerId: (0, pg_core_1.varchar)("employer_id", { length: 100 }),
    unionName: (0, pg_core_1.varchar)("union_name", { length: 300 }).notNull(),
    unionLocal: (0, pg_core_1.varchar)("union_local", { length: 100 }),
    unionId: (0, pg_core_1.varchar)("union_id", { length: 100 }),
    effectiveDate: (0, pg_core_1.timestamp)("effective_date", { withTimezone: true, mode: 'string' }).notNull(),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date", { withTimezone: true, mode: 'string' }).notNull(),
    signedDate: (0, pg_core_1.timestamp)("signed_date", { withTimezone: true, mode: 'string' }),
    ratificationDate: (0, pg_core_1.timestamp)("ratification_date", { withTimezone: true, mode: 'string' }),
    industrySector: (0, pg_core_1.varchar)("industry_sector", { length: 200 }).notNull(),
    employeeCoverage: (0, pg_core_1.integer)("employee_coverage"),
    bargainingUnitDescription: (0, pg_core_1.text)("bargaining_unit_description"),
    documentUrl: (0, pg_core_1.text)("document_url"),
    documentHash: (0, pg_core_1.varchar)("document_hash", { length: 64 }),
    rawText: (0, pg_core_1.text)("raw_text"),
    structuredData: (0, pg_core_1.jsonb)("structured_data"),
    embedding: (0, pg_core_1.text)("embedding"),
    summaryGenerated: (0, pg_core_1.text)("summary_generated"),
    keyTerms: (0, pg_core_1.jsonb)("key_terms"),
    status: (0, exports.cbaStatus)("status").default('active').notNull(),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    lastModifiedBy: (0, pg_core_1.uuid)("last_modified_by"),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    supersededBy: (0, pg_core_1.uuid)("superseded_by"),
    precedesId: (0, pg_core_1.uuid)("precedes_id"),
}, (table) => {
    return {
        cbaEffectiveDateIdx: (0, pg_core_1.index)("cba_effective_date_idx").using("btree", table.effectiveDate.asc().nullsLast()),
        cbaEmployerIdx: (0, pg_core_1.index)("cba_employer_idx").using("btree", table.employerName.asc().nullsLast()),
        cbaExpiryIdx: (0, pg_core_1.index)("cba_expiry_idx").using("btree", table.expiryDate.asc().nullsLast()),
        cbaJurisdictionIdx: (0, pg_core_1.index)("cba_jurisdiction_idx").using("btree", table.jurisdiction.asc().nullsLast()),
        cbaSectorIdx: (0, pg_core_1.index)("cba_sector_idx").using("btree", table.industrySector.asc().nullsLast()),
        cbaStatusIdx: (0, pg_core_1.index)("cba_status_idx").using("btree", table.status.asc().nullsLast()),
        cbaTenantIdx: (0, pg_core_1.index)("cba_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
        cbaUnionIdx: (0, pg_core_1.index)("cba_union_idx").using("btree", table.unionName.asc().nullsLast()),
        collectiveAgreementsCbaNumberUnique: (0, pg_core_1.unique)("collective_agreements_cba_number_unique").on(table.cbaNumber),
    };
});
exports.cbaClauses = (0, pg_core_1.pgTable)("cba_clauses", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id").notNull(),
    clauseNumber: (0, pg_core_1.varchar)("clause_number", { length: 50 }).notNull(),
    clauseType: (0, exports.clauseType)("clause_type").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    contentPlainText: (0, pg_core_1.text)("content_plain_text"),
    pageNumber: (0, pg_core_1.integer)("page_number"),
    articleNumber: (0, pg_core_1.varchar)("article_number", { length: 50 }),
    sectionHierarchy: (0, pg_core_1.jsonb)("section_hierarchy"),
    parentClauseId: (0, pg_core_1.uuid)("parent_clause_id"),
    orderIndex: (0, pg_core_1.integer)("order_index").default(0).notNull(),
    embedding: (0, pg_core_1.text)("embedding"),
    confidenceScore: (0, pg_core_1.numeric)("confidence_score", { precision: 5, scale: 4 }),
    entities: (0, pg_core_1.jsonb)("entities"),
    keyTerms: (0, pg_core_1.jsonb)("key_terms"),
    relatedClauseIds: (0, pg_core_1.jsonb)("related_clause_ids"),
    interpretationNotes: (0, pg_core_1.text)("interpretation_notes"),
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    citationCount: (0, pg_core_1.integer)("citation_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        cbaIdx: (0, pg_core_1.index)("cba_clauses_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        confidenceIdx: (0, pg_core_1.index)("cba_clauses_confidence_idx").using("btree", table.confidenceScore.asc().nullsLast()),
        numberIdx: (0, pg_core_1.index)("cba_clauses_number_idx").using("btree", table.clauseNumber.asc().nullsLast()),
        parentIdx: (0, pg_core_1.index)("cba_clauses_parent_idx").using("btree", table.parentClauseId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("cba_clauses_type_idx").using("btree", table.clauseType.asc().nullsLast()),
        cbaClausesCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "cba_clauses_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
    };
});
exports.cbaVersionHistory = (0, pg_core_1.pgTable)("cba_version_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id").notNull(),
    version: (0, pg_core_1.integer)("version").notNull(),
    changeDescription: (0, pg_core_1.text)("change_description").notNull(),
    changeType: (0, pg_core_1.varchar)("change_type", { length: 50 }).notNull(),
    previousData: (0, pg_core_1.jsonb)("previous_data"),
    newData: (0, pg_core_1.jsonb)("new_data"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
}, (table) => {
    return {
        cbaVersionCbaIdx: (0, pg_core_1.index)("cba_version_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        cbaVersionNumberIdx: (0, pg_core_1.index)("cba_version_number_idx").using("btree", table.version.asc().nullsLast()),
        cbaVersionHistoryCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "cba_version_history_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
    };
});
exports.benefitComparisons = (0, pg_core_1.pgTable)("benefit_comparisons", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id").notNull(),
    clauseId: (0, pg_core_1.uuid)("clause_id"),
    benefitType: (0, pg_core_1.varchar)("benefit_type", { length: 100 }).notNull(),
    benefitName: (0, pg_core_1.varchar)("benefit_name", { length: 200 }).notNull(),
    coverageDetails: (0, pg_core_1.jsonb)("coverage_details"),
    monthlyPremium: (0, pg_core_1.numeric)("monthly_premium", { precision: 10, scale: 2 }),
    annualCost: (0, pg_core_1.numeric)("annual_cost", { precision: 12, scale: 2 }),
    industryBenchmark: (0, pg_core_1.varchar)("industry_benchmark", { length: 50 }),
    effectiveDate: (0, pg_core_1.timestamp)("effective_date", { withTimezone: true, mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        cbaIdx: (0, pg_core_1.index)("benefit_comparisons_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("benefit_comparisons_type_idx").using("btree", table.benefitType.asc().nullsLast()),
        benefitComparisonsCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "benefit_comparisons_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
        benefitComparisonsClauseIdCbaClausesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.clauseId],
            foreignColumns: [exports.cbaClauses.id],
            name: "benefit_comparisons_clause_id_cba_clauses_id_fk"
        }).onDelete("set null"),
    };
});
exports.clauseComparisons = (0, pg_core_1.pgTable)("clause_comparisons", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    comparisonName: (0, pg_core_1.varchar)("comparison_name", { length: 200 }).notNull(),
    clauseType: (0, exports.clauseType)("clause_type").notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    clauseIds: (0, pg_core_1.jsonb)("clause_ids").notNull(),
    analysisResults: (0, pg_core_1.jsonb)("analysis_results"),
    industryAverage: (0, pg_core_1.jsonb)("industry_average"),
    marketPosition: (0, pg_core_1.varchar)("market_position", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
}, (table) => {
    return {
        tenantIdx: (0, pg_core_1.index)("clause_comparisons_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("clause_comparisons_type_idx").using("btree", table.clauseType.asc().nullsLast()),
    };
});
exports.arbitratorProfiles = (0, pg_core_1.pgTable)("arbitrator_profiles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    totalDecisions: (0, pg_core_1.integer)("total_decisions").default(0).notNull(),
    grievorSuccessRate: (0, pg_core_1.numeric)("grievor_success_rate", { precision: 5, scale: 2 }),
    employerSuccessRate: (0, pg_core_1.numeric)("employer_success_rate", { precision: 5, scale: 2 }),
    averageAwardAmount: (0, pg_core_1.numeric)("average_award_amount", { precision: 12, scale: 2 }),
    medianAwardAmount: (0, pg_core_1.numeric)("median_award_amount", { precision: 12, scale: 2 }),
    highestAwardAmount: (0, pg_core_1.numeric)("highest_award_amount", { precision: 12, scale: 2 }),
    commonRemedies: (0, pg_core_1.jsonb)("common_remedies"),
    specializations: (0, pg_core_1.jsonb)("specializations"),
    primarySectors: (0, pg_core_1.jsonb)("primary_sectors"),
    jurisdictions: (0, pg_core_1.jsonb)("jurisdictions"),
    avgDecisionDays: (0, pg_core_1.integer)("avg_decision_days"),
    medianDecisionDays: (0, pg_core_1.integer)("median_decision_days"),
    decisionRangeMin: (0, pg_core_1.integer)("decision_range_min"),
    decisionRangeMax: (0, pg_core_1.integer)("decision_range_max"),
    decisionPatterns: (0, pg_core_1.jsonb)("decision_patterns"),
    contactInfo: (0, pg_core_1.jsonb)("contact_info"),
    biography: (0, pg_core_1.text)("biography"),
    credentials: (0, pg_core_1.jsonb)("credentials"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    lastDecisionDate: (0, pg_core_1.timestamp)("last_decision_date", { withTimezone: true, mode: 'string' }),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        activeIdx: (0, pg_core_1.index)("arbitrator_profiles_active_idx").using("btree", table.isActive.asc().nullsLast()),
        nameIdx: (0, pg_core_1.index)("arbitrator_profiles_name_idx").using("btree", table.name.asc().nullsLast()),
        arbitratorProfilesNameUnique: (0, pg_core_1.unique)("arbitrator_profiles_name_unique").on(table.name),
    };
});
exports.insightRecommendations = (0, pg_core_1.pgTable)("insight_recommendations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    insightType: (0, pg_core_1.text)("insight_type").notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    priority: (0, pg_core_1.text)("priority").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    dataSource: (0, pg_core_1.jsonb)("data_source"),
    metrics: (0, pg_core_1.jsonb)("metrics"),
    trend: (0, pg_core_1.text)("trend"),
    impact: (0, pg_core_1.text)("impact"),
    recommendations: (0, pg_core_1.jsonb)("recommendations"),
    actionRequired: (0, pg_core_1.boolean)("action_required").default(false),
    actionDeadline: (0, pg_core_1.timestamp)("action_deadline", { mode: 'string' }),
    estimatedBenefit: (0, pg_core_1.text)("estimated_benefit"),
    confidenceScore: (0, pg_core_1.numeric)("confidence_score"),
    relatedEntities: (0, pg_core_1.jsonb)("related_entities"),
    status: (0, pg_core_1.text)("status").default('new'),
    acknowledgedBy: (0, pg_core_1.text)("acknowledged_by"),
    acknowledgedAt: (0, pg_core_1.timestamp)("acknowledged_at", { mode: 'string' }),
    dismissedBy: (0, pg_core_1.text)("dismissed_by"),
    dismissedAt: (0, pg_core_1.timestamp)("dismissed_at", { mode: 'string' }),
    dismissalReason: (0, pg_core_1.text)("dismissal_reason"),
    completedAt: (0, pg_core_1.timestamp)("completed_at", { mode: 'string' }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        categoryIdx: (0, pg_core_1.index)("insight_recommendations_category_idx").using("btree", table.category.asc().nullsLast()),
        createdIdx: (0, pg_core_1.index)("insight_recommendations_created_idx").using("btree", table.createdAt.asc().nullsLast()),
        orgIdx: (0, pg_core_1.index)("insight_recommendations_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        priorityIdx: (0, pg_core_1.index)("insight_recommendations_priority_idx").using("btree", table.priority.asc().nullsLast()),
        statusIdx: (0, pg_core_1.index)("insight_recommendations_status_idx").using("btree", table.status.asc().nullsLast()),
        insightRecommendationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "insight_recommendations_organization_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.profiles = (0, pg_core_1.pgTable)("profiles", {
    userId: (0, pg_core_1.text)("user_id").primaryKey().notNull(),
    email: (0, pg_core_1.text)("email"),
    membership: (0, exports.membership)("membership").default('free').notNull(),
    paymentProvider: (0, exports.paymentProvider)("payment_provider").default('whop'),
    stripeCustomerId: (0, pg_core_1.text)("stripe_customer_id"),
    stripeSubscriptionId: (0, pg_core_1.text)("stripe_subscription_id"),
    whopUserId: (0, pg_core_1.text)("whop_user_id"),
    whopMembershipId: (0, pg_core_1.text)("whop_membership_id"),
    planDuration: (0, pg_core_1.text)("plan_duration"),
    billingCycleStart: (0, pg_core_1.timestamp)("billing_cycle_start", { mode: 'string' }),
    billingCycleEnd: (0, pg_core_1.timestamp)("billing_cycle_end", { mode: 'string' }),
    nextCreditRenewal: (0, pg_core_1.timestamp)("next_credit_renewal", { mode: 'string' }),
    usageCredits: (0, pg_core_1.integer)("usage_credits").default(0),
    usedCredits: (0, pg_core_1.integer)("used_credits").default(0),
    status: (0, pg_core_1.text)("status").default('active'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
    role: (0, exports.role)("role").default('member'),
    isSystemAdmin: (0, pg_core_1.boolean)("is_system_admin").default(false),
    organizationId: (0, pg_core_1.text)("organization_id"),
    permissions: (0, pg_core_1.text)("permissions").array(),
});
exports.pendingProfiles = (0, pg_core_1.pgTable)("pending_profiles", {
    id: (0, pg_core_1.text)("id").primaryKey().notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    token: (0, pg_core_1.text)("token"),
    membership: (0, exports.membership)("membership").default('pro').notNull(),
    paymentProvider: (0, exports.paymentProvider)("payment_provider").default('whop'),
    whopUserId: (0, pg_core_1.text)("whop_user_id"),
    whopMembershipId: (0, pg_core_1.text)("whop_membership_id"),
    planDuration: (0, pg_core_1.text)("plan_duration"),
    billingCycleStart: (0, pg_core_1.timestamp)("billing_cycle_start", { mode: 'string' }),
    billingCycleEnd: (0, pg_core_1.timestamp)("billing_cycle_end", { mode: 'string' }),
    nextCreditRenewal: (0, pg_core_1.timestamp)("next_credit_renewal", { mode: 'string' }),
    usageCredits: (0, pg_core_1.integer)("usage_credits").default(0),
    usedCredits: (0, pg_core_1.integer)("used_credits").default(0),
    claimed: (0, pg_core_1.boolean)("claimed").default(false),
    claimedByUserId: (0, pg_core_1.text)("claimed_by_user_id"),
    claimedAt: (0, pg_core_1.timestamp)("claimed_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        pendingProfilesEmailUnique: (0, pg_core_1.unique)("pending_profiles_email_unique").on(table.email),
    };
});
exports.digitalSignatures = (0, pg_core_1.pgTable)("digital_signatures", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    documentType: (0, pg_core_1.varchar)("document_type", { length: 100 }).notNull(),
    documentId: (0, pg_core_1.uuid)("document_id").notNull(),
    documentHash: (0, pg_core_1.varchar)("document_hash", { length: 128 }).notNull(),
    documentUrl: (0, pg_core_1.text)("document_url"),
    signatureType: (0, exports.signatureType)("signature_type").notNull(),
    signatureStatus: (0, exports.signatureStatus)("signature_status").default('pending'),
    signerUserId: (0, pg_core_1.uuid)("signer_user_id").notNull(),
    signerName: (0, pg_core_1.varchar)("signer_name", { length: 200 }).notNull(),
    signerTitle: (0, pg_core_1.varchar)("signer_title", { length: 100 }),
    signerEmail: (0, pg_core_1.varchar)("signer_email", { length: 255 }),
    certificateSubject: (0, pg_core_1.varchar)("certificate_subject", { length: 500 }),
    certificateIssuer: (0, pg_core_1.varchar)("certificate_issuer", { length: 500 }),
    certificateSerialNumber: (0, pg_core_1.varchar)("certificate_serial_number", { length: 100 }),
    certificateThumbprint: (0, pg_core_1.varchar)("certificate_thumbprint", { length: 128 }),
    certificateNotBefore: (0, pg_core_1.timestamp)("certificate_not_before", { withTimezone: true, mode: 'string' }),
    certificateNotAfter: (0, pg_core_1.timestamp)("certificate_not_after", { withTimezone: true, mode: 'string' }),
    signatureAlgorithm: (0, pg_core_1.varchar)("signature_algorithm", { length: 50 }),
    signatureValue: (0, pg_core_1.text)("signature_value"),
    publicKey: (0, pg_core_1.text)("public_key"),
    timestampToken: (0, pg_core_1.text)("timestamp_token"),
    timestampAuthority: (0, pg_core_1.varchar)("timestamp_authority", { length: 200 }),
    timestampValue: (0, pg_core_1.timestamp)("timestamp_value", { withTimezone: true, mode: 'string' }),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    verifiedAt: (0, pg_core_1.timestamp)("verified_at", { withTimezone: true, mode: 'string' }),
    verificationMethod: (0, pg_core_1.varchar)("verification_method", { length: 100 }),
    signedAt: (0, pg_core_1.timestamp)("signed_at", { withTimezone: true, mode: 'string' }),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    geolocation: (0, pg_core_1.jsonb)("geolocation"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    rejectedAt: (0, pg_core_1.timestamp)("rejected_at", { withTimezone: true, mode: 'string' }),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at", { withTimezone: true, mode: 'string' }),
    revocationReason: (0, pg_core_1.text)("revocation_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxDigitalSignaturesDocument: (0, pg_core_1.index)("idx_digital_signatures_document").using("btree", table.documentType.asc().nullsLast(), table.documentId.asc().nullsLast()),
        idxDigitalSignaturesHash: (0, pg_core_1.index)("idx_digital_signatures_hash").using("btree", table.documentHash.asc().nullsLast()),
        idxDigitalSignaturesOrg: (0, pg_core_1.index)("idx_digital_signatures_org").using("btree", table.organizationId.asc().nullsLast()),
        idxDigitalSignaturesSignedAt: (0, pg_core_1.index)("idx_digital_signatures_signed_at").using("btree", table.signedAt.asc().nullsLast()),
        idxDigitalSignaturesSigner: (0, pg_core_1.index)("idx_digital_signatures_signer").using("btree", table.signerUserId.asc().nullsLast()),
        idxDigitalSignaturesStatus: (0, pg_core_1.index)("idx_digital_signatures_status").using("btree", table.signatureStatus.asc().nullsLast()),
        idxDigitalSignaturesType: (0, pg_core_1.index)("idx_digital_signatures_type").using("btree", table.signatureType.asc().nullsLast()),
        digitalSignaturesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "digital_signatures_organization_id_fkey"
        }),
        uniqueDocumentSigner: (0, pg_core_1.unique)("unique_document_signer").on(table.documentType, table.documentId, table.signerUserId),
    };
});
exports.signatureWorkflows = (0, pg_core_1.pgTable)("signature_workflows", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    workflowName: (0, pg_core_1.varchar)("workflow_name", { length: 200 }).notNull(),
    documentType: (0, pg_core_1.varchar)("document_type", { length: 100 }).notNull(),
    signatureType: (0, exports.signatureType)("signature_type").notNull(),
    requiredSignatures: (0, pg_core_1.integer)("required_signatures").default(1),
    requiredRoles: (0, pg_core_1.jsonb)("required_roles"),
    sequentialSigning: (0, pg_core_1.boolean)("sequential_signing").default(false),
    expirationHours: (0, pg_core_1.integer)("expiration_hours").default(168),
    approvalThreshold: (0, pg_core_1.integer)("approval_threshold"),
    allowDelegation: (0, pg_core_1.boolean)("allow_delegation").default(false),
    notifyOnPending: (0, pg_core_1.boolean)("notify_on_pending").default(true),
    notifyOnSigned: (0, pg_core_1.boolean)("notify_on_signed").default(true),
    reminderIntervalHours: (0, pg_core_1.integer)("reminder_interval_hours").default(24),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxSignatureWorkflowsDocType: (0, pg_core_1.index)("idx_signature_workflows_doc_type").using("btree", table.documentType.asc().nullsLast()),
        idxSignatureWorkflowsOrg: (0, pg_core_1.index)("idx_signature_workflows_org").using("btree", table.organizationId.asc().nullsLast()),
        signatureWorkflowsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "signature_workflows_organization_id_fkey"
        }),
        uniqueWorkflowDocType: (0, pg_core_1.unique)("unique_workflow_doc_type").on(table.organizationId, table.documentType, table.signatureType),
    };
});
exports.wageProgressions = (0, pg_core_1.pgTable)("wage_progressions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id").notNull(),
    clauseId: (0, pg_core_1.uuid)("clause_id"),
    classification: (0, pg_core_1.varchar)("classification", { length: 200 }).notNull(),
    classificationCode: (0, pg_core_1.varchar)("classification_code", { length: 50 }),
    step: (0, pg_core_1.integer)("step").notNull(),
    hourlyRate: (0, pg_core_1.numeric)("hourly_rate", { precision: 10, scale: 2 }),
    annualSalary: (0, pg_core_1.numeric)("annual_salary", { precision: 12, scale: 2 }),
    effectiveDate: (0, pg_core_1.timestamp)("effective_date", { withTimezone: true, mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date", { withTimezone: true, mode: 'string' }),
    premiums: (0, pg_core_1.jsonb)("premiums"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        cbaIdx: (0, pg_core_1.index)("wage_progressions_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        classificationIdx: (0, pg_core_1.index)("wage_progressions_classification_idx").using("btree", table.classification.asc().nullsLast()),
        clauseIdx: (0, pg_core_1.index)("wage_progressions_clause_idx").using("btree", table.clauseId.asc().nullsLast()),
        effectiveDateIdx: (0, pg_core_1.index)("wage_progressions_effective_date_idx").using("btree", table.effectiveDate.asc().nullsLast()),
        wageProgressionsCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "wage_progressions_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
        wageProgressionsClauseIdCbaClausesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.clauseId],
            foreignColumns: [exports.cbaClauses.id],
            name: "wage_progressions_clause_id_cba_clauses_id_fk"
        }).onDelete("set null"),
    };
});
exports.arbitrationDecisions = (0, pg_core_1.pgTable)("arbitration_decisions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    caseNumber: (0, pg_core_1.varchar)("case_number", { length: 100 }).notNull(),
    caseTitle: (0, pg_core_1.varchar)("case_title", { length: 500 }).notNull(),
    tribunal: (0, exports.tribunalType)("tribunal").notNull(),
    decisionType: (0, exports.decisionType)("decision_type").notNull(),
    decisionDate: (0, pg_core_1.timestamp)("decision_date", { withTimezone: true, mode: 'string' }).notNull(),
    filingDate: (0, pg_core_1.timestamp)("filing_date", { withTimezone: true, mode: 'string' }),
    hearingDate: (0, pg_core_1.timestamp)("hearing_date", { withTimezone: true, mode: 'string' }),
    arbitrator: (0, pg_core_1.varchar)("arbitrator", { length: 200 }).notNull(),
    panelMembers: (0, pg_core_1.jsonb)("panel_members"),
    grievor: (0, pg_core_1.varchar)("grievor", { length: 300 }),
    union: (0, pg_core_1.varchar)("union", { length: 300 }).notNull(),
    employer: (0, pg_core_1.varchar)("employer", { length: 300 }).notNull(),
    outcome: (0, exports.outcome)("outcome").notNull(),
    remedy: (0, pg_core_1.jsonb)("remedy"),
    keyFindings: (0, pg_core_1.jsonb)("key_findings"),
    issueTypes: (0, pg_core_1.jsonb)("issue_types"),
    precedentValue: (0, exports.precedentValue)("precedent_value").notNull(),
    legalCitations: (0, pg_core_1.jsonb)("legal_citations"),
    relatedDecisions: (0, pg_core_1.jsonb)("related_decisions"),
    cbaReferences: (0, pg_core_1.jsonb)("cba_references"),
    fullText: (0, pg_core_1.text)("full_text").notNull(),
    summary: (0, pg_core_1.text)("summary"),
    headnote: (0, pg_core_1.text)("headnote"),
    sector: (0, pg_core_1.varchar)("sector", { length: 100 }),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 50 }),
    language: (0, pg_core_1.varchar)("language", { length: 10 }).default('en').notNull(),
    citationCount: (0, pg_core_1.integer)("citation_count").default(0),
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    embedding: (0, pg_core_1.text)("embedding"),
    isPublic: (0, pg_core_1.boolean)("is_public").default(true),
    accessRestrictions: (0, pg_core_1.text)("access_restrictions"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    importedFrom: (0, pg_core_1.varchar)("imported_from", { length: 200 }),
}, (table) => {
    return {
        arbitrationArbitratorIdx: (0, pg_core_1.index)("arbitration_arbitrator_idx").using("btree", table.arbitrator.asc().nullsLast()),
        arbitrationCaseNumberIdx: (0, pg_core_1.index)("arbitration_case_number_idx").using("btree", table.caseNumber.asc().nullsLast()),
        arbitrationDecisionDateIdx: (0, pg_core_1.index)("arbitration_decision_date_idx").using("btree", table.decisionDate.asc().nullsLast()),
        arbitrationJurisdictionIdx: (0, pg_core_1.index)("arbitration_jurisdiction_idx").using("btree", table.jurisdiction.asc().nullsLast()),
        arbitrationOutcomeIdx: (0, pg_core_1.index)("arbitration_outcome_idx").using("btree", table.outcome.asc().nullsLast()),
        arbitrationPrecedentIdx: (0, pg_core_1.index)("arbitration_precedent_idx").using("btree", table.precedentValue.asc().nullsLast()),
        arbitrationTribunalIdx: (0, pg_core_1.index)("arbitration_tribunal_idx").using("btree", table.tribunal.asc().nullsLast()),
        arbitrationDecisionsCaseNumberUnique: (0, pg_core_1.unique)("arbitration_decisions_case_number_unique").on(table.caseNumber),
    };
});
exports.bargainingNotes = (0, pg_core_1.pgTable)("bargaining_notes", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id"),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    sessionDate: (0, pg_core_1.timestamp)("session_date", { withTimezone: true, mode: 'string' }).notNull(),
    sessionType: (0, pg_core_1.varchar)("session_type", { length: 100 }).notNull(),
    sessionNumber: (0, pg_core_1.integer)("session_number"),
    title: (0, pg_core_1.varchar)("title", { length: 300 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    attendees: (0, pg_core_1.jsonb)("attendees"),
    relatedClauseIds: (0, pg_core_1.jsonb)("related_clause_ids"),
    relatedDecisionIds: (0, pg_core_1.jsonb)("related_decision_ids"),
    tags: (0, pg_core_1.jsonb)("tags"),
    confidentialityLevel: (0, pg_core_1.varchar)("confidentiality_level", { length: 50 }).default('internal'),
    embedding: (0, pg_core_1.text)("embedding"),
    keyInsights: (0, pg_core_1.jsonb)("key_insights"),
    attachments: (0, pg_core_1.jsonb)("attachments"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    lastModifiedBy: (0, pg_core_1.uuid)("last_modified_by"),
}, (table) => {
    return {
        cbaIdx: (0, pg_core_1.index)("bargaining_notes_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        sessionDateIdx: (0, pg_core_1.index)("bargaining_notes_session_date_idx").using("btree", table.sessionDate.asc().nullsLast()),
        sessionTypeIdx: (0, pg_core_1.index)("bargaining_notes_session_type_idx").using("btree", table.sessionType.asc().nullsLast()),
        tenantIdx: (0, pg_core_1.index)("bargaining_notes_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
        bargainingNotesCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "bargaining_notes_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
    };
});
exports.cbaFootnotes = (0, pg_core_1.pgTable)("cba_footnotes", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sourceClauseId: (0, pg_core_1.uuid)("source_clause_id").notNull(),
    targetClauseId: (0, pg_core_1.uuid)("target_clause_id"),
    targetDecisionId: (0, pg_core_1.uuid)("target_decision_id"),
    footnoteNumber: (0, pg_core_1.integer)("footnote_number").notNull(),
    footnoteText: (0, pg_core_1.text)("footnote_text").notNull(),
    context: (0, pg_core_1.text)("context"),
    linkType: (0, pg_core_1.varchar)("link_type", { length: 50 }).notNull(),
    startOffset: (0, pg_core_1.integer)("start_offset"),
    endOffset: (0, pg_core_1.integer)("end_offset"),
    clickCount: (0, pg_core_1.integer)("click_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
}, (table) => {
    return {
        sourceIdx: (0, pg_core_1.index)("cba_footnotes_source_idx").using("btree", table.sourceClauseId.asc().nullsLast()),
        targetClauseIdx: (0, pg_core_1.index)("cba_footnotes_target_clause_idx").using("btree", table.targetClauseId.asc().nullsLast()),
        targetDecisionIdx: (0, pg_core_1.index)("cba_footnotes_target_decision_idx").using("btree", table.targetDecisionId.asc().nullsLast()),
        cbaFootnotesSourceClauseIdCbaClausesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.sourceClauseId],
            foreignColumns: [exports.cbaClauses.id],
            name: "cba_footnotes_source_clause_id_cba_clauses_id_fk"
        }).onDelete("cascade"),
        cbaFootnotesTargetClauseIdCbaClausesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.targetClauseId],
            foreignColumns: [exports.cbaClauses.id],
            name: "cba_footnotes_target_clause_id_cba_clauses_id_fk"
        }).onDelete("cascade"),
        cbaFootnotesTargetDecisionIdArbitrationDecisionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.targetDecisionId],
            foreignColumns: [exports.arbitrationDecisions.id],
            name: "cba_footnotes_target_decision_id_arbitration_decisions_id_fk"
        }).onDelete("cascade"),
    };
});
exports.claimPrecedentAnalysis = (0, pg_core_1.pgTable)("claim_precedent_analysis", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    claimId: (0, pg_core_1.uuid)("claim_id").notNull(),
    precedentMatches: (0, pg_core_1.jsonb)("precedent_matches"),
    successProbability: (0, pg_core_1.numeric)("success_probability", { precision: 5, scale: 2 }),
    confidenceLevel: (0, pg_core_1.varchar)("confidence_level", { length: 50 }),
    suggestedStrategy: (0, pg_core_1.text)("suggested_strategy"),
    potentialRemedies: (0, pg_core_1.jsonb)("potential_remedies"),
    arbitratorTendencies: (0, pg_core_1.jsonb)("arbitrator_tendencies"),
    relevantCbaClauseIds: (0, pg_core_1.jsonb)("relevant_cba_clause_ids"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    analyzedBy: (0, pg_core_1.varchar)("analyzed_by", { length: 50 }).default('ai_system').notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        claimPrecedentClaimIdx: (0, pg_core_1.index)("claim_precedent_claim_idx").using("btree", table.claimId.asc().nullsLast()),
        idxClaimPrecedentAnalysisCreatedAt: (0, pg_core_1.index)("idx_claim_precedent_analysis_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxClaimPrecedentAnalysisUpdatedAt: (0, pg_core_1.index)("idx_claim_precedent_analysis_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
    };
});
exports.cbaContacts = (0, pg_core_1.pgTable)("cba_contacts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    cbaId: (0, pg_core_1.uuid)("cba_id").notNull(),
    contactType: (0, pg_core_1.varchar)("contact_type", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 200 }),
    organization: (0, pg_core_1.varchar)("organization", { length: 300 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        cbaIdx: (0, pg_core_1.index)("cba_contacts_cba_idx").using("btree", table.cbaId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("cba_contacts_type_idx").using("btree", table.contactType.asc().nullsLast()),
        cbaContactsCbaIdCollectiveAgreementsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.cbaId],
            foreignColumns: [exports.collectiveAgreements.id],
            name: "cba_contacts_cba_id_collective_agreements_id_fk"
        }).onDelete("cascade"),
    };
});
exports.aiDocuments = (0, pg_core_1.pgTable)("ai_documents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    claimId: (0, pg_core_1.uuid)("claim_id"),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    sourceType: (0, pg_core_1.text)("source_type").notNull(),
    licenseNotes: (0, pg_core_1.text)("license_notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAiDocumentsClaim: (0, pg_core_1.index)("idx_ai_documents_claim").using("btree", table.claimId.asc().nullsLast()),
        idxAiDocumentsMetadata: (0, pg_core_1.index)("idx_ai_documents_metadata").using("gin", table.metadata.asc().nullsLast()),
        idxAiDocumentsSourceType: (0, pg_core_1.index)("idx_ai_documents_source_type").using("btree", table.sourceType.asc().nullsLast()),
        idxAiDocumentsTenant: (0, pg_core_1.index)("idx_ai_documents_tenant").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.aiChunks = (0, pg_core_1.pgTable)("ai_chunks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    documentId: (0, pg_core_1.uuid)("document_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    chunkIndex: (0, pg_core_1.integer)("chunk_index").notNull(),
    embedding: (0, pg_core_1.text)("embedding"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAiChunksDocument: (0, pg_core_1.index)("idx_ai_chunks_document").using("btree", table.documentId.asc().nullsLast()),
        idxAiChunksTenant: (0, pg_core_1.index)("idx_ai_chunks_tenant").using("btree", table.tenantId.asc().nullsLast()),
        aiChunksDocumentIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.documentId],
            foreignColumns: [exports.aiDocuments.id],
            name: "ai_chunks_document_id_fkey"
        }).onDelete("cascade"),
        aiChunksDocumentIdChunkIndexKey: (0, pg_core_1.unique)("ai_chunks_document_id_chunk_index_key").on(table.documentId, table.chunkIndex),
    };
});
exports.aiQueries = (0, pg_core_1.pgTable)("ai_queries", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    queryText: (0, pg_core_1.text)("query_text").notNull(),
    queryHash: (0, pg_core_1.text)("query_hash").notNull(),
    answer: (0, pg_core_1.text)("answer"),
    sources: (0, pg_core_1.jsonb)("sources").default([]),
    status: (0, pg_core_1.text)("status").notNull(),
    latencyMs: (0, pg_core_1.integer)("latency_ms"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAiQueriesCreated: (0, pg_core_1.index)("idx_ai_queries_created").using("btree", table.createdAt.desc().nullsFirst()),
        idxAiQueriesHash: (0, pg_core_1.index)("idx_ai_queries_hash").using("btree", table.queryHash.asc().nullsLast()),
        idxAiQueriesTenant: (0, pg_core_1.index)("idx_ai_queries_tenant").using("btree", table.tenantId.asc().nullsLast()),
        idxAiQueriesUser: (0, pg_core_1.index)("idx_ai_queries_user").using("btree", table.userId.asc().nullsLast()),
    };
});
exports.aiQueryLogs = (0, pg_core_1.pgTable)("ai_query_logs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    inputHash: (0, pg_core_1.text)("input_hash").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    latencyMs: (0, pg_core_1.integer)("latency_ms"),
    status: (0, pg_core_1.text)("status").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxAiQueryLogsCreatedAt: (0, pg_core_1.index)("idx_ai_query_logs_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxAiQueryLogsTenant: (0, pg_core_1.index)("idx_ai_query_logs_tenant").using("btree", table.tenantId.asc().nullsLast()),
        idxAiQueryLogsTimestamp: (0, pg_core_1.index)("idx_ai_query_logs_timestamp").using("btree", table.createdAt.desc().nullsFirst()),
        idxAiQueryLogsUpdatedAt: (0, pg_core_1.index)("idx_ai_query_logs_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
    };
});
exports.aiFeedback = (0, pg_core_1.pgTable)("ai_feedback", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    queryId: (0, pg_core_1.uuid)("query_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    rating: (0, pg_core_1.text)("rating").notNull(),
    comment: (0, pg_core_1.text)("comment"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAiFeedbackQuery: (0, pg_core_1.index)("idx_ai_feedback_query").using("btree", table.queryId.asc().nullsLast()),
        idxAiFeedbackTenant: (0, pg_core_1.index)("idx_ai_feedback_tenant").using("btree", table.tenantId.asc().nullsLast()),
        aiFeedbackQueryIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.queryId],
            foreignColumns: [exports.aiQueries.id],
            name: "ai_feedback_query_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.aiUsageByTenant = (0, pg_core_1.pgTable)("ai_usage_by_tenant", {
    tenantId: (0, pg_core_1.text)("tenant_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalQueries: (0, pg_core_1.bigint)("total_queries", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    successfulQueries: (0, pg_core_1.bigint)("successful_queries", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    failedQueries: (0, pg_core_1.bigint)("failed_queries", { mode: "number" }),
    avgLatencyMs: (0, pg_core_1.numeric)("avg_latency_ms"),
    lastQueryAt: (0, pg_core_1.timestamp)("last_query_at", { withTimezone: true, mode: 'string' }),
});
exports.aiFeedbackSummary = (0, pg_core_1.pgTable)("ai_feedback_summary", {
    tenantId: (0, pg_core_1.text)("tenant_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalFeedback: (0, pg_core_1.bigint)("total_feedback", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    positiveFeedback: (0, pg_core_1.bigint)("positive_feedback", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    negativeFeedback: (0, pg_core_1.bigint)("negative_feedback", { mode: "number" }),
    positiveRatePct: (0, pg_core_1.numeric)("positive_rate_pct"),
});
exports.organizationMembers = (0, pg_core_1.pgTable)("organization_members", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.text)("organization_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    role: (0, exports.memberRole)("role").default('member').notNull(),
    status: (0, exports.memberStatus)("status").default('active').notNull(),
    department: (0, pg_core_1.text)("department"),
    position: (0, pg_core_1.text)("position"),
    hireDate: (0, pg_core_1.timestamp)("hire_date", { withTimezone: true, mode: 'string' }),
    membershipNumber: (0, pg_core_1.text)("membership_number"),
    seniority: (0, pg_core_1.integer)("seniority").default(0),
    unionJoinDate: (0, pg_core_1.timestamp)("union_join_date", { withTimezone: true, mode: 'string' }),
    preferredContactMethod: (0, pg_core_1.text)("preferred_contact_method"),
    metadata: (0, pg_core_1.text)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true, mode: 'string' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    searchVector: tsvector("search_vector"),
    joinedAt: (0, pg_core_1.timestamp)("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
}, (table) => {
    return {
        idxOrgMembersDeletedAt: (0, pg_core_1.index)("idx_org_members_deleted_at").using("btree", table.deletedAt.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(deleted_at IS NULL)`),
        idxOrgMembersDepartment: (0, pg_core_1.index)("idx_org_members_department").using("btree", table.department.asc().nullsLast()),
        idxOrgMembersEmail: (0, pg_core_1.index)("idx_org_members_email").using("btree", table.email.asc().nullsLast()),
        idxOrgMembersOrgId: (0, pg_core_1.index)("idx_org_members_org_id").using("btree", table.organizationId.asc().nullsLast()),
        idxOrgMembersRole: (0, pg_core_1.index)("idx_org_members_role").using("btree", table.role.asc().nullsLast()),
        idxOrgMembersSearchVector: (0, pg_core_1.index)("idx_org_members_search_vector").using("gin", table.searchVector.asc().nullsLast()),
        idxOrgMembersStatus: (0, pg_core_1.index)("idx_org_members_status").using("btree", table.status.asc().nullsLast()),
        idxOrgMembersTenantId: (0, pg_core_1.index)("idx_org_members_tenant_id").using("btree", table.tenantId.asc().nullsLast()),
        idxOrgMembersUserId: (0, pg_core_1.index)("idx_org_members_user_id").using("btree", table.userId.asc().nullsLast()),
        idxOrganizationMembersIsPrimary: (0, pg_core_1.index)("idx_organization_members_is_primary").using("btree", table.userId.asc().nullsLast(), table.isPrimary.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(is_primary = true)`),
        idxOrganizationMembersOrgId: (0, pg_core_1.index)("idx_organization_members_org_id").using("btree", table.organizationId.asc().nullsLast()),
        organizationMembersTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "organization_members_tenant_id_fkey"
        }).onDelete("cascade"),
        organizationMembersTenantUserUnique: (0, pg_core_1.unique)("organization_members_tenant_user_unique").on(table.userId, table.tenantId),
        organizationMembersEmailKey: (0, pg_core_1.unique)("organization_members_email_key").on(table.email),
    };
});
exports.caseSummaries = (0, pg_core_1.pgTable)("case_summaries", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    claimId: (0, pg_core_1.uuid)("claim_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    summaryText: (0, pg_core_1.text)("summary_text").notNull(),
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 50 }).notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        idxCaseSummariesClaim: (0, pg_core_1.index)("idx_case_summaries_claim").using("btree", table.claimId.asc().nullsLast()),
        idxCaseSummariesCreatedAt: (0, pg_core_1.index)("idx_case_summaries_created_at").using("btree", table.createdAt.desc().nullsFirst()),
        idxCaseSummariesCreatedBy: (0, pg_core_1.index)("idx_case_summaries_created_by").using("btree", table.createdBy.asc().nullsLast()),
        idxCaseSummariesTenant: (0, pg_core_1.index)("idx_case_summaries_tenant").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.claimUpdates = (0, pg_core_1.pgTable)("claim_updates", {
    updateId: (0, pg_core_1.uuid)("update_id").defaultRandom().primaryKey().notNull(),
    claimId: (0, pg_core_1.uuid)("claim_id").notNull(),
    updateType: (0, pg_core_1.varchar)("update_type", { length: 50 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    isInternal: (0, pg_core_1.boolean)("is_internal").default(false),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        idxClaimUpdatesClaimId: (0, pg_core_1.index)("idx_claim_updates_claim_id").using("btree", table.claimId.asc().nullsLast()),
        idxClaimUpdatesCreatedAt: (0, pg_core_1.index)("idx_claim_updates_created_at").using("btree", table.createdAt.desc().nullsFirst()),
        fkClaimUpdatesClaim: (0, pg_core_1.foreignKey)({
            columns: [table.claimId],
            foreignColumns: [exports.claims.claimId],
            name: "fk_claim_updates_claim"
        }).onDelete("cascade"),
        fkClaimUpdatesUser: (0, pg_core_1.foreignKey)({
            columns: [table.createdBy],
            foreignColumns: [exports.profiles.userId],
            name: "fk_claim_updates_user"
        }).onDelete("cascade"),
    };
});
exports.memberDuesAssignments = (0, pg_core_1.pgTable)("member_dues_assignments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    ruleId: (0, pg_core_1.uuid)("rule_id").notNull(),
    effectiveDate: (0, pg_core_1.date)("effective_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    endDate: (0, pg_core_1.date)("end_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    overrideAmount: (0, pg_core_1.numeric)("override_amount", { precision: 10, scale: 2 }),
    overrideReason: (0, pg_core_1.text)("override_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAssignmentsActive: (0, pg_core_1.index)("idx_assignments_active").using("btree", table.tenantId.asc().nullsLast(), table.isActive.asc().nullsLast()),
        idxAssignmentsMember: (0, pg_core_1.index)("idx_assignments_member").using("btree", table.memberId.asc().nullsLast()),
        idxAssignmentsTenant: (0, pg_core_1.index)("idx_assignments_tenant").using("btree", table.tenantId.asc().nullsLast()),
        memberDuesAssignmentsRuleIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.ruleId],
            foreignColumns: [exports.duesRules.id],
            name: "member_dues_assignments_rule_id_fkey"
        }).onDelete("cascade"),
        memberDuesAssignmentsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "member_dues_assignments_tenant_id_fkey"
        }).onDelete("cascade"),
        uniqueActiveAssignment: (0, pg_core_1.unique)("unique_active_assignment").on(table.tenantId, table.memberId, table.ruleId, table.effectiveDate),
    };
});
exports.duesAssignments = exports.memberDuesAssignments;
exports.employerRemittances = (0, pg_core_1.pgTable)("employer_remittances", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    employerName: (0, pg_core_1.varchar)("employer_name", { length: 255 }).notNull(),
    employerId: (0, pg_core_1.varchar)("employer_id", { length: 100 }),
    remittancePeriodStart: (0, pg_core_1.date)("remittance_period_start").notNull(),
    remittancePeriodEnd: (0, pg_core_1.date)("remittance_period_end").notNull(),
    remittanceDate: (0, pg_core_1.date)("remittance_date").notNull(),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 12, scale: 2 }).notNull(),
    memberCount: (0, pg_core_1.integer)("member_count").notNull(),
    fileUrl: (0, pg_core_1.text)("file_url"),
    fileHash: (0, pg_core_1.varchar)("file_hash", { length: 64 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(),
    reconciliationStatus: (0, pg_core_1.varchar)("reconciliation_status", { length: 50 }),
    reconciliationDate: (0, pg_core_1.timestamp)("reconciliation_date", { withTimezone: true, mode: 'string' }),
    reconciledBy: (0, pg_core_1.text)("reconciled_by"),
    varianceAmount: (0, pg_core_1.numeric)("variance_amount", { precision: 10, scale: 2 }).default('0.00'),
    varianceReason: (0, pg_core_1.text)("variance_reason"),
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxRemittancesPeriod: (0, pg_core_1.index)("idx_remittances_period").using("btree", table.remittancePeriodStart.asc().nullsLast(), table.remittancePeriodEnd.asc().nullsLast()),
        idxRemittancesStatus: (0, pg_core_1.index)("idx_remittances_status").using("btree", table.tenantId.asc().nullsLast(), table.status.asc().nullsLast()),
        idxRemittancesTenant: (0, pg_core_1.index)("idx_remittances_tenant").using("btree", table.tenantId.asc().nullsLast()),
        employerRemittancesTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "employer_remittances_tenant_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.duesRules = (0, pg_core_1.pgTable)("dues_rules", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    ruleName: (0, pg_core_1.varchar)("rule_name", { length: 255 }).notNull(),
    ruleCode: (0, pg_core_1.varchar)("rule_code", { length: 50 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    calculationType: (0, pg_core_1.varchar)("calculation_type", { length: 50 }).notNull(),
    percentageRate: (0, pg_core_1.numeric)("percentage_rate", { precision: 5, scale: 2 }),
    baseField: (0, pg_core_1.varchar)("base_field", { length: 100 }),
    flatAmount: (0, pg_core_1.numeric)("flat_amount", { precision: 10, scale: 2 }),
    hourlyRate: (0, pg_core_1.numeric)("hourly_rate", { precision: 10, scale: 2 }),
    hoursPerPeriod: (0, pg_core_1.integer)("hours_per_period"),
    tierStructure: (0, pg_core_1.jsonb)("tier_structure"),
    customFormula: (0, pg_core_1.text)("custom_formula"),
    billingFrequency: (0, pg_core_1.varchar)("billing_frequency", { length: 20 }).default('monthly').notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    effectiveDate: (0, pg_core_1.date)("effective_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    endDate: (0, pg_core_1.date)("end_date"),
    createdBy: (0, pg_core_1.text)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxDuesRulesActive: (0, pg_core_1.index)("idx_dues_rules_active").using("btree", table.tenantId.asc().nullsLast(), table.isActive.asc().nullsLast()),
        idxDuesRulesTenant: (0, pg_core_1.index)("idx_dues_rules_tenant").using("btree", table.tenantId.asc().nullsLast()),
        duesRulesTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "dues_rules_tenant_id_fkey"
        }).onDelete("cascade"),
        uniqueRuleCode: (0, pg_core_1.unique)("unique_rule_code").on(table.tenantId, table.ruleCode),
    };
});
exports.strikeFunds = (0, pg_core_1.pgTable)("strike_funds", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    fundName: (0, pg_core_1.varchar)("fund_name", { length: 255 }).notNull(),
    fundCode: (0, pg_core_1.varchar)("fund_code", { length: 50 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    fundType: (0, pg_core_1.varchar)("fund_type", { length: 50 }).notNull(),
    currentBalance: (0, pg_core_1.numeric)("current_balance", { precision: 12, scale: 2 }).default('0.00').notNull(),
    targetAmount: (0, pg_core_1.numeric)("target_amount", { precision: 12, scale: 2 }),
    minimumThreshold: (0, pg_core_1.numeric)("minimum_threshold", { precision: 12, scale: 2 }),
    contributionRate: (0, pg_core_1.numeric)("contribution_rate", { precision: 10, scale: 2 }),
    contributionFrequency: (0, pg_core_1.varchar)("contribution_frequency", { length: 20 }),
    strikeStatus: (0, pg_core_1.varchar)("strike_status", { length: 50 }).default('inactive').notNull(),
    strikeStartDate: (0, pg_core_1.date)("strike_start_date"),
    strikeEndDate: (0, pg_core_1.date)("strike_end_date"),
    weeklyStipendAmount: (0, pg_core_1.numeric)("weekly_stipend_amount", { precision: 10, scale: 2 }),
    dailyPicketBonus: (0, pg_core_1.numeric)("daily_picket_bonus", { precision: 8, scale: 2 }),
    minimumAttendanceHours: (0, pg_core_1.numeric)("minimum_attendance_hours", { precision: 4, scale: 2 }).default('4.0'),
    estimatedBurnRate: (0, pg_core_1.numeric)("estimated_burn_rate", { precision: 10, scale: 2 }),
    estimatedDurationWeeks: (0, pg_core_1.integer)("estimated_duration_weeks"),
    fundDepletionDate: (0, pg_core_1.date)("fund_depletion_date"),
    lastPredictionUpdate: (0, pg_core_1.timestamp)("last_prediction_update", { withTimezone: true, mode: 'string' }),
    acceptsPublicDonations: (0, pg_core_1.boolean)("accepts_public_donations").default(false),
    donationPageUrl: (0, pg_core_1.text)("donation_page_url"),
    fundraisingGoal: (0, pg_core_1.numeric)("fundraising_goal", { precision: 12, scale: 2 }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default('active'),
    createdBy: (0, pg_core_1.text)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
}, (table) => {
    return {
        idxStrikeFundsActive: (0, pg_core_1.index)("idx_strike_funds_active").using("btree", table.tenantId.asc().nullsLast()).where((0, drizzle_orm_1.sql) `((strike_status)::text = 'active'::text)`),
        idxStrikeFundsOrganizationId: (0, pg_core_1.index)("idx_strike_funds_organization_id").using("btree", table.organizationId.asc().nullsLast()),
        idxStrikeFundsStatus: (0, pg_core_1.index)("idx_strike_funds_status").using("btree", table.tenantId.asc().nullsLast(), table.strikeStatus.asc().nullsLast()),
        idxStrikeFundsTenant: (0, pg_core_1.index)("idx_strike_funds_tenant").using("btree", table.tenantId.asc().nullsLast()),
        strikeFundsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "strike_funds_organization_id_fkey"
        }),
        strikeFundsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "strike_funds_tenant_id_fkey"
        }).onDelete("cascade"),
        uniqueFundCode: (0, pg_core_1.unique)("unique_fund_code").on(table.tenantId, table.fundCode),
    };
});
exports.fundEligibility = (0, pg_core_1.pgTable)("fund_eligibility", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    isEligible: (0, pg_core_1.boolean)("is_eligible").default(false),
    eligibilityReason: (0, pg_core_1.text)("eligibility_reason"),
    monthsInGoodStanding: (0, pg_core_1.integer)("months_in_good_standing"),
    hasPaidDues: (0, pg_core_1.boolean)("has_paid_dues").default(false),
    noArrears: (0, pg_core_1.boolean)("no_arrears").default(false),
    isInBargainingUnit: (0, pg_core_1.boolean)("is_in_bargaining_unit").default(false),
    approvalStatus: (0, pg_core_1.varchar)("approval_status", { length: 50 }).default('pending'),
    approvedBy: (0, pg_core_1.text)("approved_by"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxEligibilityFund: (0, pg_core_1.index)("idx_eligibility_fund").using("btree", table.strikeFundId.asc().nullsLast()),
        idxEligibilityMember: (0, pg_core_1.index)("idx_eligibility_member").using("btree", table.memberId.asc().nullsLast()),
        idxEligibilityTenant: (0, pg_core_1.index)("idx_eligibility_tenant").using("btree", table.tenantId.asc().nullsLast()),
        fundEligibilityStrikeFundIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.strikeFundId],
            foreignColumns: [exports.strikeFunds.id],
            name: "fund_eligibility_strike_fund_id_fkey"
        }).onDelete("cascade"),
        fundEligibilityTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "fund_eligibility_tenant_id_fkey"
        }).onDelete("cascade"),
        uniqueMemberFundEligibility: (0, pg_core_1.unique)("unique_member_fund_eligibility").on(table.tenantId, table.strikeFundId, table.memberId),
    };
});
exports.picketAttendance = (0, pg_core_1.pgTable)("picket_attendance", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    checkInTime: (0, pg_core_1.timestamp)("check_in_time", { withTimezone: true, mode: 'string' }).notNull(),
    checkOutTime: (0, pg_core_1.timestamp)("check_out_time", { withTimezone: true, mode: 'string' }),
    checkInLatitude: (0, pg_core_1.numeric)("check_in_latitude", { precision: 10, scale: 8 }),
    checkInLongitude: (0, pg_core_1.numeric)("check_in_longitude", { precision: 11, scale: 8 }),
    checkOutLatitude: (0, pg_core_1.numeric)("check_out_latitude", { precision: 10, scale: 8 }),
    checkOutLongitude: (0, pg_core_1.numeric)("check_out_longitude", { precision: 11, scale: 8 }),
    locationVerified: (0, pg_core_1.boolean)("location_verified").default(false),
    checkInMethod: (0, pg_core_1.varchar)("check_in_method", { length: 50 }),
    nfcTagUid: (0, pg_core_1.varchar)("nfc_tag_uid", { length: 100 }),
    qrCodeData: (0, pg_core_1.varchar)("qr_code_data", { length: 255 }),
    deviceId: (0, pg_core_1.text)("device_id"),
    durationMinutes: (0, pg_core_1.integer)("duration_minutes"),
    hoursWorked: (0, pg_core_1.numeric)("hours_worked", { precision: 4, scale: 2 }),
    coordinatorOverride: (0, pg_core_1.boolean)("coordinator_override").default(false),
    overrideReason: (0, pg_core_1.text)("override_reason"),
    verifiedBy: (0, pg_core_1.text)("verified_by"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxAttendanceDate: (0, pg_core_1.index)("idx_attendance_date").using("btree", table.checkInTime.asc().nullsLast()),
        idxAttendanceFund: (0, pg_core_1.index)("idx_attendance_fund").using("btree", table.strikeFundId.asc().nullsLast()),
        idxAttendanceMember: (0, pg_core_1.index)("idx_attendance_member").using("btree", table.memberId.asc().nullsLast()),
        idxAttendanceMethod: (0, pg_core_1.index)("idx_attendance_method").using("btree", table.checkInMethod.asc().nullsLast()),
        idxAttendanceTenant: (0, pg_core_1.index)("idx_attendance_tenant").using("btree", table.tenantId.asc().nullsLast()),
        picketAttendanceStrikeFundIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.strikeFundId],
            foreignColumns: [exports.strikeFunds.id],
            name: "picket_attendance_strike_fund_id_fkey"
        }).onDelete("cascade"),
        picketAttendanceTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "picket_attendance_tenant_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.stipendDisbursements = (0, pg_core_1.pgTable)("stipend_disbursements", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    weekStartDate: (0, pg_core_1.date)("week_start_date").notNull(),
    weekEndDate: (0, pg_core_1.date)("week_end_date").notNull(),
    hoursWorked: (0, pg_core_1.numeric)("hours_worked", { precision: 6, scale: 2 }).notNull(),
    baseStipendAmount: (0, pg_core_1.numeric)("base_stipend_amount", { precision: 10, scale: 2 }).notNull(),
    bonusAmount: (0, pg_core_1.numeric)("bonus_amount", { precision: 10, scale: 2 }).default('0.00'),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('calculated').notNull(),
    paymentDate: (0, pg_core_1.timestamp)("payment_date", { withTimezone: true, mode: 'string' }),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 255 }),
    approvedBy: (0, pg_core_1.text)("approved_by"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { withTimezone: true, mode: 'string' }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxStipendsFund: (0, pg_core_1.index)("idx_stipends_fund").using("btree", table.strikeFundId.asc().nullsLast()),
        idxStipendsMember: (0, pg_core_1.index)("idx_stipends_member").using("btree", table.memberId.asc().nullsLast()),
        idxStipendsStatus: (0, pg_core_1.index)("idx_stipends_status").using("btree", table.status.asc().nullsLast()),
        idxStipendsTenant: (0, pg_core_1.index)("idx_stipends_tenant").using("btree", table.tenantId.asc().nullsLast()),
        idxStipendsWeek: (0, pg_core_1.index)("idx_stipends_week").using("btree", table.weekStartDate.asc().nullsLast()),
        stipendDisbursementsStrikeFundIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.strikeFundId],
            foreignColumns: [exports.strikeFunds.id],
            name: "stipend_disbursements_strike_fund_id_fkey"
        }).onDelete("cascade"),
        stipendDisbursementsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "stipend_disbursements_tenant_id_fkey"
        }).onDelete("cascade"),
        uniqueMemberWeekStipend: (0, pg_core_1.unique)("unique_member_week_stipend").on(table.tenantId, table.strikeFundId, table.memberId, table.weekStartDate),
    };
});
exports.publicDonations = (0, pg_core_1.pgTable)("public_donations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    donorName: (0, pg_core_1.varchar)("donor_name", { length: 255 }),
    donorEmail: (0, pg_core_1.varchar)("donor_email", { length: 255 }),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(false),
    amount: (0, pg_core_1.numeric)("amount", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('USD'),
    paymentProvider: (0, pg_core_1.varchar)("payment_provider", { length: 50 }).default('stripe'),
    paymentIntentId: (0, pg_core_1.varchar)("payment_intent_id", { length: 255 }),
    transactionId: (0, pg_core_1.varchar)("transaction_id", { length: 255 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(),
    message: (0, pg_core_1.text)("message"),
    processedAt: (0, pg_core_1.timestamp)("processed_at", { withTimezone: true, mode: 'string' }),
    refundedAt: (0, pg_core_1.timestamp)("refunded_at", { withTimezone: true, mode: 'string' }),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxDonationsCreated: (0, pg_core_1.index)("idx_donations_created").using("btree", table.createdAt.desc().nullsFirst()),
        idxDonationsFund: (0, pg_core_1.index)("idx_donations_fund").using("btree", table.strikeFundId.asc().nullsLast()),
        idxDonationsPaymentIntent: (0, pg_core_1.index)("idx_donations_payment_intent").using("btree", table.paymentIntentId.asc().nullsLast()),
        idxDonationsStatus: (0, pg_core_1.index)("idx_donations_status").using("btree", table.status.asc().nullsLast()),
        idxDonationsTenant: (0, pg_core_1.index)("idx_donations_tenant").using("btree", table.tenantId.asc().nullsLast()),
        publicDonationsStrikeFundIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.strikeFundId],
            foreignColumns: [exports.strikeFunds.id],
            name: "public_donations_strike_fund_id_fkey"
        }).onDelete("cascade"),
        publicDonationsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "public_donations_tenant_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.hardshipApplications = (0, pg_core_1.pgTable)("hardship_applications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    applicationDate: (0, pg_core_1.date)("application_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    hardshipType: (0, pg_core_1.varchar)("hardship_type", { length: 50 }).notNull(),
    amountRequested: (0, pg_core_1.numeric)("amount_requested", { precision: 10, scale: 2 }).notNull(),
    amountApproved: (0, pg_core_1.numeric)("amount_approved", { precision: 10, scale: 2 }),
    description: (0, pg_core_1.text)("description").notNull(),
    supportingDocuments: (0, pg_core_1.jsonb)("supporting_documents").default([]),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('submitted').notNull(),
    reviewedBy: (0, pg_core_1.text)("reviewed_by"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at", { withTimezone: true, mode: 'string' }),
    reviewNotes: (0, pg_core_1.text)("review_notes"),
    paidDate: (0, pg_core_1.timestamp)("paid_date", { withTimezone: true, mode: 'string' }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxHardshipFund: (0, pg_core_1.index)("idx_hardship_fund").using("btree", table.strikeFundId.asc().nullsLast()),
        idxHardshipMember: (0, pg_core_1.index)("idx_hardship_member").using("btree", table.memberId.asc().nullsLast()),
        idxHardshipStatus: (0, pg_core_1.index)("idx_hardship_status").using("btree", table.status.asc().nullsLast()),
        idxHardshipTenant: (0, pg_core_1.index)("idx_hardship_tenant").using("btree", table.tenantId.asc().nullsLast()),
        hardshipApplicationsStrikeFundIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.strikeFundId],
            foreignColumns: [exports.strikeFunds.id],
            name: "hardship_applications_strike_fund_id_fkey"
        }).onDelete("cascade"),
        hardshipApplicationsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "hardship_applications_tenant_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.arrearsCases = (0, pg_core_1.pgTable)("arrears_cases", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    caseNumber: (0, pg_core_1.varchar)("case_number", { length: 100 }),
    totalOwed: (0, pg_core_1.numeric)("total_owed", { precision: 10, scale: 2 }).notNull(),
    oldestDebtDate: (0, pg_core_1.date)("oldest_debt_date"),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('open').notNull(),
    paymentPlanId: (0, pg_core_1.uuid)("payment_plan_id"),
    paymentPlanAmount: (0, pg_core_1.numeric)("payment_plan_amount", { precision: 10, scale: 2 }),
    paymentPlanFrequency: (0, pg_core_1.varchar)("payment_plan_frequency", { length: 20 }),
    lastContactDate: (0, pg_core_1.timestamp)("last_contact_date", { withTimezone: true, mode: 'string' }),
    lastContactMethod: (0, pg_core_1.varchar)("last_contact_method", { length: 50 }),
    nextFollowupDate: (0, pg_core_1.date)("next_followup_date"),
    escalationLevel: (0, pg_core_1.integer)("escalation_level").default(0),
    escalationHistory: (0, pg_core_1.jsonb)("escalation_history").default([]),
    resolutionDate: (0, pg_core_1.timestamp)("resolution_date", { withTimezone: true, mode: 'string' }),
    resolutionType: (0, pg_core_1.varchar)("resolution_type", { length: 50 }),
    resolutionNotes: (0, pg_core_1.text)("resolution_notes"),
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    transactionIds: (0, pg_core_1.uuid)("transaction_ids").array().default([""]),
    remainingBalance: (0, pg_core_1.numeric)("remaining_balance", { precision: 10, scale: 2 }),
    daysOverdue: (0, pg_core_1.integer)("days_overdue"),
    contactHistory: (0, pg_core_1.jsonb)("contact_history").default([]),
    paymentSchedule: (0, pg_core_1.jsonb)("payment_schedule").default([]),
    paymentPlanActive: (0, pg_core_1.boolean)("payment_plan_active").default(false),
    paymentPlanStartDate: (0, pg_core_1.date)("payment_plan_start_date"),
    installmentAmount: (0, pg_core_1.numeric)("installment_amount", { precision: 10, scale: 2 }),
    numberOfInstallments: (0, pg_core_1.integer)("number_of_installments"),
    createdBy: (0, pg_core_1.text)("created_by"),
    updatedBy: (0, pg_core_1.text)("updated_by"),
}, (table) => {
    return {
        idxArrearsFollowup: (0, pg_core_1.index)("idx_arrears_followup").using("btree", table.nextFollowupDate.asc().nullsLast()).where((0, drizzle_orm_1.sql) `((status)::text = 'open'::text)`),
        idxArrearsMember: (0, pg_core_1.index)("idx_arrears_member").using("btree", table.memberId.asc().nullsLast()),
        idxArrearsStatus: (0, pg_core_1.index)("idx_arrears_status").using("btree", table.tenantId.asc().nullsLast(), table.status.asc().nullsLast()),
        idxArrearsTenant: (0, pg_core_1.index)("idx_arrears_tenant").using("btree", table.tenantId.asc().nullsLast()),
        idxArrearsTransactionIds: (0, pg_core_1.index)("idx_arrears_transaction_ids").using("gin", table.transactionIds.asc().nullsLast()),
        arrearsCasesTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "arrears_cases_tenant_id_fkey"
        }).onDelete("cascade"),
        arrearsCasesCaseNumberKey: (0, pg_core_1.unique)("arrears_cases_case_number_key").on(table.caseNumber),
    };
});
exports.notificationQueue = (0, pg_core_1.pgTable)("notification_queue", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    channels: (0, pg_core_1.text)("channels").array().notNull(),
    priority: (0, pg_core_1.text)("priority").default('normal').notNull(),
    data: (0, pg_core_1.text)("data").notNull(),
    status: (0, pg_core_1.text)("status").default('pending').notNull(),
    scheduledFor: (0, pg_core_1.timestamp)("scheduled_for", { withTimezone: true, mode: 'string' }).notNull(),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { withTimezone: true, mode: 'string' }),
    attempts: (0, pg_core_1.numeric)("attempts", { precision: 2, scale: 0 }).default('0').notNull(),
    lastAttemptAt: (0, pg_core_1.timestamp)("last_attempt_at", { withTimezone: true, mode: 'string' }),
    error: (0, pg_core_1.text)("error"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        scheduledIdx: (0, pg_core_1.index)("notification_queue_scheduled_idx").using("btree", table.scheduledFor.asc().nullsLast()),
        statusIdx: (0, pg_core_1.index)("notification_queue_status_idx").using("btree", table.status.asc().nullsLast()),
        tenantIdx: (0, pg_core_1.index)("notification_queue_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
        userIdx: (0, pg_core_1.index)("notification_queue_user_idx").using("btree", table.userId.asc().nullsLast()),
    };
});
exports.notificationTemplates = (0, pg_core_1.pgTable)("notification_templates", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    channel: (0, pg_core_1.text)("channel").notNull(),
    subject: (0, pg_core_1.text)("subject"),
    body: (0, pg_core_1.text)("body").notNull(),
    variables: (0, pg_core_1.text)("variables").default('[]').notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        uniqueIdx: (0, pg_core_1.uniqueIndex)("notification_templates_unique_idx").using("btree", table.tenantId.asc().nullsLast(), table.type.asc().nullsLast(), table.channel.asc().nullsLast()),
    };
});
exports.notificationLog = (0, pg_core_1.pgTable)("notification_log", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    notificationId: (0, pg_core_1.uuid)("notification_id").notNull(),
    channel: (0, pg_core_1.text)("channel").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    error: (0, pg_core_1.text)("error"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        notificationIdx: (0, pg_core_1.index)("notification_log_notification_idx").using("btree", table.notificationId.asc().nullsLast()),
        statusIdx: (0, pg_core_1.index)("notification_log_status_idx").using("btree", table.status.asc().nullsLast()),
    };
});
exports.userNotificationPreferences = (0, pg_core_1.pgTable)("user_notification_preferences", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    preferences: (0, pg_core_1.text)("preferences").default('{}').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        uniqueIdx: (0, pg_core_1.uniqueIndex)("user_notification_preferences_unique_idx").using("btree", table.tenantId.asc().nullsLast(), table.userId.asc().nullsLast()),
    };
});
exports.donations = (0, pg_core_1.pgTable)("donations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    amount: (0, pg_core_1.numeric)("amount", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('usd'),
    donorName: (0, pg_core_1.text)("donor_name"),
    donorEmail: (0, pg_core_1.text)("donor_email"),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(false),
    message: (0, pg_core_1.text)("message"),
    status: (0, pg_core_1.text)("status").default('pending').notNull(),
    stripePaymentIntentId: (0, pg_core_1.text)("stripe_payment_intent_id"),
    paymentMethod: (0, pg_core_1.text)("payment_method"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        fundIdx: (0, pg_core_1.index)("donations_fund_idx").using("btree", table.strikeFundId.asc().nullsLast()),
        statusIdx: (0, pg_core_1.index)("donations_status_idx").using("btree", table.status.asc().nullsLast()),
        stripeIdx: (0, pg_core_1.index)("donations_stripe_idx").using("btree", table.stripePaymentIntentId.asc().nullsLast()),
        tenantIdx: (0, pg_core_1.index)("donations_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.picketTracking = (0, pg_core_1.pgTable)("picket_tracking", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    strikeFundId: (0, pg_core_1.uuid)("strike_fund_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    checkInTime: (0, pg_core_1.timestamp)("check_in_time", { withTimezone: true, mode: 'string' }).notNull(),
    checkOutTime: (0, pg_core_1.timestamp)("check_out_time", { withTimezone: true, mode: 'string' }),
    checkInLatitude: (0, pg_core_1.numeric)("check_in_latitude", { precision: 10, scale: 8 }),
    checkInLongitude: (0, pg_core_1.numeric)("check_in_longitude", { precision: 11, scale: 8 }),
    checkOutLatitude: (0, pg_core_1.numeric)("check_out_latitude", { precision: 10, scale: 8 }),
    checkOutLongitude: (0, pg_core_1.numeric)("check_out_longitude", { precision: 11, scale: 8 }),
    locationVerified: (0, pg_core_1.boolean)("location_verified").default(false),
    checkInMethod: (0, pg_core_1.text)("check_in_method"),
    nfcTagUid: (0, pg_core_1.text)("nfc_tag_uid"),
    qrCodeData: (0, pg_core_1.text)("qr_code_data"),
    deviceId: (0, pg_core_1.text)("device_id"),
    durationMinutes: (0, pg_core_1.integer)("duration_minutes"),
    hoursWorked: (0, pg_core_1.numeric)("hours_worked", { precision: 4, scale: 2 }),
    coordinatorOverride: (0, pg_core_1.boolean)("coordinator_override").default(false),
    overrideReason: (0, pg_core_1.text)("override_reason"),
    verifiedBy: (0, pg_core_1.text)("verified_by"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        dateIdx: (0, pg_core_1.index)("picket_tracking_date_idx").using("btree", table.checkInTime.asc().nullsLast()),
        fundIdx: (0, pg_core_1.index)("picket_tracking_fund_idx").using("btree", table.strikeFundId.asc().nullsLast()),
        memberIdx: (0, pg_core_1.index)("picket_tracking_member_idx").using("btree", table.memberId.asc().nullsLast()),
        tenantIdx: (0, pg_core_1.index)("picket_tracking_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.jurisdictionTemplates = (0, pg_core_1.pgTable)("jurisdiction_templates", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    jurisdiction: (0, exports.caJurisdiction)("jurisdiction").notNull(),
    templateType: (0, pg_core_1.text)("template_type").notNull(),
    templateName: (0, pg_core_1.text)("template_name").notNull(),
    templateContent: (0, pg_core_1.text)("template_content").notNull(),
    requiredFields: (0, pg_core_1.text)("required_fields").array().default([""]).notNull(),
    optionalFields: (0, pg_core_1.text)("optional_fields").array().default([""]).notNull(),
    legalReference: (0, pg_core_1.text)("legal_reference"),
    formNumber: (0, pg_core_1.text)("form_number"),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    active: (0, pg_core_1.boolean)("active").default(true).notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxJurisdictionTemplatesActive: (0, pg_core_1.index)("idx_jurisdiction_templates_active").using("btree", table.jurisdiction.asc().nullsLast(), table.templateType.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(active = true)`),
        idxJurisdictionTemplatesJurisdiction: (0, pg_core_1.index)("idx_jurisdiction_templates_jurisdiction").using("btree", table.jurisdiction.asc().nullsLast()),
        idxJurisdictionTemplatesMetadata: (0, pg_core_1.index)("idx_jurisdiction_templates_metadata").using("gin", table.metadata.asc().nullsLast()),
        idxJurisdictionTemplatesType: (0, pg_core_1.index)("idx_jurisdiction_templates_type").using("btree", table.templateType.asc().nullsLast()),
        uniqueJurisdictionTemplate: (0, pg_core_1.unique)("unique_jurisdiction_template").on(table.jurisdiction, table.templateType, table.version),
    };
});
exports.jurisdictionRulesSummary = (0, pg_core_1.pgTable)("jurisdiction_rules_summary", {
    jurisdiction: (0, exports.caJurisdiction)("jurisdiction"),
    ruleType: (0, exports.jurisdictionRuleType)("rule_type"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    ruleCount: (0, pg_core_1.bigint)("rule_count", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    categoryCount: (0, pg_core_1.bigint)("category_count", { mode: "number" }),
    earliestEffective: (0, pg_core_1.date)("earliest_effective"),
    latestEffective: (0, pg_core_1.date)("latest_effective"),
});
exports.arrears = (0, pg_core_1.pgTable)("arrears", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    totalOwed: (0, pg_core_1.numeric)("total_owed", { precision: 10, scale: 2 }).default('0.00').notNull(),
    oldestDebtDate: (0, pg_core_1.date)("oldest_debt_date"),
    monthsOverdue: (0, pg_core_1.integer)("months_overdue").default(0),
    arrearsStatus: (0, pg_core_1.text)("arrears_status").default('active').notNull(),
    paymentPlanActive: (0, pg_core_1.boolean)("payment_plan_active").default(false),
    paymentPlanAmount: (0, pg_core_1.numeric)("payment_plan_amount", { precision: 10, scale: 2 }),
    paymentPlanFrequency: (0, pg_core_1.text)("payment_plan_frequency"),
    paymentPlanStartDate: (0, pg_core_1.date)("payment_plan_start_date"),
    paymentPlanEndDate: (0, pg_core_1.date)("payment_plan_end_date"),
    suspensionEffectiveDate: (0, pg_core_1.date)("suspension_effective_date"),
    suspensionReason: (0, pg_core_1.text)("suspension_reason"),
    collectionAgency: (0, pg_core_1.text)("collection_agency"),
    legalActionDate: (0, pg_core_1.date)("legal_action_date"),
    legalReference: (0, pg_core_1.text)("legal_reference"),
    notes: (0, pg_core_1.text)("notes"),
    lastContactDate: (0, pg_core_1.date)("last_contact_date"),
    nextFollowUpDate: (0, pg_core_1.date)("next_follow_up_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        memberIdx: (0, pg_core_1.index)("arrears_member_idx").using("btree", table.memberId.asc().nullsLast()),
        statusIdx: (0, pg_core_1.index)("arrears_status_idx").using("btree", table.arrearsStatus.asc().nullsLast()),
        tenantIdx: (0, pg_core_1.index)("arrears_tenant_idx").using("btree", table.tenantId.asc().nullsLast()),
        uniqueMemberArrears: (0, pg_core_1.unique)("unique_member_arrears").on(table.tenantId, table.memberId),
    };
});
exports.clauseComparisonsHistory = (0, pg_core_1.pgTable)("clause_comparisons_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    clauseIds: (0, pg_core_1.uuid)("clause_ids").array().notNull(),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
}, (table) => {
    return {
        idxClauseComparisonsCreated: (0, pg_core_1.index)("idx_clause_comparisons_created").using("btree", table.createdAt.asc().nullsLast()),
        idxClauseComparisonsOrg: (0, pg_core_1.index)("idx_clause_comparisons_org").using("btree", table.organizationId.asc().nullsLast()),
        idxClauseComparisonsUser: (0, pg_core_1.index)("idx_clause_comparisons_user").using("btree", table.userId.asc().nullsLast()),
        clauseComparisonsHistoryOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "clause_comparisons_history_organization_id_fkey"
        }),
    };
});
exports.arbitrationPrecedents = (0, pg_core_1.pgTable)("arbitration_precedents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sourceOrganizationId: (0, pg_core_1.uuid)("source_organization_id").notNull(),
    sourceDecisionId: (0, pg_core_1.uuid)("source_decision_id"),
    caseNumber: (0, pg_core_1.varchar)("case_number", { length: 100 }),
    caseTitle: (0, pg_core_1.varchar)("case_title", { length: 500 }).notNull(),
    decisionDate: (0, pg_core_1.date)("decision_date").notNull(),
    isPartiesAnonymized: (0, pg_core_1.boolean)("is_parties_anonymized").default(false),
    unionName: (0, pg_core_1.varchar)("union_name", { length: 200 }),
    employerName: (0, pg_core_1.varchar)("employer_name", { length: 200 }),
    arbitratorName: (0, pg_core_1.varchar)("arbitrator_name", { length: 200 }).notNull(),
    tribunal: (0, pg_core_1.varchar)("tribunal", { length: 200 }),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 50 }).notNull(),
    grievanceType: (0, pg_core_1.varchar)("grievance_type", { length: 100 }).notNull(),
    issueSummary: (0, pg_core_1.text)("issue_summary").notNull(),
    unionPosition: (0, pg_core_1.text)("union_position"),
    employerPosition: (0, pg_core_1.text)("employer_position"),
    outcome: (0, pg_core_1.varchar)("outcome", { length: 50 }).notNull(),
    decisionSummary: (0, pg_core_1.text)("decision_summary").notNull(),
    reasoning: (0, pg_core_1.text)("reasoning"),
    precedentialValue: (0, pg_core_1.varchar)("precedential_value", { length: 20 }).default('medium'),
    keyPrinciples: (0, pg_core_1.text)("key_principles").array(),
    relatedLegislation: (0, pg_core_1.text)("related_legislation"),
    documentUrl: (0, pg_core_1.varchar)("document_url", { length: 500 }),
    documentPath: (0, pg_core_1.varchar)("document_path", { length: 500 }),
    sharingLevel: (0, pg_core_1.varchar)("sharing_level", { length: 50 }).default('private').notNull(),
    sharedWithOrgIds: (0, pg_core_1.uuid)("shared_with_org_ids").array(),
    sector: (0, pg_core_1.varchar)("sector", { length: 100 }),
    province: (0, pg_core_1.varchar)("province", { length: 2 }),
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    citationCount: (0, pg_core_1.integer)("citation_count").default(0),
    downloadCount: (0, pg_core_1.integer)("download_count").default(0),
    hasRedactedVersion: (0, pg_core_1.boolean)("has_redacted_version").default(false),
    redactedDocumentUrl: (0, pg_core_1.varchar)("redacted_document_url", { length: 500 }),
    redactedDocumentPath: (0, pg_core_1.varchar)("redacted_document_path", { length: 500 }),
    citedCases: (0, pg_core_1.uuid)("cited_cases").array(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxPrecedentsDate: (0, pg_core_1.index)("idx_precedents_date").using("btree", table.decisionDate.asc().nullsLast()),
        idxPrecedentsJurisdiction: (0, pg_core_1.index)("idx_precedents_jurisdiction").using("btree", table.jurisdiction.asc().nullsLast()),
        idxPrecedentsOrg: (0, pg_core_1.index)("idx_precedents_org").using("btree", table.sourceOrganizationId.asc().nullsLast()),
        idxPrecedentsOutcome: (0, pg_core_1.index)("idx_precedents_outcome").using("btree", table.outcome.asc().nullsLast()),
        idxPrecedentsProvince: (0, pg_core_1.index)("idx_precedents_province").using("btree", table.province.asc().nullsLast()),
        idxPrecedentsSector: (0, pg_core_1.index)("idx_precedents_sector").using("btree", table.sector.asc().nullsLast()),
        idxPrecedentsSharing: (0, pg_core_1.index)("idx_precedents_sharing").using("btree", table.sharingLevel.asc().nullsLast()),
        idxPrecedentsType: (0, pg_core_1.index)("idx_precedents_type").using("btree", table.grievanceType.asc().nullsLast()),
    };
});
exports.sharedClauseLibrary = (0, pg_core_1.pgTable)("shared_clause_library", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sourceOrganizationId: (0, pg_core_1.uuid)("source_organization_id").notNull(),
    sourceCbaId: (0, pg_core_1.uuid)("source_cba_id"),
    originalClauseId: (0, pg_core_1.uuid)("original_clause_id"),
    clauseNumber: (0, pg_core_1.varchar)("clause_number", { length: 50 }),
    clauseTitle: (0, pg_core_1.varchar)("clause_title", { length: 500 }).notNull(),
    clauseText: (0, pg_core_1.text)("clause_text").notNull(),
    clauseType: (0, pg_core_1.varchar)("clause_type", { length: 100 }).notNull(),
    isAnonymized: (0, pg_core_1.boolean)("is_anonymized").default(false),
    originalEmployerName: (0, pg_core_1.varchar)("original_employer_name", { length: 200 }),
    anonymizedEmployerName: (0, pg_core_1.varchar)("anonymized_employer_name", { length: 200 }),
    sharingLevel: (0, pg_core_1.varchar)("sharing_level", { length: 50 }).default('private').notNull(),
    sharedWithOrgIds: (0, pg_core_1.uuid)("shared_with_org_ids").array(),
    effectiveDate: (0, pg_core_1.date)("effective_date"),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    sector: (0, pg_core_1.varchar)("sector", { length: 100 }),
    province: (0, pg_core_1.varchar)("province", { length: 2 }),
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    citationCount: (0, pg_core_1.integer)("citation_count").default(0),
    comparisonCount: (0, pg_core_1.integer)("comparison_count").default(0),
    version: (0, pg_core_1.integer)("version").default(1),
    previousVersionId: (0, pg_core_1.uuid)("previous_version_id"),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxSharedClausesOrg: (0, pg_core_1.index)("idx_shared_clauses_org").using("btree", table.sourceOrganizationId.asc().nullsLast()),
        idxSharedClausesProvince: (0, pg_core_1.index)("idx_shared_clauses_province").using("btree", table.province.asc().nullsLast()),
        idxSharedClausesSector: (0, pg_core_1.index)("idx_shared_clauses_sector").using("btree", table.sector.asc().nullsLast()),
        idxSharedClausesSharing: (0, pg_core_1.index)("idx_shared_clauses_sharing").using("btree", table.sharingLevel.asc().nullsLast()),
        idxSharedClausesType: (0, pg_core_1.index)("idx_shared_clauses_type").using("btree", table.clauseType.asc().nullsLast()),
        sharedClauseLibraryPreviousVersionIdSharedClauseLibrary: (0, pg_core_1.foreignKey)({
            columns: [table.previousVersionId],
            foreignColumns: [table.id],
            name: "shared_clause_library_previous_version_id_shared_clause_library"
        }),
    };
});
exports.precedentTags = (0, pg_core_1.pgTable)("precedent_tags", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    precedentId: (0, pg_core_1.uuid)("precedent_id").notNull(),
    tagName: (0, pg_core_1.varchar)("tag_name", { length: 50 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxPrecedentTagsPrecedent: (0, pg_core_1.index)("idx_precedent_tags_precedent").using("btree", table.precedentId.asc().nullsLast()),
        idxPrecedentTagsTag: (0, pg_core_1.index)("idx_precedent_tags_tag").using("btree", table.tagName.asc().nullsLast()),
        precedentTagsPrecedentIdArbitrationPrecedentsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.precedentId],
            foreignColumns: [exports.arbitrationPrecedents.id],
            name: "precedent_tags_precedent_id_arbitration_precedents_id_fk"
        }).onDelete("cascade"),
    };
});
exports.precedentCitations = (0, pg_core_1.pgTable)("precedent_citations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    precedentId: (0, pg_core_1.uuid)("precedent_id").notNull(),
    citedByPrecedentId: (0, pg_core_1.uuid)("cited_by_precedent_id"),
    citingClaimId: (0, pg_core_1.uuid)("citing_claim_id"),
    citationContext: (0, pg_core_1.text)("citation_context"),
    citationWeight: (0, pg_core_1.varchar)("citation_weight", { length: 20 }).default('supporting'),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxPrecedentCitationsCitedBy: (0, pg_core_1.index)("idx_precedent_citations_cited_by").using("btree", table.citedByPrecedentId.asc().nullsLast()),
        idxPrecedentCitationsClaim: (0, pg_core_1.index)("idx_precedent_citations_claim").using("btree", table.citingClaimId.asc().nullsLast()),
        idxPrecedentCitationsPrecedent: (0, pg_core_1.index)("idx_precedent_citations_precedent").using("btree", table.precedentId.asc().nullsLast()),
        precedentCitationsCitedByPrecedentIdArbitrationPrecedent: (0, pg_core_1.foreignKey)({
            columns: [table.citedByPrecedentId],
            foreignColumns: [exports.arbitrationPrecedents.id],
            name: "precedent_citations_cited_by_precedent_id_arbitration_precedent"
        }).onDelete("cascade"),
        precedentCitationsPrecedentIdArbitrationPrecedentsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.precedentId],
            foreignColumns: [exports.arbitrationPrecedents.id],
            name: "precedent_citations_precedent_id_arbitration_precedents_id_fk"
        }).onDelete("cascade"),
    };
});
exports.organizationSharingSettings = (0, pg_core_1.pgTable)("organization_sharing_settings", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    allowFederationSharing: (0, pg_core_1.boolean)("allow_federation_sharing").default(false),
    allowSectorSharing: (0, pg_core_1.boolean)("allow_sector_sharing").default(false),
    allowProvinceSharing: (0, pg_core_1.boolean)("allow_province_sharing").default(false),
    allowCongressSharing: (0, pg_core_1.boolean)("allow_congress_sharing").default(false),
    autoShareClauses: (0, pg_core_1.boolean)("auto_share_clauses").default(false),
    autoSharePrecedents: (0, pg_core_1.boolean)("auto_share_precedents").default(false),
    requireAnonymization: (0, pg_core_1.boolean)("require_anonymization").default(true),
    defaultSharingLevel: (0, pg_core_1.varchar)("default_sharing_level", { length: 50 }).default('private'),
    allowedSharingLevels: (0, pg_core_1.varchar)("allowed_sharing_levels", { length: 50 }).array(),
    sharingApprovalRequired: (0, pg_core_1.boolean)("sharing_approval_required").default(true),
    sharingApproverRole: (0, pg_core_1.varchar)("sharing_approver_role", { length: 50 }).default('admin'),
    maxSharedClauses: (0, pg_core_1.integer)("max_shared_clauses"),
    maxSharedPrecedents: (0, pg_core_1.integer)("max_shared_precedents"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxSharingSettingsOrg: (0, pg_core_1.index)("idx_sharing_settings_org").using("btree", table.organizationId.asc().nullsLast()),
        organizationSharingSettingsOrganizationIdKey: (0, pg_core_1.unique)("organization_sharing_settings_organization_id_key").on(table.organizationId),
    };
});
exports.organizationSharingGrants = (0, pg_core_1.pgTable)("organization_sharing_grants", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    granterOrgId: (0, pg_core_1.uuid)("granter_org_id").notNull(),
    granteeOrgId: (0, pg_core_1.uuid)("grantee_org_id").notNull(),
    resourceType: (0, pg_core_1.varchar)("resource_type", { length: 50 }).notNull(),
    resourceId: (0, pg_core_1.uuid)("resource_id").notNull(),
    accessLevel: (0, pg_core_1.varchar)("access_level", { length: 50 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true, mode: 'string' }),
    canReshare: (0, pg_core_1.boolean)("can_reshare").default(false),
    grantedBy: (0, pg_core_1.uuid)("granted_by").notNull(),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at", { withTimezone: true, mode: 'string' }),
    revokedBy: (0, pg_core_1.uuid)("revoked_by"),
    accessCount: (0, pg_core_1.integer)("access_count").default(0),
    lastAccessedAt: (0, pg_core_1.timestamp)("last_accessed_at", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxSharingGrantsExpires: (0, pg_core_1.index)("idx_sharing_grants_expires").using("btree", table.expiresAt.asc().nullsLast()),
        idxSharingGrantsGrantee: (0, pg_core_1.index)("idx_sharing_grants_grantee").using("btree", table.granteeOrgId.asc().nullsLast()),
        idxSharingGrantsGranter: (0, pg_core_1.index)("idx_sharing_grants_granter").using("btree", table.granterOrgId.asc().nullsLast()),
        idxSharingGrantsResource: (0, pg_core_1.index)("idx_sharing_grants_resource").using("btree", table.resourceType.asc().nullsLast(), table.resourceId.asc().nullsLast()),
    };
});
exports.crossOrgAccessLog = (0, pg_core_1.pgTable)("cross_org_access_log", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    userOrganizationId: (0, pg_core_1.uuid)("user_organization_id").notNull(),
    resourceType: (0, pg_core_1.varchar)("resource_type", { length: 50 }).notNull(),
    resourceId: (0, pg_core_1.uuid)("resource_id").notNull(),
    resourceOrganizationId: (0, pg_core_1.uuid)("resource_organization_id").notNull(),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 50 }).notNull(),
    accessGrantedVia: (0, pg_core_1.varchar)("access_granted_via", { length: 50 }),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxAccessLogCreated: (0, pg_core_1.index)("idx_access_log_created").using("btree", table.createdAt.asc().nullsLast()),
        idxAccessLogResource: (0, pg_core_1.index)("idx_access_log_resource").using("btree", table.resourceType.asc().nullsLast(), table.resourceId.asc().nullsLast()),
        idxAccessLogResourceOrg: (0, pg_core_1.index)("idx_access_log_resource_org").using("btree", table.resourceOrganizationId.asc().nullsLast()),
        idxAccessLogUser: (0, pg_core_1.index)("idx_access_log_user").using("btree", table.userId.asc().nullsLast()),
        idxAccessLogUserOrg: (0, pg_core_1.index)("idx_access_log_user_org").using("btree", table.userOrganizationId.asc().nullsLast()),
    };
});
exports.organizationRelationships = (0, pg_core_1.pgTable)("organization_relationships", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    parentOrgId: (0, pg_core_1.uuid)("parent_org_id").notNull(),
    childOrgId: (0, pg_core_1.uuid)("child_org_id").notNull(),
    relationshipType: (0, pg_core_1.text)("relationship_type").notNull(),
    effectiveDate: (0, pg_core_1.date)("effective_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    endDate: (0, pg_core_1.date)("end_date"),
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxOrgRelationshipsActive: (0, pg_core_1.index)("idx_org_relationships_active").using("btree", table.effectiveDate.asc().nullsLast(), table.endDate.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(end_date IS NULL)`),
        idxOrgRelationshipsChild: (0, pg_core_1.index)("idx_org_relationships_child").using("btree", table.childOrgId.asc().nullsLast()),
        idxOrgRelationshipsParent: (0, pg_core_1.index)("idx_org_relationships_parent").using("btree", table.parentOrgId.asc().nullsLast()),
        idxOrgRelationshipsType: (0, pg_core_1.index)("idx_org_relationships_type").using("btree", table.relationshipType.asc().nullsLast()),
        organizationRelationshipsChildOrgIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.childOrgId],
            foreignColumns: [exports.organizations.id],
            name: "organization_relationships_child_org_id_fkey"
        }).onDelete("cascade"),
        organizationRelationshipsParentOrgIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.parentOrgId],
            foreignColumns: [exports.organizations.id],
            name: "organization_relationships_parent_org_id_fkey"
        }).onDelete("cascade"),
        organizationRelationshipsParentOrgIdChildOrgIdRelatKey: (0, pg_core_1.unique)("organization_relationships_parent_org_id_child_org_id_relat_key").on(table.parentOrgId, table.childOrgId, table.relationshipType, table.effectiveDate),
    };
});
exports.tenantManagementView = (0, pg_core_1.pgTable)("tenant_management_view", {
    tenantId: (0, pg_core_1.uuid)("tenant_id"),
    tenantSlug: (0, pg_core_1.text)("tenant_slug"),
    tenantName: (0, pg_core_1.text)("tenant_name"),
    tenantDisplayName: (0, pg_core_1.text)("tenant_display_name"),
    tenantStatus: (0, pg_core_1.text)("tenant_status"),
    tenantSettings: (0, pg_core_1.jsonb)("tenant_settings"),
    tenantCreatedAt: (0, pg_core_1.timestamp)("tenant_created_at", { withTimezone: true, mode: 'string' }),
    tenantUpdatedAt: (0, pg_core_1.timestamp)("tenant_updated_at", { withTimezone: true, mode: 'string' }),
});
exports.organizationTree = (0, pg_core_1.pgTable)("organization_tree", {
    id: (0, pg_core_1.uuid)("id"),
    parentId: (0, pg_core_1.uuid)("parent_id"),
    name: (0, pg_core_1.text)("name"),
    slug: (0, pg_core_1.text)("slug"),
    organizationType: (0, exports.organizationType)("organization_type"),
    hierarchyLevel: (0, pg_core_1.integer)("hierarchy_level"),
    hierarchyPath: (0, pg_core_1.text)("hierarchy_path"),
    displayPath: (0, pg_core_1.text)("display_path"),
    fullPath: (0, pg_core_1.text)("full_path"),
});
exports.attestationTemplates = (0, pg_core_1.pgTable)("attestation_templates", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    templateName: (0, pg_core_1.varchar)("template_name", { length: 200 }).notNull(),
    templateType: (0, pg_core_1.varchar)("template_type", { length: 100 }).notNull(),
    signatureType: (0, exports.signatureType)("signature_type").notNull(),
    attestationText: (0, pg_core_1.text)("attestation_text").notNull(),
    legalDisclaimer: (0, pg_core_1.text)("legal_disclaimer"),
    jurisdictions: (0, pg_core_1.jsonb)("jurisdictions"),
    clcRequired: (0, pg_core_1.boolean)("clc_required").default(false),
    soxCompliance: (0, pg_core_1.boolean)("sox_compliance").default(false),
    version: (0, pg_core_1.integer)("version").default(1),
    effectiveDate: (0, pg_core_1.date)("effective_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
});
exports.clauseLibraryTags = (0, pg_core_1.pgTable)("clause_library_tags", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    clauseId: (0, pg_core_1.uuid)("clause_id").notNull(),
    tagName: (0, pg_core_1.varchar)("tag_name", { length: 50 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").defaultRandom().notNull(),
}, (table) => {
    return {
        idxClauseTagsClause: (0, pg_core_1.index)("idx_clause_tags_clause").using("btree", table.clauseId.asc().nullsLast()),
        idxClauseTagsTag: (0, pg_core_1.index)("idx_clause_tags_tag").using("btree", table.tagName.asc().nullsLast()),
        clauseLibraryTagsClauseIdSharedClauseLibraryIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.clauseId],
            foreignColumns: [exports.sharedClauseLibrary.id],
            name: "clause_library_tags_clause_id_shared_clause_library_id_fk"
        }).onDelete("cascade"),
    };
});
exports.userUuidMapping = (0, pg_core_1.pgTable)("user_uuid_mapping", {
    userUuid: (0, pg_core_1.uuid)("user_uuid").defaultRandom().primaryKey().notNull(),
    clerkUserId: (0, pg_core_1.text)("clerk_user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxUserUuidMappingClerkId: (0, pg_core_1.index)("idx_user_uuid_mapping_clerk_id").using("btree", table.clerkUserId.asc().nullsLast()),
        userUuidMappingClerkUserIdKey: (0, pg_core_1.unique)("user_uuid_mapping_clerk_user_id_key").on(table.clerkUserId),
    };
});
exports.votingSessions = (0, pg_core_1.pgTable)("voting_sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('draft').notNull(),
    meetingType: (0, pg_core_1.varchar)("meeting_type", { length: 50 }).notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    startTime: (0, pg_core_1.timestamp)("start_time", { withTimezone: true, mode: 'string' }),
    endTime: (0, pg_core_1.timestamp)("end_time", { withTimezone: true, mode: 'string' }),
    scheduledEndTime: (0, pg_core_1.timestamp)("scheduled_end_time", { withTimezone: true, mode: 'string' }),
    allowAnonymous: (0, pg_core_1.boolean)("allow_anonymous").default(true),
    requiresQuorum: (0, pg_core_1.boolean)("requires_quorum").default(true),
    quorumThreshold: (0, pg_core_1.integer)("quorum_threshold").default(50),
    totalEligibleVoters: (0, pg_core_1.integer)("total_eligible_voters").default(0),
    settings: (0, pg_core_1.jsonb)("settings").default({}),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    encryptionEnabled: (0, pg_core_1.boolean)("encryption_enabled").default(false),
    encryptionAlgorithm: (0, pg_core_1.varchar)("encryption_algorithm", { length: 50 }).default('AES-256-GCM'),
    publicKey: (0, pg_core_1.text)("public_key"),
    keyFingerprint: (0, pg_core_1.varchar)("key_fingerprint", { length: 128 }),
    escrowKeyShares: (0, pg_core_1.jsonb)("escrow_key_shares"),
    auditHash: (0, pg_core_1.varchar)("audit_hash", { length: 128 }),
    blockchainAnchorTx: (0, pg_core_1.varchar)("blockchain_anchor_tx", { length: 200 }),
    blockchainNetwork: (0, pg_core_1.varchar)("blockchain_network", { length: 50 }),
    thirdPartyAuditorId: (0, pg_core_1.uuid)("third_party_auditor_id"),
}, (table) => {
    return {
        idxVotingSessionsAuditHash: (0, pg_core_1.index)("idx_voting_sessions_audit_hash").using("btree", table.auditHash.asc().nullsLast()),
        idxVotingSessionsBlockchainTx: (0, pg_core_1.index)("idx_voting_sessions_blockchain_tx").using("btree", table.blockchainAnchorTx.asc().nullsLast()),
    };
});
exports.votes = (0, pg_core_1.pgTable)("votes", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull(),
    optionId: (0, pg_core_1.uuid)("option_id").notNull(),
    voterId: (0, pg_core_1.varchar)("voter_id", { length: 100 }).notNull(),
    voterHash: (0, pg_core_1.varchar)("voter_hash", { length: 100 }),
    castAt: (0, pg_core_1.timestamp)("cast_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(true),
    voterType: (0, pg_core_1.varchar)("voter_type", { length: 20 }).default('member'),
    voterMetadata: (0, pg_core_1.jsonb)("voter_metadata").default({}),
    encryptedBallot: (0, pg_core_1.text)("encrypted_ballot"),
    encryptionIv: (0, pg_core_1.varchar)("encryption_iv", { length: 64 }),
    encryptionTag: (0, pg_core_1.varchar)("encryption_tag", { length: 64 }),
    ballotHash: (0, pg_core_1.varchar)("ballot_hash", { length: 128 }),
    voteSequence: (0, pg_core_1.integer)("vote_sequence"),
    merkleProof: (0, pg_core_1.jsonb)("merkle_proof"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxVotesBallotHash: (0, pg_core_1.index)("idx_votes_ballot_hash").using("btree", table.ballotHash.asc().nullsLast()),
        idxVotesCreatedAt: (0, pg_core_1.index)("idx_votes_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxVotesSequence: (0, pg_core_1.index)("idx_votes_sequence").using("btree", table.voteSequence.asc().nullsLast()),
        idxVotesUpdatedAt: (0, pg_core_1.index)("idx_votes_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
        votesOptionIdVotingOptionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.optionId],
            foreignColumns: [exports.votingOptions.id],
            name: "votes_option_id_voting_options_id_fk"
        }).onDelete("cascade"),
        votesSessionIdVotingSessionsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "votes_session_id_voting_sessions_id_fk"
        }).onDelete("cascade"),
    };
});
exports.claims = (0, pg_core_1.pgTable)("claims", {
    claimId: (0, pg_core_1.uuid)("claim_id").defaultRandom().primaryKey().notNull(),
    claimNumber: (0, pg_core_1.varchar)("claim_number", { length: 50 }).notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(true),
    claimType: (0, exports.claimType)("claim_type").notNull(),
    status: (0, exports.claimStatus)("status").default('submitted'),
    priority: (0, exports.claimPriority)("priority").default('medium'),
    incidentDate: (0, pg_core_1.date)("incident_date").notNull(),
    location: (0, pg_core_1.varchar)("location", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    desiredOutcome: (0, pg_core_1.text)("desired_outcome").notNull(),
    witnessesPresent: (0, pg_core_1.boolean)("witnesses_present").default(false),
    witnessDetails: (0, pg_core_1.text)("witness_details"),
    previouslyReported: (0, pg_core_1.boolean)("previously_reported").default(false),
    previousReportDetails: (0, pg_core_1.text)("previous_report_details"),
    assignedTo: (0, pg_core_1.uuid)("assigned_to"),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at", { withTimezone: true, mode: 'string' }),
    aiScore: (0, pg_core_1.integer)("ai_score"),
    aiAnalysis: (0, pg_core_1.jsonb)("ai_analysis"),
    meritConfidence: (0, pg_core_1.integer)("merit_confidence"),
    precedentMatch: (0, pg_core_1.integer)("precedent_match"),
    complexityScore: (0, pg_core_1.integer)("complexity_score"),
    progress: (0, pg_core_1.integer)("progress").default(0),
    attachments: (0, pg_core_1.jsonb)("attachments").default([]),
    voiceTranscriptions: (0, pg_core_1.jsonb)("voice_transcriptions").default([]),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    closedAt: (0, pg_core_1.timestamp)("closed_at", { withTimezone: true, mode: 'string' }),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    claimAmount: (0, pg_core_1.varchar)("claim_amount", { length: 20 }),
    settlementAmount: (0, pg_core_1.varchar)("settlement_amount", { length: 20 }),
    legalCosts: (0, pg_core_1.varchar)("legal_costs", { length: 20 }),
    courtCosts: (0, pg_core_1.varchar)("court_costs", { length: 20 }),
    resolutionOutcome: (0, pg_core_1.varchar)("resolution_outcome", { length: 100 }),
    filedDate: (0, pg_core_1.timestamp)("filed_date", { withTimezone: true, mode: 'string' }),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { withTimezone: true, mode: 'string' }),
}, (table) => {
    return {
        idxClaimsAssignedTo: (0, pg_core_1.index)("idx_claims_assigned_to").using("btree", table.assignedTo.asc().nullsLast()),
        idxClaimsClaimAmount: (0, pg_core_1.index)("idx_claims_claim_amount").using("btree", table.claimAmount.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(claim_amount IS NOT NULL)`),
        idxClaimsClaimNumber: (0, pg_core_1.index)("idx_claims_claim_number").using("btree", table.claimNumber.asc().nullsLast()),
        idxClaimsCreatedAt: (0, pg_core_1.index)("idx_claims_created_at").using("btree", table.createdAt.desc().nullsFirst()),
        idxClaimsFiledDate: (0, pg_core_1.index)("idx_claims_filed_date").using("btree", table.filedDate.desc().nullsFirst()).where((0, drizzle_orm_1.sql) `(filed_date IS NOT NULL)`),
        idxClaimsFinancialTracking: (0, pg_core_1.index)("idx_claims_financial_tracking").using("btree", table.organizationId.asc().nullsLast(), table.status.asc().nullsLast(), table.claimAmount.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(claim_amount IS NOT NULL)`),
        idxClaimsIncidentDate: (0, pg_core_1.index)("idx_claims_incident_date").using("btree", table.incidentDate.desc().nullsFirst()),
        idxClaimsMemberId: (0, pg_core_1.index)("idx_claims_member_id").using("btree", table.memberId.asc().nullsLast()),
        idxClaimsOrganizationId: (0, pg_core_1.index)("idx_claims_organization_id").using("btree", table.organizationId.asc().nullsLast()),
        idxClaimsPriority: (0, pg_core_1.index)("idx_claims_priority").using("btree", table.priority.asc().nullsLast()),
        idxClaimsResolutionOutcome: (0, pg_core_1.index)("idx_claims_resolution_outcome").using("btree", table.resolutionOutcome.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(resolution_outcome IS NOT NULL)`),
        idxClaimsResolvedAt: (0, pg_core_1.index)("idx_claims_resolved_at").using("btree", table.resolvedAt.desc().nullsFirst()).where((0, drizzle_orm_1.sql) `(resolved_at IS NOT NULL)`),
        idxClaimsSettlementAmount: (0, pg_core_1.index)("idx_claims_settlement_amount").using("btree", table.settlementAmount.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(settlement_amount IS NOT NULL)`),
        idxClaimsStatus: (0, pg_core_1.index)("idx_claims_status").using("btree", table.status.asc().nullsLast()),
        claimsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "claims_organization_id_fkey"
        }),
        fkClaimsAssignedTo: (0, pg_core_1.foreignKey)({
            columns: [table.assignedTo],
            foreignColumns: [exports.profiles.userId],
            name: "fk_claims_assigned_to"
        }).onDelete("set null"),
        fkClaimsMember: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.profiles.userId],
            name: "fk_claims_member"
        }).onDelete("cascade"),
        claimsClaimNumberKey: (0, pg_core_1.unique)("claims_claim_number_key").on(table.claimNumber),
    };
});
exports.organizations = (0, pg_core_1.pgTable)("organizations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull(),
    displayName: (0, pg_core_1.text)("display_name"),
    shortName: (0, pg_core_1.text)("short_name"),
    organizationType: (0, exports.organizationType)("organization_type").notNull(),
    parentId: (0, pg_core_1.uuid)("parent_id"),
    hierarchyPath: (0, pg_core_1.text)("hierarchy_path").array(),
    hierarchyLevel: (0, pg_core_1.integer)("hierarchy_level").default(0).notNull(),
    provinceTerritory: (0, pg_core_1.text)("province_territory"),
    sectors: (0, exports.labourSector)("sectors").array().default([]),
    email: (0, pg_core_1.text)("email"),
    phone: (0, pg_core_1.text)("phone"),
    website: (0, pg_core_1.text)("website"),
    address: (0, pg_core_1.jsonb)("address"),
    clcAffiliated: (0, pg_core_1.boolean)("clc_affiliated").default(false),
    affiliationDate: (0, pg_core_1.date)("affiliation_date"),
    charterNumber: (0, pg_core_1.text)("charter_number"),
    memberCount: (0, pg_core_1.integer)("member_count").default(0),
    activeMemberCount: (0, pg_core_1.integer)("active_member_count").default(0),
    lastMemberCountUpdate: (0, pg_core_1.timestamp)("last_member_count_update", { withTimezone: true, mode: 'string' }),
    subscriptionTier: (0, pg_core_1.text)("subscription_tier"),
    billingContactId: (0, pg_core_1.uuid)("billing_contact_id"),
    settings: (0, pg_core_1.jsonb)("settings").default({}),
    featuresEnabled: (0, pg_core_1.text)("features_enabled").array().default([""]),
    status: (0, pg_core_1.text)("status").default('active'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    legacyTenantId: (0, pg_core_1.uuid)("legacy_tenant_id"),
    clcAffiliateCode: (0, pg_core_1.varchar)("clc_affiliate_code", { length: 20 }),
    perCapitaRate: (0, pg_core_1.numeric)("per_capita_rate", { precision: 10, scale: 2 }),
    remittanceDay: (0, pg_core_1.integer)("remittance_day").default(15),
    lastRemittanceDate: (0, pg_core_1.timestamp)("last_remittance_date", { withTimezone: true, mode: 'string' }),
    fiscalYearEnd: (0, pg_core_1.date)("fiscal_year_end").default('2024-12-31'),
    legalName: (0, pg_core_1.varchar)("legal_name", { length: 255 }),
    businessNumber: (0, pg_core_1.text)("business_number"),
}, (table) => {
    return {
        idxOrganizationsClcAffiliated: (0, pg_core_1.index)("idx_organizations_clc_affiliated").using("btree", table.clcAffiliated.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(clc_affiliated = true)`),
        idxOrganizationsClcCode: (0, pg_core_1.index)("idx_organizations_clc_code").using("btree", table.clcAffiliateCode.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(clc_affiliate_code IS NOT NULL)`),
        idxOrganizationsHierarchyLevel: (0, pg_core_1.index)("idx_organizations_hierarchy_level").using("btree", table.hierarchyLevel.asc().nullsLast()),
        idxOrganizationsHierarchyPath: (0, pg_core_1.index)("idx_organizations_hierarchy_path").using("gin", table.hierarchyPath.asc().nullsLast()),
        idxOrganizationsLegacyTenant: (0, pg_core_1.index)("idx_organizations_legacy_tenant").using("btree", table.legacyTenantId.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(legacy_tenant_id IS NOT NULL)`),
        idxOrganizationsParent: (0, pg_core_1.index)("idx_organizations_parent").using("btree", table.parentId.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(parent_id IS NOT NULL)`),
        idxOrganizationsSectors: (0, pg_core_1.index)("idx_organizations_sectors").using("gin", table.sectors.asc().nullsLast()),
        idxOrganizationsSlug: (0, pg_core_1.index)("idx_organizations_slug").using("btree", table.slug.asc().nullsLast()),
        idxOrganizationsStatus: (0, pg_core_1.index)("idx_organizations_status").using("btree", table.status.asc().nullsLast()),
        idxOrganizationsType: (0, pg_core_1.index)("idx_organizations_type").using("btree", table.organizationType.asc().nullsLast()),
        organizationsParentIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: "organizations_parent_id_fkey"
        }).onDelete("restrict"),
        organizationsSlugKey: (0, pg_core_1.unique)("organizations_slug_key").on(table.slug),
    };
});
exports.comparativeAnalyses = (0, pg_core_1.pgTable)("comparative_analyses", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    analysisName: (0, pg_core_1.text)("analysis_name").notNull(),
    comparisonType: (0, pg_core_1.text)("comparison_type").notNull(),
    organizationIds: (0, pg_core_1.jsonb)("organization_ids"),
    metrics: (0, pg_core_1.jsonb)("metrics").notNull(),
    timeRange: (0, pg_core_1.jsonb)("time_range").notNull(),
    results: (0, pg_core_1.jsonb)("results").notNull(),
    benchmarks: (0, pg_core_1.jsonb)("benchmarks"),
    organizationRanking: (0, pg_core_1.jsonb)("organization_ranking"),
    gaps: (0, pg_core_1.jsonb)("gaps"),
    strengths: (0, pg_core_1.jsonb)("strengths"),
    recommendations: (0, pg_core_1.jsonb)("recommendations"),
    visualizationData: (0, pg_core_1.jsonb)("visualization_data"),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    createdBy: (0, pg_core_1.text)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        createdByIdx: (0, pg_core_1.index)("comparative_analyses_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
        createdIdx: (0, pg_core_1.index)("comparative_analyses_created_idx").using("btree", table.createdAt.asc().nullsLast()),
        orgIdx: (0, pg_core_1.index)("comparative_analyses_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("comparative_analyses_type_idx").using("btree", table.comparisonType.asc().nullsLast()),
        comparativeAnalysesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "comparative_analyses_organization_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.perCapitaRemittances = (0, pg_core_1.pgTable)("per_capita_remittances", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    fromOrganizationId: (0, pg_core_1.uuid)("from_organization_id").notNull(),
    toOrganizationId: (0, pg_core_1.uuid)("to_organization_id").notNull(),
    remittanceMonth: (0, pg_core_1.integer)("remittance_month").notNull(),
    remittanceYear: (0, pg_core_1.integer)("remittance_year").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    totalMembers: (0, pg_core_1.integer)("total_members").notNull(),
    goodStandingMembers: (0, pg_core_1.integer)("good_standing_members").notNull(),
    remittableMembers: (0, pg_core_1.integer)("remittable_members").notNull(),
    perCapitaRate: (0, pg_core_1.numeric)("per_capita_rate", { precision: 10, scale: 2 }).notNull(),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('CAD'),
    clcAccountCode: (0, pg_core_1.varchar)("clc_account_code", { length: 50 }),
    glAccount: (0, pg_core_1.varchar)("gl_account", { length: 50 }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default('pending'),
    submittedDate: (0, pg_core_1.timestamp)("submitted_date", { withTimezone: true, mode: 'string' }),
    paidDate: (0, pg_core_1.timestamp)("paid_date", { withTimezone: true, mode: 'string' }),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 100 }),
    remittanceFileUrl: (0, pg_core_1.text)("remittance_file_url"),
    receiptFileUrl: (0, pg_core_1.text)("receipt_file_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxRemittancesDueDate: (0, pg_core_1.index)("idx_remittances_due_date").using("btree", table.dueDate.asc().nullsLast()),
        idxRemittancesFromOrg: (0, pg_core_1.index)("idx_remittances_from_org").using("btree", table.fromOrganizationId.asc().nullsLast()),
        idxRemittancesToOrg: (0, pg_core_1.index)("idx_remittances_to_org").using("btree", table.toOrganizationId.asc().nullsLast()),
        perCapitaRemittancesFromOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.fromOrganizationId],
            foreignColumns: [exports.organizations.id],
            name: "per_capita_remittances_from_organization_id_fkey"
        }),
        perCapitaRemittancesToOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.toOrganizationId],
            foreignColumns: [exports.organizations.id],
            name: "per_capita_remittances_to_organization_id_fkey"
        }),
        uniqueOrgRemittancePeriod: (0, pg_core_1.unique)("unique_org_remittance_period").on(table.fromOrganizationId, table.toOrganizationId, table.remittanceMonth, table.remittanceYear),
    };
});
exports.clcChartOfAccounts = (0, pg_core_1.pgTable)("clc_chart_of_accounts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    accountCode: (0, pg_core_1.varchar)("account_code", { length: 50 }).notNull(),
    accountName: (0, pg_core_1.varchar)("account_name", { length: 255 }).notNull(),
    accountType: (0, pg_core_1.varchar)("account_type", { length: 50 }).notNull(),
    parentAccountCode: (0, pg_core_1.varchar)("parent_account_code", { length: 50 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    description: (0, pg_core_1.text)("description"),
    financialStatementLine: (0, pg_core_1.varchar)("financial_statement_line", { length: 100 }),
    statisticsCanadaCode: (0, pg_core_1.varchar)("statistics_canada_code", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxClcAccountsCode: (0, pg_core_1.index)("idx_clc_accounts_code").using("btree", table.accountCode.asc().nullsLast()),
        idxClcAccountsParent: (0, pg_core_1.index)("idx_clc_accounts_parent").using("btree", table.parentAccountCode.asc().nullsLast()),
        idxClcAccountsType: (0, pg_core_1.index)("idx_clc_accounts_type").using("btree", table.accountType.asc().nullsLast()),
        idxCoaCode: (0, pg_core_1.index)("idx_coa_code").using("btree", table.accountCode.asc().nullsLast()),
        idxCoaParent: (0, pg_core_1.index)("idx_coa_parent").using("btree", table.parentAccountCode.asc().nullsLast()),
        idxCoaType: (0, pg_core_1.index)("idx_coa_type").using("btree", table.accountType.asc().nullsLast()),
        clcChartOfAccountsAccountCodeKey: (0, pg_core_1.unique)("clc_chart_of_accounts_account_code_key").on(table.accountCode),
    };
});
exports.transactionClcMappings = (0, pg_core_1.pgTable)("transaction_clc_mappings", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    transactionType: (0, pg_core_1.varchar)("transaction_type", { length: 50 }).notNull(),
    transactionId: (0, pg_core_1.uuid)("transaction_id").notNull(),
    transactionDate: (0, pg_core_1.date)("transaction_date").notNull(),
    clcAccountCode: (0, pg_core_1.varchar)("clc_account_code", { length: 50 }).notNull(),
    glAccount: (0, pg_core_1.varchar)("gl_account", { length: 50 }),
    amount: (0, pg_core_1.numeric)("amount", { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('CAD'),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxClcMappingsAccount: (0, pg_core_1.index)("idx_clc_mappings_account").using("btree", table.clcAccountCode.asc().nullsLast()),
        idxClcMappingsDate: (0, pg_core_1.index)("idx_clc_mappings_date").using("btree", table.transactionDate.asc().nullsLast()),
        idxClcMappingsOrg: (0, pg_core_1.index)("idx_clc_mappings_org").using("btree", table.organizationId.asc().nullsLast()),
        idxClcMappingsTransaction: (0, pg_core_1.index)("idx_clc_mappings_transaction").using("btree", table.transactionType.asc().nullsLast(), table.transactionId.asc().nullsLast()),
        idxMappingsAccount: (0, pg_core_1.index)("idx_mappings_account").using("btree", table.clcAccountCode.asc().nullsLast()),
        idxMappingsTransaction: (0, pg_core_1.index)("idx_mappings_transaction").using("btree", table.transactionId.asc().nullsLast()),
        transactionClcMappingsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "transaction_clc_mappings_organization_id_fkey"
        }),
        uniqueTransactionMapping: (0, pg_core_1.unique)("unique_transaction_mapping").on(table.transactionType, table.transactionId, table.clcAccountCode),
    };
});
exports.messageThreads = (0, pg_core_1.pgTable)("message_threads", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    subject: (0, pg_core_1.text)("subject").notNull(),
    memberId: (0, pg_core_1.text)("member_id").notNull(),
    staffId: (0, pg_core_1.text)("staff_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    status: (0, pg_core_1.text)("status").default('open').notNull(),
    priority: (0, pg_core_1.text)("priority").default('normal'),
    category: (0, pg_core_1.text)("category"),
    isArchived: (0, pg_core_1.boolean)("is_archived").default(false),
    lastMessageAt: (0, pg_core_1.timestamp)("last_message_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxMessageThreadsMemberId: (0, pg_core_1.index)("idx_message_threads_member_id").using("btree", table.memberId.asc().nullsLast()),
        idxMessageThreadsOrganizationId: (0, pg_core_1.index)("idx_message_threads_organization_id").using("btree", table.organizationId.asc().nullsLast()),
        idxMessageThreadsStaffId: (0, pg_core_1.index)("idx_message_threads_staff_id").using("btree", table.staffId.asc().nullsLast()),
    };
});
exports.votingAuditors = (0, pg_core_1.pgTable)("voting_auditors", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    auditorName: (0, pg_core_1.varchar)("auditor_name", { length: 200 }).notNull(),
    auditorType: (0, pg_core_1.varchar)("auditor_type", { length: 50 }).notNull(),
    organizationName: (0, pg_core_1.varchar)("organization_name", { length: 200 }),
    organizationWebsite: (0, pg_core_1.varchar)("organization_website", { length: 500 }),
    registrationNumber: (0, pg_core_1.varchar)("registration_number", { length: 100 }),
    contactPerson: (0, pg_core_1.varchar)("contact_person", { length: 200 }),
    contactEmail: (0, pg_core_1.varchar)("contact_email", { length: 255 }).notNull(),
    contactPhone: (0, pg_core_1.varchar)("contact_phone", { length: 50 }),
    publicKey: (0, pg_core_1.text)("public_key").notNull(),
    keyFingerprint: (0, pg_core_1.varchar)("key_fingerprint", { length: 128 }).notNull(),
    certificate: (0, pg_core_1.text)("certificate"),
    isClcCertified: (0, pg_core_1.boolean)("is_clc_certified").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    certificationExpiresAt: (0, pg_core_1.date)("certification_expires_at"),
    apiKeyHash: (0, pg_core_1.varchar)("api_key_hash", { length: 128 }),
    apiRateLimit: (0, pg_core_1.integer)("api_rate_limit").default(1000),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxVotingAuditorsActive: (0, pg_core_1.index)("idx_voting_auditors_active").using("btree", table.isActive.asc().nullsLast()),
        idxVotingAuditorsClc: (0, pg_core_1.index)("idx_voting_auditors_clc").using("btree", table.isClcCertified.asc().nullsLast()),
        votingAuditorsKeyFingerprintKey: (0, pg_core_1.unique)("voting_auditors_key_fingerprint_key").on(table.keyFingerprint),
    };
});
exports.trustedCertificateAuthorities = (0, pg_core_1.pgTable)("trusted_certificate_authorities", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    caName: (0, pg_core_1.varchar)("ca_name", { length: 200 }).notNull(),
    caType: (0, pg_core_1.varchar)("ca_type", { length: 50 }).notNull(),
    issuerDn: (0, pg_core_1.varchar)("issuer_dn", { length: 500 }).notNull(),
    rootCertificate: (0, pg_core_1.text)("root_certificate").notNull(),
    rootCertificateThumbprint: (0, pg_core_1.varchar)("root_certificate_thumbprint", { length: 128 }).notNull(),
    isTrusted: (0, pg_core_1.boolean)("is_trusted").default(true),
    trustLevel: (0, pg_core_1.varchar)("trust_level", { length: 50 }).default('high'),
    validFrom: (0, pg_core_1.timestamp)("valid_from", { withTimezone: true, mode: 'string' }),
    validUntil: (0, pg_core_1.timestamp)("valid_until", { withTimezone: true, mode: 'string' }),
    crlUrl: (0, pg_core_1.text)("crl_url"),
    crlLastUpdated: (0, pg_core_1.timestamp)("crl_last_updated", { withTimezone: true, mode: 'string' }),
    ocspUrl: (0, pg_core_1.text)("ocsp_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxTrustedCasIssuer: (0, pg_core_1.index)("idx_trusted_cas_issuer").using("btree", table.issuerDn.asc().nullsLast()),
        idxTrustedCasThumbprint: (0, pg_core_1.index)("idx_trusted_cas_thumbprint").using("btree", table.rootCertificateThumbprint.asc().nullsLast()),
        trustedCertificateAuthoritiesIssuerDnKey: (0, pg_core_1.unique)("trusted_certificate_authorities_issuer_dn_key").on(table.issuerDn),
        trustedCertificateAuthoritiesRootCertificateThumbprintKey: (0, pg_core_1.unique)("trusted_certificate_authorities_root_certificate_thumbprint_key").on(table.rootCertificateThumbprint),
    };
});
exports.signatureAuditLog = (0, pg_core_1.pgTable)("signature_audit_log", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    signatureId: (0, pg_core_1.uuid)("signature_id").notNull(),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 50 }).notNull(),
    eventTimestamp: (0, pg_core_1.timestamp)("event_timestamp", { withTimezone: true, mode: 'string' }).defaultNow(),
    actorUserId: (0, pg_core_1.uuid)("actor_user_id"),
    actorName: (0, pg_core_1.varchar)("actor_name", { length: 200 }),
    actorRole: (0, pg_core_1.varchar)("actor_role", { length: 100 }),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    eventData: (0, pg_core_1.jsonb)("event_data"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxSignatureAuditLogCreatedAt: (0, pg_core_1.index)("idx_signature_audit_log_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxSignatureAuditLogUpdatedAt: (0, pg_core_1.index)("idx_signature_audit_log_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
        idxSignatureAuditSignature: (0, pg_core_1.index)("idx_signature_audit_signature").using("btree", table.signatureId.asc().nullsLast()),
        idxSignatureAuditTimestamp: (0, pg_core_1.index)("idx_signature_audit_timestamp").using("btree", table.eventTimestamp.asc().nullsLast()),
    };
});
exports.votingSessionAuditors = (0, pg_core_1.pgTable)("voting_session_auditors", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    votingSessionId: (0, pg_core_1.uuid)("voting_session_id").notNull(),
    auditorId: (0, pg_core_1.uuid)("auditor_id").notNull(),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    assignedBy: (0, pg_core_1.uuid)("assigned_by"),
    auditorPublicKey: (0, pg_core_1.text)("auditor_public_key").notNull(),
    accessLevel: (0, pg_core_1.varchar)("access_level", { length: 50 }).default('observer'),
    verificationStatus: (0, pg_core_1.varchar)("verification_status", { length: 50 }),
    verificationStartedAt: (0, pg_core_1.timestamp)("verification_started_at", { withTimezone: true, mode: 'string' }),
    verificationCompletedAt: (0, pg_core_1.timestamp)("verification_completed_at", { withTimezone: true, mode: 'string' }),
    verificationReportUrl: (0, pg_core_1.text)("verification_report_url"),
    issuesFound: (0, pg_core_1.integer)("issues_found").default(0),
    severity: (0, pg_core_1.varchar)("severity", { length: 50 }),
    findingsSummary: (0, pg_core_1.text)("findings_summary"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxSessionAuditorsAuditor: (0, pg_core_1.index)("idx_session_auditors_auditor").using("btree", table.auditorId.asc().nullsLast()),
        idxSessionAuditorsSession: (0, pg_core_1.index)("idx_session_auditors_session").using("btree", table.votingSessionId.asc().nullsLast()),
        idxSessionAuditorsStatus: (0, pg_core_1.index)("idx_session_auditors_status").using("btree", table.verificationStatus.asc().nullsLast()),
        votingSessionAuditorsAuditorIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.auditorId],
            foreignColumns: [exports.votingAuditors.id],
            name: "voting_session_auditors_auditor_id_fkey"
        }),
        votingSessionAuditorsVotingSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.votingSessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "voting_session_auditors_voting_session_id_fkey"
        }).onDelete("cascade"),
        uniqueSessionAuditor: (0, pg_core_1.unique)("unique_session_auditor").on(table.votingSessionId, table.auditorId),
    };
});
exports.blockchainAuditAnchors = (0, pg_core_1.pgTable)("blockchain_audit_anchors", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    votingSessionId: (0, pg_core_1.uuid)("voting_session_id").notNull(),
    blockchainNetwork: (0, pg_core_1.varchar)("blockchain_network", { length: 50 }).notNull(),
    networkType: (0, pg_core_1.varchar)("network_type", { length: 50 }).default('mainnet'),
    transactionHash: (0, pg_core_1.varchar)("transaction_hash", { length: 200 }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    blockNumber: (0, pg_core_1.bigint)("block_number", { mode: "number" }),
    blockHash: (0, pg_core_1.varchar)("block_hash", { length: 200 }),
    blockTimestamp: (0, pg_core_1.timestamp)("block_timestamp", { withTimezone: true, mode: 'string' }),
    merkleRootHash: (0, pg_core_1.varchar)("merkle_root_hash", { length: 128 }).notNull(),
    metadataHash: (0, pg_core_1.varchar)("metadata_hash", { length: 128 }),
    totalVotesCount: (0, pg_core_1.integer)("total_votes_count"),
    contractAddress: (0, pg_core_1.varchar)("contract_address", { length: 200 }),
    contractMethod: (0, pg_core_1.varchar)("contract_method", { length: 100 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    gasUsed: (0, pg_core_1.bigint)("gas_used", { mode: "number" }),
    gasPriceGwei: (0, pg_core_1.numeric)("gas_price_gwei", { precision: 20, scale: 9 }),
    transactionFeeEth: (0, pg_core_1.numeric)("transaction_fee_eth", { precision: 20, scale: 18 }),
    transactionFeeUsd: (0, pg_core_1.numeric)("transaction_fee_usd", { precision: 12, scale: 2 }),
    isConfirmed: (0, pg_core_1.boolean)("is_confirmed").default(false),
    confirmationsRequired: (0, pg_core_1.integer)("confirmations_required").default(6),
    currentConfirmations: (0, pg_core_1.integer)("current_confirmations").default(0),
    explorerUrl: (0, pg_core_1.text)("explorer_url"),
    proofUrl: (0, pg_core_1.text)("proof_url"),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending'),
    errorMessage: (0, pg_core_1.text)("error_message"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    anchoredBy: (0, pg_core_1.uuid)("anchored_by"),
}, (table) => {
    return {
        idxBlockchainAnchorsBlock: (0, pg_core_1.index)("idx_blockchain_anchors_block").using("btree", table.blockNumber.asc().nullsLast()),
        idxBlockchainAnchorsSession: (0, pg_core_1.index)("idx_blockchain_anchors_session").using("btree", table.votingSessionId.asc().nullsLast()),
        idxBlockchainAnchorsStatus: (0, pg_core_1.index)("idx_blockchain_anchors_status").using("btree", table.status.asc().nullsLast()),
        idxBlockchainAnchorsTx: (0, pg_core_1.index)("idx_blockchain_anchors_tx").using("btree", table.transactionHash.asc().nullsLast()),
        blockchainAuditAnchorsVotingSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.votingSessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "blockchain_audit_anchors_voting_session_id_fkey"
        }),
        blockchainAuditAnchorsTransactionHashKey: (0, pg_core_1.unique)("blockchain_audit_anchors_transaction_hash_key").on(table.transactionHash),
    };
});
exports.voteMerkleTree = (0, pg_core_1.pgTable)("vote_merkle_tree", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    votingSessionId: (0, pg_core_1.uuid)("voting_session_id").notNull(),
    treeLevel: (0, pg_core_1.integer)("tree_level").notNull(),
    nodeIndex: (0, pg_core_1.integer)("node_index").notNull(),
    nodeHash: (0, pg_core_1.varchar)("node_hash", { length: 128 }).notNull(),
    parentNodeId: (0, pg_core_1.uuid)("parent_node_id"),
    leftChildId: (0, pg_core_1.uuid)("left_child_id"),
    rightChildId: (0, pg_core_1.uuid)("right_child_id"),
    voteId: (0, pg_core_1.uuid)("vote_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxMerkleTreeLevel: (0, pg_core_1.index)("idx_merkle_tree_level").using("btree", table.treeLevel.asc().nullsLast(), table.nodeIndex.asc().nullsLast()),
        idxMerkleTreeParent: (0, pg_core_1.index)("idx_merkle_tree_parent").using("btree", table.parentNodeId.asc().nullsLast()),
        idxMerkleTreeSession: (0, pg_core_1.index)("idx_merkle_tree_session").using("btree", table.votingSessionId.asc().nullsLast()),
        idxMerkleTreeVote: (0, pg_core_1.index)("idx_merkle_tree_vote").using("btree", table.voteId.asc().nullsLast()),
        voteMerkleTreeLeftChildIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.leftChildId],
            foreignColumns: [table.id],
            name: "vote_merkle_tree_left_child_id_fkey"
        }),
        voteMerkleTreeParentNodeIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.parentNodeId],
            foreignColumns: [table.id],
            name: "vote_merkle_tree_parent_node_id_fkey"
        }),
        voteMerkleTreeRightChildIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.rightChildId],
            foreignColumns: [table.id],
            name: "vote_merkle_tree_right_child_id_fkey"
        }),
        voteMerkleTreeVoteIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.voteId],
            foreignColumns: [exports.votes.id],
            name: "vote_merkle_tree_vote_id_fkey"
        }),
        voteMerkleTreeVotingSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.votingSessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "vote_merkle_tree_voting_session_id_fkey"
        }),
        uniqueTreePosition: (0, pg_core_1.unique)("unique_tree_position").on(table.votingSessionId, table.treeLevel, table.nodeIndex),
    };
});
exports.vPendingRemittances = (0, pg_core_1.pgTable)("v_pending_remittances", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    organizationName: (0, pg_core_1.text)("organization_name"),
    clcAffiliateCode: (0, pg_core_1.varchar)("clc_affiliate_code", { length: 20 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pendingCount: (0, pg_core_1.bigint)("pending_count", { mode: "number" }),
    totalPending: (0, pg_core_1.numeric)("total_pending"),
    earliestDueDate: (0, pg_core_1.date)("earliest_due_date"),
    latestDueDate: (0, pg_core_1.date)("latest_due_date"),
});
exports.vAnnualRemittanceSummary = (0, pg_core_1.pgTable)("v_annual_remittance_summary", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    organizationName: (0, pg_core_1.text)("organization_name"),
    clcAffiliateCode: (0, pg_core_1.varchar)("clc_affiliate_code", { length: 20 }),
    hierarchyLevel: (0, pg_core_1.integer)("hierarchy_level"),
    remittanceYear: (0, pg_core_1.integer)("remittance_year"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    remittanceCount: (0, pg_core_1.bigint)("remittance_count", { mode: "number" }),
    totalRemitted: (0, pg_core_1.numeric)("total_remitted"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalMembers: (0, pg_core_1.bigint)("total_members", { mode: "number" }),
    avgPerCapitaRate: (0, pg_core_1.numeric)("avg_per_capita_rate"),
});
exports.votingSessionKeys = (0, pg_core_1.pgTable)("voting_session_keys", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    votingSessionId: (0, pg_core_1.uuid)("voting_session_id").notNull(),
    publicKey: (0, pg_core_1.text)("public_key").notNull(),
    privateKeyEncrypted: (0, pg_core_1.text)("private_key_encrypted").notNull(),
    encryptionAlgorithm: (0, pg_core_1.varchar)("encryption_algorithm", { length: 50 }).default('RSA-4096'),
    keyDerivationFunction: (0, pg_core_1.varchar)("key_derivation_function", { length: 50 }).default('PBKDF2'),
    kdfIterations: (0, pg_core_1.integer)("kdf_iterations").default(100000),
    kdfSalt: (0, pg_core_1.varchar)("kdf_salt", { length: 64 }),
    secretSharesTotal: (0, pg_core_1.integer)("secret_shares_total").default(5),
    secretSharesThreshold: (0, pg_core_1.integer)("secret_shares_threshold").default(3),
    secretShare1Encrypted: (0, pg_core_1.text)("secret_share_1_encrypted"),
    secretShare2Encrypted: (0, pg_core_1.text)("secret_share_2_encrypted"),
    secretShare3Encrypted: (0, pg_core_1.text)("secret_share_3_encrypted"),
    secretShare4Encrypted: (0, pg_core_1.text)("secret_share_4_encrypted"),
    secretShare5Encrypted: (0, pg_core_1.text)("secret_share_5_encrypted"),
    custodian1UserId: (0, pg_core_1.uuid)("custodian_1_user_id"),
    custodian2UserId: (0, pg_core_1.uuid)("custodian_2_user_id"),
    custodian3UserId: (0, pg_core_1.uuid)("custodian_3_user_id"),
    custodian4UserId: (0, pg_core_1.uuid)("custodian_4_user_id"),
    custodian5UserId: (0, pg_core_1.uuid)("custodian_5_user_id"),
    generatedAt: (0, pg_core_1.timestamp)("generated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true, mode: 'string' }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    encryptionCount: (0, pg_core_1.integer)("encryption_count").default(0),
    decryptionCount: (0, pg_core_1.integer)("decryption_count").default(0),
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxSessionKeysActive: (0, pg_core_1.index)("idx_session_keys_active").using("btree", table.isActive.asc().nullsLast()),
        idxSessionKeysSession: (0, pg_core_1.index)("idx_session_keys_session").using("btree", table.votingSessionId.asc().nullsLast()),
        votingSessionKeysVotingSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.votingSessionId],
            foreignColumns: [exports.votingSessions.id],
            name: "voting_session_keys_voting_session_id_fkey"
        }),
        votingSessionKeysVotingSessionIdKey: (0, pg_core_1.unique)("voting_session_keys_voting_session_id_key").on(table.votingSessionId),
    };
});
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    threadId: (0, pg_core_1.uuid)("thread_id").notNull(),
    senderId: (0, pg_core_1.text)("sender_id").notNull(),
    senderRole: (0, pg_core_1.text)("sender_role").notNull(),
    messageType: (0, exports.messageType)("message_type").default('text').notNull(),
    content: (0, pg_core_1.text)("content"),
    fileUrl: (0, pg_core_1.text)("file_url"),
    fileName: (0, pg_core_1.text)("file_name"),
    fileSize: (0, pg_core_1.text)("file_size"),
    status: (0, exports.messageStatus)("status").default('sent').notNull(),
    readAt: (0, pg_core_1.timestamp)("read_at", { mode: 'string' }),
    isEdited: (0, pg_core_1.boolean)("is_edited").default(false),
    editedAt: (0, pg_core_1.timestamp)("edited_at", { mode: 'string' }),
    metadata: (0, pg_core_1.text)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxMessagesCreatedAt: (0, pg_core_1.index)("idx_messages_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxMessagesThreadId: (0, pg_core_1.index)("idx_messages_thread_id").using("btree", table.threadId.asc().nullsLast()),
        messagesThreadIdMessageThreadsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.threadId],
            foreignColumns: [exports.messageThreads.id],
            name: "messages_thread_id_message_threads_id_fk"
        }).onDelete("cascade"),
    };
});
exports.organizationHierarchyAudit = (0, pg_core_1.pgTable)("organization_hierarchy_audit", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    changeType: (0, pg_core_1.varchar)("change_type", { length: 50 }).notNull(),
    oldParentId: (0, pg_core_1.uuid)("old_parent_id"),
    newParentId: (0, pg_core_1.uuid)("new_parent_id"),
    oldHierarchyLevel: (0, pg_core_1.integer)("old_hierarchy_level"),
    newHierarchyLevel: (0, pg_core_1.integer)("new_hierarchy_level"),
    oldClcCode: (0, pg_core_1.varchar)("old_clc_code", { length: 20 }),
    newClcCode: (0, pg_core_1.varchar)("new_clc_code", { length: 20 }),
    changedAt: (0, pg_core_1.timestamp)("changed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    changedBy: (0, pg_core_1.uuid)("changed_by"),
    reason: (0, pg_core_1.text)("reason"),
    oldHierarchyPath: (0, pg_core_1.uuid)("old_hierarchy_path").array(),
    newHierarchyPath: (0, pg_core_1.uuid)("new_hierarchy_path").array(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxAuditDate: (0, pg_core_1.index)("idx_audit_date").using("btree", table.changedAt.asc().nullsLast()),
        idxAuditOrg: (0, pg_core_1.index)("idx_audit_org").using("btree", table.organizationId.asc().nullsLast()),
        idxAuditType: (0, pg_core_1.index)("idx_audit_type").using("btree", table.changeType.asc().nullsLast()),
        idxHierarchyAuditDate: (0, pg_core_1.index)("idx_hierarchy_audit_date").using("btree", table.changedAt.asc().nullsLast()),
        idxHierarchyAuditOrg: (0, pg_core_1.index)("idx_hierarchy_audit_org").using("btree", table.organizationId.asc().nullsLast()),
        idxHierarchyAuditType: (0, pg_core_1.index)("idx_hierarchy_audit_type").using("btree", table.changeType.asc().nullsLast()),
        idxOrganizationHierarchyAuditCreatedAt: (0, pg_core_1.index)("idx_organization_hierarchy_audit_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxOrganizationHierarchyAuditUpdatedAt: (0, pg_core_1.index)("idx_organization_hierarchy_audit_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
        organizationHierarchyAuditOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "organization_hierarchy_audit_organization_id_fkey"
        }),
    };
});
exports.votingKeyAccessLog = (0, pg_core_1.pgTable)("voting_key_access_log", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    sessionKeyId: (0, pg_core_1.uuid)("session_key_id").notNull(),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 50 }).notNull(),
    accessedBy: (0, pg_core_1.uuid)("accessed_by").notNull(),
    accessReason: (0, pg_core_1.text)("access_reason"),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    success: (0, pg_core_1.boolean)("success"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    accessedAt: (0, pg_core_1.timestamp)("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxKeyAccessLogKey: (0, pg_core_1.index)("idx_key_access_log_key").using("btree", table.sessionKeyId.asc().nullsLast()),
        idxKeyAccessLogTime: (0, pg_core_1.index)("idx_key_access_log_time").using("btree", table.accessedAt.asc().nullsLast()),
        idxKeyAccessLogUser: (0, pg_core_1.index)("idx_key_access_log_user").using("btree", table.accessedBy.asc().nullsLast()),
        idxVotingKeyAccessLogCreatedAt: (0, pg_core_1.index)("idx_voting_key_access_log_created_at").using("btree", table.createdAt.asc().nullsLast()),
        idxVotingKeyAccessLogUpdatedAt: (0, pg_core_1.index)("idx_voting_key_access_log_updated_at").using("btree", table.updatedAt.asc().nullsLast()),
        votingKeyAccessLogSessionKeyIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.sessionKeyId],
            foreignColumns: [exports.votingSessionKeys.id],
            name: "voting_key_access_log_session_key_id_fkey"
        }),
    };
});
exports.messageReadReceipts = (0, pg_core_1.pgTable)("message_read_receipts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    messageId: (0, pg_core_1.uuid)("message_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    readAt: (0, pg_core_1.timestamp)("read_at", { mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        messageReadReceiptsMessageIdMessagesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.messageId],
            foreignColumns: [exports.messages.id],
            name: "message_read_receipts_message_id_messages_id_fk"
        }).onDelete("cascade"),
    };
});
exports.messageParticipants = (0, pg_core_1.pgTable)("message_participants", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    threadId: (0, pg_core_1.uuid)("thread_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    role: (0, pg_core_1.text)("role").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    lastReadAt: (0, pg_core_1.timestamp)("last_read_at", { mode: 'string' }),
    joinedAt: (0, pg_core_1.timestamp)("joined_at", { mode: 'string' }).defaultNow().notNull(),
    leftAt: (0, pg_core_1.timestamp)("left_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        messageParticipantsThreadIdMessageThreadsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.threadId],
            foreignColumns: [exports.messageThreads.id],
            name: "message_participants_thread_id_message_threads_id_fk"
        }).onDelete("cascade"),
    };
});
exports.jurisdictionRules = (0, pg_core_1.pgTable)("jurisdiction_rules", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    jurisdiction: (0, exports.caJurisdiction)("jurisdiction").notNull(),
    ruleType: (0, exports.jurisdictionRuleType)("rule_type").notNull(),
    ruleCategory: (0, pg_core_1.text)("rule_category").notNull(),
    ruleName: (0, pg_core_1.text)("rule_name").notNull(),
    description: (0, pg_core_1.text)("description"),
    legalReference: (0, pg_core_1.text)("legal_reference").notNull(),
    ruleParameters: (0, pg_core_1.jsonb)("rule_parameters").default({}).notNull(),
    appliesToSectors: (0, pg_core_1.text)("applies_to_sectors").array(),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    effectiveDate: (0, pg_core_1.date)("effective_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => {
    return {
        idxJurisdictionRulesActive: (0, pg_core_1.index)("idx_jurisdiction_rules_active").using("btree", table.jurisdiction.asc().nullsLast(), table.ruleCategory.asc().nullsLast(), table.version.asc().nullsLast()),
        idxJurisdictionRulesCategory: (0, pg_core_1.index)("idx_jurisdiction_rules_category").using("btree", table.ruleCategory.asc().nullsLast()),
        idxJurisdictionRulesEffective: (0, pg_core_1.index)("idx_jurisdiction_rules_effective").using("btree", table.effectiveDate.asc().nullsLast()),
        idxJurisdictionRulesJurisdiction: (0, pg_core_1.index)("idx_jurisdiction_rules_jurisdiction").using("btree", table.jurisdiction.asc().nullsLast()),
        idxJurisdictionRulesParams: (0, pg_core_1.index)("idx_jurisdiction_rules_params").using("gin", table.ruleParameters.asc().nullsLast()),
        idxJurisdictionRulesSectors: (0, pg_core_1.index)("idx_jurisdiction_rules_sectors").using("gin", table.appliesToSectors.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(applies_to_sectors IS NOT NULL)`),
        idxJurisdictionRulesType: (0, pg_core_1.index)("idx_jurisdiction_rules_type").using("btree", table.ruleType.asc().nullsLast()),
    };
});
exports.statutoryHolidays = (0, pg_core_1.pgTable)("statutory_holidays", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    jurisdiction: (0, exports.caJurisdiction)("jurisdiction").notNull(),
    holidayDate: (0, pg_core_1.date)("holiday_date").notNull(),
    holidayName: (0, pg_core_1.text)("holiday_name").notNull(),
    holidayNameFr: (0, pg_core_1.text)("holiday_name_fr"),
    affectsDeadlines: (0, pg_core_1.boolean)("affects_deadlines").default(true).notNull(),
    isOptional: (0, pg_core_1.boolean)("is_optional").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => {
    return {
        idxStatutoryHolidaysAffects: (0, pg_core_1.index)("idx_statutory_holidays_affects").using("btree", table.jurisdiction.asc().nullsLast(), table.affectsDeadlines.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(affects_deadlines = true)`),
        idxStatutoryHolidaysDate: (0, pg_core_1.index)("idx_statutory_holidays_date").using("btree", table.holidayDate.asc().nullsLast()),
        idxStatutoryHolidaysJurisdiction: (0, pg_core_1.index)("idx_statutory_holidays_jurisdiction").using("btree", table.jurisdiction.asc().nullsLast()),
        idxStatutoryHolidaysYear: (0, pg_core_1.index)("idx_statutory_holidays_year").using("btree", (0, drizzle_orm_1.sql) `EXTRACT(year FROM holiday_date)`),
        uniqueJurisdictionHoliday: (0, pg_core_1.unique)("unique_jurisdiction_holiday").on(table.jurisdiction, table.holidayDate),
    };
});
exports.complianceValidations = (0, pg_core_1.pgTable)("compliance_validations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    referenceType: (0, pg_core_1.text)("reference_type").notNull(),
    referenceId: (0, pg_core_1.uuid)("reference_id").notNull(),
    ruleId: (0, pg_core_1.uuid)("rule_id").notNull(),
    validationDate: (0, pg_core_1.timestamp)("validation_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    isCompliant: (0, pg_core_1.boolean)("is_compliant").notNull(),
    validationMessage: (0, pg_core_1.text)("validation_message"),
    requiresAction: (0, pg_core_1.boolean)("requires_action").default(false).notNull(),
    actionDeadline: (0, pg_core_1.date)("action_deadline"),
    actionTaken: (0, pg_core_1.text)("action_taken"),
    validatedBy: (0, pg_core_1.uuid)("validated_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxComplianceValidationsAction: (0, pg_core_1.index)("idx_compliance_validations_action").using("btree", table.organizationId.asc().nullsLast(), table.requiresAction.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(requires_action = true)`),
        idxComplianceValidationsDate: (0, pg_core_1.index)("idx_compliance_validations_date").using("btree", table.validationDate.asc().nullsLast()),
        idxComplianceValidationsOrg: (0, pg_core_1.index)("idx_compliance_validations_org").using("btree", table.organizationId.asc().nullsLast()),
        idxComplianceValidationsReference: (0, pg_core_1.index)("idx_compliance_validations_reference").using("btree", table.referenceType.asc().nullsLast(), table.referenceId.asc().nullsLast()),
        idxComplianceValidationsRule: (0, pg_core_1.index)("idx_compliance_validations_rule").using("btree", table.ruleId.asc().nullsLast()),
        complianceValidationsRuleIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.ruleId],
            foreignColumns: [exports.jurisdictionRules.id],
            name: "compliance_validations_rule_id_fkey"
        }),
        fkRule: (0, pg_core_1.foreignKey)({
            columns: [table.ruleId],
            foreignColumns: [exports.jurisdictionRules.id],
            name: "fk_rule"
        }),
    };
});
exports.messageNotifications = (0, pg_core_1.pgTable)("message_notifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    messageId: (0, pg_core_1.uuid)("message_id").notNull(),
    threadId: (0, pg_core_1.uuid)("thread_id").notNull(),
    isRead: (0, pg_core_1.boolean)("is_read").default(false),
    readAt: (0, pg_core_1.timestamp)("read_at", { mode: 'string' }),
    notifiedAt: (0, pg_core_1.timestamp)("notified_at", { mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxMessageNotificationsIsRead: (0, pg_core_1.index)("idx_message_notifications_is_read").using("btree", table.isRead.asc().nullsLast()),
        idxMessageNotificationsUserId: (0, pg_core_1.index)("idx_message_notifications_user_id").using("btree", table.userId.asc().nullsLast()),
        messageNotificationsMessageIdMessagesIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.messageId],
            foreignColumns: [exports.messages.id],
            name: "message_notifications_message_id_messages_id_fk"
        }).onDelete("cascade"),
        messageNotificationsThreadIdMessageThreadsIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.threadId],
            foreignColumns: [exports.messageThreads.id],
            name: "message_notifications_thread_id_message_threads_id_fk"
        }).onDelete("cascade"),
    };
});
exports.encryptionKeys = (0, pg_core_1.pgTable)("encryption_keys", {
    keyId: (0, pg_core_1.uuid)("key_id").defaultRandom().primaryKey().notNull(),
    keyName: (0, pg_core_1.varchar)("key_name", { length: 100 }).notNull(),
    keyValue: (0, pg_core_1.text)("key_value").notNull(), // bytea stored as base64 text
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    rotatedAt: (0, pg_core_1.timestamp)("rotated_at", { mode: 'string' }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdBy: (0, pg_core_1.text)("created_by").notNull(),
}, (table) => {
    return {
        encryptionKeysKeyNameKey: (0, pg_core_1.unique)("encryption_keys_key_name_key").on(table.keyName),
    };
});
exports.members = (0, pg_core_1.pgTable)("members", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('active'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    encryptedSin: (0, pg_core_1.text)("encrypted_sin"),
    encryptedSsn: (0, pg_core_1.text)("encrypted_ssn"),
    encryptedBankAccount: (0, pg_core_1.text)("encrypted_bank_account"),
}, (table) => {
    return {
        idxMembersOrganization: (0, pg_core_1.index)("idx_members_organization").using("btree", table.organizationId.asc().nullsLast()),
        idxMembersStatus: (0, pg_core_1.index)("idx_members_status").using("btree", table.status.asc().nullsLast()),
        idxMembersUser: (0, pg_core_1.index)("idx_members_user").using("btree", table.userId.asc().nullsLast()),
        membersOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "members_organization_id_fkey"
        }),
    };
});
exports.membersWithPii = (0, pg_core_1.pgTable)("members_with_pii", {
    id: (0, pg_core_1.uuid)("id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    userId: (0, pg_core_1.uuid)("user_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }),
    encryptedSin: (0, pg_core_1.text)("encrypted_sin"),
    encryptedSsn: (0, pg_core_1.text)("encrypted_ssn"),
    encryptedBankAccount: (0, pg_core_1.text)("encrypted_bank_account"),
    decryptedSin: (0, pg_core_1.text)("decrypted_sin"),
    decryptedSsn: (0, pg_core_1.text)("decrypted_ssn"),
    decryptedBankAccount: (0, pg_core_1.text)("decrypted_bank_account"),
});
exports.piiAccessLog = (0, pg_core_1.pgTable)("pii_access_log", {
    logId: (0, pg_core_1.uuid)("log_id").defaultRandom().primaryKey().notNull(),
    tableName: (0, pg_core_1.varchar)("table_name", { length: 100 }).notNull(),
    recordId: (0, pg_core_1.uuid)("record_id"),
    columnName: (0, pg_core_1.varchar)("column_name", { length: 100 }).notNull(),
    accessedBy: (0, pg_core_1.text)("accessed_by").notNull(),
    accessedAt: (0, pg_core_1.timestamp)("accessed_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 20 }).notNull(),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    application: (0, pg_core_1.varchar)("application", { length: 100 }),
}, (table) => {
    return {
        idxPiiAccessLogAccessedAt: (0, pg_core_1.index)("idx_pii_access_log_accessed_at").using("btree", table.accessedAt.desc().nullsFirst()),
        idxPiiAccessLogAccessedBy: (0, pg_core_1.index)("idx_pii_access_log_accessed_by").using("btree", table.accessedBy.asc().nullsLast(), table.accessedAt.desc().nullsFirst()),
    };
});
exports.reports = (0, pg_core_1.pgTable)("reports", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    reportType: (0, exports.reportType)("report_type").default('custom').notNull(),
    category: (0, exports.reportCategory)("category").default('custom').notNull(),
    config: (0, pg_core_1.jsonb)("config").notNull(),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false).notNull(),
    isTemplate: (0, pg_core_1.boolean)("is_template").default(false).notNull(),
    templateId: (0, pg_core_1.uuid)("template_id"),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    updatedBy: (0, pg_core_1.uuid)("updated_by"),
    lastRunAt: (0, pg_core_1.timestamp)("last_run_at", { mode: 'string' }),
    runCount: (0, pg_core_1.integer)("run_count").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxReportsCreatedBy: (0, pg_core_1.index)("idx_reports_created_by").using("btree", table.createdBy.asc().nullsLast()),
        idxReportsTenantId: (0, pg_core_1.index)("idx_reports_tenant_id").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.reportTemplates = (0, pg_core_1.pgTable)("report_templates", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, exports.reportCategory)("category").notNull(),
    config: (0, pg_core_1.jsonb)("config").notNull(),
    isSystem: (0, pg_core_1.boolean)("is_system").default(false).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    thumbnail: (0, pg_core_1.varchar)("thumbnail", { length: 500 }),
    tags: (0, pg_core_1.jsonb)("tags"),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
exports.reportExecutions = (0, pg_core_1.pgTable)("report_executions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    reportId: (0, pg_core_1.uuid)("report_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    executedBy: (0, pg_core_1.uuid)("executed_by").notNull(),
    executedAt: (0, pg_core_1.timestamp)("executed_at", { mode: 'string' }).defaultNow().notNull(),
    format: (0, exports.reportFormat)("format").default('pdf').notNull(),
    parameters: (0, pg_core_1.jsonb)("parameters"),
    resultCount: (0, pg_core_1.varchar)("result_count", { length: 50 }),
    executionTimeMs: (0, pg_core_1.varchar)("execution_time_ms", { length: 50 }),
    fileUrl: (0, pg_core_1.varchar)("file_url", { length: 500 }),
    fileSize: (0, pg_core_1.varchar)("file_size", { length: 50 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('completed').notNull(),
    errorMessage: (0, pg_core_1.text)("error_message"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxReportExecutionsReportId: (0, pg_core_1.index)("idx_report_executions_report_id").using("btree", table.reportId.asc().nullsLast()),
    };
});
exports.scheduledReports = (0, pg_core_1.pgTable)("scheduled_reports", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    reportId: (0, pg_core_1.uuid)("report_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    frequency: (0, exports.scheduleFrequency)("frequency").notNull(),
    dayOfWeek: (0, pg_core_1.varchar)("day_of_week", { length: 20 }),
    dayOfMonth: (0, pg_core_1.varchar)("day_of_month", { length: 20 }),
    timeOfDay: (0, pg_core_1.varchar)("time_of_day", { length: 10 }).notNull(),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 100 }).default('UTC').notNull(),
    format: (0, exports.reportFormat)("format").default('pdf').notNull(),
    recipients: (0, pg_core_1.jsonb)("recipients").notNull(),
    parameters: (0, pg_core_1.jsonb)("parameters"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    lastExecutedAt: (0, pg_core_1.timestamp)("last_executed_at", { mode: 'string' }),
    nextExecutionAt: (0, pg_core_1.timestamp)("next_execution_at", { mode: 'string' }),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxScheduledReportsNextExecution: (0, pg_core_1.index)("idx_scheduled_reports_next_execution").using("btree", table.nextExecutionAt.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(is_active = true)`),
    };
});
exports.reportShares = (0, pg_core_1.pgTable)("report_shares", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    reportId: (0, pg_core_1.uuid)("report_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    sharedBy: (0, pg_core_1.uuid)("shared_by").notNull(),
    sharedWith: (0, pg_core_1.uuid)("shared_with"),
    sharedWithEmail: (0, pg_core_1.varchar)("shared_with_email", { length: 255 }),
    permission: (0, pg_core_1.varchar)("permission", { length: 50 }).default('viewer').notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
});
exports.deadlineRules = (0, pg_core_1.pgTable)("deadline_rules", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    ruleName: (0, pg_core_1.varchar)("rule_name", { length: 255 }).notNull(),
    ruleCode: (0, pg_core_1.varchar)("rule_code", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    claimType: (0, pg_core_1.varchar)("claim_type", { length: 100 }),
    priorityLevel: (0, pg_core_1.varchar)("priority_level", { length: 50 }),
    stepNumber: (0, pg_core_1.integer)("step_number"),
    daysFromEvent: (0, pg_core_1.integer)("days_from_event").notNull(),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).default('claim_filed').notNull(),
    businessDaysOnly: (0, pg_core_1.boolean)("business_days_only").default(true).notNull(),
    allowsExtension: (0, pg_core_1.boolean)("allows_extension").default(true).notNull(),
    maxExtensionDays: (0, pg_core_1.integer)("max_extension_days").default(30).notNull(),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(true).notNull(),
    escalateToRole: (0, pg_core_1.varchar)("escalate_to_role", { length: 100 }),
    escalationDelayDays: (0, pg_core_1.integer)("escalation_delay_days").default(0).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    isSystemRule: (0, pg_core_1.boolean)("is_system_rule").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxDeadlineRulesTenantId: (0, pg_core_1.index)("idx_deadline_rules_tenant_id").using("btree", table.tenantId.asc().nullsLast()),
    };
});
exports.claimDeadlines = (0, pg_core_1.pgTable)("claim_deadlines", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    claimId: (0, pg_core_1.uuid)("claim_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    deadlineRuleId: (0, pg_core_1.uuid)("deadline_rule_id"),
    deadlineName: (0, pg_core_1.varchar)("deadline_name", { length: 255 }).notNull(),
    deadlineType: (0, pg_core_1.varchar)("deadline_type", { length: 100 }).notNull(),
    eventDate: (0, pg_core_1.timestamp)("event_date", { mode: 'string' }).notNull(),
    originalDeadline: (0, pg_core_1.timestamp)("original_deadline", { mode: 'string' }).notNull(),
    dueDate: (0, pg_core_1.timestamp)("due_date", { mode: 'string' }).notNull(),
    completedAt: (0, pg_core_1.timestamp)("completed_at", { mode: 'string' }),
    status: (0, exports.deadlineStatus)("status").default('pending').notNull(),
    priority: (0, exports.deadlinePriority)("priority").default('medium').notNull(),
    extensionCount: (0, pg_core_1.integer)("extension_count").default(0).notNull(),
    totalExtensionDays: (0, pg_core_1.integer)("total_extension_days").default(0).notNull(),
    lastExtensionDate: (0, pg_core_1.timestamp)("last_extension_date", { mode: 'string' }),
    lastExtensionReason: (0, pg_core_1.text)("last_extension_reason"),
    completedBy: (0, pg_core_1.uuid)("completed_by"),
    completionNotes: (0, pg_core_1.text)("completion_notes"),
    isOverdue: (0, pg_core_1.boolean)("is_overdue").default(false).notNull(),
    daysUntilDue: (0, pg_core_1.integer)("days_until_due"),
    daysOverdue: (0, pg_core_1.integer)("days_overdue").default(0).notNull(),
    escalatedAt: (0, pg_core_1.timestamp)("escalated_at", { mode: 'string' }),
    escalatedTo: (0, pg_core_1.uuid)("escalated_to"),
    alertCount: (0, pg_core_1.integer)("alert_count").default(0).notNull(),
    lastAlertSent: (0, pg_core_1.timestamp)("last_alert_sent", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxClaimDeadlinesClaimId: (0, pg_core_1.index)("idx_claim_deadlines_claim_id").using("btree", table.claimId.asc().nullsLast()),
        idxClaimDeadlinesDueDate: (0, pg_core_1.index)("idx_claim_deadlines_due_date").using("btree", table.dueDate.asc().nullsLast()),
        idxClaimDeadlinesStatus: (0, pg_core_1.index)("idx_claim_deadlines_status").using("btree", table.status.asc().nullsLast()),
    };
});
exports.deadlineExtensions = (0, pg_core_1.pgTable)("deadline_extensions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    deadlineId: (0, pg_core_1.uuid)("deadline_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    requestedBy: (0, pg_core_1.uuid)("requested_by").notNull(),
    requestedAt: (0, pg_core_1.timestamp)("requested_at", { mode: 'string' }).defaultNow().notNull(),
    requestedDays: (0, pg_core_1.integer)("requested_days").notNull(),
    requestReason: (0, pg_core_1.text)("request_reason").notNull(),
    status: (0, exports.extensionStatus)("status").default('pending').notNull(),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(true).notNull(),
    approvedBy: (0, pg_core_1.uuid)("approved_by"),
    approvalDecisionAt: (0, pg_core_1.timestamp)("approval_decision_at", { mode: 'string' }),
    approvalNotes: (0, pg_core_1.text)("approval_notes"),
    newDeadline: (0, pg_core_1.timestamp)("new_deadline", { mode: 'string' }),
    daysGranted: (0, pg_core_1.integer)("days_granted"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxDeadlineExtensionsDeadlineId: (0, pg_core_1.index)("idx_deadline_extensions_deadline_id").using("btree", table.deadlineId.asc().nullsLast()),
    };
});
exports.deadlineAlerts = (0, pg_core_1.pgTable)("deadline_alerts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    deadlineId: (0, pg_core_1.uuid)("deadline_id").notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }).notNull(),
    alertType: (0, pg_core_1.varchar)("alert_type", { length: 100 }).notNull(),
    alertSeverity: (0, exports.alertSeverity)("alert_severity").notNull(),
    alertTrigger: (0, pg_core_1.varchar)("alert_trigger", { length: 100 }).notNull(),
    recipientId: (0, pg_core_1.uuid)("recipient_id").notNull(),
    recipientRole: (0, pg_core_1.varchar)("recipient_role", { length: 100 }),
    deliveryMethod: (0, exports.deliveryMethod)("delivery_method").notNull(),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { mode: 'string' }).defaultNow().notNull(),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at", { mode: 'string' }),
    deliveryStatus: (0, exports.deliveryStatus)("delivery_status").default('pending').notNull(),
    deliveryError: (0, pg_core_1.text)("delivery_error"),
    viewedAt: (0, pg_core_1.timestamp)("viewed_at", { mode: 'string' }),
    acknowledgedAt: (0, pg_core_1.timestamp)("acknowledged_at", { mode: 'string' }),
    actionTaken: (0, pg_core_1.varchar)("action_taken", { length: 255 }),
    actionTakenAt: (0, pg_core_1.timestamp)("action_taken_at", { mode: 'string' }),
    subject: (0, pg_core_1.varchar)("subject", { length: 500 }),
    message: (0, pg_core_1.text)("message"),
    actionUrl: (0, pg_core_1.varchar)("action_url", { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxDeadlineAlertsDeadlineId: (0, pg_core_1.index)("idx_deadline_alerts_deadline_id").using("btree", table.deadlineId.asc().nullsLast()),
    };
});
exports.holidays = (0, pg_core_1.pgTable)("holidays", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }),
    holidayDate: (0, pg_core_1.timestamp)("holiday_date", { mode: 'string' }).notNull(),
    holidayName: (0, pg_core_1.varchar)("holiday_name", { length: 255 }).notNull(),
    holidayType: (0, pg_core_1.varchar)("holiday_type", { length: 100 }).notNull(),
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false).notNull(),
    appliesTo: (0, pg_core_1.varchar)("applies_to", { length: 100 }).default('all').notNull(),
    isObserved: (0, pg_core_1.boolean)("is_observed").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
});
exports.calendars = (0, pg_core_1.pgTable)("calendars", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    color: (0, pg_core_1.varchar)("color", { length: 7 }).default('#3B82F6'),
    icon: (0, pg_core_1.varchar)("icon", { length: 50 }),
    ownerId: (0, pg_core_1.text)("owner_id").notNull(),
    isPersonal: (0, pg_core_1.boolean)("is_personal").default(true),
    isShared: (0, pg_core_1.boolean)("is_shared").default(false),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    externalProvider: (0, pg_core_1.varchar)("external_provider", { length: 50 }),
    externalCalendarId: (0, pg_core_1.text)("external_calendar_id"),
    syncEnabled: (0, pg_core_1.boolean)("sync_enabled").default(false),
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at", { mode: 'string' }),
    syncStatus: (0, exports.syncStatus)("sync_status").default('disconnected'),
    syncToken: (0, pg_core_1.text)("sync_token"),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 100 }).default('America/New_York'),
    defaultEventDuration: (0, pg_core_1.integer)("default_event_duration").default(60),
    reminderDefaultMinutes: (0, pg_core_1.integer)("reminder_default_minutes").default(15),
    allowOverlap: (0, pg_core_1.boolean)("allow_overlap").default(true),
    requireApproval: (0, pg_core_1.boolean)("require_approval").default(false),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxCalendarsOwnerId: (0, pg_core_1.index)("idx_calendars_owner_id").using("btree", table.ownerId.asc().nullsLast()),
    };
});
exports.calendarEvents = (0, pg_core_1.pgTable)("calendar_events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    calendarId: (0, pg_core_1.uuid)("calendar_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    location: (0, pg_core_1.text)("location"),
    locationUrl: (0, pg_core_1.text)("location_url"),
    startTime: (0, pg_core_1.timestamp)("start_time", { mode: 'string' }).notNull(),
    endTime: (0, pg_core_1.timestamp)("end_time", { mode: 'string' }).notNull(),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 100 }).default('America/New_York'),
    isAllDay: (0, pg_core_1.boolean)("is_all_day").default(false),
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"),
    recurrenceExceptions: (0, pg_core_1.jsonb)("recurrence_exceptions"),
    parentEventId: (0, pg_core_1.uuid)("parent_event_id"),
    eventType: (0, exports.eventType)("event_type").default('meeting'),
    status: (0, exports.eventStatus)("status").default('scheduled'),
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }).default('normal'),
    claimId: (0, pg_core_1.text)("claim_id"),
    caseNumber: (0, pg_core_1.text)("case_number"),
    memberId: (0, pg_core_1.text)("member_id"),
    meetingRoomId: (0, pg_core_1.uuid)("meeting_room_id"),
    meetingUrl: (0, pg_core_1.text)("meeting_url"),
    meetingPassword: (0, pg_core_1.text)("meeting_password"),
    agenda: (0, pg_core_1.text)("agenda"),
    organizerId: (0, pg_core_1.text)("organizer_id").notNull(),
    reminders: (0, pg_core_1.jsonb)("reminders").default([15]),
    externalEventId: (0, pg_core_1.text)("external_event_id"),
    externalProvider: (0, pg_core_1.varchar)("external_provider", { length: 50 }),
    externalHtmlLink: (0, pg_core_1.text)("external_html_link"),
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at", { mode: 'string' }),
    isPrivate: (0, pg_core_1.boolean)("is_private").default(false),
    visibility: (0, pg_core_1.varchar)("visibility", { length: 20 }).default('default'),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    attachments: (0, pg_core_1.jsonb)("attachments"),
    createdBy: (0, pg_core_1.text)("created_by").notNull(),
    cancelledAt: (0, pg_core_1.timestamp)("cancelled_at", { mode: 'string' }),
    cancelledBy: (0, pg_core_1.text)("cancelled_by"),
    cancellationReason: (0, pg_core_1.text)("cancellation_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxCalendarEventsCalendarId: (0, pg_core_1.index)("idx_calendar_events_calendar_id").using("btree", table.calendarId.asc().nullsLast()),
        idxCalendarEventsOrganizerId: (0, pg_core_1.index)("idx_calendar_events_organizer_id").using("btree", table.organizerId.asc().nullsLast()),
        idxCalendarEventsStartTime: (0, pg_core_1.index)("idx_calendar_events_start_time").using("btree", table.startTime.asc().nullsLast()),
        calendarEventsCalendarIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.calendarId],
            foreignColumns: [exports.calendars.id],
            name: "calendar_events_calendar_id_fk"
        }).onDelete("cascade"),
    };
});
exports.eventAttendees = (0, pg_core_1.pgTable)("event_attendees", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    eventId: (0, pg_core_1.uuid)("event_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    userId: (0, pg_core_1.text)("user_id"),
    email: (0, pg_core_1.text)("email").notNull(),
    name: (0, pg_core_1.text)("name"),
    status: (0, exports.attendeeStatus)("status").default('invited'),
    isOptional: (0, pg_core_1.boolean)("is_optional").default(false),
    isOrganizer: (0, pg_core_1.boolean)("is_organizer").default(false),
    respondedAt: (0, pg_core_1.timestamp)("responded_at", { mode: 'string' }),
    responseComment: (0, pg_core_1.text)("response_comment"),
    notificationSent: (0, pg_core_1.boolean)("notification_sent").default(false),
    lastNotificationAt: (0, pg_core_1.timestamp)("last_notification_at", { mode: 'string' }),
    externalAttendeeId: (0, pg_core_1.text)("external_attendee_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxEventAttendeesEventId: (0, pg_core_1.index)("idx_event_attendees_event_id").using("btree", table.eventId.asc().nullsLast()),
        idxEventAttendeesUserId: (0, pg_core_1.index)("idx_event_attendees_user_id").using("btree", table.userId.asc().nullsLast()),
        eventAttendeesEventIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.eventId],
            foreignColumns: [exports.calendarEvents.id],
            name: "event_attendees_event_id_fk"
        }).onDelete("cascade"),
    };
});
exports.meetingRooms = (0, pg_core_1.pgTable)("meeting_rooms", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    displayName: (0, pg_core_1.text)("display_name"),
    description: (0, pg_core_1.text)("description"),
    buildingName: (0, pg_core_1.varchar)("building_name", { length: 200 }),
    floor: (0, pg_core_1.varchar)("floor", { length: 50 }),
    roomNumber: (0, pg_core_1.varchar)("room_number", { length: 50 }),
    address: (0, pg_core_1.text)("address"),
    capacity: (0, pg_core_1.integer)("capacity").default(10),
    features: (0, pg_core_1.jsonb)("features"),
    equipment: (0, pg_core_1.jsonb)("equipment"),
    status: (0, exports.roomStatus)("status").default('available'),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(false),
    minBookingDuration: (0, pg_core_1.integer)("min_booking_duration").default(30),
    maxBookingDuration: (0, pg_core_1.integer)("max_booking_duration").default(480),
    advanceBookingDays: (0, pg_core_1.integer)("advance_booking_days").default(90),
    operatingHours: (0, pg_core_1.jsonb)("operating_hours"),
    allowedUserRoles: (0, pg_core_1.jsonb)("allowed_user_roles"),
    blockedDates: (0, pg_core_1.jsonb)("blocked_dates"),
    contactPersonId: (0, pg_core_1.text)("contact_person_id"),
    contactEmail: (0, pg_core_1.text)("contact_email"),
    contactPhone: (0, pg_core_1.varchar)("contact_phone", { length: 20 }),
    imageUrl: (0, pg_core_1.text)("image_url"),
    floorPlanUrl: (0, pg_core_1.text)("floor_plan_url"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
exports.roomBookings = (0, pg_core_1.pgTable)("room_bookings", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    roomId: (0, pg_core_1.uuid)("room_id").notNull(),
    eventId: (0, pg_core_1.uuid)("event_id"),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    bookedBy: (0, pg_core_1.text)("booked_by").notNull(),
    bookedFor: (0, pg_core_1.text)("booked_for"),
    purpose: (0, pg_core_1.text)("purpose").notNull(),
    startTime: (0, pg_core_1.timestamp)("start_time", { mode: 'string' }).notNull(),
    endTime: (0, pg_core_1.timestamp)("end_time", { mode: 'string' }).notNull(),
    setupRequired: (0, pg_core_1.boolean)("setup_required").default(false),
    setupTime: (0, pg_core_1.integer)("setup_time").default(0),
    cateringRequired: (0, pg_core_1.boolean)("catering_required").default(false),
    cateringNotes: (0, pg_core_1.text)("catering_notes"),
    specialRequests: (0, pg_core_1.text)("special_requests"),
    status: (0, exports.eventStatus)("status").default('scheduled'),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(false),
    approvedBy: (0, pg_core_1.text)("approved_by"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { mode: 'string' }),
    approvalNotes: (0, pg_core_1.text)("approval_notes"),
    checkedInAt: (0, pg_core_1.timestamp)("checked_in_at", { mode: 'string' }),
    checkedInBy: (0, pg_core_1.text)("checked_in_by"),
    checkedOutAt: (0, pg_core_1.timestamp)("checked_out_at", { mode: 'string' }),
    actualEndTime: (0, pg_core_1.timestamp)("actual_end_time", { mode: 'string' }),
    cancelledAt: (0, pg_core_1.timestamp)("cancelled_at", { mode: 'string' }),
    cancelledBy: (0, pg_core_1.text)("cancelled_by"),
    cancellationReason: (0, pg_core_1.text)("cancellation_reason"),
    attendeeCount: (0, pg_core_1.integer)("attendee_count"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxRoomBookingsRoomId: (0, pg_core_1.index)("idx_room_bookings_room_id").using("btree", table.roomId.asc().nullsLast()),
        idxRoomBookingsStartTime: (0, pg_core_1.index)("idx_room_bookings_start_time").using("btree", table.startTime.asc().nullsLast()),
        roomBookingsEventIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.eventId],
            foreignColumns: [exports.calendarEvents.id],
            name: "room_bookings_event_id_fk"
        }).onDelete("set null"),
        roomBookingsRoomIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.roomId],
            foreignColumns: [exports.meetingRooms.id],
            name: "room_bookings_room_id_fk"
        }).onDelete("cascade"),
    };
});
exports.calendarSharing = (0, pg_core_1.pgTable)("calendar_sharing", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    calendarId: (0, pg_core_1.uuid)("calendar_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    sharedWithUserId: (0, pg_core_1.text)("shared_with_user_id"),
    sharedWithEmail: (0, pg_core_1.text)("shared_with_email"),
    sharedWithRole: (0, pg_core_1.varchar)("shared_with_role", { length: 50 }),
    permission: (0, exports.calendarPermission)("permission").default('viewer'),
    canCreateEvents: (0, pg_core_1.boolean)("can_create_events").default(false),
    canEditEvents: (0, pg_core_1.boolean)("can_edit_events").default(false),
    canDeleteEvents: (0, pg_core_1.boolean)("can_delete_events").default(false),
    canShare: (0, pg_core_1.boolean)("can_share").default(false),
    invitedBy: (0, pg_core_1.text)("invited_by").notNull(),
    invitedAt: (0, pg_core_1.timestamp)("invited_at", { mode: 'string' }).defaultNow().notNull(),
    acceptedAt: (0, pg_core_1.timestamp)("accepted_at", { mode: 'string' }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        calendarSharingCalendarIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.calendarId],
            foreignColumns: [exports.calendars.id],
            name: "calendar_sharing_calendar_id_fk"
        }).onDelete("cascade"),
    };
});
exports.externalCalendarConnections = (0, pg_core_1.pgTable)("external_calendar_connections", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    provider: (0, pg_core_1.varchar)("provider", { length: 50 }).notNull(),
    providerAccountId: (0, pg_core_1.text)("provider_account_id").notNull(),
    providerEmail: (0, pg_core_1.text)("provider_email"),
    accessToken: (0, pg_core_1.text)("access_token").notNull(),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    tokenExpiresAt: (0, pg_core_1.timestamp)("token_expires_at", { mode: 'string' }),
    scope: (0, pg_core_1.text)("scope"),
    syncEnabled: (0, pg_core_1.boolean)("sync_enabled").default(true),
    syncDirection: (0, pg_core_1.varchar)("sync_direction", { length: 20 }).default('both'),
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at", { mode: 'string' }),
    nextSyncAt: (0, pg_core_1.timestamp)("next_sync_at", { mode: 'string' }),
    syncStatus: (0, exports.syncStatus)("sync_status").default('synced'),
    syncError: (0, pg_core_1.text)("sync_error"),
    syncPastDays: (0, pg_core_1.integer)("sync_past_days").default(30),
    syncFutureDays: (0, pg_core_1.integer)("sync_future_days").default(365),
    syncOnlyFreeTime: (0, pg_core_1.boolean)("sync_only_free_time").default(false),
    calendarMappings: (0, pg_core_1.jsonb)("calendar_mappings"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
exports.eventReminders = (0, pg_core_1.pgTable)("event_reminders", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    eventId: (0, pg_core_1.uuid)("event_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    reminderMinutes: (0, pg_core_1.integer)("reminder_minutes").notNull(),
    reminderType: (0, pg_core_1.varchar)("reminder_type", { length: 20 }).default('notification'),
    scheduledFor: (0, pg_core_1.timestamp)("scheduled_for", { mode: 'string' }).notNull(),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { mode: 'string' }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default('pending'),
    error: (0, pg_core_1.text)("error"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        eventRemindersEventIdFk: (0, pg_core_1.foreignKey)({
            columns: [table.eventId],
            foreignColumns: [exports.calendarEvents.id],
            name: "event_reminders_event_id_fk"
        }).onDelete("cascade"),
    };
});
exports.notificationHistory = (0, pg_core_1.pgTable)("notification_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.text)("user_id"),
    tenantId: (0, pg_core_1.text)("tenant_id"),
    recipient: (0, pg_core_1.text)("recipient").notNull(),
    channel: (0, exports.notificationChannel)("channel").notNull(),
    subject: (0, pg_core_1.text)("subject"),
    template: (0, pg_core_1.text)("template"),
    status: (0, exports.notificationStatus)("status").notNull(),
    error: (0, pg_core_1.text)("error"),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { mode: 'string' }).notNull(),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at", { mode: 'string' }),
    openedAt: (0, pg_core_1.timestamp)("opened_at", { mode: 'string' }),
    clickedAt: (0, pg_core_1.timestamp)("clicked_at", { mode: 'string' }),
    metadata: (0, pg_core_1.jsonb)("metadata"),
}, (table) => {
    return {
        idxNotificationHistoryUserId: (0, pg_core_1.index)("idx_notification_history_user_id").using("btree", table.userId.asc().nullsLast()),
    };
});
exports.memberDocuments = (0, pg_core_1.pgTable)("member_documents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    fileUrl: (0, pg_core_1.text)("file_url").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(),
    fileType: (0, pg_core_1.text)("file_type").notNull(),
    category: (0, pg_core_1.text)("category").default('General'),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        idxMemberDocumentsCategory: (0, pg_core_1.index)("idx_member_documents_category").using("btree", table.category.asc().nullsLast()),
        idxMemberDocumentsUserId: (0, pg_core_1.index)("idx_member_documents_user_id").using("btree", table.userId.asc().nullsLast()),
    };
});
exports.memberPoliticalParticipation = (0, pg_core_1.pgTable)("member_political_participation", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    copeMember: (0, pg_core_1.boolean)("cope_member").default(false),
    copeEnrollmentDate: (0, pg_core_1.date)("cope_enrollment_date"),
    copeContributionsTotal: (0, pg_core_1.numeric)("cope_contributions_total", { precision: 10, scale: 2 }).default('0.00'),
    engagementLevel: (0, pg_core_1.varchar)("engagement_level", { length: 50 }),
    campaignsParticipated: (0, pg_core_1.jsonb)("campaigns_participated"),
    activitiesCount: (0, pg_core_1.integer)("activities_count").default(0),
    meetingsAttended: (0, pg_core_1.integer)("meetings_attended").default(0),
    lettersWritten: (0, pg_core_1.integer)("letters_written").default(0),
    callsMade: (0, pg_core_1.integer)("calls_made").default(0),
    hoursVolunteered: (0, pg_core_1.integer)("hours_volunteered").default(0),
    politicalSkills: (0, pg_core_1.jsonb)("political_skills"),
    issueInterests: (0, pg_core_1.jsonb)("issue_interests"),
    preferredEngagement: (0, pg_core_1.jsonb)("preferred_engagement"),
    availableWeekdays: (0, pg_core_1.boolean)("available_weekdays").default(false),
    availableEvenings: (0, pg_core_1.boolean)("available_evenings").default(true),
    availableWeekends: (0, pg_core_1.boolean)("available_weekends").default(true),
    federalRiding: (0, pg_core_1.varchar)("federal_riding", { length: 200 }),
    provincialRiding: (0, pg_core_1.varchar)("provincial_riding", { length: 200 }),
    municipalWard: (0, pg_core_1.varchar)("municipal_ward", { length: 200 }),
    registeredToVote: (0, pg_core_1.boolean)("registered_to_vote"),
    voterRegistrationVerifiedDate: (0, pg_core_1.date)("voter_registration_verified_date"),
    politicalTrainingCompleted: (0, pg_core_1.boolean)("political_training_completed").default(false),
    trainingCompletionDate: (0, pg_core_1.date)("training_completion_date"),
    contactForCampaigns: (0, pg_core_1.boolean)("contact_for_campaigns").default(true),
    contactMethodPreference: (0, pg_core_1.varchar)("contact_method_preference", { length: 50 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxMemberPoliticalParticipationCope: (0, pg_core_1.index)("idx_member_political_participation_cope").using("btree", table.copeMember.asc().nullsLast()),
        idxMemberPoliticalParticipationEngagement: (0, pg_core_1.index)("idx_member_political_participation_engagement").using("btree", table.engagementLevel.asc().nullsLast()),
        idxMemberPoliticalParticipationMember: (0, pg_core_1.index)("idx_member_political_participation_member").using("btree", table.memberId.asc().nullsLast()),
        idxMemberPoliticalParticipationOrg: (0, pg_core_1.index)("idx_member_political_participation_org").using("btree", table.organizationId.asc().nullsLast()),
        memberPoliticalParticipationMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "member_political_participation_member_id_fkey"
        }),
        memberPoliticalParticipationOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "member_political_participation_organization_id_fkey"
        }),
    };
});
exports.electedOfficials = (0, pg_core_1.pgTable)("elected_officials", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }).notNull(),
    fullName: (0, pg_core_1.varchar)("full_name", { length: 200 }),
    preferredName: (0, pg_core_1.varchar)("preferred_name", { length: 200 }),
    honorific: (0, pg_core_1.varchar)("honorific", { length: 50 }),
    officeTitle: (0, pg_core_1.varchar)("office_title", { length: 200 }),
    governmentLevel: (0, exports.governmentLevel)("government_level").notNull(),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 200 }),
    electoralDistrict: (0, pg_core_1.varchar)("electoral_district", { length: 200 }),
    districtNumber: (0, pg_core_1.varchar)("district_number", { length: 50 }),
    politicalParty: (0, exports.politicalParty)("political_party"),
    partyCaucusRole: (0, pg_core_1.varchar)("party_caucus_role", { length: 100 }),
    parliamentHillOfficePhone: (0, pg_core_1.varchar)("parliament_hill_office_phone", { length: 50 }),
    parliamentHillOfficeAddress: (0, pg_core_1.text)("parliament_hill_office_address"),
    constituencyOfficePhone: (0, pg_core_1.varchar)("constituency_office_phone", { length: 50 }),
    constituencyOfficeAddress: (0, pg_core_1.text)("constituency_office_address"),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    websiteUrl: (0, pg_core_1.text)("website_url"),
    twitterHandle: (0, pg_core_1.varchar)("twitter_handle", { length: 100 }),
    facebookUrl: (0, pg_core_1.text)("facebook_url"),
    linkedinUrl: (0, pg_core_1.text)("linkedin_url"),
    chiefOfStaffName: (0, pg_core_1.varchar)("chief_of_staff_name", { length: 200 }),
    chiefOfStaffEmail: (0, pg_core_1.varchar)("chief_of_staff_email", { length: 255 }),
    chiefOfStaffPhone: (0, pg_core_1.varchar)("chief_of_staff_phone", { length: 50 }),
    legislativeAssistantName: (0, pg_core_1.varchar)("legislative_assistant_name", { length: 200 }),
    legislativeAssistantEmail: (0, pg_core_1.varchar)("legislative_assistant_email", { length: 255 }),
    committeeMemberships: (0, pg_core_1.jsonb)("committee_memberships"),
    cabinetPosition: (0, pg_core_1.varchar)("cabinet_position", { length: 200 }),
    criticPortfolios: (0, pg_core_1.jsonb)("critic_portfolios"),
    firstElectedDate: (0, pg_core_1.date)("first_elected_date"),
    currentTermStartDate: (0, pg_core_1.date)("current_term_start_date"),
    currentTermEndDate: (0, pg_core_1.date)("current_term_end_date"),
    previousTermsCount: (0, pg_core_1.integer)("previous_terms_count").default(0),
    laborFriendlyRating: (0, pg_core_1.integer)("labor_friendly_rating"),
    previousUnionMember: (0, pg_core_1.boolean)("previous_union_member").default(false),
    previousUnionName: (0, pg_core_1.varchar)("previous_union_name", { length: 200 }),
    votedForLaborBills: (0, pg_core_1.integer)("voted_for_labor_bills").default(0),
    votedAgainstLaborBills: (0, pg_core_1.integer)("voted_against_labor_bills").default(0),
    lastContactDate: (0, pg_core_1.date)("last_contact_date"),
    totalMeetingsHeld: (0, pg_core_1.integer)("total_meetings_held").default(0),
    totalLettersSent: (0, pg_core_1.integer)("total_letters_sent").default(0),
    responsive: (0, pg_core_1.boolean)("responsive"),
    responsivenessNotes: (0, pg_core_1.text)("responsiveness_notes"),
    unionEndorsed: (0, pg_core_1.boolean)("union_endorsed").default(false),
    unionContributionAmount: (0, pg_core_1.numeric)("union_contribution_amount", { precision: 10, scale: 2 }),
    volunteersProvided: (0, pg_core_1.integer)("volunteers_provided").default(0),
    isCurrent: (0, pg_core_1.boolean)("is_current").default(true),
    defeatDate: (0, pg_core_1.date)("defeat_date"),
    retirementDate: (0, pg_core_1.date)("retirement_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxElectedOfficialsCurrent: (0, pg_core_1.index)("idx_elected_officials_current").using("btree", table.isCurrent.asc().nullsLast()),
        idxElectedOfficialsDistrict: (0, pg_core_1.index)("idx_elected_officials_district").using("btree", table.electoralDistrict.asc().nullsLast()),
        idxElectedOfficialsLevel: (0, pg_core_1.index)("idx_elected_officials_level").using("btree", table.governmentLevel.asc().nullsLast()),
        idxElectedOfficialsOrg: (0, pg_core_1.index)("idx_elected_officials_org").using("btree", table.organizationId.asc().nullsLast()),
        idxElectedOfficialsParty: (0, pg_core_1.index)("idx_elected_officials_party").using("btree", table.politicalParty.asc().nullsLast()),
        electedOfficialsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "elected_officials_organization_id_fkey"
        }),
    };
});
exports.legislationTracking = (0, pg_core_1.pgTable)("legislation_tracking", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    billNumber: (0, pg_core_1.varchar)("bill_number", { length: 50 }).notNull(),
    billTitle: (0, pg_core_1.varchar)("bill_title", { length: 500 }).notNull(),
    shortTitle: (0, pg_core_1.varchar)("short_title", { length: 200 }),
    governmentLevel: (0, exports.governmentLevel)("government_level").notNull(),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 200 }),
    legislativeSession: (0, pg_core_1.varchar)("legislative_session", { length: 100 }),
    billType: (0, pg_core_1.varchar)("bill_type", { length: 50 }),
    sponsorName: (0, pg_core_1.varchar)("sponsor_name", { length: 200 }),
    sponsorParty: (0, exports.politicalParty)("sponsor_party"),
    sponsorOfficialId: (0, pg_core_1.uuid)("sponsor_official_id"),
    billSummary: (0, pg_core_1.text)("bill_summary"),
    impactOnLabor: (0, pg_core_1.text)("impact_on_labor"),
    keyProvisions: (0, pg_core_1.text)("key_provisions"),
    currentStatus: (0, exports.billStatus)("current_status").default('introduced'),
    introductionDate: (0, pg_core_1.date)("introduction_date"),
    firstReadingDate: (0, pg_core_1.date)("first_reading_date"),
    secondReadingDate: (0, pg_core_1.date)("second_reading_date"),
    committeeReferralDate: (0, pg_core_1.date)("committee_referral_date"),
    committeeName: (0, pg_core_1.varchar)("committee_name", { length: 200 }),
    thirdReadingDate: (0, pg_core_1.date)("third_reading_date"),
    passedDate: (0, pg_core_1.date)("passed_date"),
    royalAssentDate: (0, pg_core_1.date)("royal_assent_date"),
    unionPosition: (0, exports.unionPosition)("union_position").default('monitoring'),
    positionRationale: (0, pg_core_1.text)("position_rationale"),
    activeCampaign: (0, pg_core_1.boolean)("active_campaign").default(false),
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    committeePresentationScheduled: (0, pg_core_1.boolean)("committee_presentation_scheduled").default(false),
    committeePresentationDate: (0, pg_core_1.date)("committee_presentation_date"),
    writtenSubmissionFiled: (0, pg_core_1.boolean)("written_submission_filed").default(false),
    writtenSubmissionUrl: (0, pg_core_1.text)("written_submission_url"),
    membersContactedMp: (0, pg_core_1.integer)("members_contacted_mp").default(0),
    lettersSentToMps: (0, pg_core_1.integer)("letters_sent_to_mps").default(0),
    petitionSignatures: (0, pg_core_1.integer)("petition_signatures").default(0),
    amendmentsProposed: (0, pg_core_1.jsonb)("amendments_proposed"),
    amendmentsAdopted: (0, pg_core_1.integer)("amendments_adopted").default(0),
    coalitionPartners: (0, pg_core_1.jsonb)("coalition_partners"),
    finalOutcome: (0, pg_core_1.varchar)("final_outcome", { length: 100 }),
    outcomeDate: (0, pg_core_1.date)("outcome_date"),
    outcomeImpactAssessment: (0, pg_core_1.text)("outcome_impact_assessment"),
    billTextUrl: (0, pg_core_1.text)("bill_text_url"),
    legislativeSummaryUrl: (0, pg_core_1.text)("legislative_summary_url"),
    committeeReportUrl: (0, pg_core_1.text)("committee_report_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxLegislationTrackingBill: (0, pg_core_1.index)("idx_legislation_tracking_bill").using("btree", table.billNumber.asc().nullsLast()),
        idxLegislationTrackingCampaign: (0, pg_core_1.index)("idx_legislation_tracking_campaign").using("btree", table.campaignId.asc().nullsLast()),
        idxLegislationTrackingOrg: (0, pg_core_1.index)("idx_legislation_tracking_org").using("btree", table.organizationId.asc().nullsLast()),
        idxLegislationTrackingPosition: (0, pg_core_1.index)("idx_legislation_tracking_position").using("btree", table.unionPosition.asc().nullsLast()),
        idxLegislationTrackingStatus: (0, pg_core_1.index)("idx_legislation_tracking_status").using("btree", table.currentStatus.asc().nullsLast()),
        legislationTrackingCampaignIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.campaignId],
            foreignColumns: [exports.politicalCampaigns.id],
            name: "legislation_tracking_campaign_id_fkey"
        }),
        legislationTrackingOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "legislation_tracking_organization_id_fkey"
        }),
        legislationTrackingSponsorOfficialIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.sponsorOfficialId],
            foreignColumns: [exports.electedOfficials.id],
            name: "legislation_tracking_sponsor_official_id_fkey"
        }),
    };
});
exports.politicalActivities = (0, pg_core_1.pgTable)("political_activities", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    activityType: (0, exports.politicalActivityType)("activity_type").notNull(),
    activityName: (0, pg_core_1.varchar)("activity_name", { length: 200 }),
    activityDate: (0, pg_core_1.date)("activity_date").notNull(),
    activityTime: (0, pg_core_1.time)("activity_time"),
    electedOfficialId: (0, pg_core_1.uuid)("elected_official_id"),
    electedOfficialName: (0, pg_core_1.varchar)("elected_official_name", { length: 200 }),
    legislationId: (0, pg_core_1.uuid)("legislation_id"),
    billNumber: (0, pg_core_1.varchar)("bill_number", { length: 50 }),
    location: (0, pg_core_1.varchar)("location", { length: 300 }),
    isVirtual: (0, pg_core_1.boolean)("is_virtual").default(false),
    meetingLink: (0, pg_core_1.text)("meeting_link"),
    membersParticipated: (0, pg_core_1.jsonb)("members_participated"),
    membersCount: (0, pg_core_1.integer)("members_count").default(0),
    volunteersCount: (0, pg_core_1.integer)("volunteers_count").default(0),
    doorsKnocked: (0, pg_core_1.integer)("doors_knocked").default(0),
    callsMade: (0, pg_core_1.integer)("calls_made").default(0),
    contactsReached: (0, pg_core_1.integer)("contacts_reached").default(0),
    petitionSignaturesCollected: (0, pg_core_1.integer)("petition_signatures_collected").default(0),
    outcomeSummary: (0, pg_core_1.text)("outcome_summary"),
    commitmentsReceived: (0, pg_core_1.text)("commitments_received"),
    followUpRequired: (0, pg_core_1.boolean)("follow_up_required").default(false),
    followUpDate: (0, pg_core_1.date)("follow_up_date"),
    meetingNotesUrl: (0, pg_core_1.text)("meeting_notes_url"),
    photosUrls: (0, pg_core_1.jsonb)("photos_urls"),
    mediaCoverageUrls: (0, pg_core_1.jsonb)("media_coverage_urls"),
    activityCost: (0, pg_core_1.numeric)("activity_cost", { precision: 10, scale: 2 }).default('0.00'),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxPoliticalActivitiesCampaign: (0, pg_core_1.index)("idx_political_activities_campaign").using("btree", table.campaignId.asc().nullsLast()),
        idxPoliticalActivitiesDate: (0, pg_core_1.index)("idx_political_activities_date").using("btree", table.activityDate.asc().nullsLast()),
        idxPoliticalActivitiesLegislation: (0, pg_core_1.index)("idx_political_activities_legislation").using("btree", table.legislationId.asc().nullsLast()),
        idxPoliticalActivitiesOfficial: (0, pg_core_1.index)("idx_political_activities_official").using("btree", table.electedOfficialId.asc().nullsLast()),
        idxPoliticalActivitiesOrg: (0, pg_core_1.index)("idx_political_activities_org").using("btree", table.organizationId.asc().nullsLast()),
        politicalActivitiesCampaignIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.campaignId],
            foreignColumns: [exports.politicalCampaigns.id],
            name: "political_activities_campaign_id_fkey"
        }),
        politicalActivitiesElectedOfficialIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.electedOfficialId],
            foreignColumns: [exports.electedOfficials.id],
            name: "political_activities_elected_official_id_fkey"
        }),
        politicalActivitiesLegislationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.legislationId],
            foreignColumns: [exports.legislationTracking.id],
            name: "political_activities_legislation_id_fkey"
        }),
        politicalActivitiesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "political_activities_organization_id_fkey"
        }),
    };
});
exports.vPoliticalCampaignDashboard = (0, pg_core_1.pgTable)("v_political_campaign_dashboard", {
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 300 }),
    campaignType: (0, exports.politicalCampaignType)("campaign_type"),
    campaignStatus: (0, exports.politicalCampaignStatus)("campaign_status"),
    jurisdictionLevel: (0, pg_core_1.varchar)("jurisdiction_level", { length: 50 }),
    startDate: (0, pg_core_1.date)("start_date"),
    endDate: (0, pg_core_1.date)("end_date"),
    electionDate: (0, pg_core_1.date)("election_date"),
    membersParticipated: (0, pg_core_1.integer)("members_participated"),
    memberParticipationGoal: (0, pg_core_1.integer)("member_participation_goal"),
    participationPercentage: (0, pg_core_1.numeric)("participation_percentage"),
    doorsKnocked: (0, pg_core_1.integer)("doors_knocked"),
    phoneCallsMade: (0, pg_core_1.integer)("phone_calls_made"),
    petitionSignaturesCollected: (0, pg_core_1.integer)("petition_signatures_collected"),
    budgetAllocated: (0, pg_core_1.numeric)("budget_allocated", { precision: 12, scale: 2 }),
    expensesToDate: (0, pg_core_1.numeric)("expenses_to_date", { precision: 12, scale: 2 }),
    budgetUsedPercentage: (0, pg_core_1.numeric)("budget_used_percentage"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalActivities: (0, pg_core_1.bigint)("total_activities", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    activitiesLastWeek: (0, pg_core_1.bigint)("activities_last_week", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalDoorsKnocked: (0, pg_core_1.bigint)("total_doors_knocked", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalCallsMade: (0, pg_core_1.bigint)("total_calls_made", { mode: "number" }),
});
exports.vElectedOfficialEngagement = (0, pg_core_1.pgTable)("v_elected_official_engagement", {
    officialId: (0, pg_core_1.uuid)("official_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    fullName: (0, pg_core_1.varchar)("full_name", { length: 200 }),
    officeTitle: (0, pg_core_1.varchar)("office_title", { length: 200 }),
    governmentLevel: (0, exports.governmentLevel)("government_level"),
    electoralDistrict: (0, pg_core_1.varchar)("electoral_district", { length: 200 }),
    politicalParty: (0, exports.politicalParty)("political_party"),
    laborFriendlyRating: (0, pg_core_1.integer)("labor_friendly_rating"),
    totalMeetingsHeld: (0, pg_core_1.integer)("total_meetings_held"),
    lastContactDate: (0, pg_core_1.date)("last_contact_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalActivities: (0, pg_core_1.bigint)("total_activities", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    activitiesLast90Days: (0, pg_core_1.bigint)("activities_last_90_days", { mode: "number" }),
    votedForLaborBills: (0, pg_core_1.integer)("voted_for_labor_bills"),
    votedAgainstLaborBills: (0, pg_core_1.integer)("voted_against_labor_bills"),
    laborSupportPercentage: (0, pg_core_1.numeric)("labor_support_percentage"),
});
exports.vLegislativePriorities = (0, pg_core_1.pgTable)("v_legislative_priorities", {
    legislationId: (0, pg_core_1.uuid)("legislation_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    billNumber: (0, pg_core_1.varchar)("bill_number", { length: 50 }),
    billTitle: (0, pg_core_1.varchar)("bill_title", { length: 500 }),
    governmentLevel: (0, exports.governmentLevel)("government_level"),
    currentStatus: (0, exports.billStatus)("current_status"),
    unionPosition: (0, exports.unionPosition)("union_position"),
    activeCampaign: (0, pg_core_1.boolean)("active_campaign"),
    introductionDate: (0, pg_core_1.date)("introduction_date"),
    membersContactedMp: (0, pg_core_1.integer)("members_contacted_mp"),
    lettersSentToMps: (0, pg_core_1.integer)("letters_sent_to_mps"),
    petitionSignatures: (0, pg_core_1.integer)("petition_signatures"),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 300 }),
    campaignStatus: (0, exports.politicalCampaignStatus)("campaign_status"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalActivities: (0, pg_core_1.bigint)("total_activities", { mode: "number" }),
    lastActivityDate: (0, pg_core_1.date)("last_activity_date"),
});
exports.trainingCourses = (0, pg_core_1.pgTable)("training_courses", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    courseCode: (0, pg_core_1.varchar)("course_code", { length: 50 }).notNull(),
    courseName: (0, pg_core_1.varchar)("course_name", { length: 300 }).notNull(),
    courseDescription: (0, pg_core_1.text)("course_description"),
    courseCategory: (0, exports.courseCategory)("course_category").notNull(),
    deliveryMethod: (0, exports.courseDeliveryMethod)("delivery_method").notNull(),
    courseDifficulty: (0, exports.courseDifficulty)("course_difficulty").default('all_levels'),
    durationHours: (0, pg_core_1.numeric)("duration_hours", { precision: 5, scale: 2 }),
    durationDays: (0, pg_core_1.integer)("duration_days"),
    hasPrerequisites: (0, pg_core_1.boolean)("has_prerequisites").default(false),
    prerequisiteCourses: (0, pg_core_1.jsonb)("prerequisite_courses"),
    prerequisiteCertifications: (0, pg_core_1.jsonb)("prerequisite_certifications"),
    learningObjectives: (0, pg_core_1.text)("learning_objectives"),
    courseOutline: (0, pg_core_1.jsonb)("course_outline"),
    courseMaterialsUrl: (0, pg_core_1.text)("course_materials_url"),
    presentationSlidesUrl: (0, pg_core_1.text)("presentation_slides_url"),
    workbookUrl: (0, pg_core_1.text)("workbook_url"),
    additionalResources: (0, pg_core_1.jsonb)("additional_resources"),
    primaryInstructorName: (0, pg_core_1.varchar)("primary_instructor_name", { length: 200 }),
    instructorIds: (0, pg_core_1.jsonb)("instructor_ids"),
    minEnrollment: (0, pg_core_1.integer)("min_enrollment").default(5),
    maxEnrollment: (0, pg_core_1.integer)("max_enrollment").default(30),
    providesCertification: (0, pg_core_1.boolean)("provides_certification").default(false),
    certificationName: (0, pg_core_1.varchar)("certification_name", { length: 200 }),
    certificationValidYears: (0, pg_core_1.integer)("certification_valid_years"),
    clcApproved: (0, pg_core_1.boolean)("clc_approved").default(false),
    clcApprovalDate: (0, pg_core_1.date)("clc_approval_date"),
    clcCourseCode: (0, pg_core_1.varchar)("clc_course_code", { length: 50 }),
    courseFee: (0, pg_core_1.numeric)("course_fee", { precision: 10, scale: 2 }).default('0.00'),
    materialsFee: (0, pg_core_1.numeric)("materials_fee", { precision: 10, scale: 2 }).default('0.00'),
    travelSubsidyAvailable: (0, pg_core_1.boolean)("travel_subsidy_available").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isMandatory: (0, pg_core_1.boolean)("is_mandatory").default(false),
    mandatoryForRoles: (0, pg_core_1.jsonb)("mandatory_for_roles"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxTrainingCoursesActive: (0, pg_core_1.index)("idx_training_courses_active").using("btree", table.isActive.asc().nullsLast()),
        idxTrainingCoursesCategory: (0, pg_core_1.index)("idx_training_courses_category").using("btree", table.courseCategory.asc().nullsLast()),
        idxTrainingCoursesClc: (0, pg_core_1.index)("idx_training_courses_clc").using("btree", table.clcApproved.asc().nullsLast()),
        idxTrainingCoursesOrg: (0, pg_core_1.index)("idx_training_courses_org").using("btree", table.organizationId.asc().nullsLast()),
        trainingCoursesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "training_courses_organization_id_fkey"
        }),
        trainingCoursesCourseCodeKey: (0, pg_core_1.unique)("training_courses_course_code_key").on(table.courseCode),
    };
});
exports.inAppNotifications = (0, pg_core_1.pgTable)("in_app_notifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    tenantId: (0, pg_core_1.text)("tenant_id").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    type: (0, pg_core_1.text)("type").default('info').notNull(),
    actionLabel: (0, pg_core_1.text)("action_label"),
    actionUrl: (0, pg_core_1.text)("action_url"),
    data: (0, pg_core_1.jsonb)("data"),
    read: (0, pg_core_1.boolean)("read").default(false).notNull(),
    readAt: (0, pg_core_1.timestamp)("read_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }),
}, (table) => {
    return {
        idxInAppNotificationsRead: (0, pg_core_1.index)("idx_in_app_notifications_read").using("btree", table.read.asc().nullsLast()),
        idxInAppNotificationsUserId: (0, pg_core_1.index)("idx_in_app_notifications_user_id").using("btree", table.userId.asc().nullsLast()),
    };
});
exports.courseSessions = (0, pg_core_1.pgTable)("course_sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    courseId: (0, pg_core_1.uuid)("course_id").notNull(),
    sessionCode: (0, pg_core_1.varchar)("session_code", { length: 50 }).notNull(),
    sessionName: (0, pg_core_1.varchar)("session_name", { length: 300 }),
    startDate: (0, pg_core_1.date)("start_date").notNull(),
    endDate: (0, pg_core_1.date)("end_date").notNull(),
    sessionTimes: (0, pg_core_1.jsonb)("session_times"),
    deliveryMethod: (0, exports.courseDeliveryMethod)("delivery_method").notNull(),
    venueName: (0, pg_core_1.varchar)("venue_name", { length: 200 }),
    venueAddress: (0, pg_core_1.text)("venue_address"),
    roomNumber: (0, pg_core_1.varchar)("room_number", { length: 50 }),
    virtualMeetingUrl: (0, pg_core_1.text)("virtual_meeting_url"),
    virtualMeetingAccessCode: (0, pg_core_1.varchar)("virtual_meeting_access_code", { length: 50 }),
    leadInstructorId: (0, pg_core_1.uuid)("lead_instructor_id"),
    leadInstructorName: (0, pg_core_1.varchar)("lead_instructor_name", { length: 200 }),
    coInstructors: (0, pg_core_1.jsonb)("co_instructors"),
    registrationOpenDate: (0, pg_core_1.date)("registration_open_date"),
    registrationCloseDate: (0, pg_core_1.date)("registration_close_date"),
    registrationCount: (0, pg_core_1.integer)("registration_count").default(0),
    waitlistCount: (0, pg_core_1.integer)("waitlist_count").default(0),
    maxEnrollment: (0, pg_core_1.integer)("max_enrollment"),
    sessionStatus: (0, exports.sessionStatus)("session_status").default('scheduled'),
    attendeesCount: (0, pg_core_1.integer)("attendees_count").default(0),
    completionsCount: (0, pg_core_1.integer)("completions_count").default(0),
    completionRate: (0, pg_core_1.numeric)("completion_rate", { precision: 5, scale: 2 }),
    averageRating: (0, pg_core_1.numeric)("average_rating", { precision: 3, scale: 2 }),
    evaluationResponsesCount: (0, pg_core_1.integer)("evaluation_responses_count").default(0),
    sessionBudget: (0, pg_core_1.numeric)("session_budget", { precision: 10, scale: 2 }),
    actualCost: (0, pg_core_1.numeric)("actual_cost", { precision: 10, scale: 2 }),
    travelSubsidyOffered: (0, pg_core_1.boolean)("travel_subsidy_offered").default(false),
    accommodationArranged: (0, pg_core_1.boolean)("accommodation_arranged").default(false),
    accommodationHotel: (0, pg_core_1.varchar)("accommodation_hotel", { length: 200 }),
    materialsPrepared: (0, pg_core_1.boolean)("materials_prepared").default(false),
    materialsDistributedCount: (0, pg_core_1.integer)("materials_distributed_count").default(0),
    cancellationReason: (0, pg_core_1.text)("cancellation_reason"),
    cancelledDate: (0, pg_core_1.date)("cancelled_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxCourseSessionsCourse: (0, pg_core_1.index)("idx_course_sessions_course").using("btree", table.courseId.asc().nullsLast()),
        idxCourseSessionsDates: (0, pg_core_1.index)("idx_course_sessions_dates").using("btree", table.startDate.asc().nullsLast(), table.endDate.asc().nullsLast()),
        idxCourseSessionsInstructor: (0, pg_core_1.index)("idx_course_sessions_instructor").using("btree", table.leadInstructorId.asc().nullsLast()),
        idxCourseSessionsOrg: (0, pg_core_1.index)("idx_course_sessions_org").using("btree", table.organizationId.asc().nullsLast()),
        idxCourseSessionsStatus: (0, pg_core_1.index)("idx_course_sessions_status").using("btree", table.sessionStatus.asc().nullsLast()),
        courseSessionsCourseIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.courseId],
            foreignColumns: [exports.trainingCourses.id],
            name: "course_sessions_course_id_fkey"
        }),
        courseSessionsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "course_sessions_organization_id_fkey"
        }),
        courseSessionsSessionCodeKey: (0, pg_core_1.unique)("course_sessions_session_code_key").on(table.sessionCode),
    };
});
exports.courseRegistrations = (0, pg_core_1.pgTable)("course_registrations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    courseId: (0, pg_core_1.uuid)("course_id").notNull(),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull(),
    registrationDate: (0, pg_core_1.timestamp)("registration_date", { withTimezone: true, mode: 'string' }).defaultNow(),
    registrationStatus: (0, exports.registrationStatus)("registration_status").default('registered'),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(false),
    approvedBy: (0, pg_core_1.uuid)("approved_by"),
    approvedDate: (0, pg_core_1.date)("approved_date"),
    approvalNotes: (0, pg_core_1.text)("approval_notes"),
    attended: (0, pg_core_1.boolean)("attended").default(false),
    attendanceDates: (0, pg_core_1.jsonb)("attendance_dates"),
    attendanceHours: (0, pg_core_1.numeric)("attendance_hours", { precision: 5, scale: 2 }),
    completed: (0, pg_core_1.boolean)("completed").default(false),
    completionDate: (0, pg_core_1.date)("completion_date"),
    completionPercentage: (0, pg_core_1.numeric)("completion_percentage", { precision: 5, scale: 2 }).default('0.00'),
    preTestScore: (0, pg_core_1.numeric)("pre_test_score", { precision: 5, scale: 2 }),
    postTestScore: (0, pg_core_1.numeric)("post_test_score", { precision: 5, scale: 2 }),
    finalGrade: (0, pg_core_1.varchar)("final_grade", { length: 10 }),
    passed: (0, pg_core_1.boolean)("passed"),
    certificateIssued: (0, pg_core_1.boolean)("certificate_issued").default(false),
    certificateNumber: (0, pg_core_1.varchar)("certificate_number", { length: 100 }),
    certificateIssueDate: (0, pg_core_1.date)("certificate_issue_date"),
    certificateUrl: (0, pg_core_1.text)("certificate_url"),
    evaluationCompleted: (0, pg_core_1.boolean)("evaluation_completed").default(false),
    evaluationRating: (0, pg_core_1.numeric)("evaluation_rating", { precision: 3, scale: 2 }),
    evaluationComments: (0, pg_core_1.text)("evaluation_comments"),
    evaluationSubmittedDate: (0, pg_core_1.date)("evaluation_submitted_date"),
    travelRequired: (0, pg_core_1.boolean)("travel_required").default(false),
    travelSubsidyRequested: (0, pg_core_1.boolean)("travel_subsidy_requested").default(false),
    travelSubsidyApproved: (0, pg_core_1.boolean)("travel_subsidy_approved").default(false),
    travelSubsidyAmount: (0, pg_core_1.numeric)("travel_subsidy_amount", { precision: 10, scale: 2 }),
    accommodationRequired: (0, pg_core_1.boolean)("accommodation_required").default(false),
    courseFee: (0, pg_core_1.numeric)("course_fee", { precision: 10, scale: 2 }).default('0.00'),
    feePaid: (0, pg_core_1.boolean)("fee_paid").default(false),
    feePaymentDate: (0, pg_core_1.date)("fee_payment_date"),
    feeWaived: (0, pg_core_1.boolean)("fee_waived").default(false),
    feeWaiverReason: (0, pg_core_1.text)("fee_waiver_reason"),
    cancellationDate: (0, pg_core_1.date)("cancellation_date"),
    cancellationReason: (0, pg_core_1.text)("cancellation_reason"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxCourseRegistrationsCompleted: (0, pg_core_1.index)("idx_course_registrations_completed").using("btree", table.completed.asc().nullsLast()),
        idxCourseRegistrationsCourse: (0, pg_core_1.index)("idx_course_registrations_course").using("btree", table.courseId.asc().nullsLast()),
        idxCourseRegistrationsMember: (0, pg_core_1.index)("idx_course_registrations_member").using("btree", table.memberId.asc().nullsLast()),
        idxCourseRegistrationsOrg: (0, pg_core_1.index)("idx_course_registrations_org").using("btree", table.organizationId.asc().nullsLast()),
        idxCourseRegistrationsSession: (0, pg_core_1.index)("idx_course_registrations_session").using("btree", table.sessionId.asc().nullsLast()),
        idxCourseRegistrationsStatus: (0, pg_core_1.index)("idx_course_registrations_status").using("btree", table.registrationStatus.asc().nullsLast()),
        courseRegistrationsCourseIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.courseId],
            foreignColumns: [exports.trainingCourses.id],
            name: "course_registrations_course_id_fkey"
        }),
        courseRegistrationsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "course_registrations_member_id_fkey"
        }),
        courseRegistrationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "course_registrations_organization_id_fkey"
        }),
        courseRegistrationsSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.courseSessions.id],
            name: "course_registrations_session_id_fkey"
        }),
    };
});
exports.pensionPlans = (0, pg_core_1.pgTable)("pension_plans", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    planName: (0, pg_core_1.varchar)("plan_name", { length: 200 }).notNull(),
    planNumber: (0, pg_core_1.varchar)("plan_number", { length: 50 }),
    planType: (0, exports.pensionPlanType)("plan_type").notNull(),
    planStatus: (0, exports.pensionPlanStatus)("plan_status").default('active'),
    isTaftHartley: (0, pg_core_1.boolean)("is_taft_hartley").default(false),
    isMultiEmployer: (0, pg_core_1.boolean)("is_multi_employer").default(false),
    participatingEmployersCount: (0, pg_core_1.integer)("participating_employers_count"),
    craRegistrationNumber: (0, pg_core_1.varchar)("cra_registration_number", { length: 50 }),
    irsEin: (0, pg_core_1.varchar)("irs_ein", { length: 20 }),
    form5500Required: (0, pg_core_1.boolean)("form_5500_required").default(false),
    t3FilingRequired: (0, pg_core_1.boolean)("t3_filing_required").default(true),
    benefitFormula: (0, pg_core_1.text)("benefit_formula"),
    contributionRate: (0, pg_core_1.numeric)("contribution_rate", { precision: 5, scale: 2 }),
    normalRetirementAge: (0, pg_core_1.integer)("normal_retirement_age").default(65),
    earlyRetirementAge: (0, pg_core_1.integer)("early_retirement_age").default(55),
    vestingPeriodYears: (0, pg_core_1.integer)("vesting_period_years").default(2),
    currentAssets: (0, pg_core_1.numeric)("current_assets", { precision: 15, scale: 2 }),
    currentLiabilities: (0, pg_core_1.numeric)("current_liabilities", { precision: 15, scale: 2 }),
    fundedRatio: (0, pg_core_1.numeric)("funded_ratio", { precision: 5, scale: 2 }),
    solvencyRatio: (0, pg_core_1.numeric)("solvency_ratio", { precision: 5, scale: 2 }),
    lastValuationDate: (0, pg_core_1.date)("last_valuation_date"),
    nextValuationDate: (0, pg_core_1.date)("next_valuation_date"),
    valuationFrequencyMonths: (0, pg_core_1.integer)("valuation_frequency_months").default(36),
    actuaryFirm: (0, pg_core_1.varchar)("actuary_firm", { length: 200 }),
    actuaryContact: (0, pg_core_1.varchar)("actuary_contact", { length: 200 }),
    planEffectiveDate: (0, pg_core_1.date)("plan_effective_date").notNull(),
    planYearEnd: (0, pg_core_1.date)("plan_year_end").notNull(),
    fiscalYearEnd: (0, pg_core_1.date)("fiscal_year_end"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxPensionPlansOrg: (0, pg_core_1.index)("idx_pension_plans_org").using("btree", table.organizationId.asc().nullsLast()),
        idxPensionPlansRegistration: (0, pg_core_1.index)("idx_pension_plans_registration").using("btree", table.craRegistrationNumber.asc().nullsLast()),
        idxPensionPlansStatus: (0, pg_core_1.index)("idx_pension_plans_status").using("btree", table.planStatus.asc().nullsLast()),
        idxPensionPlansType: (0, pg_core_1.index)("idx_pension_plans_type").using("btree", table.planType.asc().nullsLast()),
        pensionPlansOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "pension_plans_organization_id_fkey"
        }),
    };
});
exports.pensionHoursBanks = (0, pg_core_1.pgTable)("pension_hours_banks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    reportingPeriodStart: (0, pg_core_1.date)("reporting_period_start").notNull(),
    reportingPeriodEnd: (0, pg_core_1.date)("reporting_period_end").notNull(),
    totalHoursWorked: (0, pg_core_1.numeric)("total_hours_worked", { precision: 10, scale: 2 }).default('0').notNull(),
    pensionableHours: (0, pg_core_1.numeric)("pensionable_hours", { precision: 10, scale: 2 }).default('0').notNull(),
    overtimeHours: (0, pg_core_1.numeric)("overtime_hours", { precision: 10, scale: 2 }).default('0'),
    primaryEmployerId: (0, pg_core_1.uuid)("primary_employer_id"),
    secondaryEmployerIds: (0, pg_core_1.jsonb)("secondary_employer_ids"),
    reciprocalHours: (0, pg_core_1.numeric)("reciprocal_hours", { precision: 10, scale: 2 }).default('0'),
    reciprocalPlanIds: (0, pg_core_1.jsonb)("reciprocal_plan_ids"),
    contributionCredits: (0, pg_core_1.numeric)("contribution_credits", { precision: 10, scale: 2 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('active'),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxHoursBanksEmployer: (0, pg_core_1.index)("idx_hours_banks_employer").using("btree", table.primaryEmployerId.asc().nullsLast()),
        idxHoursBanksMember: (0, pg_core_1.index)("idx_hours_banks_member").using("btree", table.memberId.asc().nullsLast()),
        idxHoursBanksPeriod: (0, pg_core_1.index)("idx_hours_banks_period").using("btree", table.reportingPeriodStart.asc().nullsLast(), table.reportingPeriodEnd.asc().nullsLast()),
        idxHoursBanksPlan: (0, pg_core_1.index)("idx_hours_banks_plan").using("btree", table.pensionPlanId.asc().nullsLast()),
        pensionHoursBanksMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "pension_hours_banks_member_id_fkey"
        }),
        pensionHoursBanksPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "pension_hours_banks_pension_plan_id_fkey"
        }),
        uniqueMemberPeriod: (0, pg_core_1.unique)("unique_member_period").on(table.pensionPlanId, table.memberId, table.reportingPeriodStart),
    };
});
exports.mlPredictions = (0, pg_core_1.pgTable)("ml_predictions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.text)("organization_id").notNull(),
    predictionType: (0, pg_core_1.varchar)("prediction_type", { length: 50 }).notNull(),
    predictionDate: (0, pg_core_1.date)("prediction_date").notNull(),
    predictedValue: (0, pg_core_1.numeric)("predicted_value").notNull(),
    lowerBound: (0, pg_core_1.numeric)("lower_bound"),
    upperBound: (0, pg_core_1.numeric)("upper_bound"),
    confidence: (0, pg_core_1.numeric)("confidence"),
    horizon: (0, pg_core_1.integer)("horizon"),
    granularity: (0, pg_core_1.varchar)("granularity", { length: 20 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        idxMlPredictionsDate: (0, pg_core_1.index)("idx_ml_predictions_date").using("btree", table.predictionDate.asc().nullsLast()),
        idxMlPredictionsOrganization: (0, pg_core_1.index)("idx_ml_predictions_organization").using("btree", table.organizationId.asc().nullsLast()),
        idxMlPredictionsType: (0, pg_core_1.index)("idx_ml_predictions_type").using("btree", table.predictionType.asc().nullsLast()),
        orgIdx: (0, pg_core_1.index)("ml_predictions_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("ml_predictions_type_idx").using("btree", table.predictionType.asc().nullsLast()),
        uniquePrediction: (0, pg_core_1.unique)("unique_prediction").on(table.organizationId, table.predictionType, table.predictionDate, table.horizon),
    };
});
exports.pensionContributions = (0, pg_core_1.pgTable)("pension_contributions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id").notNull(),
    employerId: (0, pg_core_1.uuid)("employer_id"),
    employerName: (0, pg_core_1.varchar)("employer_name", { length: 200 }).notNull(),
    employerRegistrationNumber: (0, pg_core_1.varchar)("employer_registration_number", { length: 50 }),
    contributionPeriodStart: (0, pg_core_1.date)("contribution_period_start").notNull(),
    contributionPeriodEnd: (0, pg_core_1.date)("contribution_period_end").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    totalMembersCovered: (0, pg_core_1.integer)("total_members_covered").notNull(),
    memberContributions: (0, pg_core_1.jsonb)("member_contributions"),
    totalContributionAmount: (0, pg_core_1.numeric)("total_contribution_amount", { precision: 12, scale: 2 }).notNull(),
    employerPortion: (0, pg_core_1.numeric)("employer_portion", { precision: 12, scale: 2 }),
    employeePortion: (0, pg_core_1.numeric)("employee_portion", { precision: 12, scale: 2 }),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('CAD'),
    expectedAmount: (0, pg_core_1.numeric)("expected_amount", { precision: 12, scale: 2 }),
    varianceAmount: (0, pg_core_1.numeric)("variance_amount", { precision: 12, scale: 2 }),
    variancePercentage: (0, pg_core_1.numeric)("variance_percentage", { precision: 5, scale: 2 }),
    reconciliationStatus: (0, pg_core_1.varchar)("reconciliation_status", { length: 50 }).default('pending'),
    paymentStatus: (0, pg_core_1.varchar)("payment_status", { length: 50 }).default('pending'),
    paymentDate: (0, pg_core_1.date)("payment_date"),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 100 }),
    isLate: (0, pg_core_1.boolean)("is_late").default(false),
    daysLate: (0, pg_core_1.integer)("days_late"),
    lateFeeAmount: (0, pg_core_1.numeric)("late_fee_amount", { precision: 10, scale: 2 }),
    interestCharged: (0, pg_core_1.numeric)("interest_charged", { precision: 10, scale: 2 }),
    remittanceFileUrl: (0, pg_core_1.text)("remittance_file_url"),
    reconciliationReportUrl: (0, pg_core_1.text)("reconciliation_report_url"),
    contributionHash: (0, pg_core_1.varchar)("contribution_hash", { length: 128 }),
    blockchainTxHash: (0, pg_core_1.varchar)("blockchain_tx_hash", { length: 200 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    processedBy: (0, pg_core_1.uuid)("processed_by"),
}, (table) => {
    return {
        idxPensionContributionsDueDate: (0, pg_core_1.index)("idx_pension_contributions_due_date").using("btree", table.dueDate.asc().nullsLast()),
        idxPensionContributionsEmployer: (0, pg_core_1.index)("idx_pension_contributions_employer").using("btree", table.employerId.asc().nullsLast()),
        idxPensionContributionsHash: (0, pg_core_1.index)("idx_pension_contributions_hash").using("btree", table.contributionHash.asc().nullsLast()),
        idxPensionContributionsPeriod: (0, pg_core_1.index)("idx_pension_contributions_period").using("btree", table.contributionPeriodStart.asc().nullsLast(), table.contributionPeriodEnd.asc().nullsLast()),
        idxPensionContributionsPlan: (0, pg_core_1.index)("idx_pension_contributions_plan").using("btree", table.pensionPlanId.asc().nullsLast()),
        idxPensionContributionsStatus: (0, pg_core_1.index)("idx_pension_contributions_status").using("btree", table.paymentStatus.asc().nullsLast()),
        pensionContributionsPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "pension_contributions_pension_plan_id_fkey"
        }),
    };
});
exports.pensionTrusteeBoards = (0, pg_core_1.pgTable)("pension_trustee_boards", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id").notNull(),
    boardName: (0, pg_core_1.varchar)("board_name", { length: 200 }).notNull(),
    isJointBoard: (0, pg_core_1.boolean)("is_joint_board").default(true),
    totalTrustees: (0, pg_core_1.integer)("total_trustees").notNull(),
    laborTrusteesRequired: (0, pg_core_1.integer)("labor_trustees_required"),
    managementTrusteesRequired: (0, pg_core_1.integer)("management_trustees_required"),
    independentTrusteesRequired: (0, pg_core_1.integer)("independent_trustees_required").default(0),
    meetingFrequency: (0, pg_core_1.varchar)("meeting_frequency", { length: 50 }),
    quorumRequirement: (0, pg_core_1.integer)("quorum_requirement"),
    bylawsUrl: (0, pg_core_1.text)("bylaws_url"),
    trustAgreementUrl: (0, pg_core_1.text)("trust_agreement_url"),
    investmentPolicyUrl: (0, pg_core_1.text)("investment_policy_url"),
    establishedDate: (0, pg_core_1.date)("established_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxTrusteeBoardsPlan: (0, pg_core_1.index)("idx_trustee_boards_plan").using("btree", table.pensionPlanId.asc().nullsLast()),
        pensionTrusteeBoardsPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "pension_trustee_boards_pension_plan_id_fkey"
        }),
    };
});
exports.modelMetadata = (0, pg_core_1.pgTable)("model_metadata", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.text)("organization_id").notNull(),
    modelType: (0, pg_core_1.varchar)("model_type", { length: 50 }).notNull(),
    version: (0, pg_core_1.varchar)("version", { length: 20 }).notNull(),
    accuracy: (0, pg_core_1.numeric)("accuracy"),
    trainedAt: (0, pg_core_1.timestamp)("trained_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    parameters: (0, pg_core_1.jsonb)("parameters"),
}, (table) => {
    return {
        idxModelMetadataOrganization: (0, pg_core_1.index)("idx_model_metadata_organization").using("btree", table.organizationId.asc().nullsLast()),
        idxModelMetadataType: (0, pg_core_1.index)("idx_model_metadata_type").using("btree", table.modelType.asc().nullsLast()),
        uniqueModel: (0, pg_core_1.unique)("unique_model").on(table.organizationId, table.modelType, table.version),
    };
});
exports.pensionTrustees = (0, pg_core_1.pgTable)("pension_trustees", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    trusteeBoardId: (0, pg_core_1.uuid)("trustee_board_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    trusteeName: (0, pg_core_1.varchar)("trustee_name", { length: 200 }).notNull(),
    trusteeType: (0, pg_core_1.varchar)("trustee_type", { length: 50 }).notNull(),
    position: (0, pg_core_1.varchar)("position", { length: 100 }),
    isVotingMember: (0, pg_core_1.boolean)("is_voting_member").default(true),
    termStartDate: (0, pg_core_1.date)("term_start_date").notNull(),
    termEndDate: (0, pg_core_1.date)("term_end_date"),
    termLengthYears: (0, pg_core_1.integer)("term_length_years").default(3),
    isCurrent: (0, pg_core_1.boolean)("is_current").default(true),
    representingOrganization: (0, pg_core_1.varchar)("representing_organization", { length: 200 }),
    representingOrganizationId: (0, pg_core_1.uuid)("representing_organization_id"),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    notes: (0, pg_core_1.text)("notes"),
    appointedAt: (0, pg_core_1.timestamp)("appointed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    appointedBy: (0, pg_core_1.uuid)("appointed_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxTrusteesBoard: (0, pg_core_1.index)("idx_trustees_board").using("btree", table.trusteeBoardId.asc().nullsLast()),
        idxTrusteesCurrent: (0, pg_core_1.index)("idx_trustees_current").using("btree", table.isCurrent.asc().nullsLast()),
        idxTrusteesType: (0, pg_core_1.index)("idx_trustees_type").using("btree", table.trusteeType.asc().nullsLast()),
        idxTrusteesUser: (0, pg_core_1.index)("idx_trustees_user").using("btree", table.userId.asc().nullsLast()),
        pensionTrusteesTrusteeBoardIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.trusteeBoardId],
            foreignColumns: [exports.pensionTrusteeBoards.id],
            name: "pension_trustees_trustee_board_id_fkey"
        }),
    };
});
exports.analyticsMetrics = (0, pg_core_1.pgTable)("analytics_metrics", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    metricType: (0, pg_core_1.text)("metric_type").notNull(),
    metricName: (0, pg_core_1.text)("metric_name").notNull(),
    metricValue: (0, pg_core_1.numeric)("metric_value").notNull(),
    metricUnit: (0, pg_core_1.text)("metric_unit"),
    periodType: (0, pg_core_1.text)("period_type").notNull(),
    periodStart: (0, pg_core_1.timestamp)("period_start", { mode: 'string' }).notNull(),
    periodEnd: (0, pg_core_1.timestamp)("period_end", { mode: 'string' }).notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    comparisonValue: (0, pg_core_1.numeric)("comparison_value"),
    trend: (0, pg_core_1.text)("trend"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        orgIdx: (0, pg_core_1.index)("analytics_metrics_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        periodIdx: (0, pg_core_1.index)("analytics_metrics_period_idx").using("btree", table.periodStart.asc().nullsLast(), table.periodEnd.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("analytics_metrics_type_idx").using("btree", table.metricType.asc().nullsLast()),
        analyticsMetricsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "analytics_metrics_organization_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.pensionTrusteeMeetings = (0, pg_core_1.pgTable)("pension_trustee_meetings", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    trusteeBoardId: (0, pg_core_1.uuid)("trustee_board_id").notNull(),
    meetingTitle: (0, pg_core_1.varchar)("meeting_title", { length: 200 }).notNull(),
    meetingType: (0, pg_core_1.varchar)("meeting_type", { length: 50 }).default('regular'),
    meetingDate: (0, pg_core_1.date)("meeting_date").notNull(),
    meetingStartTime: (0, pg_core_1.time)("meeting_start_time"),
    meetingEndTime: (0, pg_core_1.time)("meeting_end_time"),
    meetingLocation: (0, pg_core_1.varchar)("meeting_location", { length: 200 }),
    isVirtual: (0, pg_core_1.boolean)("is_virtual").default(false),
    meetingLink: (0, pg_core_1.text)("meeting_link"),
    trusteesPresent: (0, pg_core_1.jsonb)("trustees_present"),
    trusteesAbsent: (0, pg_core_1.jsonb)("trustees_absent"),
    guestsPresent: (0, pg_core_1.jsonb)("guests_present"),
    quorumMet: (0, pg_core_1.boolean)("quorum_met"),
    agendaUrl: (0, pg_core_1.text)("agenda_url"),
    minutesUrl: (0, pg_core_1.text)("minutes_url"),
    minutesApproved: (0, pg_core_1.boolean)("minutes_approved").default(false),
    minutesApprovedDate: (0, pg_core_1.date)("minutes_approved_date"),
    motions: (0, pg_core_1.jsonb)("motions"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxTrusteeMeetingsBoard: (0, pg_core_1.index)("idx_trustee_meetings_board").using("btree", table.trusteeBoardId.asc().nullsLast()),
        idxTrusteeMeetingsDate: (0, pg_core_1.index)("idx_trustee_meetings_date").using("btree", table.meetingDate.asc().nullsLast()),
        idxTrusteeMeetingsType: (0, pg_core_1.index)("idx_trustee_meetings_type").using("btree", table.meetingType.asc().nullsLast()),
        pensionTrusteeMeetingsTrusteeBoardIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.trusteeBoardId],
            foreignColumns: [exports.pensionTrusteeBoards.id],
            name: "pension_trustee_meetings_trustee_board_id_fkey"
        }),
    };
});
exports.pensionBenefitClaims = (0, pg_core_1.pgTable)("pension_benefit_claims", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    claimType: (0, exports.pensionClaimType)("claim_type").notNull(),
    claimNumber: (0, pg_core_1.varchar)("claim_number", { length: 50 }),
    claimStatus: (0, pg_core_1.varchar)("claim_status", { length: 50 }).default('pending'),
    claimDate: (0, pg_core_1.date)("claim_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    benefitStartDate: (0, pg_core_1.date)("benefit_start_date"),
    benefitEndDate: (0, pg_core_1.date)("benefit_end_date"),
    monthlyBenefitAmount: (0, pg_core_1.numeric)("monthly_benefit_amount", { precision: 10, scale: 2 }),
    annualBenefitAmount: (0, pg_core_1.numeric)("annual_benefit_amount", { precision: 10, scale: 2 }),
    lumpSumAmount: (0, pg_core_1.numeric)("lump_sum_amount", { precision: 12, scale: 2 }),
    yearsOfService: (0, pg_core_1.numeric)("years_of_service", { precision: 8, scale: 2 }),
    finalAverageEarnings: (0, pg_core_1.numeric)("final_average_earnings", { precision: 10, scale: 2 }),
    benefitFormulaUsed: (0, pg_core_1.text)("benefit_formula_used"),
    reductionPercentage: (0, pg_core_1.numeric)("reduction_percentage", { precision: 5, scale: 2 }),
    submittedBy: (0, pg_core_1.uuid)("submitted_by"),
    reviewedBy: (0, pg_core_1.uuid)("reviewed_by"),
    approvedBy: (0, pg_core_1.uuid)("approved_by"),
    reviewDate: (0, pg_core_1.date)("review_date"),
    approvalDate: (0, pg_core_1.date)("approval_date"),
    denialReason: (0, pg_core_1.text)("denial_reason"),
    paymentFrequency: (0, pg_core_1.varchar)("payment_frequency", { length: 50 }),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    bankAccountInfoEncrypted: (0, pg_core_1.text)("bank_account_info_encrypted"),
    taxWithholdingRate: (0, pg_core_1.numeric)("tax_withholding_rate", { precision: 5, scale: 2 }),
    taxWithholdingAmount: (0, pg_core_1.numeric)("tax_withholding_amount", { precision: 10, scale: 2 }),
    applicationFormUrl: (0, pg_core_1.text)("application_form_url"),
    supportingDocumentsUrls: (0, pg_core_1.jsonb)("supporting_documents_urls"),
    approvalLetterUrl: (0, pg_core_1.text)("approval_letter_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxPensionClaimsMember: (0, pg_core_1.index)("idx_pension_claims_member").using("btree", table.memberId.asc().nullsLast()),
        idxPensionClaimsPlan: (0, pg_core_1.index)("idx_pension_claims_plan").using("btree", table.pensionPlanId.asc().nullsLast()),
        idxPensionClaimsStartDate: (0, pg_core_1.index)("idx_pension_claims_start_date").using("btree", table.benefitStartDate.asc().nullsLast()),
        idxPensionClaimsStatus: (0, pg_core_1.index)("idx_pension_claims_status").using("btree", table.claimStatus.asc().nullsLast()),
        idxPensionClaimsType: (0, pg_core_1.index)("idx_pension_claims_type").using("btree", table.claimType.asc().nullsLast()),
        pensionBenefitClaimsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "pension_benefit_claims_member_id_fkey"
        }),
        pensionBenefitClaimsPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "pension_benefit_claims_pension_plan_id_fkey"
        }),
        pensionBenefitClaimsClaimNumberKey: (0, pg_core_1.unique)("pension_benefit_claims_claim_number_key").on(table.claimNumber),
    };
});
exports.pensionActuarialValuations = (0, pg_core_1.pgTable)("pension_actuarial_valuations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id").notNull(),
    valuationDate: (0, pg_core_1.date)("valuation_date").notNull(),
    valuationType: (0, pg_core_1.varchar)("valuation_type", { length: 50 }).notNull(),
    actuaryFirm: (0, pg_core_1.varchar)("actuary_firm", { length: 200 }).notNull(),
    actuaryName: (0, pg_core_1.varchar)("actuary_name", { length: 200 }),
    actuaryDesignation: (0, pg_core_1.varchar)("actuary_designation", { length: 50 }),
    marketValueAssets: (0, pg_core_1.numeric)("market_value_assets", { precision: 15, scale: 2 }).notNull(),
    smoothedValueAssets: (0, pg_core_1.numeric)("smoothed_value_assets", { precision: 15, scale: 2 }),
    goingConcernLiabilities: (0, pg_core_1.numeric)("going_concern_liabilities", { precision: 15, scale: 2 }),
    solvencyLiabilities: (0, pg_core_1.numeric)("solvency_liabilities", { precision: 15, scale: 2 }),
    windUpLiabilities: (0, pg_core_1.numeric)("wind_up_liabilities", { precision: 15, scale: 2 }),
    goingConcernSurplusDeficit: (0, pg_core_1.numeric)("going_concern_surplus_deficit", { precision: 15, scale: 2 }),
    goingConcernFundedRatio: (0, pg_core_1.numeric)("going_concern_funded_ratio", { precision: 5, scale: 2 }),
    solvencySurplusDeficit: (0, pg_core_1.numeric)("solvency_surplus_deficit", { precision: 15, scale: 2 }),
    solvencyFundedRatio: (0, pg_core_1.numeric)("solvency_funded_ratio", { precision: 5, scale: 2 }),
    discountRate: (0, pg_core_1.numeric)("discount_rate", { precision: 5, scale: 2 }),
    inflationRate: (0, pg_core_1.numeric)("inflation_rate", { precision: 5, scale: 2 }),
    salaryIncreaseRate: (0, pg_core_1.numeric)("salary_increase_rate", { precision: 5, scale: 2 }),
    mortalityTable: (0, pg_core_1.varchar)("mortality_table", { length: 100 }),
    recommendedEmployerContribution: (0, pg_core_1.numeric)("recommended_employer_contribution", { precision: 12, scale: 2 }),
    recommendedContributionRate: (0, pg_core_1.numeric)("recommended_contribution_rate", { precision: 5, scale: 2 }),
    specialPaymentRequired: (0, pg_core_1.numeric)("special_payment_required", { precision: 12, scale: 2 }),
    valuationReportUrl: (0, pg_core_1.text)("valuation_report_url").notNull(),
    summaryReportUrl: (0, pg_core_1.text)("summary_report_url"),
    filedWithRegulator: (0, pg_core_1.boolean)("filed_with_regulator").default(false),
    filingDate: (0, pg_core_1.date)("filing_date"),
    regulatorResponseUrl: (0, pg_core_1.text)("regulator_response_url"),
    nextValuationRequiredDate: (0, pg_core_1.date)("next_valuation_required_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxActuarialValuationsDate: (0, pg_core_1.index)("idx_actuarial_valuations_date").using("btree", table.valuationDate.asc().nullsLast()),
        idxActuarialValuationsPlan: (0, pg_core_1.index)("idx_actuarial_valuations_plan").using("btree", table.pensionPlanId.asc().nullsLast()),
        idxActuarialValuationsType: (0, pg_core_1.index)("idx_actuarial_valuations_type").using("btree", table.valuationType.asc().nullsLast()),
        pensionActuarialValuationsPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "pension_actuarial_valuations_pension_plan_id_fkey"
        }),
    };
});
exports.hwBenefitPlans = (0, pg_core_1.pgTable)("hw_benefit_plans", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    planName: (0, pg_core_1.varchar)("plan_name", { length: 200 }).notNull(),
    planType: (0, exports.hwPlanType)("plan_type").notNull(),
    planNumber: (0, pg_core_1.varchar)("plan_number", { length: 50 }),
    carrierName: (0, pg_core_1.varchar)("carrier_name", { length: 200 }),
    carrierPolicyNumber: (0, pg_core_1.varchar)("carrier_policy_number", { length: 100 }),
    tpaName: (0, pg_core_1.varchar)("tpa_name", { length: 200 }),
    tpaContact: (0, pg_core_1.varchar)("tpa_contact", { length: 200 }),
    coverageType: (0, pg_core_1.varchar)("coverage_type", { length: 50 }),
    coverageTierStructure: (0, pg_core_1.jsonb)("coverage_tier_structure"),
    monthlyPremiumAmount: (0, pg_core_1.numeric)("monthly_premium_amount", { precision: 10, scale: 2 }),
    employerContributionPercentage: (0, pg_core_1.numeric)("employer_contribution_percentage", { precision: 5, scale: 2 }),
    employeeContributionPercentage: (0, pg_core_1.numeric)("employee_contribution_percentage", { precision: 5, scale: 2 }),
    annualMaximum: (0, pg_core_1.numeric)("annual_maximum", { precision: 10, scale: 2 }),
    lifetimeMaximum: (0, pg_core_1.numeric)("lifetime_maximum", { precision: 12, scale: 2 }),
    deductible: (0, pg_core_1.numeric)("deductible", { precision: 8, scale: 2 }),
    coinsurancePercentage: (0, pg_core_1.numeric)("coinsurance_percentage", { precision: 5, scale: 2 }),
    outOfPocketMaximum: (0, pg_core_1.numeric)("out_of_pocket_maximum", { precision: 10, scale: 2 }),
    waitingPeriodDays: (0, pg_core_1.integer)("waiting_period_days").default(0),
    hoursRequiredPerMonth: (0, pg_core_1.integer)("hours_required_per_month"),
    planYearStart: (0, pg_core_1.date)("plan_year_start"),
    planYearEnd: (0, pg_core_1.date)("plan_year_end"),
    renewalDate: (0, pg_core_1.date)("renewal_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isSelfInsured: (0, pg_core_1.boolean)("is_self_insured").default(false),
    planBookletUrl: (0, pg_core_1.text)("plan_booklet_url"),
    summaryPlanDescriptionUrl: (0, pg_core_1.text)("summary_plan_description_url"),
    benefitsAtAGlanceUrl: (0, pg_core_1.text)("benefits_at_a_glance_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxHwPlansCarrier: (0, pg_core_1.index)("idx_hw_plans_carrier").using("btree", table.carrierName.asc().nullsLast()),
        idxHwPlansOrg: (0, pg_core_1.index)("idx_hw_plans_org").using("btree", table.organizationId.asc().nullsLast()),
        idxHwPlansType: (0, pg_core_1.index)("idx_hw_plans_type").using("btree", table.planType.asc().nullsLast()),
        hwBenefitPlansOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "hw_benefit_plans_organization_id_fkey"
        }),
    };
});
exports.hwBenefitEnrollments = (0, pg_core_1.pgTable)("hw_benefit_enrollments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    hwPlanId: (0, pg_core_1.uuid)("hw_plan_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    enrollmentDate: (0, pg_core_1.date)("enrollment_date").notNull(),
    effectiveDate: (0, pg_core_1.date)("effective_date").notNull(),
    terminationDate: (0, pg_core_1.date)("termination_date"),
    coverageTier: (0, pg_core_1.varchar)("coverage_tier", { length: 50 }),
    dependents: (0, pg_core_1.jsonb)("dependents"),
    totalDependents: (0, pg_core_1.integer)("total_dependents").default(0),
    monthlyPremium: (0, pg_core_1.numeric)("monthly_premium", { precision: 10, scale: 2 }),
    employerContribution: (0, pg_core_1.numeric)("employer_contribution", { precision: 10, scale: 2 }),
    employeeContribution: (0, pg_core_1.numeric)("employee_contribution", { precision: 10, scale: 2 }),
    enrollmentStatus: (0, pg_core_1.varchar)("enrollment_status", { length: 50 }).default('active'),
    qualifyingEvent: (0, pg_core_1.varchar)("qualifying_event", { length: 100 }),
    qualifyingEventDate: (0, pg_core_1.date)("qualifying_event_date"),
    waivedCoverage: (0, pg_core_1.boolean)("waived_coverage").default(false),
    waiverReason: (0, pg_core_1.text)("waiver_reason"),
    enrollmentFormUrl: (0, pg_core_1.text)("enrollment_form_url"),
    beneficiaryDesignationUrl: (0, pg_core_1.text)("beneficiary_designation_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxHwEnrollmentsEffective: (0, pg_core_1.index)("idx_hw_enrollments_effective").using("btree", table.effectiveDate.asc().nullsLast()),
        idxHwEnrollmentsMember: (0, pg_core_1.index)("idx_hw_enrollments_member").using("btree", table.memberId.asc().nullsLast()),
        idxHwEnrollmentsPlan: (0, pg_core_1.index)("idx_hw_enrollments_plan").using("btree", table.hwPlanId.asc().nullsLast()),
        idxHwEnrollmentsStatus: (0, pg_core_1.index)("idx_hw_enrollments_status").using("btree", table.enrollmentStatus.asc().nullsLast()),
        hwBenefitEnrollmentsHwPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.hwPlanId],
            foreignColumns: [exports.hwBenefitPlans.id],
            name: "hw_benefit_enrollments_hw_plan_id_fkey"
        }),
        hwBenefitEnrollmentsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "hw_benefit_enrollments_member_id_fkey"
        }),
        uniqueMemberPlanPeriod: (0, pg_core_1.unique)("unique_member_plan_period").on(table.hwPlanId, table.memberId, table.effectiveDate),
    };
});
exports.hwBenefitClaims = (0, pg_core_1.pgTable)("hw_benefit_claims", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    hwPlanId: (0, pg_core_1.uuid)("hw_plan_id").notNull(),
    enrollmentId: (0, pg_core_1.uuid)("enrollment_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    claimNumber: (0, pg_core_1.varchar)("claim_number", { length: 50 }).notNull(),
    carrierClaimNumber: (0, pg_core_1.varchar)("carrier_claim_number", { length: 100 }),
    serviceDate: (0, pg_core_1.date)("service_date").notNull(),
    serviceType: (0, pg_core_1.varchar)("service_type", { length: 100 }),
    diagnosisCodes: (0, pg_core_1.jsonb)("diagnosis_codes"),
    procedureCodes: (0, pg_core_1.jsonb)("procedure_codes"),
    providerName: (0, pg_core_1.varchar)("provider_name", { length: 200 }),
    providerNpi: (0, pg_core_1.varchar)("provider_npi", { length: 20 }),
    providerType: (0, pg_core_1.varchar)("provider_type", { length: 100 }),
    providerTaxId: (0, pg_core_1.varchar)("provider_tax_id", { length: 20 }),
    patientName: (0, pg_core_1.varchar)("patient_name", { length: 200 }),
    patientRelationship: (0, pg_core_1.varchar)("patient_relationship", { length: 50 }),
    totalBilledAmount: (0, pg_core_1.numeric)("total_billed_amount", { precision: 10, scale: 2 }).notNull(),
    eligibleAmount: (0, pg_core_1.numeric)("eligible_amount", { precision: 10, scale: 2 }),
    deductibleApplied: (0, pg_core_1.numeric)("deductible_applied", { precision: 10, scale: 2 }).default('0'),
    coinsuranceAmount: (0, pg_core_1.numeric)("coinsurance_amount", { precision: 10, scale: 2 }).default('0'),
    copayAmount: (0, pg_core_1.numeric)("copay_amount", { precision: 10, scale: 2 }).default('0'),
    planPaidAmount: (0, pg_core_1.numeric)("plan_paid_amount", { precision: 10, scale: 2 }),
    memberResponsibility: (0, pg_core_1.numeric)("member_responsibility", { precision: 10, scale: 2 }),
    isCob: (0, pg_core_1.boolean)("is_cob").default(false),
    primaryPayer: (0, pg_core_1.varchar)("primary_payer", { length: 200 }),
    primaryPayerAmount: (0, pg_core_1.numeric)("primary_payer_amount", { precision: 10, scale: 2 }),
    claimStatus: (0, exports.hwClaimStatus)("claim_status").default('submitted'),
    submissionDate: (0, pg_core_1.date)("submission_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    receivedDate: (0, pg_core_1.date)("received_date"),
    processedDate: (0, pg_core_1.date)("processed_date"),
    paidDate: (0, pg_core_1.date)("paid_date"),
    denialReason: (0, pg_core_1.text)("denial_reason"),
    denialCode: (0, pg_core_1.varchar)("denial_code", { length: 50 }),
    appealDeadline: (0, pg_core_1.date)("appeal_deadline"),
    appealSubmittedDate: (0, pg_core_1.date)("appeal_submitted_date"),
    appealDecisionDate: (0, pg_core_1.date)("appeal_decision_date"),
    appealNotes: (0, pg_core_1.text)("appeal_notes"),
    edi837FileUrl: (0, pg_core_1.text)("edi_837_file_url"),
    edi835FileUrl: (0, pg_core_1.text)("edi_835_file_url"),
    edi277StatusUrl: (0, pg_core_1.text)("edi_277_status_url"),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 100 }),
    eobUrl: (0, pg_core_1.text)("eob_url"),
    flaggedForReview: (0, pg_core_1.boolean)("flagged_for_review").default(false),
    fraudScore: (0, pg_core_1.integer)("fraud_score"),
    fraudIndicators: (0, pg_core_1.jsonb)("fraud_indicators"),
    claimFormUrl: (0, pg_core_1.text)("claim_form_url"),
    supportingDocumentsUrls: (0, pg_core_1.jsonb)("supporting_documents_urls"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    submittedBy: (0, pg_core_1.uuid)("submitted_by"),
    processedBy: (0, pg_core_1.uuid)("processed_by"),
}, (table) => {
    return {
        idxHwClaimsCarrierNumber: (0, pg_core_1.index)("idx_hw_claims_carrier_number").using("btree", table.carrierClaimNumber.asc().nullsLast()),
        idxHwClaimsEnrollment: (0, pg_core_1.index)("idx_hw_claims_enrollment").using("btree", table.enrollmentId.asc().nullsLast()),
        idxHwClaimsFraud: (0, pg_core_1.index)("idx_hw_claims_fraud").using("btree", table.flaggedForReview.asc().nullsLast(), table.fraudScore.asc().nullsLast()),
        idxHwClaimsMember: (0, pg_core_1.index)("idx_hw_claims_member").using("btree", table.memberId.asc().nullsLast()),
        idxHwClaimsPlan: (0, pg_core_1.index)("idx_hw_claims_plan").using("btree", table.hwPlanId.asc().nullsLast()),
        idxHwClaimsServiceDate: (0, pg_core_1.index)("idx_hw_claims_service_date").using("btree", table.serviceDate.asc().nullsLast()),
        idxHwClaimsStatus: (0, pg_core_1.index)("idx_hw_claims_status").using("btree", table.claimStatus.asc().nullsLast()),
        hwBenefitClaimsEnrollmentIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.enrollmentId],
            foreignColumns: [exports.hwBenefitEnrollments.id],
            name: "hw_benefit_claims_enrollment_id_fkey"
        }),
        hwBenefitClaimsHwPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.hwPlanId],
            foreignColumns: [exports.hwBenefitPlans.id],
            name: "hw_benefit_claims_hw_plan_id_fkey"
        }),
        hwBenefitClaimsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "hw_benefit_claims_member_id_fkey"
        }),
        hwBenefitClaimsClaimNumberKey: (0, pg_core_1.unique)("hw_benefit_claims_claim_number_key").on(table.claimNumber),
    };
});
exports.trustComplianceReports = (0, pg_core_1.pgTable)("trust_compliance_reports", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    pensionPlanId: (0, pg_core_1.uuid)("pension_plan_id"),
    hwPlanId: (0, pg_core_1.uuid)("hw_plan_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    reportType: (0, pg_core_1.varchar)("report_type", { length: 100 }).notNull(),
    reportYear: (0, pg_core_1.integer)("report_year").notNull(),
    reportPeriodStart: (0, pg_core_1.date)("report_period_start").notNull(),
    reportPeriodEnd: (0, pg_core_1.date)("report_period_end").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    filedDate: (0, pg_core_1.date)("filed_date"),
    filingStatus: (0, pg_core_1.varchar)("filing_status", { length: 50 }).default('pending'),
    regulator: (0, pg_core_1.varchar)("regulator", { length: 100 }),
    filingConfirmationNumber: (0, pg_core_1.varchar)("filing_confirmation_number", { length: 100 }),
    totalPlanAssets: (0, pg_core_1.numeric)("total_plan_assets", { precision: 15, scale: 2 }),
    totalPlanLiabilities: (0, pg_core_1.numeric)("total_plan_liabilities", { precision: 15, scale: 2 }),
    totalContributionsReceived: (0, pg_core_1.numeric)("total_contributions_received", { precision: 12, scale: 2 }),
    totalBenefitsPaid: (0, pg_core_1.numeric)("total_benefits_paid", { precision: 12, scale: 2 }),
    administrativeExpenses: (0, pg_core_1.numeric)("administrative_expenses", { precision: 10, scale: 2 }),
    auditRequired: (0, pg_core_1.boolean)("audit_required").default(false),
    auditorName: (0, pg_core_1.varchar)("auditor_name", { length: 200 }),
    auditorOpinion: (0, pg_core_1.varchar)("auditor_opinion", { length: 50 }),
    auditReportUrl: (0, pg_core_1.text)("audit_report_url"),
    isLate: (0, pg_core_1.boolean)("is_late").default(false),
    daysLate: (0, pg_core_1.integer)("days_late"),
    lateFilingPenalty: (0, pg_core_1.numeric)("late_filing_penalty", { precision: 10, scale: 2 }),
    penaltyPaid: (0, pg_core_1.boolean)("penalty_paid").default(false),
    reportFileUrl: (0, pg_core_1.text)("report_file_url").notNull(),
    schedulesUrls: (0, pg_core_1.jsonb)("schedules_urls"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    preparedBy: (0, pg_core_1.uuid)("prepared_by"),
    filedBy: (0, pg_core_1.uuid)("filed_by"),
}, (table) => {
    return {
        idxComplianceReportsDueDate: (0, pg_core_1.index)("idx_compliance_reports_due_date").using("btree", table.dueDate.asc().nullsLast()),
        idxComplianceReportsHw: (0, pg_core_1.index)("idx_compliance_reports_hw").using("btree", table.hwPlanId.asc().nullsLast()),
        idxComplianceReportsOrg: (0, pg_core_1.index)("idx_compliance_reports_org").using("btree", table.organizationId.asc().nullsLast()),
        idxComplianceReportsPension: (0, pg_core_1.index)("idx_compliance_reports_pension").using("btree", table.pensionPlanId.asc().nullsLast()),
        idxComplianceReportsStatus: (0, pg_core_1.index)("idx_compliance_reports_status").using("btree", table.filingStatus.asc().nullsLast()),
        idxComplianceReportsTypeYear: (0, pg_core_1.index)("idx_compliance_reports_type_year").using("btree", table.reportType.asc().nullsLast(), table.reportYear.asc().nullsLast()),
        trustComplianceReportsHwPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.hwPlanId],
            foreignColumns: [exports.hwBenefitPlans.id],
            name: "trust_compliance_reports_hw_plan_id_fkey"
        }),
        trustComplianceReportsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "trust_compliance_reports_organization_id_fkey"
        }),
        trustComplianceReportsPensionPlanIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.pensionPlanId],
            foreignColumns: [exports.pensionPlans.id],
            name: "trust_compliance_reports_pension_plan_id_fkey"
        }),
    };
});
exports.vPensionFundingSummary = (0, pg_core_1.pgTable)("v_pension_funding_summary", {
    planId: (0, pg_core_1.uuid)("plan_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    planName: (0, pg_core_1.varchar)("plan_name", { length: 200 }),
    planType: (0, exports.pensionPlanType)("plan_type"),
    isMultiEmployer: (0, pg_core_1.boolean)("is_multi_employer"),
    currentAssets: (0, pg_core_1.numeric)("current_assets", { precision: 15, scale: 2 }),
    currentLiabilities: (0, pg_core_1.numeric)("current_liabilities", { precision: 15, scale: 2 }),
    fundedRatio: (0, pg_core_1.numeric)("funded_ratio", { precision: 5, scale: 2 }),
    latestGcFundedRatio: (0, pg_core_1.numeric)("latest_gc_funded_ratio", { precision: 5, scale: 2 }),
    latestSolvencyFundedRatio: (0, pg_core_1.numeric)("latest_solvency_funded_ratio", { precision: 5, scale: 2 }),
    latestValuationDate: (0, pg_core_1.date)("latest_valuation_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalActiveMembers: (0, pg_core_1.bigint)("total_active_members", { mode: "number" }),
    totalPensionableHours: (0, pg_core_1.numeric)("total_pensionable_hours"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalBenefitClaims: (0, pg_core_1.bigint)("total_benefit_claims", { mode: "number" }),
    totalAnnualBenefitsApproved: (0, pg_core_1.numeric)("total_annual_benefits_approved"),
});
exports.vHwClaimsAging = (0, pg_core_1.pgTable)("v_hw_claims_aging", {
    planId: (0, pg_core_1.uuid)("plan_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    planName: (0, pg_core_1.varchar)("plan_name", { length: 200 }),
    planType: (0, exports.hwPlanType)("plan_type"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalClaims: (0, pg_core_1.bigint)("total_claims", { mode: "number" }),
    totalBilled: (0, pg_core_1.numeric)("total_billed"),
    totalPaid: (0, pg_core_1.numeric)("total_paid"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pendingCount: (0, pg_core_1.bigint)("pending_count", { mode: "number" }),
    pendingAmount: (0, pg_core_1.numeric)("pending_amount"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aged30DaysCount: (0, pg_core_1.bigint)("aged_30_days_count", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aged60DaysCount: (0, pg_core_1.bigint)("aged_60_days_count", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aged90DaysCount: (0, pg_core_1.bigint)("aged_90_days_count", { mode: "number" }),
    avgProcessingDays: (0, pg_core_1.numeric)("avg_processing_days"),
});
exports.vMemberBenefitEligibility = (0, pg_core_1.pgTable)("v_member_benefit_eligibility", {
    memberId: (0, pg_core_1.uuid)("member_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    membershipStatus: (0, pg_core_1.varchar)("membership_status", { length: 50 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pensionPlansEnrolled: (0, pg_core_1.bigint)("pension_plans_enrolled", { mode: "number" }),
    totalPensionHours: (0, pg_core_1.numeric)("total_pension_hours"),
    lastPensionContributionDate: (0, pg_core_1.date)("last_pension_contribution_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    hwPlansEnrolled: (0, pg_core_1.bigint)("hw_plans_enrolled", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    activeHwEnrollments: (0, pg_core_1.bigint)("active_hw_enrollments", { mode: "number" }),
    latestHwEnrollmentDate: (0, pg_core_1.date)("latest_hw_enrollment_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalPensionClaims: (0, pg_core_1.bigint)("total_pension_claims", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalHwClaims: (0, pg_core_1.bigint)("total_hw_claims", { mode: "number" }),
    totalPensionBenefitsClaimed: (0, pg_core_1.numeric)("total_pension_benefits_claimed"),
    totalHwBenefitsPaid: (0, pg_core_1.numeric)("total_hw_benefits_paid"),
});
exports.taxYearConfigurations = (0, pg_core_1.pgTable)("tax_year_configurations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    taxYear: (0, pg_core_1.integer)("tax_year").notNull(),
    t4AFilingDeadline: (0, pg_core_1.date)("t4a_filing_deadline").notNull(),
    copeReceiptDeadline: (0, pg_core_1.date)("cope_receipt_deadline").notNull(),
    rl1FilingDeadline: (0, pg_core_1.date)("rl_1_filing_deadline"),
    craTransmitterNumber: (0, pg_core_1.varchar)("cra_transmitter_number", { length: 8 }),
    craWebAccessCode: (0, pg_core_1.varchar)("cra_web_access_code", { length: 16 }),
    craBusinessNumber: (0, pg_core_1.varchar)("cra_business_number", { length: 15 }),
    rqIdentificationNumber: (0, pg_core_1.varchar)("rq_identification_number", { length: 10 }),
    rqFileNumber: (0, pg_core_1.varchar)("rq_file_number", { length: 6 }),
    electionsCanadaAgentId: (0, pg_core_1.varchar)("elections_canada_agent_id", { length: 50 }),
    electionsCanadaRecipientNumber: (0, pg_core_1.varchar)("elections_canada_recipient_number", { length: 20 }),
    organizationContactName: (0, pg_core_1.varchar)("organization_contact_name", { length: 200 }),
    organizationContactPhone: (0, pg_core_1.varchar)("organization_contact_phone", { length: 50 }),
    organizationContactEmail: (0, pg_core_1.varchar)("organization_contact_email", { length: 255 }),
    organizationMailingAddress: (0, pg_core_1.text)("organization_mailing_address"),
    isFinalized: (0, pg_core_1.boolean)("is_finalized").default(false),
    finalizedAt: (0, pg_core_1.timestamp)("finalized_at", { withTimezone: true, mode: 'string' }),
    finalizedBy: (0, pg_core_1.uuid)("finalized_by"),
    xmlFileGenerated: (0, pg_core_1.boolean)("xml_file_generated").default(false),
    xmlGeneratedAt: (0, pg_core_1.timestamp)("xml_generated_at", { withTimezone: true, mode: 'string' }),
    submittedToCra: (0, pg_core_1.boolean)("submitted_to_cra").default(false),
    craSubmissionDate: (0, pg_core_1.date)("cra_submission_date"),
    craConfirmationNumber: (0, pg_core_1.varchar)("cra_confirmation_number", { length: 100 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxTaxYearConfigOrg: (0, pg_core_1.index)("idx_tax_year_config_org").using("btree", table.organizationId.asc().nullsLast()),
        idxTaxYearConfigYear: (0, pg_core_1.index)("idx_tax_year_config_year").using("btree", table.taxYear.asc().nullsLast()),
        taxYearConfigurationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "tax_year_configurations_organization_id_fkey"
        }),
        uniqueOrgTaxYear: (0, pg_core_1.unique)("unique_org_tax_year").on(table.organizationId, table.taxYear),
    };
});
exports.trendAnalyses = (0, pg_core_1.pgTable)("trend_analyses", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    analysisType: (0, pg_core_1.text)("analysis_type").notNull(),
    dataSource: (0, pg_core_1.text)("data_source").notNull(),
    timeRange: (0, pg_core_1.jsonb)("time_range").notNull(),
    detectedTrend: (0, pg_core_1.text)("detected_trend"),
    trendStrength: (0, pg_core_1.numeric)("trend_strength"),
    anomaliesDetected: (0, pg_core_1.jsonb)("anomalies_detected"),
    anomalyCount: (0, pg_core_1.integer)("anomaly_count").default(0),
    seasonalPattern: (0, pg_core_1.jsonb)("seasonal_pattern"),
    correlations: (0, pg_core_1.jsonb)("correlations"),
    insights: (0, pg_core_1.text)("insights"),
    recommendations: (0, pg_core_1.jsonb)("recommendations"),
    statisticalTests: (0, pg_core_1.jsonb)("statistical_tests"),
    visualizationData: (0, pg_core_1.jsonb)("visualization_data"),
    confidence: (0, pg_core_1.numeric)("confidence"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        createdIdx: (0, pg_core_1.index)("trend_analyses_created_idx").using("btree", table.createdAt.asc().nullsLast()),
        dataSourceIdx: (0, pg_core_1.index)("trend_analyses_data_source_idx").using("btree", table.dataSource.asc().nullsLast()),
        orgIdx: (0, pg_core_1.index)("trend_analyses_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        typeIdx: (0, pg_core_1.index)("trend_analyses_type_idx").using("btree", table.analysisType.asc().nullsLast()),
        trendAnalysesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "trend_analyses_organization_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.taxSlips = (0, pg_core_1.pgTable)("tax_slips", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    taxYearConfigId: (0, pg_core_1.uuid)("tax_year_config_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id"),
    recipientName: (0, pg_core_1.varchar)("recipient_name", { length: 200 }).notNull(),
    recipientSin: (0, pg_core_1.varchar)("recipient_sin", { length: 11 }),
    recipientAddressLine1: (0, pg_core_1.varchar)("recipient_address_line1", { length: 200 }),
    recipientAddressLine2: (0, pg_core_1.varchar)("recipient_address_line2", { length: 200 }),
    recipientCity: (0, pg_core_1.varchar)("recipient_city", { length: 100 }),
    recipientProvince: (0, pg_core_1.varchar)("recipient_province", { length: 2 }),
    recipientPostalCode: (0, pg_core_1.varchar)("recipient_postal_code", { length: 7 }),
    slipType: (0, exports.taxSlipType)("slip_type").notNull(),
    taxYear: (0, pg_core_1.integer)("tax_year").notNull(),
    slipNumber: (0, pg_core_1.varchar)("slip_number", { length: 50 }).notNull(),
    box016PensionAmount: (0, pg_core_1.integer)("box_016_pension_amount").default(0),
    box018LumpSumAmount: (0, pg_core_1.integer)("box_018_lump_sum_amount").default(0),
    box020SelfEmployedCommissions: (0, pg_core_1.integer)("box_020_self_employed_commissions").default(0),
    box022IncomeTaxDeducted: (0, pg_core_1.integer)("box_022_income_tax_deducted").default(0),
    box024Annuities: (0, pg_core_1.integer)("box_024_annuities").default(0),
    box048FeesForServices: (0, pg_core_1.integer)("box_048_fees_for_services").default(0),
    box101RespAccumulatedIncome: (0, pg_core_1.integer)("box_101_resp_accumulated_income").default(0),
    box102RespEducationalAssistance: (0, pg_core_1.integer)("box_102_resp_educational_assistance").default(0),
    box105OtherIncome: (0, pg_core_1.integer)("box_105_other_income").default(0),
    copeContributionAmount: (0, pg_core_1.integer)("cope_contribution_amount").default(0),
    copeEligibleAmount: (0, pg_core_1.integer)("cope_eligible_amount").default(0),
    copeIneligibleAmount: (0, pg_core_1.integer)("cope_ineligible_amount").default(0),
    rl1BoxOPensionAmount: (0, pg_core_1.integer)("rl_1_box_o_pension_amount").default(0),
    quebecProvincialTaxWithheld: (0, pg_core_1.integer)("quebec_provincial_tax_withheld").default(0),
    sourceTransactionIds: (0, pg_core_1.jsonb)("source_transaction_ids"),
    isAmended: (0, pg_core_1.boolean)("is_amended").default(false),
    originalSlipId: (0, pg_core_1.uuid)("original_slip_id"),
    amendmentNumber: (0, pg_core_1.integer)("amendment_number").default(0),
    amendmentReason: (0, pg_core_1.text)("amendment_reason"),
    slipStatus: (0, pg_core_1.varchar)("slip_status", { length: 50 }).default('draft'),
    finalizedAt: (0, pg_core_1.timestamp)("finalized_at", { withTimezone: true, mode: 'string' }),
    issuedAt: (0, pg_core_1.timestamp)("issued_at", { withTimezone: true, mode: 'string' }),
    deliveryMethod: (0, pg_core_1.varchar)("delivery_method", { length: 50 }),
    emailSentAt: (0, pg_core_1.timestamp)("email_sent_at", { withTimezone: true, mode: 'string' }),
    emailOpenedAt: (0, pg_core_1.timestamp)("email_opened_at", { withTimezone: true, mode: 'string' }),
    downloadedAt: (0, pg_core_1.timestamp)("downloaded_at", { withTimezone: true, mode: 'string' }),
    pdfUrl: (0, pg_core_1.text)("pdf_url"),
    pdfGeneratedAt: (0, pg_core_1.timestamp)("pdf_generated_at", { withTimezone: true, mode: 'string' }),
    includedInXmlBatch: (0, pg_core_1.boolean)("included_in_xml_batch").default(false),
    xmlBatchId: (0, pg_core_1.uuid)("xml_batch_id"),
    slipHash: (0, pg_core_1.varchar)("slip_hash", { length: 128 }),
    digitalSignature: (0, pg_core_1.text)("digital_signature"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxTaxSlipsConfig: (0, pg_core_1.index)("idx_tax_slips_config").using("btree", table.taxYearConfigId.asc().nullsLast()),
        idxTaxSlipsHash: (0, pg_core_1.index)("idx_tax_slips_hash").using("btree", table.slipHash.asc().nullsLast()),
        idxTaxSlipsMember: (0, pg_core_1.index)("idx_tax_slips_member").using("btree", table.memberId.asc().nullsLast()),
        idxTaxSlipsOrg: (0, pg_core_1.index)("idx_tax_slips_org").using("btree", table.organizationId.asc().nullsLast()),
        idxTaxSlipsSin: (0, pg_core_1.index)("idx_tax_slips_sin").using("btree", table.recipientSin.asc().nullsLast()),
        idxTaxSlipsStatus: (0, pg_core_1.index)("idx_tax_slips_status").using("btree", table.slipStatus.asc().nullsLast()),
        idxTaxSlipsType: (0, pg_core_1.index)("idx_tax_slips_type").using("btree", table.slipType.asc().nullsLast()),
        idxTaxSlipsYear: (0, pg_core_1.index)("idx_tax_slips_year").using("btree", table.taxYear.asc().nullsLast()),
        taxSlipsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "tax_slips_member_id_fkey"
        }),
        taxSlipsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "tax_slips_organization_id_fkey"
        }),
        taxSlipsOriginalSlipIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.originalSlipId],
            foreignColumns: [table.id],
            name: "tax_slips_original_slip_id_fkey"
        }),
        taxSlipsTaxYearConfigIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.taxYearConfigId],
            foreignColumns: [exports.taxYearConfigurations.id],
            name: "tax_slips_tax_year_config_id_fkey"
        }),
        taxSlipsSlipNumberKey: (0, pg_core_1.unique)("tax_slips_slip_number_key").on(table.slipNumber),
    };
});
exports.craXmlBatches = (0, pg_core_1.pgTable)("cra_xml_batches", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    taxYearConfigId: (0, pg_core_1.uuid)("tax_year_config_id").notNull(),
    batchNumber: (0, pg_core_1.varchar)("batch_number", { length: 50 }).notNull(),
    taxYear: (0, pg_core_1.integer)("tax_year").notNull(),
    returnType: (0, pg_core_1.varchar)("return_type", { length: 20 }).notNull(),
    transmitterNumber: (0, pg_core_1.varchar)("transmitter_number", { length: 8 }).notNull(),
    transmitterName: (0, pg_core_1.varchar)("transmitter_name", { length: 200 }),
    transmitterType: (0, pg_core_1.varchar)("transmitter_type", { length: 10 }).default('E'),
    totalSlipsCount: (0, pg_core_1.integer)("total_slips_count").notNull(),
    totalAmountReported: (0, pg_core_1.integer)("total_amount_reported").notNull(),
    totalTaxWithheld: (0, pg_core_1.integer)("total_tax_withheld").notNull(),
    xmlFilename: (0, pg_core_1.varchar)("xml_filename", { length: 255 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    xmlFileSizeBytes: (0, pg_core_1.bigint)("xml_file_size_bytes", { mode: "number" }),
    xmlSchemaVersion: (0, pg_core_1.varchar)("xml_schema_version", { length: 20 }),
    xmlContent: (0, pg_core_1.text)("xml_content"),
    xmlFileUrl: (0, pg_core_1.text)("xml_file_url"),
    generatedAt: (0, pg_core_1.timestamp)("generated_at", { withTimezone: true, mode: 'string' }),
    generatedBy: (0, pg_core_1.uuid)("generated_by"),
    submissionMethod: (0, pg_core_1.varchar)("submission_method", { length: 50 }),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at", { withTimezone: true, mode: 'string' }),
    submittedBy: (0, pg_core_1.uuid)("submitted_by"),
    craConfirmationNumber: (0, pg_core_1.varchar)("cra_confirmation_number", { length: 100 }),
    craAccepted: (0, pg_core_1.boolean)("cra_accepted"),
    craResponseDate: (0, pg_core_1.date)("cra_response_date"),
    craResponseDetails: (0, pg_core_1.jsonb)("cra_response_details"),
    craErrors: (0, pg_core_1.jsonb)("cra_errors"),
    batchStatus: (0, pg_core_1.varchar)("batch_status", { length: 50 }).default('draft'),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxCraBatchesConfig: (0, pg_core_1.index)("idx_cra_batches_config").using("btree", table.taxYearConfigId.asc().nullsLast()),
        idxCraBatchesConfirmation: (0, pg_core_1.index)("idx_cra_batches_confirmation").using("btree", table.craConfirmationNumber.asc().nullsLast()),
        idxCraBatchesOrg: (0, pg_core_1.index)("idx_cra_batches_org").using("btree", table.organizationId.asc().nullsLast()),
        idxCraBatchesStatus: (0, pg_core_1.index)("idx_cra_batches_status").using("btree", table.batchStatus.asc().nullsLast()),
        idxCraBatchesYear: (0, pg_core_1.index)("idx_cra_batches_year").using("btree", table.taxYear.asc().nullsLast()),
        craXmlBatchesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "cra_xml_batches_organization_id_fkey"
        }),
        craXmlBatchesTaxYearConfigIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.taxYearConfigId],
            foreignColumns: [exports.taxYearConfigurations.id],
            name: "cra_xml_batches_tax_year_config_id_fkey"
        }),
        craXmlBatchesBatchNumberKey: (0, pg_core_1.unique)("cra_xml_batches_batch_number_key").on(table.batchNumber),
    };
});
exports.copeContributions = (0, pg_core_1.pgTable)("cope_contributions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    contributionDate: (0, pg_core_1.date)("contribution_date").notNull(),
    contributionType: (0, pg_core_1.varchar)("contribution_type", { length: 50 }).default('payroll_deduction'),
    totalAmount: (0, pg_core_1.integer)("total_amount").notNull(),
    politicalPortion: (0, pg_core_1.integer)("political_portion").notNull(),
    administrativePortion: (0, pg_core_1.integer)("administrative_portion").notNull(),
    isEligibleForCredit: (0, pg_core_1.boolean)("is_eligible_for_credit").default(true),
    ineligibleReason: (0, pg_core_1.text)("ineligible_reason"),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 100 }),
    duesTransactionId: (0, pg_core_1.uuid)("dues_transaction_id"),
    financialTransactionId: (0, pg_core_1.uuid)("financial_transaction_id"),
    receiptIssued: (0, pg_core_1.boolean)("receipt_issued").default(false),
    receiptIssuedDate: (0, pg_core_1.date)("receipt_issued_date"),
    taxSlipId: (0, pg_core_1.uuid)("tax_slip_id"),
    reportedToElectionsCanada: (0, pg_core_1.boolean)("reported_to_elections_canada").default(false),
    electionsCanadaReportDate: (0, pg_core_1.date)("elections_canada_report_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxCopeContributionsDate: (0, pg_core_1.index)("idx_cope_contributions_date").using("btree", table.contributionDate.asc().nullsLast()),
        idxCopeContributionsDuesTxn: (0, pg_core_1.index)("idx_cope_contributions_dues_txn").using("btree", table.duesTransactionId.asc().nullsLast()),
        idxCopeContributionsMember: (0, pg_core_1.index)("idx_cope_contributions_member").using("btree", table.memberId.asc().nullsLast()),
        idxCopeContributionsOrg: (0, pg_core_1.index)("idx_cope_contributions_org").using("btree", table.organizationId.asc().nullsLast()),
        idxCopeContributionsSlip: (0, pg_core_1.index)("idx_cope_contributions_slip").using("btree", table.taxSlipId.asc().nullsLast()),
        copeContributionsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "cope_contributions_member_id_fkey"
        }),
        copeContributionsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "cope_contributions_organization_id_fkey"
        }),
        copeContributionsTaxSlipIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.taxSlipId],
            foreignColumns: [exports.taxSlips.id],
            name: "cope_contributions_tax_slip_id_fkey"
        }),
    };
});
exports.vTaxSlipSummary = (0, pg_core_1.pgTable)("v_tax_slip_summary", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    taxYear: (0, pg_core_1.integer)("tax_year"),
    slipType: (0, exports.taxSlipType)("slip_type"),
    slipStatus: (0, pg_core_1.varchar)("slip_status", { length: 50 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalSlips: (0, pg_core_1.bigint)("total_slips", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalAmountCents: (0, pg_core_1.bigint)("total_amount_cents", { mode: "number" }),
    totalAmountDollars: (0, pg_core_1.numeric)("total_amount_dollars"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalTaxWithheldCents: (0, pg_core_1.bigint)("total_tax_withheld_cents", { mode: "number" }),
    totalTaxWithheldDollars: (0, pg_core_1.numeric)("total_tax_withheld_dollars"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    slipsEmailed: (0, pg_core_1.bigint)("slips_emailed", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    slipsDownloaded: (0, pg_core_1.bigint)("slips_downloaded", { mode: "number" }),
});
exports.vCopeMemberSummary = (0, pg_core_1.pgTable)("v_cope_member_summary", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    memberId: (0, pg_core_1.uuid)("member_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalContributions: (0, pg_core_1.bigint)("total_contributions", { mode: "number" }),
    firstContributionDate: (0, pg_core_1.date)("first_contribution_date"),
    latestContributionDate: (0, pg_core_1.date)("latest_contribution_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    lifetimeTotalCents: (0, pg_core_1.bigint)("lifetime_total_cents", { mode: "number" }),
    lifetimeTotalDollars: (0, pg_core_1.numeric)("lifetime_total_dollars"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    lifetimePoliticalCents: (0, pg_core_1.bigint)("lifetime_political_cents", { mode: "number" }),
    lifetimePoliticalDollars: (0, pg_core_1.numeric)("lifetime_political_dollars"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    receiptsIssued: (0, pg_core_1.bigint)("receipts_issued", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    receiptsPending: (0, pg_core_1.bigint)("receipts_pending", { mode: "number" }),
});
exports.memberDemographics = (0, pg_core_1.pgTable)("member_demographics", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    dataCollectionConsent: (0, pg_core_1.boolean)("data_collection_consent").default(false).notNull(),
    consentDate: (0, pg_core_1.timestamp)("consent_date", { withTimezone: true, mode: 'string' }),
    consentWithdrawnDate: (0, pg_core_1.timestamp)("consent_withdrawn_date", { withTimezone: true, mode: 'string' }),
    consentType: (0, pg_core_1.varchar)("consent_type", { length: 50 }),
    consentPurpose: (0, pg_core_1.text)("consent_purpose"),
    dataRetentionYears: (0, pg_core_1.integer)("data_retention_years").default(7),
    dataExpiryDate: (0, pg_core_1.date)("data_expiry_date"),
    equityGroups: (0, pg_core_1.jsonb)("equity_groups").default([]),
    genderIdentity: (0, exports.genderIdentityType)("gender_identity"),
    genderIdentityOther: (0, pg_core_1.text)("gender_identity_other"),
    isIndigenous: (0, pg_core_1.boolean)("is_indigenous"),
    indigenousIdentity: (0, exports.indigenousIdentityType)("indigenous_identity"),
    indigenousNation: (0, pg_core_1.varchar)("indigenous_nation", { length: 200 }),
    indigenousTreatyNumber: (0, pg_core_1.varchar)("indigenous_treaty_number", { length: 50 }),
    indigenousDataGovernanceConsent: (0, pg_core_1.boolean)("indigenous_data_governance_consent").default(false),
    isVisibleMinority: (0, pg_core_1.boolean)("is_visible_minority"),
    visibleMinorityGroups: (0, pg_core_1.jsonb)("visible_minority_groups"),
    hasDisability: (0, pg_core_1.boolean)("has_disability"),
    disabilityTypes: (0, pg_core_1.jsonb)("disability_types"),
    requiresAccommodation: (0, pg_core_1.boolean)("requires_accommodation"),
    accommodationDetailsEncrypted: (0, pg_core_1.text)("accommodation_details_encrypted"),
    isLgbtq2Plus: (0, pg_core_1.boolean)("is_lgbtq2plus"),
    lgbtq2PlusIdentity: (0, pg_core_1.jsonb)("lgbtq2plus_identity"),
    dateOfBirth: (0, pg_core_1.date)("date_of_birth"),
    ageRange: (0, pg_core_1.varchar)("age_range", { length: 20 }),
    isNewcomer: (0, pg_core_1.boolean)("is_newcomer"),
    immigrationYear: (0, pg_core_1.integer)("immigration_year"),
    countryOfOrigin: (0, pg_core_1.varchar)("country_of_origin", { length: 100 }),
    primaryLanguage: (0, pg_core_1.varchar)("primary_language", { length: 50 }),
    speaksFrench: (0, pg_core_1.boolean)("speaks_french"),
    speaksIndigenousLanguage: (0, pg_core_1.boolean)("speaks_indigenous_language"),
    indigenousLanguageName: (0, pg_core_1.varchar)("indigenous_language_name", { length: 100 }),
    intersectionalityCount: (0, pg_core_1.integer)("intersectionality_count"),
    needsInterpretation: (0, pg_core_1.boolean)("needs_interpretation").default(false),
    interpretationLanguage: (0, pg_core_1.varchar)("interpretation_language", { length: 100 }),
    needsTranslation: (0, pg_core_1.boolean)("needs_translation").default(false),
    translationLanguage: (0, pg_core_1.varchar)("translation_language", { length: 100 }),
    needsMobilityAccommodation: (0, pg_core_1.boolean)("needs_mobility_accommodation").default(false),
    allowAggregateReporting: (0, pg_core_1.boolean)("allow_aggregate_reporting").default(true),
    allowResearchParticipation: (0, pg_core_1.boolean)("allow_research_participation").default(false),
    allowExternalReporting: (0, pg_core_1.boolean)("allow_external_reporting").default(false),
    dataAccessLog: (0, pg_core_1.jsonb)("data_access_log").default([]),
    lastUpdatedBy: (0, pg_core_1.uuid)("last_updated_by"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxDemographicsConsent: (0, pg_core_1.index)("idx_demographics_consent").using("btree", table.dataCollectionConsent.asc().nullsLast()),
        idxDemographicsExpiry: (0, pg_core_1.index)("idx_demographics_expiry").using("btree", table.dataExpiryDate.asc().nullsLast()),
        idxDemographicsIndigenous: (0, pg_core_1.index)("idx_demographics_indigenous").using("btree", table.isIndigenous.asc().nullsLast()),
        idxDemographicsMember: (0, pg_core_1.index)("idx_demographics_member").using("btree", table.memberId.asc().nullsLast()),
        idxDemographicsOrg: (0, pg_core_1.index)("idx_demographics_org").using("btree", table.organizationId.asc().nullsLast()),
        memberDemographicsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "member_demographics_member_id_fkey"
        }),
        memberDemographicsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "member_demographics_organization_id_fkey"
        }),
        memberDemographicsMemberIdKey: (0, pg_core_1.unique)("member_demographics_member_id_key").on(table.memberId),
    };
});
exports.vCriticalDeadlines = (0, pg_core_1.pgTable)("v_critical_deadlines", {
    id: (0, pg_core_1.uuid)("id"),
    claimId: (0, pg_core_1.uuid)("claim_id"),
    tenantId: (0, pg_core_1.varchar)("tenant_id", { length: 255 }),
    deadlineRuleId: (0, pg_core_1.uuid)("deadline_rule_id"),
    deadlineName: (0, pg_core_1.varchar)("deadline_name", { length: 255 }),
    deadlineType: (0, pg_core_1.varchar)("deadline_type", { length: 100 }),
    eventDate: (0, pg_core_1.timestamp)("event_date", { mode: 'string' }),
    originalDeadline: (0, pg_core_1.timestamp)("original_deadline", { mode: 'string' }),
    dueDate: (0, pg_core_1.timestamp)("due_date", { mode: 'string' }),
    completedAt: (0, pg_core_1.timestamp)("completed_at", { mode: 'string' }),
    status: (0, exports.deadlineStatus)("status"),
    priority: (0, exports.deadlinePriority)("priority"),
    extensionCount: (0, pg_core_1.integer)("extension_count"),
    totalExtensionDays: (0, pg_core_1.integer)("total_extension_days"),
    lastExtensionDate: (0, pg_core_1.timestamp)("last_extension_date", { mode: 'string' }),
    lastExtensionReason: (0, pg_core_1.text)("last_extension_reason"),
    completedBy: (0, pg_core_1.uuid)("completed_by"),
    completionNotes: (0, pg_core_1.text)("completion_notes"),
    isOverdue: (0, pg_core_1.boolean)("is_overdue"),
    daysUntilDue: (0, pg_core_1.integer)("days_until_due"),
    daysOverdue: (0, pg_core_1.integer)("days_overdue"),
    escalatedAt: (0, pg_core_1.timestamp)("escalated_at", { mode: 'string' }),
    escalatedTo: (0, pg_core_1.uuid)("escalated_to"),
    alertCount: (0, pg_core_1.integer)("alert_count"),
    lastAlertSent: (0, pg_core_1.timestamp)("last_alert_sent", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }),
    isOverdueCalc: (0, pg_core_1.boolean)("is_overdue_calc"),
    daysOverdueCalc: (0, pg_core_1.integer)("days_overdue_calc"),
    daysUntilDueCalc: (0, pg_core_1.integer)("days_until_due_calc"),
});
exports.payEquityComplaints = (0, pg_core_1.pgTable)("pay_equity_complaints", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    complainantMemberId: (0, pg_core_1.uuid)("complainant_member_id"),
    complainantName: (0, pg_core_1.varchar)("complainant_name", { length: 200 }),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(false),
    isGroupComplaint: (0, pg_core_1.boolean)("is_group_complaint").default(false),
    groupMemberCount: (0, pg_core_1.integer)("group_member_count"),
    groupMemberIds: (0, pg_core_1.jsonb)("group_member_ids"),
    complaintNumber: (0, pg_core_1.varchar)("complaint_number", { length: 50 }).notNull(),
    filedDate: (0, pg_core_1.date)("filed_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    jobClassComplainant: (0, pg_core_1.varchar)("job_class_complainant", { length: 200 }).notNull(),
    jobClassComparator: (0, pg_core_1.varchar)("job_class_comparator", { length: 200 }).notNull(),
    complainantHourlyRate: (0, pg_core_1.numeric)("complainant_hourly_rate", { precision: 10, scale: 2 }),
    comparatorHourlyRate: (0, pg_core_1.numeric)("comparator_hourly_rate", { precision: 10, scale: 2 }),
    estimatedPayGapPercentage: (0, pg_core_1.numeric)("estimated_pay_gap_percentage", { precision: 5, scale: 2 }),
    estimatedAnnualLoss: (0, pg_core_1.numeric)("estimated_annual_loss", { precision: 10, scale: 2 }),
    skillComparison: (0, pg_core_1.text)("skill_comparison"),
    effortComparison: (0, pg_core_1.text)("effort_comparison"),
    responsibilityComparison: (0, pg_core_1.text)("responsibility_comparison"),
    workingConditionsComparison: (0, pg_core_1.text)("working_conditions_comparison"),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 50 }),
    legislationCited: (0, pg_core_1.varchar)("legislation_cited", { length: 200 }),
    complaintStatus: (0, exports.payEquityStatus)("complaint_status").default('intake'),
    assignedInvestigator: (0, pg_core_1.uuid)("assigned_investigator"),
    investigationStartDate: (0, pg_core_1.date)("investigation_start_date"),
    investigationCompletionDate: (0, pg_core_1.date)("investigation_completion_date"),
    employerResponseDate: (0, pg_core_1.date)("employer_response_date"),
    employerPosition: (0, pg_core_1.text)("employer_position"),
    employerSupportingDocumentsUrls: (0, pg_core_1.jsonb)("employer_supporting_documents_urls"),
    unionRepresentativeId: (0, pg_core_1.uuid)("union_representative_id"),
    unionPosition: (0, pg_core_1.text)("union_position"),
    unionSupportingDocumentsUrls: (0, pg_core_1.jsonb)("union_supporting_documents_urls"),
    mediationScheduledDate: (0, pg_core_1.date)("mediation_scheduled_date"),
    mediatorName: (0, pg_core_1.varchar)("mediator_name", { length: 200 }),
    mediationOutcome: (0, pg_core_1.varchar)("mediation_outcome", { length: 50 }),
    resolutionDate: (0, pg_core_1.date)("resolution_date"),
    resolutionType: (0, pg_core_1.varchar)("resolution_type", { length: 50 }),
    settlementAmount: (0, pg_core_1.numeric)("settlement_amount", { precision: 12, scale: 2 }),
    retroactivePaymentAmount: (0, pg_core_1.numeric)("retroactive_payment_amount", { precision: 12, scale: 2 }),
    retroactivePeriodStart: (0, pg_core_1.date)("retroactive_period_start"),
    retroactivePeriodEnd: (0, pg_core_1.date)("retroactive_period_end"),
    ongoingPayAdjustment: (0, pg_core_1.numeric)("ongoing_pay_adjustment", { precision: 10, scale: 2 }),
    appealFiled: (0, pg_core_1.boolean)("appeal_filed").default(false),
    appealFiledDate: (0, pg_core_1.date)("appeal_filed_date"),
    appealDecisionDate: (0, pg_core_1.date)("appeal_decision_date"),
    appealOutcome: (0, pg_core_1.text)("appeal_outcome"),
    reportedToStatcan: (0, pg_core_1.boolean)("reported_to_statcan").default(false),
    statcanReportDate: (0, pg_core_1.date)("statcan_report_date"),
    complaintFormUrl: (0, pg_core_1.text)("complaint_form_url"),
    investigationReportUrl: (0, pg_core_1.text)("investigation_report_url"),
    settlementAgreementUrl: (0, pg_core_1.text)("settlement_agreement_url"),
    isConfidential: (0, pg_core_1.boolean)("is_confidential").default(true),
    confidentialityRestrictions: (0, pg_core_1.text)("confidentiality_restrictions"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxPayEquityComplaintsFiledDate: (0, pg_core_1.index)("idx_pay_equity_complaints_filed_date").using("btree", table.filedDate.asc().nullsLast()),
        idxPayEquityComplaintsInvestigator: (0, pg_core_1.index)("idx_pay_equity_complaints_investigator").using("btree", table.assignedInvestigator.asc().nullsLast()),
        idxPayEquityComplaintsMember: (0, pg_core_1.index)("idx_pay_equity_complaints_member").using("btree", table.complainantMemberId.asc().nullsLast()),
        idxPayEquityComplaintsOrg: (0, pg_core_1.index)("idx_pay_equity_complaints_org").using("btree", table.organizationId.asc().nullsLast()),
        idxPayEquityComplaintsStatus: (0, pg_core_1.index)("idx_pay_equity_complaints_status").using("btree", table.complaintStatus.asc().nullsLast()),
        payEquityComplaintsComplainantMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.complainantMemberId],
            foreignColumns: [exports.members.id],
            name: "pay_equity_complaints_complainant_member_id_fkey"
        }),
        payEquityComplaintsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "pay_equity_complaints_organization_id_fkey"
        }),
        payEquityComplaintsComplaintNumberKey: (0, pg_core_1.unique)("pay_equity_complaints_complaint_number_key").on(table.complaintNumber),
    };
});
exports.equitySnapshots = (0, pg_core_1.pgTable)("equity_snapshots", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    snapshotDate: (0, pg_core_1.date)("snapshot_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    snapshotType: (0, pg_core_1.varchar)("snapshot_type", { length: 50 }).default('annual'),
    totalMembers: (0, pg_core_1.integer)("total_members").notNull(),
    totalActiveMembers: (0, pg_core_1.integer)("total_active_members"),
    womenCount: (0, pg_core_1.integer)("women_count").default(0),
    menCount: (0, pg_core_1.integer)("men_count").default(0),
    nonBinaryCount: (0, pg_core_1.integer)("non_binary_count").default(0),
    genderNotDisclosed: (0, pg_core_1.integer)("gender_not_disclosed").default(0),
    visibleMinorityCount: (0, pg_core_1.integer)("visible_minority_count").default(0),
    indigenousCount: (0, pg_core_1.integer)("indigenous_count").default(0),
    personsWithDisabilitiesCount: (0, pg_core_1.integer)("persons_with_disabilities_count").default(0),
    lgbtq2PlusCount: (0, pg_core_1.integer)("lgbtq2plus_count").default(0),
    firstNationsCount: (0, pg_core_1.integer)("first_nations_count").default(0),
    inuitCount: (0, pg_core_1.integer)("inuit_count").default(0),
    metisCount: (0, pg_core_1.integer)("metis_count").default(0),
    multipleEquityGroupsCount: (0, pg_core_1.integer)("multiple_equity_groups_count").default(0),
    avgIntersectionalityScore: (0, pg_core_1.numeric)("avg_intersectionality_score", { precision: 5, scale: 2 }),
    executiveBoardTotal: (0, pg_core_1.integer)("executive_board_total"),
    executiveBoardWomen: (0, pg_core_1.integer)("executive_board_women").default(0),
    executiveBoardVisibleMinority: (0, pg_core_1.integer)("executive_board_visible_minority").default(0),
    executiveBoardIndigenous: (0, pg_core_1.integer)("executive_board_indigenous").default(0),
    stewardsTotal: (0, pg_core_1.integer)("stewards_total"),
    stewardsWomen: (0, pg_core_1.integer)("stewards_women").default(0),
    stewardsVisibleMinority: (0, pg_core_1.integer)("stewards_visible_minority").default(0),
    avgHourlyRateAll: (0, pg_core_1.numeric)("avg_hourly_rate_all", { precision: 10, scale: 2 }),
    avgHourlyRateWomen: (0, pg_core_1.numeric)("avg_hourly_rate_women", { precision: 10, scale: 2 }),
    avgHourlyRateMen: (0, pg_core_1.numeric)("avg_hourly_rate_men", { precision: 10, scale: 2 }),
    genderPayGapPercentage: (0, pg_core_1.numeric)("gender_pay_gap_percentage", { precision: 5, scale: 2 }),
    totalConsentGiven: (0, pg_core_1.integer)("total_consent_given"),
    consentRatePercentage: (0, pg_core_1.numeric)("consent_rate_percentage", { precision: 5, scale: 2 }),
    reportedToStatcan: (0, pg_core_1.boolean)("reported_to_statcan").default(false),
    statcanReportDate: (0, pg_core_1.date)("statcan_report_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxEquitySnapshotsDate: (0, pg_core_1.index)("idx_equity_snapshots_date").using("btree", table.snapshotDate.asc().nullsLast()),
        idxEquitySnapshotsOrg: (0, pg_core_1.index)("idx_equity_snapshots_org").using("btree", table.organizationId.asc().nullsLast()),
        equitySnapshotsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "equity_snapshots_organization_id_fkey"
        }),
        uniqueOrgSnapshotDate: (0, pg_core_1.unique)("unique_org_snapshot_date").on(table.organizationId, table.snapshotDate),
    };
});
exports.statcanSubmissions = (0, pg_core_1.pgTable)("statcan_submissions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    surveyCode: (0, pg_core_1.varchar)("survey_code", { length: 50 }).notNull(),
    surveyName: (0, pg_core_1.varchar)("survey_name", { length: 200 }),
    referencePeriodStart: (0, pg_core_1.date)("reference_period_start").notNull(),
    referencePeriodEnd: (0, pg_core_1.date)("reference_period_end").notNull(),
    submissionDate: (0, pg_core_1.date)("submission_date"),
    submittedBy: (0, pg_core_1.uuid)("submitted_by"),
    dataPayload: (0, pg_core_1.jsonb)("data_payload").notNull(),
    validationStatus: (0, pg_core_1.varchar)("validation_status", { length: 50 }).default('pending'),
    validationErrors: (0, pg_core_1.jsonb)("validation_errors"),
    statcanConfirmationNumber: (0, pg_core_1.varchar)("statcan_confirmation_number", { length: 100 }),
    statcanAccepted: (0, pg_core_1.boolean)("statcan_accepted"),
    statcanResponseDate: (0, pg_core_1.date)("statcan_response_date"),
    statcanResponseDetails: (0, pg_core_1.jsonb)("statcan_response_details"),
    exportFileUrl: (0, pg_core_1.text)("export_file_url"),
    exportFileFormat: (0, pg_core_1.varchar)("export_file_format", { length: 20 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxStatcanSubmissionsOrg: (0, pg_core_1.index)("idx_statcan_submissions_org").using("btree", table.organizationId.asc().nullsLast()),
        idxStatcanSubmissionsPeriod: (0, pg_core_1.index)("idx_statcan_submissions_period").using("btree", table.referencePeriodStart.asc().nullsLast(), table.referencePeriodEnd.asc().nullsLast()),
        idxStatcanSubmissionsSurvey: (0, pg_core_1.index)("idx_statcan_submissions_survey").using("btree", table.surveyCode.asc().nullsLast()),
        statcanSubmissionsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "statcan_submissions_organization_id_fkey"
        }),
    };
});
exports.vEquityStatisticsAnonymized = (0, pg_core_1.pgTable)("v_equity_statistics_anonymized", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    snapshotDate: (0, pg_core_1.date)("snapshot_date"),
    totalMembers: (0, pg_core_1.integer)("total_members"),
    womenPercentage: (0, pg_core_1.numeric)("women_percentage"),
    visibleMinorityPercentage: (0, pg_core_1.numeric)("visible_minority_percentage"),
    indigenousPercentage: (0, pg_core_1.numeric)("indigenous_percentage"),
    disabilityPercentage: (0, pg_core_1.numeric)("disability_percentage"),
    lgbtq2PlusPercentage: (0, pg_core_1.numeric)("lgbtq2plus_percentage"),
    genderPayGapPercentage: (0, pg_core_1.numeric)("gender_pay_gap_percentage", { precision: 5, scale: 2 }),
    consentRatePercentage: (0, pg_core_1.numeric)("consent_rate_percentage", { precision: 5, scale: 2 }),
});
exports.vPayEquityPipeline = (0, pg_core_1.pgTable)("v_pay_equity_pipeline", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    complaintStatus: (0, exports.payEquityStatus)("complaint_status"),
    jurisdiction: (0, pg_core_1.varchar)("jurisdiction", { length: 50 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalComplaints: (0, pg_core_1.bigint)("total_complaints", { mode: "number" }),
    avgPayGapPercentage: (0, pg_core_1.numeric)("avg_pay_gap_percentage"),
    totalSettlements: (0, pg_core_1.numeric)("total_settlements"),
    avgDaysToResolution: (0, pg_core_1.numeric)("avg_days_to_resolution"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    payAdjustmentsGranted: (0, pg_core_1.bigint)("pay_adjustments_granted", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    appealsFiled: (0, pg_core_1.bigint)("appeals_filed", { mode: "number" }),
});
exports.organizingCampaigns = (0, pg_core_1.pgTable)("organizing_campaigns", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 200 }).notNull(),
    campaignCode: (0, pg_core_1.varchar)("campaign_code", { length: 50 }).notNull(),
    campaignType: (0, exports.organizingCampaignType)("campaign_type").notNull(),
    campaignStatus: (0, exports.organizingCampaignStatus)("campaign_status").default('research'),
    targetEmployerName: (0, pg_core_1.varchar)("target_employer_name", { length: 300 }).notNull(),
    targetEmployerAddress: (0, pg_core_1.text)("target_employer_address"),
    targetIndustry: (0, pg_core_1.varchar)("target_industry", { length: 200 }),
    targetNaicsCode: (0, pg_core_1.varchar)("target_naics_code", { length: 10 }),
    proposedBargainingUnitName: (0, pg_core_1.varchar)("proposed_bargaining_unit_name", { length: 300 }),
    proposedBargainingUnitDescription: (0, pg_core_1.text)("proposed_bargaining_unit_description"),
    excludedPositions: (0, pg_core_1.text)("excluded_positions"),
    estimatedEligibleWorkers: (0, pg_core_1.integer)("estimated_eligible_workers"),
    estimatedTotalWorkforce: (0, pg_core_1.integer)("estimated_total_workforce"),
    workplaceCity: (0, pg_core_1.varchar)("workplace_city", { length: 100 }),
    workplaceProvince: (0, pg_core_1.varchar)("workplace_province", { length: 2 }),
    workplacePostalCode: (0, pg_core_1.varchar)("workplace_postal_code", { length: 7 }),
    workplaceCoordinates: (0, pg_core_1.point)("workplace_coordinates"),
    isMultiLocation: (0, pg_core_1.boolean)("is_multi_location").default(false),
    laborBoardJurisdiction: (0, pg_core_1.varchar)("labor_board_jurisdiction", { length: 50 }),
    laborBoardName: (0, pg_core_1.varchar)("labor_board_name", { length: 200 }),
    laborRelationsAct: (0, pg_core_1.varchar)("labor_relations_act", { length: 200 }),
    researchStartDate: (0, pg_core_1.date)("research_start_date"),
    campaignLaunchDate: (0, pg_core_1.date)("campaign_launch_date"),
    cardCheckStartDate: (0, pg_core_1.date)("card_check_start_date"),
    cardCheckDeadline: (0, pg_core_1.date)("card_check_deadline"),
    certificationApplicationDate: (0, pg_core_1.date)("certification_application_date"),
    certificationVoteDate: (0, pg_core_1.date)("certification_vote_date"),
    certificationDecisionDate: (0, pg_core_1.date)("certification_decision_date"),
    firstContractDeadline: (0, pg_core_1.date)("first_contract_deadline"),
    cardSigningGoal: (0, pg_core_1.integer)("card_signing_goal"),
    cardSigningThresholdPercentage: (0, pg_core_1.numeric)("card_signing_threshold_percentage", { precision: 5, scale: 2 }).default('40.00'),
    superMajorityGoal: (0, pg_core_1.integer)("super_majority_goal"),
    superMajorityThresholdPercentage: (0, pg_core_1.numeric)("super_majority_threshold_percentage", { precision: 5, scale: 2 }).default('65.00'),
    cardsSignedCount: (0, pg_core_1.integer)("cards_signed_count").default(0),
    cardsSignedPercentage: (0, pg_core_1.numeric)("cards_signed_percentage", { precision: 5, scale: 2 }).default('0.00'),
    lastCardSignedDate: (0, pg_core_1.date)("last_card_signed_date"),
    leadOrganizerId: (0, pg_core_1.uuid)("lead_organizer_id"),
    leadOrganizerName: (0, pg_core_1.varchar)("lead_organizer_name", { length: 200 }),
    organizingCommitteeSize: (0, pg_core_1.integer)("organizing_committee_size").default(0),
    employerResistanceLevel: (0, pg_core_1.varchar)("employer_resistance_level", { length: 50 }),
    antiUnionConsultantInvolved: (0, pg_core_1.boolean)("anti_union_consultant_involved").default(false),
    antiUnionConsultantName: (0, pg_core_1.varchar)("anti_union_consultant_name", { length: 200 }),
    captiveAudienceMeetingsCount: (0, pg_core_1.integer)("captive_audience_meetings_count").default(0),
    incumbentUnionName: (0, pg_core_1.varchar)("incumbent_union_name", { length: 200 }),
    incumbentContractExpiryDate: (0, pg_core_1.date)("incumbent_contract_expiry_date"),
    outcomeType: (0, pg_core_1.varchar)("outcome_type", { length: 50 }),
    certificationVoteYesCount: (0, pg_core_1.integer)("certification_vote_yes_count"),
    certificationVoteNoCount: (0, pg_core_1.integer)("certification_vote_no_count"),
    certificationVoteEligibleVoters: (0, pg_core_1.integer)("certification_vote_eligible_voters"),
    certificationVoteTurnoutPercentage: (0, pg_core_1.numeric)("certification_vote_turnout_percentage", { precision: 5, scale: 2 }),
    certificationNumber: (0, pg_core_1.varchar)("certification_number", { length: 100 }),
    certificationDate: (0, pg_core_1.date)("certification_date"),
    firstContractRatifiedDate: (0, pg_core_1.date)("first_contract_ratified_date"),
    firstContractCampaignRequired: (0, pg_core_1.boolean)("first_contract_campaign_required").default(false),
    campaignBudget: (0, pg_core_1.numeric)("campaign_budget", { precision: 12, scale: 2 }),
    campaignExpensesToDate: (0, pg_core_1.numeric)("campaign_expenses_to_date", { precision: 12, scale: 2 }).default('0.00'),
    fullTimeOrganizersAssigned: (0, pg_core_1.integer)("full_time_organizers_assigned").default(0),
    volunteerOrganizersCount: (0, pg_core_1.integer)("volunteer_organizers_count").default(0),
    campaignPlanUrl: (0, pg_core_1.text)("campaign_plan_url"),
    workplaceMapUrl: (0, pg_core_1.text)("workplace_map_url"),
    authorizationCardsTemplateUrl: (0, pg_core_1.text)("authorization_cards_template_url"),
    certificationApplicationUrl: (0, pg_core_1.text)("certification_application_url"),
    laborBoardDecisionUrl: (0, pg_core_1.text)("labor_board_decision_url"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxOrganizingCampaignsDates: (0, pg_core_1.index)("idx_organizing_campaigns_dates").using("btree", table.campaignLaunchDate.asc().nullsLast(), table.cardCheckDeadline.asc().nullsLast()),
        idxOrganizingCampaignsEmployer: (0, pg_core_1.index)("idx_organizing_campaigns_employer").using("btree", table.targetEmployerName.asc().nullsLast()),
        idxOrganizingCampaignsJurisdiction: (0, pg_core_1.index)("idx_organizing_campaigns_jurisdiction").using("btree", table.laborBoardJurisdiction.asc().nullsLast()),
        idxOrganizingCampaignsLeadOrganizer: (0, pg_core_1.index)("idx_organizing_campaigns_lead_organizer").using("btree", table.leadOrganizerId.asc().nullsLast()),
        idxOrganizingCampaignsOrg: (0, pg_core_1.index)("idx_organizing_campaigns_org").using("btree", table.organizationId.asc().nullsLast()),
        idxOrganizingCampaignsStatus: (0, pg_core_1.index)("idx_organizing_campaigns_status").using("btree", table.campaignStatus.asc().nullsLast()),
        organizingCampaignsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "organizing_campaigns_organization_id_fkey"
        }),
        organizingCampaignsCampaignCodeKey: (0, pg_core_1.unique)("organizing_campaigns_campaign_code_key").on(table.campaignCode),
    };
});
exports.organizingContacts = (0, pg_core_1.pgTable)("organizing_contacts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    contactNumber: (0, pg_core_1.varchar)("contact_number", { length: 50 }).notNull(),
    firstNameEncrypted: (0, pg_core_1.text)("first_name_encrypted"),
    lastNameEncrypted: (0, pg_core_1.text)("last_name_encrypted"),
    personalEmailEncrypted: (0, pg_core_1.text)("personal_email_encrypted"),
    personalPhoneEncrypted: (0, pg_core_1.text)("personal_phone_encrypted"),
    workEmailEncrypted: (0, pg_core_1.text)("work_email_encrypted"),
    workPhoneEncrypted: (0, pg_core_1.text)("work_phone_encrypted"),
    jobTitle: (0, pg_core_1.varchar)("job_title", { length: 200 }),
    department: (0, pg_core_1.varchar)("department", { length: 200 }),
    shift: (0, pg_core_1.varchar)("shift", { length: 50 }),
    hireDate: (0, pg_core_1.date)("hire_date"),
    seniorityYears: (0, pg_core_1.numeric)("seniority_years", { precision: 5, scale: 2 }),
    hourlyRate: (0, pg_core_1.numeric)("hourly_rate", { precision: 10, scale: 2 }),
    ageRange: (0, pg_core_1.varchar)("age_range", { length: 20 }),
    primaryLanguage: (0, pg_core_1.varchar)("primary_language", { length: 50 }),
    requiresInterpretation: (0, pg_core_1.boolean)("requires_interpretation").default(false),
    buildingLocation: (0, pg_core_1.varchar)("building_location", { length: 100 }),
    floorNumber: (0, pg_core_1.integer)("floor_number"),
    workstationArea: (0, pg_core_1.varchar)("workstation_area", { length: 100 }),
    supportLevel: (0, exports.contactSupportLevel)("support_level").default('unknown'),
    organizingCommitteeMember: (0, pg_core_1.boolean)("organizing_committee_member").default(false),
    organizingCommitteeRole: (0, pg_core_1.varchar)("organizing_committee_role", { length: 100 }),
    naturalLeader: (0, pg_core_1.boolean)("natural_leader").default(false),
    cardSigned: (0, pg_core_1.boolean)("card_signed").default(false),
    cardSignedDate: (0, pg_core_1.date)("card_signed_date"),
    cardWitnessedBy: (0, pg_core_1.varchar)("card_witnessed_by", { length: 200 }),
    cardRevoked: (0, pg_core_1.boolean)("card_revoked").default(false),
    cardRevokedDate: (0, pg_core_1.date)("card_revoked_date"),
    houseVisitAttempted: (0, pg_core_1.boolean)("house_visit_attempted").default(false),
    houseVisitCompleted: (0, pg_core_1.boolean)("house_visit_completed").default(false),
    houseVisitDate: (0, pg_core_1.date)("house_visit_date"),
    houseVisitNotes: (0, pg_core_1.text)("house_visit_notes"),
    lastContactDate: (0, pg_core_1.date)("last_contact_date"),
    lastContactMethod: (0, pg_core_1.varchar)("last_contact_method", { length: 50 }),
    contactAttemptsCount: (0, pg_core_1.integer)("contact_attempts_count").default(0),
    primaryIssues: (0, pg_core_1.jsonb)("primary_issues"),
    workplaceConcerns: (0, pg_core_1.text)("workplace_concerns"),
    personalStory: (0, pg_core_1.text)("personal_story"),
    closeCoworkers: (0, pg_core_1.jsonb)("close_coworkers"),
    influencedBy: (0, pg_core_1.jsonb)("influenced_by"),
    fearLevel: (0, pg_core_1.varchar)("fear_level", { length: 50 }),
    barriersToSupport: (0, pg_core_1.text)("barriers_to_support"),
    targetedByEmployer: (0, pg_core_1.boolean)("targeted_by_employer").default(false),
    targetedDate: (0, pg_core_1.date)("targeted_date"),
    targetedMethod: (0, pg_core_1.text)("targeted_method"),
    votedInCertification: (0, pg_core_1.boolean)("voted_in_certification"),
    becameMember: (0, pg_core_1.boolean)("became_member").default(false),
    memberId: (0, pg_core_1.uuid)("member_id"),
    dataRetentionDeadline: (0, pg_core_1.date)("data_retention_deadline"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxOrganizingContactsCampaign: (0, pg_core_1.index)("idx_organizing_contacts_campaign").using("btree", table.campaignId.asc().nullsLast()),
        idxOrganizingContactsCardSigned: (0, pg_core_1.index)("idx_organizing_contacts_card_signed").using("btree", table.cardSigned.asc().nullsLast()),
        idxOrganizingContactsCommittee: (0, pg_core_1.index)("idx_organizing_contacts_committee").using("btree", table.organizingCommitteeMember.asc().nullsLast()),
        idxOrganizingContactsDepartment: (0, pg_core_1.index)("idx_organizing_contacts_department").using("btree", table.department.asc().nullsLast()),
        idxOrganizingContactsShift: (0, pg_core_1.index)("idx_organizing_contacts_shift").using("btree", table.shift.asc().nullsLast()),
        idxOrganizingContactsSupportLevel: (0, pg_core_1.index)("idx_organizing_contacts_support_level").using("btree", table.supportLevel.asc().nullsLast()),
        organizingContactsCampaignIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.campaignId],
            foreignColumns: [exports.organizingCampaigns.id],
            name: "organizing_contacts_campaign_id_fkey"
        }),
        organizingContactsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "organizing_contacts_member_id_fkey"
        }),
        organizingContactsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "organizing_contacts_organization_id_fkey"
        }),
        organizingContactsContactNumberKey: (0, pg_core_1.unique)("organizing_contacts_contact_number_key").on(table.contactNumber),
    };
});
exports.tenants = (0, pg_core_1.pgTable)("tenants", {
    tenantId: (0, pg_core_1.uuid)("tenant_id").primaryKey().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
exports.organizingActivities = (0, pg_core_1.pgTable)("organizing_activities", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    activityType: (0, exports.organizingActivityType)("activity_type").notNull(),
    activityName: (0, pg_core_1.varchar)("activity_name", { length: 200 }),
    activityDate: (0, pg_core_1.date)("activity_date").notNull(),
    activityStartTime: (0, pg_core_1.time)("activity_start_time"),
    activityEndTime: (0, pg_core_1.time)("activity_end_time"),
    activityLocation: (0, pg_core_1.varchar)("activity_location", { length: 300 }),
    locationAddress: (0, pg_core_1.text)("location_address"),
    isVirtual: (0, pg_core_1.boolean)("is_virtual").default(false),
    meetingLink: (0, pg_core_1.text)("meeting_link"),
    contactsTargeted: (0, pg_core_1.jsonb)("contacts_targeted"),
    contactsAttended: (0, pg_core_1.jsonb)("contacts_attended"),
    contactsAttendedCount: (0, pg_core_1.integer)("contacts_attended_count").default(0),
    organizersAssigned: (0, pg_core_1.jsonb)("organizers_assigned"),
    volunteersAttended: (0, pg_core_1.integer)("volunteers_attended").default(0),
    cardsSignedAtEvent: (0, pg_core_1.integer)("cards_signed_at_event").default(0),
    outcomeSummary: (0, pg_core_1.text)("outcome_summary"),
    contactsMovedToSupporter: (0, pg_core_1.integer)("contacts_moved_to_supporter").default(0),
    newOrganizingCommitteeRecruits: (0, pg_core_1.integer)("new_organizing_committee_recruits").default(0),
    followUpRequired: (0, pg_core_1.boolean)("follow_up_required").default(false),
    followUpCompleted: (0, pg_core_1.boolean)("follow_up_completed").default(false),
    followUpNotes: (0, pg_core_1.text)("follow_up_notes"),
    activityCost: (0, pg_core_1.numeric)("activity_cost", { precision: 10, scale: 2 }).default('0.00'),
    photosUrls: (0, pg_core_1.jsonb)("photos_urls"),
    videosUrls: (0, pg_core_1.jsonb)("videos_urls"),
    socialMediaPosts: (0, pg_core_1.jsonb)("social_media_posts"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxOrganizingActivitiesCampaign: (0, pg_core_1.index)("idx_organizing_activities_campaign").using("btree", table.campaignId.asc().nullsLast()),
        idxOrganizingActivitiesDate: (0, pg_core_1.index)("idx_organizing_activities_date").using("btree", table.activityDate.asc().nullsLast()),
        idxOrganizingActivitiesType: (0, pg_core_1.index)("idx_organizing_activities_type").using("btree", table.activityType.asc().nullsLast()),
        organizingActivitiesCampaignIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.campaignId],
            foreignColumns: [exports.organizingCampaigns.id],
            name: "organizing_activities_campaign_id_fkey"
        }),
        organizingActivitiesOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "organizing_activities_organization_id_fkey"
        }),
    };
});
exports.vOrganizingCampaignDashboard = (0, pg_core_1.pgTable)("v_organizing_campaign_dashboard", {
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 200 }),
    campaignCode: (0, pg_core_1.varchar)("campaign_code", { length: 50 }),
    campaignType: (0, exports.organizingCampaignType)("campaign_type"),
    campaignStatus: (0, exports.organizingCampaignStatus)("campaign_status"),
    targetEmployerName: (0, pg_core_1.varchar)("target_employer_name", { length: 300 }),
    laborBoardJurisdiction: (0, pg_core_1.varchar)("labor_board_jurisdiction", { length: 50 }),
    estimatedEligibleWorkers: (0, pg_core_1.integer)("estimated_eligible_workers"),
    cardsSignedCount: (0, pg_core_1.integer)("cards_signed_count"),
    cardsSignedPercentage: (0, pg_core_1.numeric)("cards_signed_percentage", { precision: 5, scale: 2 }),
    cardSigningGoal: (0, pg_core_1.integer)("card_signing_goal"),
    cardSigningThresholdPercentage: (0, pg_core_1.numeric)("card_signing_threshold_percentage", { precision: 5, scale: 2 }),
    organizingCommitteeSize: (0, pg_core_1.integer)("organizing_committee_size"),
    campaignLaunchDate: (0, pg_core_1.date)("campaign_launch_date"),
    cardCheckDeadline: (0, pg_core_1.date)("card_check_deadline"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalContacts: (0, pg_core_1.bigint)("total_contacts", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    supporters: (0, pg_core_1.bigint)("supporters", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    committeeMembers: (0, pg_core_1.bigint)("committee_members", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    cardsSigned: (0, pg_core_1.bigint)("cards_signed", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    activitiesLast7Days: (0, pg_core_1.bigint)("activities_last_7_days", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    activitiesLast30Days: (0, pg_core_1.bigint)("activities_last_30_days", { mode: "number" }),
    daysUntilDeadline: (0, pg_core_1.integer)("days_until_deadline"),
    campaignStrength: (0, pg_core_1.text)("campaign_strength"),
});
exports.certificationApplications = (0, pg_core_1.pgTable)("certification_applications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    applicationNumber: (0, pg_core_1.varchar)("application_number", { length: 100 }).notNull(),
    applicationStatus: (0, exports.certificationApplicationStatus)("application_status").default('draft'),
    laborBoardJurisdiction: (0, pg_core_1.varchar)("labor_board_jurisdiction", { length: 50 }).notNull(),
    laborBoardName: (0, pg_core_1.varchar)("labor_board_name", { length: 200 }),
    filedDate: (0, pg_core_1.date)("filed_date"),
    filedByName: (0, pg_core_1.varchar)("filed_by_name", { length: 200 }),
    proposedBargainingUnitDescription: (0, pg_core_1.text)("proposed_bargaining_unit_description"),
    numberOfEmployeesClaimed: (0, pg_core_1.integer)("number_of_employees_claimed"),
    authorizationCardsSubmitted: (0, pg_core_1.integer)("authorization_cards_submitted"),
    authorizationCardsPercentage: (0, pg_core_1.numeric)("authorization_cards_percentage", { precision: 5, scale: 2 }),
    employerResponseFiled: (0, pg_core_1.boolean)("employer_response_filed").default(false),
    employerResponseDate: (0, pg_core_1.date)("employer_response_date"),
    employerContested: (0, pg_core_1.boolean)("employer_contested").default(false),
    employerObjections: (0, pg_core_1.text)("employer_objections"),
    employerProposedUnitChanges: (0, pg_core_1.text)("employer_proposed_unit_changes"),
    incumbentUnionResponseFiled: (0, pg_core_1.boolean)("incumbent_union_response_filed").default(false),
    incumbentUnionResponseDate: (0, pg_core_1.date)("incumbent_union_response_date"),
    incumbentUnionObjections: (0, pg_core_1.text)("incumbent_union_objections"),
    preHearingScheduled: (0, pg_core_1.boolean)("pre_hearing_scheduled").default(false),
    preHearingDate: (0, pg_core_1.date)("pre_hearing_date"),
    hearingScheduled: (0, pg_core_1.boolean)("hearing_scheduled").default(false),
    hearingDate: (0, pg_core_1.date)("hearing_date"),
    hearingLocation: (0, pg_core_1.varchar)("hearing_location", { length: 300 }),
    hearingOutcome: (0, pg_core_1.text)("hearing_outcome"),
    voterListReceived: (0, pg_core_1.boolean)("voter_list_received").default(false),
    voterListReceivedDate: (0, pg_core_1.date)("voter_list_received_date"),
    voterListDisputeFiled: (0, pg_core_1.boolean)("voter_list_dispute_filed").default(false),
    voterListDisputeOutcome: (0, pg_core_1.text)("voter_list_dispute_outcome"),
    voteOrdered: (0, pg_core_1.boolean)("vote_ordered").default(false),
    voteOrderedDate: (0, pg_core_1.date)("vote_ordered_date"),
    voteMethod: (0, pg_core_1.varchar)("vote_method", { length: 50 }),
    voteDate: (0, pg_core_1.date)("vote_date"),
    voteLocation: (0, pg_core_1.varchar)("vote_location", { length: 300 }),
    votesYes: (0, pg_core_1.integer)("votes_yes"),
    votesNo: (0, pg_core_1.integer)("votes_no"),
    votesSpoiled: (0, pg_core_1.integer)("votes_spoiled"),
    votesChallenged: (0, pg_core_1.integer)("votes_challenged"),
    eligibleVoters: (0, pg_core_1.integer)("eligible_voters"),
    voterTurnoutPercentage: (0, pg_core_1.numeric)("voter_turnout_percentage", { precision: 5, scale: 2 }),
    decisionDate: (0, pg_core_1.date)("decision_date"),
    decisionOutcome: (0, pg_core_1.varchar)("decision_outcome", { length: 50 }),
    decisionSummary: (0, pg_core_1.text)("decision_summary"),
    decisionDocumentUrl: (0, pg_core_1.text)("decision_document_url"),
    certificationOrderNumber: (0, pg_core_1.varchar)("certification_order_number", { length: 100 }),
    certificationDate: (0, pg_core_1.date)("certification_date"),
    certificationDocumentUrl: (0, pg_core_1.text)("certification_document_url"),
    bargainingUnitCertifiedDescription: (0, pg_core_1.text)("bargaining_unit_certified_description"),
    numberOfEmployeesCertified: (0, pg_core_1.integer)("number_of_employees_certified"),
    appealFiled: (0, pg_core_1.boolean)("appeal_filed").default(false),
    appealFiledBy: (0, pg_core_1.varchar)("appeal_filed_by", { length: 100 }),
    appealFiledDate: (0, pg_core_1.date)("appeal_filed_date"),
    appealOutcome: (0, pg_core_1.text)("appeal_outcome"),
    firstContractArbitrationEligible: (0, pg_core_1.boolean)("first_contract_arbitration_eligible").default(false),
    firstContractArbitrationApplied: (0, pg_core_1.boolean)("first_contract_arbitration_applied").default(false),
    firstContractArbitrationDate: (0, pg_core_1.date)("first_contract_arbitration_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxCertificationApplicationsCampaign: (0, pg_core_1.index)("idx_certification_applications_campaign").using("btree", table.campaignId.asc().nullsLast()),
        idxCertificationApplicationsFiledDate: (0, pg_core_1.index)("idx_certification_applications_filed_date").using("btree", table.filedDate.asc().nullsLast()),
        idxCertificationApplicationsJurisdiction: (0, pg_core_1.index)("idx_certification_applications_jurisdiction").using("btree", table.laborBoardJurisdiction.asc().nullsLast()),
        idxCertificationApplicationsStatus: (0, pg_core_1.index)("idx_certification_applications_status").using("btree", table.applicationStatus.asc().nullsLast()),
        certificationApplicationsCampaignIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.campaignId],
            foreignColumns: [exports.organizingCampaigns.id],
            name: "certification_applications_campaign_id_fkey"
        }),
        certificationApplicationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "certification_applications_organization_id_fkey"
        }),
        certificationApplicationsApplicationNumberKey: (0, pg_core_1.unique)("certification_applications_application_number_key").on(table.applicationNumber),
    };
});
exports.organizingVolunteers = (0, pg_core_1.pgTable)("organizing_volunteers", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id"),
    volunteerName: (0, pg_core_1.varchar)("volunteer_name", { length: 200 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    organizingExperienceLevel: (0, pg_core_1.varchar)("organizing_experience_level", { length: 50 }),
    previousCampaignsCount: (0, pg_core_1.integer)("previous_campaigns_count").default(0),
    specialSkills: (0, pg_core_1.jsonb)("special_skills"),
    availableWeekdays: (0, pg_core_1.boolean)("available_weekdays").default(true),
    availableEvenings: (0, pg_core_1.boolean)("available_evenings").default(true),
    availableWeekends: (0, pg_core_1.boolean)("available_weekends").default(true),
    hoursPerWeekAvailable: (0, pg_core_1.integer)("hours_per_week_available"),
    organizingTrainingCompleted: (0, pg_core_1.boolean)("organizing_training_completed").default(false),
    trainingCompletionDate: (0, pg_core_1.date)("training_completion_date"),
    currentCampaigns: (0, pg_core_1.jsonb)("current_campaigns"),
    totalHouseVisitsCompleted: (0, pg_core_1.integer)("total_house_visits_completed").default(0),
    totalCardsSignedWitnessed: (0, pg_core_1.integer)("total_cards_signed_witnessed").default(0),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxOrganizingVolunteersActive: (0, pg_core_1.index)("idx_organizing_volunteers_active").using("btree", table.isActive.asc().nullsLast()),
        idxOrganizingVolunteersMember: (0, pg_core_1.index)("idx_organizing_volunteers_member").using("btree", table.memberId.asc().nullsLast()),
        idxOrganizingVolunteersOrg: (0, pg_core_1.index)("idx_organizing_volunteers_org").using("btree", table.organizationId.asc().nullsLast()),
        organizingVolunteersMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "organizing_volunteers_member_id_fkey"
        }),
        organizingVolunteersOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "organizing_volunteers_organization_id_fkey"
        }),
    };
});
exports.vWorkplaceContactMap = (0, pg_core_1.pgTable)("v_workplace_contact_map", {
    contactId: (0, pg_core_1.uuid)("contact_id"),
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    contactNumber: (0, pg_core_1.varchar)("contact_number", { length: 50 }),
    department: (0, pg_core_1.varchar)("department", { length: 200 }),
    shift: (0, pg_core_1.varchar)("shift", { length: 50 }),
    supportLevel: (0, exports.contactSupportLevel)("support_level"),
    organizingCommitteeMember: (0, pg_core_1.boolean)("organizing_committee_member"),
    cardSigned: (0, pg_core_1.boolean)("card_signed"),
    naturalLeader: (0, pg_core_1.boolean)("natural_leader"),
    buildingLocation: (0, pg_core_1.varchar)("building_location", { length: 100 }),
    floorNumber: (0, pg_core_1.integer)("floor_number"),
    workstationArea: (0, pg_core_1.varchar)("workstation_area", { length: 100 }),
    primaryIssues: (0, pg_core_1.jsonb)("primary_issues"),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 200 }),
    targetEmployerName: (0, pg_core_1.varchar)("target_employer_name", { length: 300 }),
});
exports.politicalCampaigns = (0, pg_core_1.pgTable)("political_campaigns", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    campaignName: (0, pg_core_1.varchar)("campaign_name", { length: 300 }).notNull(),
    campaignCode: (0, pg_core_1.varchar)("campaign_code", { length: 50 }).notNull(),
    campaignType: (0, exports.politicalCampaignType)("campaign_type").notNull(),
    campaignStatus: (0, exports.politicalCampaignStatus)("campaign_status").default('planning'),
    campaignDescription: (0, pg_core_1.text)("campaign_description"),
    campaignGoals: (0, pg_core_1.text)("campaign_goals"),
    startDate: (0, pg_core_1.date)("start_date"),
    endDate: (0, pg_core_1.date)("end_date"),
    electionDate: (0, pg_core_1.date)("election_date"),
    jurisdictionLevel: (0, pg_core_1.varchar)("jurisdiction_level", { length: 50 }),
    jurisdictionName: (0, pg_core_1.varchar)("jurisdiction_name", { length: 200 }),
    electoralDistrict: (0, pg_core_1.varchar)("electoral_district", { length: 200 }),
    billNumber: (0, pg_core_1.varchar)("bill_number", { length: 50 }),
    billName: (0, pg_core_1.varchar)("bill_name", { length: 300 }),
    billStatus: (0, pg_core_1.varchar)("bill_status", { length: 100 }),
    billUrl: (0, pg_core_1.text)("bill_url"),
    primaryIssue: (0, pg_core_1.varchar)("primary_issue", { length: 200 }),
    secondaryIssues: (0, pg_core_1.jsonb)("secondary_issues"),
    memberParticipationGoal: (0, pg_core_1.integer)("member_participation_goal"),
    volunteerHoursGoal: (0, pg_core_1.integer)("volunteer_hours_goal"),
    doorsKnockedGoal: (0, pg_core_1.integer)("doors_knocked_goal"),
    phoneCallsGoal: (0, pg_core_1.integer)("phone_calls_goal"),
    petitionSignaturesGoal: (0, pg_core_1.integer)("petition_signatures_goal"),
    membersParticipated: (0, pg_core_1.integer)("members_participated").default(0),
    volunteerHoursLogged: (0, pg_core_1.integer)("volunteer_hours_logged").default(0),
    doorsKnocked: (0, pg_core_1.integer)("doors_knocked").default(0),
    phoneCallsMade: (0, pg_core_1.integer)("phone_calls_made").default(0),
    petitionSignaturesCollected: (0, pg_core_1.integer)("petition_signatures_collected").default(0),
    budgetAllocated: (0, pg_core_1.numeric)("budget_allocated", { precision: 12, scale: 2 }),
    expensesToDate: (0, pg_core_1.numeric)("expenses_to_date", { precision: 12, scale: 2 }).default('0.00'),
    fundedByCope: (0, pg_core_1.boolean)("funded_by_cope").default(false),
    copeContributionAmount: (0, pg_core_1.numeric)("cope_contribution_amount", { precision: 12, scale: 2 }),
    coalitionPartners: (0, pg_core_1.jsonb)("coalition_partners"),
    outcomeType: (0, pg_core_1.varchar)("outcome_type", { length: 100 }),
    outcomeDate: (0, pg_core_1.date)("outcome_date"),
    outcomeNotes: (0, pg_core_1.text)("outcome_notes"),
    campaignPlanUrl: (0, pg_core_1.text)("campaign_plan_url"),
    campaignMaterialsUrls: (0, pg_core_1.jsonb)("campaign_materials_urls"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxPoliticalCampaignsJurisdiction: (0, pg_core_1.index)("idx_political_campaigns_jurisdiction").using("btree", table.jurisdictionLevel.asc().nullsLast(), table.jurisdictionName.asc().nullsLast()),
        idxPoliticalCampaignsOrg: (0, pg_core_1.index)("idx_political_campaigns_org").using("btree", table.organizationId.asc().nullsLast()),
        idxPoliticalCampaignsStatus: (0, pg_core_1.index)("idx_political_campaigns_status").using("btree", table.campaignStatus.asc().nullsLast()),
        idxPoliticalCampaignsType: (0, pg_core_1.index)("idx_political_campaigns_type").using("btree", table.campaignType.asc().nullsLast()),
        politicalCampaignsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "political_campaigns_organization_id_fkey"
        }),
        politicalCampaignsCampaignCodeKey: (0, pg_core_1.unique)("political_campaigns_campaign_code_key").on(table.campaignCode),
    };
});
exports.memberCertifications = (0, pg_core_1.pgTable)("member_certifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    certificationName: (0, pg_core_1.varchar)("certification_name", { length: 200 }).notNull(),
    certificationType: (0, pg_core_1.varchar)("certification_type", { length: 100 }),
    issuedByOrganization: (0, pg_core_1.varchar)("issued_by_organization", { length: 200 }),
    certificationNumber: (0, pg_core_1.varchar)("certification_number", { length: 100 }),
    issueDate: (0, pg_core_1.date)("issue_date").notNull(),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    validYears: (0, pg_core_1.integer)("valid_years"),
    certificationStatus: (0, exports.certificationStatus)("certification_status").default('active'),
    courseId: (0, pg_core_1.uuid)("course_id"),
    sessionId: (0, pg_core_1.uuid)("session_id"),
    registrationId: (0, pg_core_1.uuid)("registration_id"),
    renewalRequired: (0, pg_core_1.boolean)("renewal_required").default(false),
    renewalDate: (0, pg_core_1.date)("renewal_date"),
    renewalCourseId: (0, pg_core_1.uuid)("renewal_course_id"),
    verified: (0, pg_core_1.boolean)("verified").default(true),
    verificationDate: (0, pg_core_1.date)("verification_date"),
    verifiedBy: (0, pg_core_1.uuid)("verified_by"),
    certificateUrl: (0, pg_core_1.text)("certificate_url"),
    digitalBadgeUrl: (0, pg_core_1.text)("digital_badge_url"),
    clcRegistered: (0, pg_core_1.boolean)("clc_registered").default(false),
    clcRegistrationNumber: (0, pg_core_1.varchar)("clc_registration_number", { length: 100 }),
    clcRegistrationDate: (0, pg_core_1.date)("clc_registration_date"),
    revoked: (0, pg_core_1.boolean)("revoked").default(false),
    revocationDate: (0, pg_core_1.date)("revocation_date"),
    revocationReason: (0, pg_core_1.text)("revocation_reason"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxMemberCertificationsExpiry: (0, pg_core_1.index)("idx_member_certifications_expiry").using("btree", table.expiryDate.asc().nullsLast()),
        idxMemberCertificationsMember: (0, pg_core_1.index)("idx_member_certifications_member").using("btree", table.memberId.asc().nullsLast()),
        idxMemberCertificationsOrg: (0, pg_core_1.index)("idx_member_certifications_org").using("btree", table.organizationId.asc().nullsLast()),
        idxMemberCertificationsStatus: (0, pg_core_1.index)("idx_member_certifications_status").using("btree", table.certificationStatus.asc().nullsLast()),
        idxMemberCertificationsType: (0, pg_core_1.index)("idx_member_certifications_type").using("btree", table.certificationType.asc().nullsLast()),
        memberCertificationsCourseIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.courseId],
            foreignColumns: [exports.trainingCourses.id],
            name: "member_certifications_course_id_fkey"
        }),
        memberCertificationsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "member_certifications_member_id_fkey"
        }),
        memberCertificationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "member_certifications_organization_id_fkey"
        }),
        memberCertificationsRegistrationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.registrationId],
            foreignColumns: [exports.courseRegistrations.id],
            name: "member_certifications_registration_id_fkey"
        }),
        memberCertificationsRenewalCourseIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.renewalCourseId],
            foreignColumns: [exports.trainingCourses.id],
            name: "member_certifications_renewal_course_id_fkey"
        }),
        memberCertificationsSessionIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.sessionId],
            foreignColumns: [exports.courseSessions.id],
            name: "member_certifications_session_id_fkey"
        }),
        memberCertificationsCertificationNumberKey: (0, pg_core_1.unique)("member_certifications_certification_number_key").on(table.certificationNumber),
    };
});
exports.trainingPrograms = (0, pg_core_1.pgTable)("training_programs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    programName: (0, pg_core_1.varchar)("program_name", { length: 300 }).notNull(),
    programCode: (0, pg_core_1.varchar)("program_code", { length: 50 }).notNull(),
    programDescription: (0, pg_core_1.text)("program_description"),
    programCategory: (0, pg_core_1.varchar)("program_category", { length: 100 }),
    requiredCourses: (0, pg_core_1.jsonb)("required_courses"),
    electiveCourses: (0, pg_core_1.jsonb)("elective_courses"),
    electivesRequiredCount: (0, pg_core_1.integer)("electives_required_count").default(0),
    totalHoursRequired: (0, pg_core_1.numeric)("total_hours_required", { precision: 6, scale: 2 }),
    programDurationMonths: (0, pg_core_1.integer)("program_duration_months"),
    providesCertification: (0, pg_core_1.boolean)("provides_certification").default(false),
    certificationName: (0, pg_core_1.varchar)("certification_name", { length: 200 }),
    entryRequirements: (0, pg_core_1.text)("entry_requirements"),
    timeCommitment: (0, pg_core_1.text)("time_commitment"),
    clcApproved: (0, pg_core_1.boolean)("clc_approved").default(false),
    clcApprovalDate: (0, pg_core_1.date)("clc_approval_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
}, (table) => {
    return {
        idxTrainingProgramsActive: (0, pg_core_1.index)("idx_training_programs_active").using("btree", table.isActive.asc().nullsLast()),
        idxTrainingProgramsOrg: (0, pg_core_1.index)("idx_training_programs_org").using("btree", table.organizationId.asc().nullsLast()),
        trainingProgramsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "training_programs_organization_id_fkey"
        }),
        trainingProgramsProgramCodeKey: (0, pg_core_1.unique)("training_programs_program_code_key").on(table.programCode),
    };
});
exports.duesTransactions = (0, pg_core_1.pgTable)("dues_transactions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    assignmentId: (0, pg_core_1.uuid)("assignment_id"),
    ruleId: (0, pg_core_1.uuid)("rule_id"),
    transactionType: (0, pg_core_1.varchar)("transaction_type", { length: 50 }).notNull(),
    amount: (0, pg_core_1.numeric)("amount", { precision: 10, scale: 2 }).notNull(),
    periodStart: (0, pg_core_1.date)("period_start").notNull(),
    periodEnd: (0, pg_core_1.date)("period_end").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(),
    paymentDate: (0, pg_core_1.timestamp)("payment_date", { withTimezone: true, mode: 'string' }),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 255 }),
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    duesAmount: (0, pg_core_1.numeric)("dues_amount", { precision: 10, scale: 2 }).notNull(),
    copeAmount: (0, pg_core_1.numeric)("cope_amount", { precision: 10, scale: 2 }).default('0.00'),
    pacAmount: (0, pg_core_1.numeric)("pac_amount", { precision: 10, scale: 2 }).default('0.00'),
    strikeFundAmount: (0, pg_core_1.numeric)("strike_fund_amount", { precision: 10, scale: 2 }).default('0.00'),
    lateFeeAmount: (0, pg_core_1.numeric)("late_fee_amount", { precision: 10, scale: 2 }).default('0.00'),
    adjustmentAmount: (0, pg_core_1.numeric)("adjustment_amount", { precision: 10, scale: 2 }).default('0.00'),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 10, scale: 2 }).notNull(),
    paidDate: (0, pg_core_1.timestamp)("paid_date", { withTimezone: true, mode: 'string' }),
    receiptUrl: (0, pg_core_1.text)("receipt_url"),
}, (table) => {
    return {
        idxDuesTransAmounts: (0, pg_core_1.index)("idx_dues_trans_amounts").using("btree", table.tenantId.asc().nullsLast(), table.totalAmount.asc().nullsLast()),
        idxDuesTransPaidDate: (0, pg_core_1.index)("idx_dues_trans_paid_date").using("btree", table.paidDate.asc().nullsLast()).where((0, drizzle_orm_1.sql) `(paid_date IS NOT NULL)`),
        idxTransactionsDueDate: (0, pg_core_1.index)("idx_transactions_due_date").using("btree", table.dueDate.asc().nullsLast()),
        idxTransactionsMember: (0, pg_core_1.index)("idx_transactions_member").using("btree", table.memberId.asc().nullsLast()),
        idxTransactionsPeriod: (0, pg_core_1.index)("idx_transactions_period").using("btree", table.periodStart.asc().nullsLast(), table.periodEnd.asc().nullsLast()),
        idxTransactionsStatus: (0, pg_core_1.index)("idx_transactions_status").using("btree", table.tenantId.asc().nullsLast(), table.status.asc().nullsLast()),
        idxTransactionsTenant: (0, pg_core_1.index)("idx_transactions_tenant").using("btree", table.tenantId.asc().nullsLast()),
        duesTransactionsAssignmentIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.assignmentId],
            foreignColumns: [exports.memberDuesAssignments.id],
            name: "dues_transactions_assignment_id_fkey"
        }),
        duesTransactionsRuleIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.ruleId],
            foreignColumns: [exports.duesRules.id],
            name: "dues_transactions_rule_id_fkey"
        }),
        duesTransactionsTenantIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.tenantId],
            foreignColumns: [exports.tenants.tenantId],
            name: "dues_transactions_tenant_id_fkey"
        }).onDelete("cascade"),
    };
});
exports.programEnrollments = (0, pg_core_1.pgTable)("program_enrollments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    memberId: (0, pg_core_1.uuid)("member_id").notNull(),
    programId: (0, pg_core_1.uuid)("program_id").notNull(),
    enrollmentDate: (0, pg_core_1.date)("enrollment_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    enrollmentStatus: (0, pg_core_1.varchar)("enrollment_status", { length: 50 }).default('active'),
    coursesCompleted: (0, pg_core_1.integer)("courses_completed").default(0),
    coursesRequired: (0, pg_core_1.integer)("courses_required"),
    hoursCompleted: (0, pg_core_1.numeric)("hours_completed", { precision: 6, scale: 2 }).default('0.00'),
    hoursRequired: (0, pg_core_1.numeric)("hours_required", { precision: 6, scale: 2 }),
    progressPercentage: (0, pg_core_1.numeric)("progress_percentage", { precision: 5, scale: 2 }).default('0.00'),
    completed: (0, pg_core_1.boolean)("completed").default(false),
    completionDate: (0, pg_core_1.date)("completion_date"),
    certificationIssued: (0, pg_core_1.boolean)("certification_issued").default(false),
    certificationId: (0, pg_core_1.uuid)("certification_id"),
    expectedCompletionDate: (0, pg_core_1.date)("expected_completion_date"),
    extensionGranted: (0, pg_core_1.boolean)("extension_granted").default(false),
    extendedCompletionDate: (0, pg_core_1.date)("extended_completion_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
    return {
        idxProgramEnrollmentsMember: (0, pg_core_1.index)("idx_program_enrollments_member").using("btree", table.memberId.asc().nullsLast()),
        idxProgramEnrollmentsOrg: (0, pg_core_1.index)("idx_program_enrollments_org").using("btree", table.organizationId.asc().nullsLast()),
        idxProgramEnrollmentsProgram: (0, pg_core_1.index)("idx_program_enrollments_program").using("btree", table.programId.asc().nullsLast()),
        idxProgramEnrollmentsStatus: (0, pg_core_1.index)("idx_program_enrollments_status").using("btree", table.enrollmentStatus.asc().nullsLast()),
        programEnrollmentsCertificationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.certificationId],
            foreignColumns: [exports.memberCertifications.id],
            name: "program_enrollments_certification_id_fkey"
        }),
        programEnrollmentsMemberIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.memberId],
            foreignColumns: [exports.members.id],
            name: "program_enrollments_member_id_fkey"
        }),
        programEnrollmentsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "program_enrollments_organization_id_fkey"
        }),
        programEnrollmentsProgramIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.programId],
            foreignColumns: [exports.trainingPrograms.id],
            name: "program_enrollments_program_id_fkey"
        }),
    };
});
exports.vMemberTrainingTranscript = (0, pg_core_1.pgTable)("v_member_training_transcript", {
    memberId: (0, pg_core_1.uuid)("member_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    courseName: (0, pg_core_1.varchar)("course_name", { length: 300 }),
    courseCategory: (0, exports.courseCategory)("course_category"),
    sessionCode: (0, pg_core_1.varchar)("session_code", { length: 50 }),
    startDate: (0, pg_core_1.date)("start_date"),
    endDate: (0, pg_core_1.date)("end_date"),
    registrationStatus: (0, exports.registrationStatus)("registration_status"),
    attended: (0, pg_core_1.boolean)("attended"),
    completed: (0, pg_core_1.boolean)("completed"),
    completionDate: (0, pg_core_1.date)("completion_date"),
    attendanceHours: (0, pg_core_1.numeric)("attendance_hours", { precision: 5, scale: 2 }),
    finalGrade: (0, pg_core_1.varchar)("final_grade", { length: 10 }),
    certificateIssued: (0, pg_core_1.boolean)("certificate_issued"),
    certificateNumber: (0, pg_core_1.varchar)("certificate_number", { length: 100 }),
    durationHours: (0, pg_core_1.numeric)("duration_hours", { precision: 5, scale: 2 }),
    providesCertification: (0, pg_core_1.boolean)("provides_certification"),
});
exports.vCourseSessionDashboard = (0, pg_core_1.pgTable)("v_course_session_dashboard", {
    sessionId: (0, pg_core_1.uuid)("session_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    courseName: (0, pg_core_1.varchar)("course_name", { length: 300 }),
    courseCategory: (0, exports.courseCategory)("course_category"),
    sessionCode: (0, pg_core_1.varchar)("session_code", { length: 50 }),
    startDate: (0, pg_core_1.date)("start_date"),
    endDate: (0, pg_core_1.date)("end_date"),
    sessionStatus: (0, exports.sessionStatus)("session_status"),
    maxEnrollment: (0, pg_core_1.integer)("max_enrollment"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalRegistrations: (0, pg_core_1.bigint)("total_registrations", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    confirmedRegistrations: (0, pg_core_1.bigint)("confirmed_registrations", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    waitlistCount: (0, pg_core_1.bigint)("waitlist_count", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    attendees: (0, pg_core_1.bigint)("attendees", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    noShows: (0, pg_core_1.bigint)("no_shows", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    completions: (0, pg_core_1.bigint)("completions", { mode: "number" }),
    completionRate: (0, pg_core_1.numeric)("completion_rate"),
    avgRating: (0, pg_core_1.numeric)("avg_rating"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    evaluationCount: (0, pg_core_1.bigint)("evaluation_count", { mode: "number" }),
    enrollmentPercentage: (0, pg_core_1.numeric)("enrollment_percentage"),
});
exports.vCertificationExpiryTracking = (0, pg_core_1.pgTable)("v_certification_expiry_tracking", {
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    memberId: (0, pg_core_1.uuid)("member_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    certificationName: (0, pg_core_1.varchar)("certification_name", { length: 200 }),
    certificationType: (0, pg_core_1.varchar)("certification_type", { length: 100 }),
    issueDate: (0, pg_core_1.date)("issue_date"),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    certificationStatus: (0, exports.certificationStatus)("certification_status"),
    expiryAlert: (0, pg_core_1.text)("expiry_alert"),
    daysUntilExpiry: (0, pg_core_1.integer)("days_until_expiry"),
    renewalRequired: (0, pg_core_1.boolean)("renewal_required"),
    renewalCourseId: (0, pg_core_1.uuid)("renewal_course_id"),
});
exports.vTrainingProgramProgress = (0, pg_core_1.pgTable)("v_training_program_progress", {
    enrollmentId: (0, pg_core_1.uuid)("enrollment_id"),
    organizationId: (0, pg_core_1.uuid)("organization_id"),
    memberId: (0, pg_core_1.uuid)("member_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    programName: (0, pg_core_1.varchar)("program_name", { length: 300 }),
    programCategory: (0, pg_core_1.varchar)("program_category", { length: 100 }),
    enrollmentDate: (0, pg_core_1.date)("enrollment_date"),
    enrollmentStatus: (0, pg_core_1.varchar)("enrollment_status", { length: 50 }),
    coursesCompleted: (0, pg_core_1.integer)("courses_completed"),
    coursesRequired: (0, pg_core_1.integer)("courses_required"),
    hoursCompleted: (0, pg_core_1.numeric)("hours_completed", { precision: 6, scale: 2 }),
    hoursRequired: (0, pg_core_1.numeric)("hours_required", { precision: 6, scale: 2 }),
    progressPercentage: (0, pg_core_1.numeric)("progress_percentage", { precision: 5, scale: 2 }),
    expectedCompletionDate: (0, pg_core_1.date)("expected_completion_date"),
    completed: (0, pg_core_1.boolean)("completed"),
    completionDate: (0, pg_core_1.date)("completion_date"),
});
exports.kpiConfigurations = (0, pg_core_1.pgTable)("kpi_configurations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id").notNull(),
    createdBy: (0, pg_core_1.text)("created_by").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    metricType: (0, pg_core_1.text)("metric_type").notNull(),
    dataSource: (0, pg_core_1.text)("data_source").notNull(),
    calculation: (0, pg_core_1.jsonb)("calculation").notNull(),
    visualizationType: (0, pg_core_1.text)("visualization_type").notNull(),
    targetValue: (0, pg_core_1.numeric)("target_value"),
    warningThreshold: (0, pg_core_1.numeric)("warning_threshold"),
    criticalThreshold: (0, pg_core_1.numeric)("critical_threshold"),
    alertEnabled: (0, pg_core_1.boolean)("alert_enabled").default(false),
    alertRecipients: (0, pg_core_1.jsonb)("alert_recipients"),
    refreshInterval: (0, pg_core_1.integer)("refresh_interval").default(3600),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    displayOrder: (0, pg_core_1.integer)("display_order"),
    dashboardLayout: (0, pg_core_1.jsonb)("dashboard_layout"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
    return {
        activeIdx: (0, pg_core_1.index)("kpi_configurations_active_idx").using("btree", table.isActive.asc().nullsLast()),
        createdByIdx: (0, pg_core_1.index)("kpi_configurations_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
        orgIdx: (0, pg_core_1.index)("kpi_configurations_org_idx").using("btree", table.organizationId.asc().nullsLast()),
        kpiConfigurationsOrganizationIdFkey: (0, pg_core_1.foreignKey)({
            columns: [table.organizationId],
            foreignColumns: [exports.organizations.id],
            name: "kpi_configurations_organization_id_fkey"
        }).onDelete("cascade"),
    };
});
//# sourceMappingURL=schema.js.map