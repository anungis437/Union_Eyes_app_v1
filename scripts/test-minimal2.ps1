# ISO 27001:2022 Compliance Automation Scripts
Write-Host "Testing if this minimal script runs" -ForegroundColor Green

function Test-PolicyDocuments {
    $RequiredPolicies = @(
        "policy1.md",
        "policy2.md"
    )
    
    foreach ($Policy in $RequiredPolicies) {
        Write-Host "Policy: $Policy" -ForegroundColor Green
    }
    
    return "Done"
}

Test-PolicyDocuments