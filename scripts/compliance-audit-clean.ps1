# ISO 27001:2022 Compliance Automation Scripts
# This PowerShell script provides automated compliance checking and reporting

# Configuration
$ErrorActionPreference = "Stop"
$ComplianceRoot = "$PSScriptRoot\..\docs\compliance"
$EvidenceDir = "$ComplianceRoot\evidence"
$ReportsDir = "$ComplianceRoot\reports"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

# ============================================================================
# Policy Existence Check
# ============================================================================

function Test-PolicyDocuments {
    Write-Host "`n=== Policy Document Check ===" -ForegroundColor Cyan
    
    $RequiredPolicies = @(
        "policies\INFORMATION_SECURITY_POLICY.md",
        "policies\ACCESS_CONTROL_POLICY.md",
        "policies\INCIDENT_RESPONSE_PLAN.md",
        "policies\BACKUP_RECOVERY_POLICY.md",
        "policies\ENCRYPTION_STANDARDS.md",
        "policies\DATA_CLASSIFICATION_POLICY.md",
        "policies\SUPPLIER_SECURITY_POLICY.md",
        "policies\HR_SECURITY_POLICY.md",
        "policies\THREAT_INTELLIGENCE_PROGRAM.md",
        "policies\SECURE_SDLC_POLICY.md",
        "policies\INDEPENDENT_REVIEW_SCHEDULE.md",
        "policies\DATA_RETENTION_POLICY.md",
        "policies\RISK_ASSESSMENT_METHODOLOGY.md",
        "ISMS_SCOPE_STATEMENT.md",
        "ASSET_MANAGEMENT_REGISTER.md",
        "SUPPLIER_RISK_REGISTER.md"
    )
    
    $MissingPolicies = @()
    $ExistingPolicies = @()
    
    foreach ($Policy in $RequiredPolicies) {
        $PolicyPath = Join-Path $ComplianceRoot $Policy
        if (Test-Path $PolicyPath) {
            $ExistingPolicies += $Policy
            Write-Host "  [✓] $Policy" -ForegroundColor Green
        } else {
            $MissingPolicies += $Policy
            Write-Host "  [✗] $Policy" -ForegroundColor Red
        }
    }
    
    $Result = @{
        Total = $RequiredPolicies.Count
        Existing = $ExistingPolicies.Count
        Missing = $MissingPolicies.Count
        MissingList = $MissingPolicies
    }
    
    $SummaryCount = '{0}/{1}' -f $ExistingPolicies.Count, $RequiredPolicies.Count
    $SummaryColor = if ($MissingPolicies.Count -eq 0) { 'Green' } else { 'Yellow' }
    Write-Host "`n  Summary: $SummaryCount policies present" -ForegroundColor $SummaryColor
    
    return $Result
}

# ============================================================================
# Asset Inventory Check
# ============================================================================

function Test-AssetInventory {
    Write-Host "`n=== Asset Inventory Check ===" -ForegroundColor Cyan
    
    $AssetRegisterPath = Join-Path $ComplianceRoot "ASSET_MANAGEMENT_REGISTER.md"
    
    if (-not (Test-Path $AssetRegisterPath)) {
        Write-Host "  [✗] Asset register not found" -ForegroundColor Red
        return @{ Status = "Missing"; Assets = 0 }
    }
    
    $Content = Get-Content $AssetRegisterPath -Raw
    
    # Count asset entries (basic heuristic: lines starting with "| DATA-", "| SW-", "| INFRA-", "| 3P-", "| DOC-")
    $DataAssets = ([regex]::Matches($Content, '^\| DATA-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $SoftwareAssets = ([regex]::Matches($Content, '^\| SW-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $InfraAssets = ([regex]::Matches($Content, '^\| INFRA-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $ThirdPartyAssets = ([regex]::Matches($Content, '^\| 3P-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $DocumentAssets = ([regex]::Matches($Content, '^\| DOC-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    
    $TotalAssets = $DataAssets + $SoftwareAssets + $InfraAssets + $ThirdPartyAssets + $DocumentAssets
    
    Write-Host "  [✓] Asset register found" -ForegroundColor Green
    Write-Host "    - Data Assets: $DataAssets" -ForegroundColor Gray
    Write-Host "    - Software Assets: $SoftwareAssets" -ForegroundColor Gray
    Write-Host "    - Infrastructure Assets: $InfraAssets" -ForegroundColor Gray
    Write-Host "    - Third-Party Services: $ThirdPartyAssets" -ForegroundColor Gray
    Write-Host "    - Documentation Assets: $DocumentAssets" -ForegroundColor Gray
    Write-Host "    - Total Assets: $TotalAssets" -ForegroundColor Cyan
    
    return @{
        Status = "Present"
        TotalAssets = $TotalAssets
        DataAssets = $DataAssets
        SoftwareAssets = $SoftwareAssets
        InfraAssets = $InfraAssets
        ThirdPartyAssets = $ThirdPartyAssets
        DocumentAssets = $DocumentAssets
    }
}

# ============================================================================
# Supplier Risk Assessment Check
# ============================================================================

function Test-SupplierRiskAssessment {
    Write-Host "`n=== Supplier Risk Assessment Check ===" -ForegroundColor Cyan
    
    $SupplierRegisterPath = Join-Path $ComplianceRoot "SUPPLIER_RISK_REGISTER.md"
    
    if (-not (Test-Path $SupplierRegisterPath)) {
        Write-Host "  [✗] Supplier risk register not found" -ForegroundColor Red
        return @{ Status = "Missing"; Suppliers = 0 }
    }
    
    $Content = Get-Content $SupplierRegisterPath -Raw
    
    # Count critical and high-risk suppliers
    $CriticalSuppliers = ([regex]::Matches($Content, '\|\s*Critical\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $HighSuppliers = ([regex]::Matches($Content, '\|\s*High\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $MediumSuppliers = ([regex]::Matches($Content, '\|\s*Medium\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    
    Write-Host "  [✓] Supplier risk register found" -ForegroundColor Green
    Write-Host "    - Critical Suppliers: $CriticalSuppliers" -ForegroundColor Red
    Write-Host "    - High-Risk Suppliers: $HighSuppliers" -ForegroundColor Yellow
    Write-Host "    - Medium-Risk Suppliers: $MediumSuppliers" -ForegroundColor Gray
    
    return @{
        Status = "Present"
        Critical = $CriticalSuppliers
        High = $HighSuppliers
        Medium = $MediumSuppliers
        Total = $CriticalSuppliers + $HighSuppliers + $MediumSuppliers
    }
}

# ============================================================================
# Database RLS Policy Check
# ============================================================================

function Test-DatabaseSecurityControls {
    Write-Host "`n=== Database Security Controls Check ===" -ForegroundColor Cyan
    
    $SchemaDir = "$PSScriptRoot\..\db\schema"
    
    if (-not (Test-Path $SchemaDir)) {
        Write-Host "  [✗] Database schema directory not found" -ForegroundColor Red
        return @{ Status = "NotFound"; RLSPolicies = 0 }
    }
    
    # Count RLS policy files
    $RLSFiles = Get-ChildItem -Path $SchemaDir -Recurse -Filter "*rls*.ts"
    $RLSPolicyCount = $RLSFiles.Count
    
    Write-Host "  [✓] Database schema found" -ForegroundColor Green
    Write-Host "    - RLS policy files: $RLSPolicyCount" -ForegroundColor Cyan
    
    # Check for RLS usage in code
    $WithRLSUsage = Get-ChildItem -Path "$PSScriptRoot\..\lib" -Recurse -Filter "*.ts" | 
        Select-String -Pattern "withRLSContext|enableRLS" | 
        Measure-Object | 
        Select-Object -ExpandProperty Count
    
    Write-Host "    - RLS usage in code: $WithRLSUsage locations" -ForegroundColor Cyan
    
    return @{
        Status = "Present"
        RLSPolicies = $RLSPolicyCount
        CodeUsage = $WithRLSUsage
    }
}

# ============================================================================
# API Route Security Check
# ============================================================================

function Test-APIRouteSecurity {
    Write-Host "`n=== API Route Security Check ===" -ForegroundColor Cyan
    
    $AppDir = "$PSScriptRoot\..\app"
    
    if (-not (Test-Path $AppDir)) {
        Write-Host "  [✗] App directory not found" -ForegroundColor Red
        return @{ Status = "NotFound"; Routes = 0 }
    }
    
    # Count API route files
    $APIFiles = Get-ChildItem -Path "$AppDir\api" -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue
    $APIRouteCount = ($APIFiles | Measure-Object).Count
    
    # Check for auth middleware usage
    $AuthMiddlewareUsage = Get-ChildItem -Path "$AppDir\api" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue | 
        Select-String -Pattern "withRoleAuth|getCurrentUserServer|requireAuth" | 
        Measure-Object | 
        Select-Object -ExpandProperty Count
    
    Write-Host "  [✓] API routes analyzed" -ForegroundColor Green
    Write-Host "    - API route files: $APIRouteCount" -ForegroundColor Cyan
    Write-Host "    - Auth middleware usage: $AuthMiddlewareUsage" -ForegroundColor Cyan
    
    $Coverage = if ($APIRouteCount -gt 0) { 
        [math]::Round(($AuthMiddlewareUsage / $APIRouteCount) * 100, 1) 
    } else { 0 }
    
    Write-Host "    - Estimated auth coverage: $Coverage%" -ForegroundColor $(if ($Coverage -ge 95) { 'Green' } else { 'Yellow' })
    
    return @{
        Status = "Present"
        TotalRoutes = $APIRouteCount
        AuthUsage = $AuthMiddlewareUsage
        CoveragePercent = $Coverage
    }
}

# ============================================================================
# Generate Compliance Report
# ============================================================================

function New-ComplianceReport {
    param(
        [hashtable]$PolicyCheck,
        [hashtable]$AssetCheck,
        [hashtable]$SupplierCheck,
        [hashtable]$DatabaseCheck,
        [hashtable]$APICheck
    )
    
    $ReportPath = Join-Path $ReportsDir "compliance_report_$Timestamp.md"
    
    $PolicyStatus = if ($PolicyCheck.Missing -eq 0) { "✅ Complete" } else { "⚠️ Incomplete" }
    $AssetStatus = if ($AssetCheck.Status -eq "Present") { "✅ Implemented" } else { "❌ Missing" }
    $SupplierStatus = if ($SupplierCheck.Status -eq "Present") { "✅ Implemented" } else { "❌ Missing" }
    $DatabaseStatus = if ($DatabaseCheck.Status -eq "Present") { "✅ Implemented" } else { "❌ Missing" }
    $APIStatus = if ($APICheck.CoveragePercent -ge 95) { "✅ Complete" } else { "⚠️ Review Needed" }
    
    $PolicyScore = "$($PolicyCheck.Existing)/$($PolicyCheck.Total)"
    $AssetCount = "$($AssetCheck.TotalAssets) assets registered"
    $SupplierCount = "$($SupplierCheck.Total) suppliers assessed"
    $DatabasePolicies = "$($DatabaseCheck.RLSPolicies) RLS policies"
    $APICoverage = "$($APICheck.CoveragePercent)% coverage"
    
    $Report = @'
# ISO 27001:2022 Compliance Report

**Generated:** TIMESTAMP_PLACEHOLDER  
**Report Type:** Automated Compliance Check  

## Executive Summary

**Policy Documentation:** POLICY_STATUS (POLICY_SCORE)  
**Asset Management:** ASSET_STATUS (ASSET_COUNT)  
**Supplier Risk Management:** SUPPLIER_STATUS (SUPPLIER_COUNT)  
**Database Security (RLS):** DATABASE_STATUS (DATABASE_POLICIES)  
**API Security:** API_STATUS (API_COVERAGE)

---

## A.5.1 Information Security Policy

Status: POLICY_IMPL_STATUS
Document: INFORMATION_SECURITY_POLICY.md
Last Review: POLICY_LAST_REVIEW

## A.5.9 Asset Management

Status: ASSET_IMPL_STATUS
Total Assets: ASSET_TOTAL_COUNT
  - Data Assets: DATA_ASSET_COUNT
  - Software Assets: SW_ASSET_COUNT
  - Infrastructure: INFRA_ASSET_COUNT
  - Third-Party Services: THIRDPARTY_ASSET_COUNT
  - Documentation: DOC_ASSET_COUNT

Recommendation: Quarterly review scheduled.

## A.5.19, A.5.20 Supplier Security

Status: SUPPLIER_IMPL_STATUS
Total Suppliers: SUPPLIER_TOTAL_COUNT
  - Critical: SUPPLIER_CRITICAL_COUNT
  - High-Risk: SUPPLIER_HIGH_COUNT
  - Medium-Risk: SUPPLIER_MEDIUM_COUNT

Action Items:
- Complete SOC 2 verification for all critical suppliers
- Negotiate 24-hour breach notification SLAs
- Schedule annual supplier reviews

## A.8.3 Access Control (RLS & API Security)

### Database Row-Level Security
RLS Policy Files: RLS_POLICY_COUNT
Code Integration: RLS_CODE_USAGE usages
Status: RLS_STATUS

### API Route Protection
Total API Routes: API_ROUTE_COUNT
Auth Middleware Usage: API_AUTH_USAGE
Coverage: API_COVERAGE_PCT%
Status: API_STATUS_TEXT

## Policy Documentation Status

POLICY_LIST_SECTION

## Overall Compliance Score

Estimated Readiness: OVERALL_SCORE
Certification Timeline: CERT_TIMELINE

---

## Next Steps

1. **Immediate (P0):**
   - Complete missing policies (if any)
   - Verify all suppliers have SOC 2 reports
   - Schedule ISO 27001 Stage 1 audit

2. **Short-term (P1 - 30 days):**
   - Conduct risk assessment using new methodology
   - Implement automated compliance monitoring
   - Schedule penetration testing

3. **Medium-term (P2 - 90 days):**
   - Complete annual supplier reviews
   - Conduct internal security audit
   - Prepare evidence repository for external audit

---

**Report Generated By:** Automated Compliance Script  
**Contact:** security@unioneyes.com
'@

    # Replace placeholders with actual values
    $Report = $Report.Replace('TIMESTAMP_PLACEHOLDER', (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
    $Report = $Report.Replace('POLICY_STATUS', $PolicyStatus)
    $Report = $Report.Replace('POLICY_SCORE', $PolicyScore)
    $Report = $Report.Replace('ASSET_STATUS', $AssetStatus)
    $Report = $Report.Replace('ASSET_COUNT', $AssetCount)
    $Report = $Report.Replace('SUPPLIER_STATUS', $SupplierStatus)
    $Report = $Report.Replace('SUPPLIER_COUNT', $SupplierCount)
    $Report = $Report.Replace('DATABASE_STATUS', $DatabaseStatus)
    $Report = $Report.Replace('DATABASE_POLICIES', $DatabasePolicies)
    $Report = $Report.Replace('API_STATUS', $APIStatus)
    $Report = $Report.Replace('API_COVERAGE', $APICoverage)
    
    $PolicyImplStatus = if (Test-Path "$ComplianceRoot\policies\INFORMATION_SECURITY_POLICY.md") { "Implemented" } else { "Not Implemented" }
    $PolicyLastReview = if (Test-Path "$ComplianceRoot\policies\INFORMATION_SECURITY_POLICY.md") { 
        (Get-Item "$ComplianceRoot\policies\INFORMATION_SECURITY_POLICY.md").LastWriteTime.ToString('yyyy-MM-dd') 
    } else { "N/A" }
    $AssetImplStatus = if ($AssetCheck.Status -eq 'Present') { 'Implemented' } else { 'Not Implemented' }
    $SupplierImplStatus = if ($SupplierCheck.Status -eq 'Present') { 'Implemented' } else { 'Not Implemented' }
    $RLSStatus = if ($DatabaseCheck.RLSPolicies -gt 0) { 'Implemented' } else { 'Review Needed' }
    $APIStatusText = if ($APICheck.CoveragePercent -ge 95) { 'Excellent' } else { 'Review Needed' }
    
    $Report = $Report.Replace('POLICY_IMPL_STATUS', $PolicyImplStatus)
    $Report = $Report.Replace('POLICY_LAST_REVIEW', $PolicyLastReview)
    $Report = $Report.Replace('ASSET_IMPL_STATUS', $AssetImplStatus)
    $Report = $Report.Replace('ASSET_TOTAL_COUNT', $AssetCheck.TotalAssets)
    $Report = $Report.Replace('DATA_ASSET_COUNT', $AssetCheck.DataAssets)
    $Report = $Report.Replace('SW_ASSET_COUNT', $AssetCheck.SoftwareAssets)
    $Report = $Report.Replace('INFRA_ASSET_COUNT', $AssetCheck.InfraAssets)
    $Report = $Report.Replace('THIRDPARTY_ASSET_COUNT', $AssetCheck.ThirdPartyAssets)
    $Report = $Report.Replace('DOC_ASSET_COUNT', $AssetCheck.DocumentAssets)
    $Report = $Report.Replace('SUPPLIER_IMPL_STATUS', $SupplierImplStatus)
    $Report = $Report.Replace('SUPPLIER_TOTAL_COUNT', $SupplierCheck.Total)
    $Report = $Report.Replace('SUPPLIER_CRITICAL_COUNT', $SupplierCheck.Critical)
    $Report = $Report.Replace('SUPPLIER_HIGH_COUNT', $SupplierCheck.High)
    $Report = $Report.Replace('SUPPLIER_MEDIUM_COUNT', $SupplierCheck.Medium)
    $Report = $Report.Replace('RLS_POLICY_COUNT', $DatabaseCheck.RLSPolicies)
    $Report = $Report.Replace('RLS_CODE_USAGE', $DatabaseCheck.CodeUsage)
    $Report = $Report.Replace('RLS_STATUS', $RLSStatus)
    $Report = $Report.Replace('API_ROUTE_COUNT', $APICheck.TotalRoutes)
    $Report = $Report.Replace('API_AUTH_USAGE', $APICheck.AuthUsage)
    $Report = $Report.Replace('API_COVERAGE_PCT', $APICheck.CoveragePercent)
    $Report = $Report.Replace('API_STATUS_TEXT', $APIStatusText)
    
    # Handle policy list if available
    if ($PolicyCheck.ContainsKey('ExistingList') -and $PolicyCheck.ExistingList) {
        $PolicyListText = ($PolicyCheck.ExistingList | ForEach-Object { "- $($_)" }) -join "`n"
        $Report = $Report.Replace('POLICY_LIST_SECTION', $PolicyListText)
    } else {
        $Report = $Report.Replace('POLICY_LIST_SECTION', 'No policies found')
    }
    
    $TotalChecks = 5
    $PassedChecks = 0
    if ($PolicyCheck.Missing -eq 0) { $PassedChecks++ }
    if ($AssetCheck.Status -eq 'Present') { $PassedChecks++ }
    if ($SupplierCheck.Status -eq 'Present') { $PassedChecks++ }
    if ($DatabaseCheck.Status -eq 'Present') { $PassedChecks++ }
    if ($APICheck.CoveragePercent -ge 95) { $PassedChecks++ }
    
    $Percentage = [math]::Round(($PassedChecks / $TotalChecks) * 100, 1)
    $OverallScore = '{0}% ({1}/{2} controls passing)' -f $Percentage, $PassedChecks, $TotalChecks
    $Report = $Report.Replace('OVERALL_SCORE', $OverallScore)
    
    $CertTimeline = if ($PolicyCheck.Missing -eq 0 -and $AssetCheck.Status -eq 'Present' -and $SupplierCheck.Status -eq 'Present') {
        '2-3 months (documentation review only)'
    } else {
        '4-6 months (policy completion + documentation)'
    }
    $Report = $Report.Replace('CERT_TIMELINE', $CertTimeline)
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host "`n[✓] Compliance report generated: $ReportPath" -ForegroundColor Green
    
    return $ReportPath
}

# ============================================================================
# Main Execution
# ============================================================================

function Invoke-ComplianceAudit {
    Write-Host @'

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ISO 27001:2022 Automated Compliance Audit                   ║
║   Union Eyes Platform                                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

'@ -ForegroundColor Magenta
    
    # Run all checks
    $PolicyResults = Test-PolicyDocuments
    $AssetResults = Test-AssetInventory
    $SupplierResults = Test-SupplierRiskAssessment
    $DatabaseResults = Test-DatabaseSecurityControls
    $APIResults = Test-APIRouteSecurity
    
    # Add existing list to PolicyResults
    $PolicyResults.ExistingList = Get-ChildItem "$ComplianceRoot\policies" -Filter "*.md" -ErrorAction SilentlyContinue | ForEach-Object { "policies\$($_.Name)" }
    
    # Generate report
    $ReportPath = New-ComplianceReport `
        -PolicyCheck $PolicyResults `
        -AssetCheck $AssetResults `
        -SupplierCheck $SupplierResults `
        -DatabaseCheck $DatabaseResults `
        -APICheck $APIResults
    
    Write-Host "`n=== Audit Complete ===" -ForegroundColor Cyan
    Write-Host "Full report available at: $ReportPath" -ForegroundColor Green
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Invoke-ComplianceAudit
}
