# ISO 27001:2022 Compliance Automation Scripts

$ErrorActionPreference = "Stop"
$ComplianceRoot = "$PSScriptRoot\..\docs\compliance"
$EvidenceDir = "$ComplianceRoot\evidence"
$ReportsDir = "$ComplianceRoot\reports"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

function Test-PolicyDocuments {
    Write-Host "`n=== Policy Document Check ===" -ForegroundColor Cyan
    $RequiredPolicies = @("policies\INFORMATION_SECURITY_POLICY.md","policies\ACCESS_CONTROL_POLICY.md","policies\INCIDENT_RESPONSE_PLAN.md","policies\BACKUP_RECOVERY_POLICY.md","policies\ENCRYPTION_STANDARDS.md","policies\DATA_CLASSIFICATION_POLICY.md","policies\SUPPLIER_SECURITY_POLICY.md","policies\HR_SECURITY_POLICY.md","policies\THREAT_INTELLIGENCE_PROGRAM.md","policies\SECURE_SDLC_POLICY.md","policies\INDEPENDENT_REVIEW_SCHEDULE.md","policies\DATA_RETENTION_POLICY.md","policies\RISK_ASSESSMENT_METHODOLOGY.md","ISMS_SCOPE_STATEMENT.md","ASSET_MANAGEMENT_REGISTER.md","SUPPLIER_RISK_REGISTER.md")
    $MissingPolicies = @()
    $ExistingPolicies = @()    
    foreach ($Policy in $RequiredPolicies) {
        $PolicyPath = Join-Path $ComplianceRoot $Policy
        if (Test-Path $PolicyPath) {
            $ExistingPolicies += $Policy
            Write-Host "  [] $Policy" -ForegroundColor Green
        } else {
            $MissingPolicies += $Policy
            Write-Host "  [] $Policy" -ForegroundColor Red
        }
    }    
    $Result = @{Total=$RequiredPolicies.Count;Existing=$ExistingPolicies.Count;Missing=$MissingPolicies.Count;MissingList=$MissingPolicies}
    $SummaryCount = '{0}/{1}' -f $ExistingPolicies.Count,$RequiredPolicies.Count
    $SummaryColor = if ($MissingPolicies.Count -eq 0) { 'Green' } else { 'Yellow' }
    Write-Host "`n  Summary: $SummaryCount policies present" -ForegroundColor $SummaryColor    
    return $Result
}

function Test-AssetInventory {
    Write-Host "`n=== Asset Inventory Check ===" -ForegroundColor Cyan
    $AssetRegisterPath = Join-Path $ComplianceRoot "ASSET_MANAGEMENT_REGISTER.md"    
    if (-not (Test-Path $AssetRegisterPath)) {
        Write-Host "  [] Asset register not found" -ForegroundColor Red
        return @{Status="Missing";Assets=0}
    }    
    $Content = Get-Content $AssetRegisterPath -Raw
    $DataAssets = ([regex]::Matches($Content, '^\| DATA-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $SoftwareAssets = ([regex]::Matches($Content, '^\| SW-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $InfraAssets = ([regex]::Matches($Content, '^\| INFRA-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $ThirdPartyAssets = ([regex]::Matches($Content, '^\| 3P-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $DocumentAssets = ([regex]::Matches($Content, '^\| DOC-\d+', [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $TotalAssets = $DataAssets + $SoftwareAssets + $InfraAssets + $ThirdPartyAssets + $DocumentAssets    
    Write-Host "  [] Asset register found" -ForegroundColor Green
    Write-Host "    - Data Assets: $DataAssets" -ForegroundColor Gray
    Write-Host "    - Software Assets: $SoftwareAssets" -ForegroundColor Gray
    Write-Host "    - Infrastructure Assets: $InfraAssets" -ForegroundColor Gray
    Write-Host "    - Third-Party Services: $ThirdPartyAssets" -ForegroundColor Gray
    Write-Host "    - Documentation Assets: $DocumentAssets" -ForegroundColor Gray
    Write-Host "    - Total Assets: $TotalAssets" -ForegroundColor Cyan    
    return @{Status="Present";TotalAssets=$TotalAssets;DataAssets=$DataAssets;SoftwareAssets=$SoftwareAssets;InfraAssets=$InfraAssets;ThirdPartyAssets=$ThirdPartyAssets;DocumentAssets=$DocumentAssets}
}

function Test-SupplierRiskAssessment {
    Write-Host "`n=== Supplier Risk Assessment Check ===" -ForegroundColor Cyan
    $SupplierRegisterPath = Join-Path $ComplianceRoot "SUPPLIER_RISK_REGISTER.md"    
    if (-not (Test-Path $SupplierRegisterPath)) {
        Write-Host "  [] Supplier risk register not found" -ForegroundColor Red
        return @{Status="Missing";Suppliers=0}
    }    
    $Content = Get-Content $SupplierRegisterPath -Raw
    $CriticalSuppliers = ([regex]::Matches($Content, '\|\s*Critical\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $HighSuppliers = ([regex]::Matches($Content, '\|\s*High\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $MediumSuppliers = ([regex]::Matches($Content, '\|\s*Medium\s*\|', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count    
    Write-Host "  [] Supplier risk register found" -ForegroundColor Green
    Write-Host "    - Critical Suppliers: $CriticalSuppliers" -ForegroundColor Red
    Write-Host "    - High-Risk Suppliers: $HighSuppliers" -ForegroundColor Yellow
    Write-Host "    - Medium-Risk Suppliers: $MediumSuppliers" -ForegroundColor Gray    
    return @{Status="Present";Critical=$CriticalSuppliers;High=$HighSuppliers;Medium=$MediumSuppliers;Total=($CriticalSuppliers+$HighSuppliers+$MediumSuppliers)}
}

function Test-DatabaseSecurityControls {
    Write-Host "`n=== Database Security Controls Check ===" -ForegroundColor Cyan
    $SchemaDir = "$PSScriptRoot\..\db\schema"    
    if (-not (Test-Path $SchemaDir)) {
        Write-Host "  [] Database schema directory not found" -ForegroundColor Red
        return @{Status="NotFound";RLSPolicies=0}
    }    
    $RLSFiles = Get-ChildItem -Path $SchemaDir -Recurse -Filter "*rls*.ts"
    $RLSPolicyCount = $RLSFiles.Count    
    Write-Host "  [] Database schema found" -ForegroundColor Green
    Write-Host "    - RLS policy files: $RLSPolicyCount" -ForegroundColor Cyan    
    $WithRLSUsage = (Get-ChildItem -Path "$PSScriptRoot\..\lib" -Recurse -Filter "*.ts" | Select-String -Pattern "withRLSContext|enableRLS" | Measure-Object).Count    
    Write-Host "    - RLS usage in code: $WithRLSUsage locations" -ForegroundColor Cyan    
    return @{Status="Present";RLSPolicies=$RLSPolicyCount;CodeUsage=$WithRLSUsage}
}

function Test-APIRouteSecurity {
    Write-Host "`n=== API Route Security Check ===" -ForegroundColor Cyan
    $AppDir = "$PSScriptRoot\..\app"    
    if (-not (Test-Path $AppDir)) {
        Write-Host "  [] App directory not found" -ForegroundColor Red
        return @{Status="NotFound";Routes=0}
    }    
    $APIFiles = Get-ChildItem -Path "$AppDir\api" -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue
    $APIRouteCount = ($APIFiles | Measure-Object).Count    
    $AuthMiddlewareUsage = (Get-ChildItem -Path "$AppDir\api" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue | Select-String -Pattern "withRoleAuth|getCurrentUserServer|requireAuth" | Measure-Object).Count    
    Write-Host "  [] API routes analyzed" -ForegroundColor Green
    Write-Host "    - API route files: $APIRouteCount" -ForegroundColor Cyan
    Write-Host "    - Auth middleware usage: $AuthMiddlewareUsage" -ForegroundColor Cyan    
    $Coverage = if ($APIRouteCount -gt 0) { [math]::Round(($AuthMiddlewareUsage/$APIRouteCount)*100,1) } else { 0 }    
    Write-Host "    - Estimated auth coverage: $Coverage%" -ForegroundColor $(if ($Coverage -ge 95) { 'Green' } else { 'Yellow' })    
    return @{Status="Present";TotalRoutes=$APIRouteCount;AuthUsage=$AuthMiddlewareUsage;CoveragePercent=$Coverage}
}

function New-ComplianceReport {
    param([hashtable]$PolicyCheck,[hashtable]$AssetCheck,[hashtable]$SupplierCheck,[hashtable]$DatabaseCheck,[hashtable]$APICheck)
    $ReportPath = Join-Path $ReportsDir "compliance_report_$Timestamp.md"
    $Report = "# ISO 27001:2022 Compliance Report`n`n**Generated:** {0}`n**Policy Documentation:** {1}/{2}`n**Asset Management:** {3} assets`n**Supplier Risk:** {4} suppliers`n**Database Security:** {5} RLS policies`n**API Security:** {6}% coverage`n" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),$PolicyCheck.Existing,$PolicyCheck.Total,$AssetCheck.TotalAssets,$SupplierCheck.Total,$DatabaseCheck.RLSPolicies,$APICheck.CoveragePercent
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host "`n[] Compliance report generated: $ReportPath" -ForegroundColor Green
    return $ReportPath
}

function Invoke-ComplianceAudit {
    Write-Host "`n
   ISO 27001:2022 Automated Compliance Audit                   
`n" -ForegroundColor Magenta    
    $PolicyResults = Test-PolicyDocuments
    $AssetResults = Test-AssetInventory
    $SupplierResults = Test-SupplierRiskAssessment
    $DatabaseResults = Test-DatabaseSecurityControls
    $APIResults = Test-APIRouteSecurity    
    $PolicyResults.ExistingList = Get-ChildItem "$ComplianceRoot\policies" -Filter "*.md" -ErrorAction SilentlyContinue | ForEach-Object { "policies\$($_.Name)" }    
    $ReportPath = New-ComplianceReport -PolicyCheck $PolicyResults -AssetCheck $AssetResults -SupplierCheck $SupplierResults -DatabaseCheck $DatabaseResults -APICheck $APIResults    
    Write-Host "`n=== Audit Complete ===" -ForegroundColor Cyan
    Write-Host "Full report available at: $ReportPath" -ForegroundColor Green
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-ComplianceAudit
}