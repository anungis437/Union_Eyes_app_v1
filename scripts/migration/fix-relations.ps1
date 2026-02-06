# Fix relations.ts by commenting out all view references

$content = Get-Content "db\migrations\relations.ts" -Raw

# Comment out lines containing tenantsInTenantManagement references
$lines = $content -split "`n"
$fixed = foreach ($line in $lines) {
    if ($line -match '^\s+tenantsInTenantManagement:' -and $line -notmatch '^\s+//') {
        $line -replace '(\s+)(tenantsInTenantManagement:)', '$1// $2'
    }
    elseif ($line -match 'references: \[tenantsInTenantManagement\.tenantId\]' -and $line -notmatch '^\s+//') {
        $line -replace '(\s+)(references:)', '$1// $2'
    }
    elseif ($line -match 'fields: \[(.*?\.tenantId.*?)\]' -and $line -notmatch '^\s+//') {
        # Check if previous line was commented
        $idx = [array]::IndexOf($lines, $line)
        if ($idx -gt 0 -and $lines[$idx - 1] -match '^\s+// tenantsInTenantManagement:') {
            $line -replace '(\s+)(fields:)', '$1// $2'
        } else {
            $line
        }
    }
    elseif ($line -match '^\s+\}\),$' -and $line -notmatch '^\s+//') {
        # Check if this closes a commented tenantsInTenantManagement block
        $idx = [array]::IndexOf($lines, $line)
        if ($idx -gt 1) {
            $prevLine = $lines[$idx - 1]
            if ($prevLine -match '^\s+// references:') {
                $line -replace '(\s+)(\}\),)', '$1// $2'
            } else {
                $line
            }
        } else {
            $line
        }
    }
    else {
        $line
    }
}

$fixed -join "`n" | Set-Content "db\migrations\relations.ts" -NoNewline
Write-Host "Fixed relations.ts - commented out view references"
