# API Route Migration Inventory
**Total Routes:** 373  
**Phase 1 Completed:** 14/15 (93%)  
**Remaining:** 359 routes

---

## Phase 1: ✅ COMPLETED (14 routes)

### Admin Routes (7)
- ✅ `/api/admin/users` - GET, POST
- ✅ `/api/admin/organizations` - GET, POST, PATCH, DELETE
- ✅ `/api/admin/feature-flags` - GET, PATCH
- ✅ `/api/admin/update-role` - PATCH
- ✅ `/api/admin/fix-super-admin-roles` - POST
- ✅ `/api/admin/system/settings` - GET, PUT
- ✅ `/api/admin/jobs` - GET

### Voting Routes (2)
- ✅ `/api/voting/sessions` - GET, POST
- ✅ `/api/voting/sessions/[id]` - GET, PATCH, DELETE

### Payment/Auth Routes (5)
- ✅ `/api/stripe/webhooks` - POST
- ✅ `/api/auth/role` - GET
- ✅ `/api/dues/create-payment-intent` - POST
- ✅ `/api/members/me` - GET, PATCH
- ✅ `/api/strike/funds` - GET, POST

---

## Phase 2: Financial Operations (Priority: 🔴 HIGH)

### Dues & Payments (8 routes)
- [ ] `/api/dues/transactions` - Transaction processing
- [ ] `/api/dues/members/[id]/payment` - Member payments
- [ ] `/api/arrears/cases` - Arrears management
- [ ] `/api/arrears/case/[memberId]` - Individual case
- [ ] `/api/arrears/create-payment-plan` - Payment plans
- [ ] `/api/arrears/escalate/[caseId]` - Escalation
- [ ] `/api/arrears/resolve/[caseId]` - Case resolution
- [ ] `/api/arrears/log-contact` - Contact logging

### Strike Fund Management (6 routes)
- [ ] `/api/strike/stipends` - Stipend processing
- [ ] `/api/strike/disbursements` - Disbursement tracking
- [ ] `/api/strike/eligibility` - Eligibility checks
- [ ] `/api/strike/picket-lines` - Picket tracking

### Billing & Invoicing (3 routes)
- [ ] `/api/billing/invoices` - Invoice management
- [ ] `/api/billing/validate` - Validation
- [ ] `/api/billing/batch-status/[jobId]` - Batch processing

### Remittances & CLC (11 routes)
- [ ] `/api/admin/clc/remittances` - Main remittances
- [ ] `/api/admin/clc/remittances/[id]` - Individual remittance
- [ ] `/api/admin/clc/remittances/[id]/submit` - Submit
- [ ] `/api/admin/clc/remittances/[id]/export` - Export
- [ ] `/api/admin/clc/remittances/export` - Bulk export
- [ ] `/api/admin/clc/analytics/trends` - Trends
- [ ] `/api/admin/clc/analytics/anomalies` - Anomalies
- [ ] `/api/admin/clc/analytics/forecast` - Forecasting
- [ ] `/api/admin/clc/analytics/organizations` - Org analytics
- [ ] `/api/admin/clc/analytics/patterns` - Pattern detection
- [ ] `/api/reconciliation/bank` - Bank reconciliation
- [ ] `/api/reconciliation/upload` - Upload statements
- [ ] `/api/reconciliation/process` - Process reconciliation
- [ ] `/api/reconciliation/resolve` - Resolve discrepancies

### Tax & Compliance (6 routes)
- [ ] `/api/tax/slips` - Tax slip generation
- [ ] `/api/tax/t4a` - T4A generation
- [ ] `/api/tax/t106` - T106 forms
- [ ] `/api/tax/rl-1/generate` - RL-1 Quebec forms
- [ ] `/api/tax/cope/receipts` - COPE receipts
- [ ] `/api/tax/cra/export` - CRA export

**Phase 2 Total:** ~34 financial routes

---

## Phase 3: Data Management (Priority: 🟡 MEDIUM)

### Member Operations (10 routes)
- [ ] `/api/members/[id]` - Individual member CRUD
- [ ] `/api/members/[id]/claims` - Member claims
- [ ] `/api/members/bulk` - Bulk operations
- [ ] `/api/members/export` - Export members
- [ ] `/api/members/import` - Import members
- [ ] `/api/members/merge` - Merge duplicates
- [ ] `/api/members/search` - Search members
- [ ] `/api/admin/members/bulk-import` - Admin bulk import

### Claims Management (8 routes)
- [ ] `/api/v1/claims` - V1 API claims
- [ ] `/api/claims/*` - Main claims routes (multiple)
- [ ] `/api/analytics/claims` - Claims analytics
- [ ] `/api/analytics/claims/categories` - Categories
- [ ] `/api/analytics/claims/trends` - Trends
- [ ] `/api/analytics/claims/stewards` - Steward stats

### Documents & Storage (12 routes)
- [ ] `/api/documents` - Document management
- [ ] `/api/documents/[id]` - Individual document
- [ ] `/api/documents/[id]/ocr` - OCR processing
- [ ] `/api/upload` - File upload
- [ ] `/api/exports` - Data exports
- [ ] `/api/exports/csv` - CSV exports
- [ ] `/api/signatures/documents` - E-signatures
- [ ] `/api/signatures/documents/[id]` - Individual signature
- [ ] `/api/signatures/sign` - Signing
- [ ] `/api/signatures/audit/[documentId]` - Audit trail
- [ ] `/api/signatures/webhooks/docusign` - DocuSign webhooks

### Organizations & Hierarchy (6 routes)
- [ ] `/api/admin/organizations/[id]` - Individual org
- [ ] `/api/admin/organizations/bulk-import` - Bulk import
- [ ] `/api/users/me/organizations` - User orgs

### Equity & Demographics (3 routes)
- [ ] `/api/equity/snapshots` - Equity snapshots
- [ ] `/api/equity/self-identify` - Self-identification
- [ ] `/api/equity/monitoring` - Monitoring

**Phase 3 Total:** ~39 data management routes

---

## Phase 4: Analytics, Reports & Integrations (Priority: 🟢 LOW)

### Analytics (50+ routes)
- [ ] `/api/analytics/*` - All analytics endpoints
- [ ] `/api/admin/stats/*` - Admin statistics
- [ ] `/api/social-media/analytics` - Social media analytics

### Reports & Exports (10 routes)
- [ ] `/api/reports/builder` - Report builder
- [ ] `/api/reports/datasources` - Data sources
- [ ] `/api/rewards/export` - Rewards export

### Organizing & Campaigns (12 routes)
- [ ] `/api/organizing/campaigns` - Campaign management
- [ ] `/api/organizing/workplace-mapping` - Workplace mapping
- [ ] `/api/organizing/labour-board` - Labour board filings
- [ ] `/api/organizing/support-percentage` - Support tracking
- [ ] `/api/organizing/forms/generate` - Form generation

### Social Media Integration (20 routes)
- [ ] `/api/social-media/feed` - Social feed
- [ ] `/api/social-media/posts` - Post management
- [ ] `/api/social-media/campaigns` - Social campaigns
- [ ] `/api/social-media/accounts` - Account management
- [ ] `/api/social-media/analytics` - Social analytics

### Bargaining & Arbitration (8 routes)
- [ ] `/api/bargaining-notes` - Bargaining notes
- [ ] `/api/bargaining-notes/[id]` - Individual note
- [ ] `/api/arbitration/precedents` - Precedents
- [ ] `/api/arbitration/precedents/[id]` - Individual precedent
- [ ] `/api/arbitration/precedents/search` - Search
- [ ] `/api/arbitration/precedents/[id]/citations` - Citations
- [ ] `/api/arbitration/precedents/[id]/documents` - Documents

### AI & ML Services (7 routes)
- [ ] `/api/ai/classify` - Classification
- [ ] `/api/ai/extract-clauses` - Clause extraction
- [ ] `/api/ai/feedback` - Feedback collection
- [ ] `/api/ai/match-precedents` - Precedent matching
- [ ] `/api/ai/search` - AI search
- [ ] `/api/ai/semantic-search` - Semantic search
- [ ] `/api/ai/summarize` - Summarization

### PKI & Security (9 routes)
- [ ] `/api/admin/pki/certificates` - Certificate management
- [ ] `/api/admin/pki/certificates/[id]` - Individual cert
- [ ] `/api/admin/pki/signatures` - Signature management
- [ ] `/api/admin/pki/signatures/[id]/sign` - Sign
- [ ] `/api/admin/pki/signatures/[id]/verify` - Verify
- [ ] `/api/admin/pki/workflows` - Workflow management
- [ ] `/api/admin/pki/workflows/[id]` - Individual workflow

### Messaging & Communications (10 routes)
- [ ] `/api/messages/threads` - Message threads
- [ ] `/api/messages/threads/[threadId]` - Individual thread
- [ ] `/api/messages/threads/[threadId]/messages` - Thread messages
- [ ] `/api/messages/notifications` - Notifications

### Calendar & Events (8 routes)
- [ ] `/api/calendar/events` - Calendar events
- [ ] `/api/calendar/events/[id]` - Individual event
- [ ] `/api/calendars` - Calendar management
- [ ] `/api/calendars/[id]` - Individual calendar
- [ ] `/api/calendars/[id]/events` - Calendar events
- [ ] `/api/calendar-sync/connections/[id]` - Sync connections
- [ ] `/api/calendar-sync/microsoft/callback` - Microsoft callback

### Rewards & Gamification (5 routes)
- [ ] `/api/rewards/wallet` - Wallet management
- [ ] `/api/rewards/redemptions` - Redemptions
- [ ] `/api/rewards/cron` - Scheduled tasks

### Voice & Transcription (2 routes)
- [ ] `/api/voice/upload` - Voice upload
- [ ] `/api/voice/transcribe` - Transcription

### System & Utility (15 routes)
- [ ] `/api/status` - System status
- [ ] `/api/test-auth` - Auth testing
- [ ] `/api/user/status` - User status
- [ ] `/api/tenant/current` - Current tenant
- [ ] `/api/tenant/switch` - Switch tenant
- [ ] `/api/activities` - Activity log
- [ ] `/api/workflow/overdue` - Overdue workflows
- [ ] `/api/workbench/assign` - Task assignment
- [ ] `/api/workbench/assigned` - Assigned tasks
- [ ] `/api/admin/database/health` - DB health
- [ ] `/api/admin/database/optimize` - DB optimization
- [ ] `/api/admin/system/cache` - Cache management
- [ ] `/api/admin/seed-test-data` - Test data seeding
- [ ] `/api/currency/convert` - Currency conversion

### Webhooks & External (8 routes)
- [ ] `/api/webhooks/stripe` - Stripe webhooks
- [ ] `/api/webhooks/clc` - CLC webhooks
- [ ] `/api/webhooks/signatures` - Signature webhooks
- [ ] `/api/whop/create-checkout` - Whop checkout
- [ ] `/api/whop/unauthenticated-checkout` - Public checkout
- [ ] `/api/whop/webhooks` - Whop webhooks

### Admin Jobs & Background (3 routes)
- [ ] `/api/admin/jobs/[action]` - Job actions
- [ ] `/api/admin/jobs/retry` - Retry failed jobs

**Phase 4 Total:** ~170+ remaining routes

---

## Migration Strategy

### Batch Approach
1. **Phase 2a**: Core financial (dues, arrears, strike) - 20 routes
2. **Phase 2b**: Billing & remittances - 14 routes
3. **Phase 3a**: Members & claims - 18 routes
4. **Phase 3b**: Documents & organizations - 21 routes
5. **Phase 4**: Analytics & remaining - 170+ routes (lower priority)

### Estimated Timeline
- **Phase 2**: 4-6 hours (34 routes @ 7-10 min/route)
- **Phase 3**: 5-7 hours (39 routes @ 7-10 min/route)
- **Phase 4**: 15-20 hours (170+ routes, many simpler)
- **Total**: 24-33 hours for complete migration

### Verification Strategy
- Batch verification after every 10 routes
- Comprehensive error check after each phase
- Audit logging verification via spot checks
- Performance impact monitoring

---

## Notes
- Some routes may already be partially secured
- Some routes may be deprecated
- Dynamic routes require manual pattern application
- Webhook routes have special security considerations
