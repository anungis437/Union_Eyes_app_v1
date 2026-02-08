# Route Authorization Audit Report

**Generated:** 2026-02-08T07:35:16.005Z  
**Total Routes:** 297  
**Protected Routes:** 272 (91.6%)  
**Unprotected Routes:** 25  
**Critical Issues:** 0  
**Warnings:** 25  

---

## ⚠️ Unprotected Routes

These routes have no authentication middleware and should be reviewed:

### ..\app\api\auth\role\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 13

### ..\app\api\carbon\dashboard\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 14

### ..\app\api\carbon\infrastructure\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 14

### ..\app\api\carbon\validate\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 14

### ..\app\api\communications\campaigns\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 34
- POST: Line 75

### ..\app\api\communications\polls\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 26
- POST: Line 95

### ..\app\api\communications\polls\[pollId]\route.ts

**Methods:** GET, PUT, DELETE  
**Line Numbers:**
- GET: Line 21
- PUT: Line 87
- DELETE: Line 184

### ..\app\api\communications\polls\[pollId]\vote\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 34

### ..\app\api\communications\surveys\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 45
- POST: Line 114

### ..\app\api\communications\surveys\[surveyId]\export\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 8

### ..\app\api\communications\surveys\[surveyId]\responses\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 24
- POST: Line 104

### ..\app\api\communications\surveys\[surveyId]\results\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 16

### ..\app\api\communications\surveys\[surveyId]\route.ts

**Methods:** GET, PUT, DELETE  
**Line Numbers:**
- GET: Line 26
- PUT: Line 77
- DELETE: Line 206

### ..\app\api\deadlines\dashboard\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 10

### ..\app\api\deadlines\upcoming\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 10

### ..\app\api\education\notification-preferences\route.ts

**Methods:** GET, POST, PATCH  
**Line Numbers:**
- GET: Line 24
- POST: Line 240
- PATCH: Line 109

### ..\app\api\emergency\dashboard\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 14

### ..\app\api\emergency\pipeda\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 15

### ..\app\api\emergency\recovery\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 15

### ..\app\api\graphql\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 29
- POST: Line 30

### ..\app\api\location\consent\route.ts

**Methods:** GET, POST, DELETE  
**Line Numbers:**
- GET: Line 55
- POST: Line 12
- DELETE: Line 80

### ..\app\api\location\geofence\route.ts

**Methods:** GET, POST  
**Line Numbers:**
- GET: Line 63
- POST: Line 11

### ..\app\api\location\track\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 10

### ..\app\api\profile\roles\route.ts

**Methods:** POST  
**Line Numbers:**
- POST: Line 6

### ..\app\api\v1\claims\route.ts

**Methods:** GET  
**Line Numbers:**
- GET: Line 71

---

## ✅ Protected Routes Summary

### withEnhancedRoleAuth (230 routes)

**Role Level Distribution:**
- Level 10 (Viewer): 102 routes
- Level 20 (Member): 55 routes
- Level 50 (Admin): 4 routes
- Level 60 (Super Admin): 31 routes
- Level 90 (Unknown): 38 routes

<details>
<summary>View 230 routes</summary>

- `..\app\api\activities\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\admin\clc\analytics\anomalies\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\analytics\forecast\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\analytics\organizations\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\analytics\patterns\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\analytics\trends\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\remittances\export\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\remittances\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\admin\clc\remittances\[id]\export\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\clc\remittances\[id]\route.ts` - Methods: GET, PUT, DELETE - Role Level: 90
- `..\app\api\admin\clc\remittances\[id]\submit\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\database\health\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\database\optimize\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\feature-flags\route.ts` - Methods: GET, PATCH - Role Level: 90
- `..\app\api\admin\fix-super-admin-roles\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\jobs\retry\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\jobs\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\jobs\[action]\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\members\bulk-import\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\organizations\bulk-import\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\organizations\route.ts` - Methods: GET, POST, PATCH, DELETE - Role Level: 90
- `..\app\api\admin\organizations\[id]\route.ts` - Methods: GET, PUT, DELETE - Role Level: 90
- `..\app\api\admin\pki\certificates\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\admin\pki\certificates\[id]\route.ts` - Methods: GET, DELETE - Role Level: 90
- `..\app\api\admin\pki\signatures\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\admin\pki\signatures\[id]\sign\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\pki\signatures\[id]\verify\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\pki\workflows\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\pki\workflows\[id]\route.ts` - Methods: GET, PUT, DELETE - Role Level: 90
- `..\app\api\admin\seed-test-data\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\stats\activity\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\stats\overview\route.ts` - Methods: GET - Role Level: 90
- `..\app\api\admin\system\cache\route.ts` - Methods: POST - Role Level: 90
- `..\app\api\admin\system\settings\route.ts` - Methods: GET, PUT - Role Level: 90
- `..\app\api\admin\update-role\route.ts` - Methods: PATCH - Role Level: 90
- `..\app\api\admin\users\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\admin\users\[userId]\route.ts` - Methods: GET, PUT, DELETE - Role Level: 90
- `..\app\api\ai\classify\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\ai\extract-clauses\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\ai\feedback\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\ai\match-precedents\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\ai\search\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\ai\semantic-search\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\ai\summarize\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\analytics\clause-stats\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\analytics\comparative\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\analytics\dashboard\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\analytics\insights\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\analytics\kpis\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\analytics\metrics\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\analytics\org-activity\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\analytics\precedent-stats\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\analytics\predictions\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\analytics\trends\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\arbitration\precedents\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\arbitration\precedents\search\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\arbitration\precedents\[id]\citations\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\arbitration\precedents\[id]\documents\route.ts` - Methods: GET, POST, DELETE - Role Level: 10
- `..\app\api\arbitration\precedents\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\arrears\case\[memberId]\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\arrears\cases\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\arrears\create-payment-plan\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\arrears\escalate\[caseId]\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\arrears\log-contact\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\arrears\resolve\[caseId]\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\bargaining-notes\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\bargaining-notes\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\billing\batch-status\[jobId]\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\billing\invoices\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\billing\validate\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\calendar-sync\connections\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\calendar-sync\connections\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\calendar-sync\connections\[id]\sync\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\calendar-sync\google\auth\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\calendar-sync\google\callback\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\calendar-sync\microsoft\auth\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\calendar-sync\microsoft\callback\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\calendars\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\calendars\[id]\events\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\calendars\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\cba\footnotes\[clauseId]\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\cba\precedents\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\cba\search\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\cba\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\cbas\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\cbas\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\claims\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\claims\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\claims\[id]\updates\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\claims\[id]\workflow\history\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\clause-library\compare\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\clause-library\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\clause-library\search\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\clause-library\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\clause-library\[id]\share\route.ts` - Methods: PATCH - Role Level: 20
- `..\app\api\clause-library\[id]\tags\route.ts` - Methods: POST, DELETE - Role Level: 20
- `..\app\api\clauses\compare\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\clauses\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\clauses\search\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\clauses\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\communications\sms\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\cope\campaigns\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\cope\canvassing\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\cope\officials\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\currency\convert\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\debug\user-role\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\documents\bulk\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\documents\folders\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\documents\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\documents\[id]\ocr\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\documents\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\dues\balance\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\dues\billing-cycle\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\dues\calculate\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\dues\create-payment-intent\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\dues\late-fees\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\dues\payment-history\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\dues\receipt\[id]\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\dues\setup-intent\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\education\certifications\generate\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\education\certifications\route.ts` - Methods: GET, POST, PATCH, DELETE - Role Level: 10
- `..\app\api\education\completions\certificates\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\education\completions\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\education\courses\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\education\programs\route.ts` - Methods: GET, POST, PATCH, DELETE - Role Level: 10
- `..\app\api\education\programs\[id]\enrollments\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\education\registrations\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\education\sessions\route.ts` - Methods: GET, POST, PATCH, DELETE - Role Level: 10
- `..\app\api\education\sessions\[id]\attendance\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\emergency\activate\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\equity\monitoring\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\equity\self-identify\route.ts` - Methods: GET, POST, DELETE - Role Level: 20
- `..\app\api\equity\snapshots\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\events\[id]\occurrences\route.ts` - Methods: GET, POST, DELETE - Role Level: 10
- `..\app\api\events\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\financial\reports\aged-receivables\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\financial\reports\balance-sheet\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\financial\reports\cash-flow\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\financial\reports\income-statement\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\gdpr\data-erasure\route.ts` - Methods: DELETE - Role Level: 20
- `..\app\api\healthwelfare\plans\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\jurisdiction\clc-compliance\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\jurisdiction\validate-deadline\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\meeting-rooms\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\meeting-rooms\[id]\bookings\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\members\bulk\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\members\export\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\members\me\route.ts` - Methods: GET, PATCH - Role Level: 20
- `..\app\api\members\merge\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\members\search\route.ts` - Methods: GET, POST - Role Level: 20
- `..\app\api\members\[id]\route.ts` - Methods: GET, PATCH - Role Level: 10
- `..\app\api\messages\notifications\route.ts` - Methods: GET, PATCH - Role Level: 10
- `..\app\api\messages\threads\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\messages\threads\[threadId]\messages\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\messages\threads\[threadId]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\notifications\count\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\notifications\mark-all-read\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\notifications\preferences\route.ts` - Methods: GET, PUT - Role Level: 10
- `..\app\api\notifications\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\notifications\test\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\notifications\[id]\route.ts` - Methods: PATCH, DELETE - Role Level: 20
- `..\app\api\onboarding\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\organizations\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\organizations\switch\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\organizations\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\organizing\campaigns\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\organizing\card-check\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\organizing\committee\route.ts` - Methods: GET, POST, DELETE - Role Level: 10
- `..\app\api\organizing\forms\generate\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\organizing\labour-board\route.ts` - Methods: GET, POST, PATCH - Role Level: 10
- `..\app\api\organizing\support-percentage\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\organizing\workplace-mapping\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\pension\benefits\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\pension\members\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\pension\plans\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\pension\plans\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\pension\retirement-eligibility\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\pension\trustee-meetings\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\pension\trustee-meetings\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\pension\trustees\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\pension\trustees\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\portal\documents\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\portal\documents\upload\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\portal\dues\balance\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\portal\dues\pay\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\precedents\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\precedents\search\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\precedents\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\privacy\breach\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\privacy\dsar\route.ts` - Methods: GET, POST - Role Level: 90
- `..\app\api\privacy\provincial\route.ts` - Methods: GET, POST - Role Level: 50
- `..\app\api\reconciliation\bank\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\reconciliation\process\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\reconciliation\resolve\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\reconciliation\upload\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\reports\builder\route.ts` - Methods: GET, POST - Role Level: 50
- `..\app\api\reports\execute\route.ts` - Methods: POST - Role Level: 50
- `..\app\api\reports\templates\route.ts` - Methods: GET - Role Level: 50
- `..\app\api\rewards\export\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\rewards\redemptions\route.ts` - Methods: GET, POST, DELETE - Role Level: 10
- `..\app\api\rewards\wallet\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\social-media\accounts\callback\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\social-media\accounts\route.ts` - Methods: GET, POST, PUT, DELETE - Role Level: 10
- `..\app\api\social-media\analytics\route.ts` - Methods: GET, POST, PUT, DELETE - Role Level: 10
- `..\app\api\social-media\campaigns\route.ts` - Methods: GET, POST, PUT, DELETE - Role Level: 10
- `..\app\api\social-media\feed\route.ts` - Methods: GET, POST, PUT, DELETE - Role Level: 10
- `..\app\api\social-media\posts\route.ts` - Methods: GET, POST, DELETE - Role Level: 10
- `..\app\api\strike\disbursements\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\strike\eligibility\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\strike\funds\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\strike\picket-lines\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\strike\stipends\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\tax\cope\receipts\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\tax\cra\export\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\tax\rl-1\generate\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\tax\slips\route.ts` - Methods: GET - Role Level: 60
- `..\app\api\tax\t106\route.ts` - Methods: GET, POST - Role Level: 60
- `..\app\api\tax\t4a\route.ts` - Methods: POST - Role Level: 60
- `..\app\api\tenant\current\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\tenant\switch\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\test-auth\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\upload\route.ts` - Methods: GET, POST, DELETE - Role Level: 20
- `..\app\api\users\me\organizations\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\voice\transcribe\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\voice\upload\route.ts` - Methods: POST, DELETE - Role Level: 20
- `..\app\api\voting\sessions\route.ts` - Methods: GET, POST - Role Level: 10
- `..\app\api\voting\sessions\[id]\results\route.ts` - Methods: GET - Role Level: 10
- `..\app\api\voting\sessions\[id]\route.ts` - Methods: GET, PATCH, DELETE - Role Level: 10
- `..\app\api\voting\sessions\[id]\vote\route.ts` - Methods: POST - Role Level: 20
- `..\app\api\workbench\assign\route.ts` - Methods: POST - Role Level: 20

</details>

### withOrganizationAuth (40 routes)

<details>
<summary>View 40 routes</summary>

- `..\app\api\analytics\claims\categories\route.ts` - Methods: GET
- `..\app\api\analytics\claims\route.ts` - Methods: GET
- `..\app\api\analytics\claims\stewards\route.ts` - Methods: GET
- `..\app\api\analytics\claims\trends\route.ts` - Methods: GET
- `..\app\api\analytics\deadlines-metrics\route.ts` - Methods: GET
- `..\app\api\analytics\executive\route.ts` - Methods: GET
- `..\app\api\analytics\financial\categories\route.ts` - Methods: GET
- `..\app\api\analytics\financial\costs\route.ts` - Methods: GET
- `..\app\api\analytics\financial\outcomes\route.ts` - Methods: GET
- `..\app\api\analytics\financial\route.ts` - Methods: GET
- `..\app\api\analytics\financial\trends\route.ts` - Methods: GET
- `..\app\api\analytics\heatmap\route.ts` - Methods: GET
- `..\app\api\analytics\members\churn-risk\route.ts` - Methods: GET
- `..\app\api\analytics\members\cohorts\route.ts` - Methods: GET
- `..\app\api\analytics\members\route.ts` - Methods: GET
- `..\app\api\analytics\members\trends\route.ts` - Methods: GET
- `..\app\api\analytics\operational\bottlenecks\route.ts` - Methods: GET
- `..\app\api\analytics\operational\queues\route.ts` - Methods: GET
- `..\app\api\analytics\operational\route.ts` - Methods: GET
- `..\app\api\analytics\operational\sla\route.ts` - Methods: GET
- `..\app\api\analytics\operational\workload\route.ts` - Methods: GET
- `..\app\api\analytics\refresh\route.ts` - Methods: GET, POST
- `..\app\api\cba\clauses\compare\route.ts` - Methods: GET, POST
- `..\app\api\dashboard\stats\route.ts` - Methods: GET
- `..\app\api\deadlines\route.ts` - Methods: GET
- `..\app\api\exports\csv\route.ts` - Methods: POST
- `..\app\api\exports\excel\route.ts` - Methods: POST
- `..\app\api\exports\pdf\route.ts` - Methods: POST
- `..\app\api\exports\route.ts` - Methods: GET
- `..\app\api\exports\[id]\route.ts` - Methods: GET
- `..\app\api\organization\members\search\route.ts` - Methods: GET
- `..\app\api\reports\datasources\route.ts` - Methods: GET
- `..\app\api\reports\route.ts` - Methods: GET, POST
- `..\app\api\reports\scheduled\route.ts` - Methods: GET, POST
- `..\app\api\reports\scheduled\[id]\route.ts` - Methods: GET, PATCH, DELETE
- `..\app\api\reports\[id]\execute\route.ts` - Methods: POST
- `..\app\api\reports\[id]\route.ts` - Methods: GET, PUT, DELETE
- `..\app\api\reports\[id]\run\route.ts` - Methods: POST
- `..\app\api\reports\[id]\share\route.ts` - Methods: GET, POST, DELETE
- `..\app\api\workbench\assigned\route.ts` - Methods: GET

</details>

### withRoleAuth (2 routes)

<details>
<summary>View 2 routes</summary>

- `..\app\api\members\[id]\claims\route.ts` - Methods: GET
- `..\app\api\organization\members\route.ts` - Methods: GET, POST

</details>

---

## 📋 Recommendations

### High Priority
1. **Review unprotected routes** - 25 routes without auth middleware
   - Verify these routes should be public
   - Add appropriate auth middleware if sensitive data is exposed

### Best Practices
1. **Use enterprise-role-middleware.ts** for all new routes
2. **Prefer role-based auth** over permission-based when possible
3. **Document public routes** in PUBLIC_ROUTES array
4. **Add JSDoc comments** to exported route handlers
5. **Test auth middleware** in route integration tests

---

## Appendix: Role Levels Reference

| Level | Role | Description |
|-------|------|-------------|
| 10 | Viewer | Read-only access |
| 20 | Member | Standard member access |
| 30 | Steward | Shop steward/representative |
| 40 | Officer | Union officer |
| 50 | Admin | Organization administrator |
| 60 | Super Admin | Elevated admin access |
| 70 | System Admin | System-level access |

