$ErrorActionPreference = "Stop"
$ComplianceRoot = "C:\test"

function Test-PolicyDocuments {
    Write-Host "`n=== Policy Document Check ===" -ForegroundColor Cyan
    
    $RequiredPolicies = @(
        "policies\INFORMATION_SECURITY_POLICY.md",
        "policies\ACCESS_CONTROL_POLICY.md"
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
    
    $SummaryCount = "$($ExistingPolicies.Count)" + "/" + "$($RequiredPolicies.Count)"
    $SummaryColor = if ($MissingPolicies.Count -eq 0) { "Green" } else { "Yellow" }
    Write-Host "`n  Summary: $SummaryCount policies present" -ForegroundColor $SummaryColor
    
    return $Result
}

Test-PolicyDocuments
