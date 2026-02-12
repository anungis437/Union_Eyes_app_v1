# Generate and apply missing enum types from db/schema definitions
$ErrorActionPreference = "Stop"

$schemaRoot = "db\schema"
$sqlPath = "tmp-create-enums.sql"

$enumMap = @{}

$files = Get-ChildItem -Path $schemaRoot -Recurse -Filter "*.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $regexPattern = 'pgEnum\(\s*["''](?<name>[^"'']+)["'']\s*,\s*\[(?<values>.*?)\]\s*\)'
    $regex = [regex]::new($regexPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $regex.Matches($content)) {
        $name = $match.Groups['name'].Value
        $valuesBlock = $match.Groups['values'].Value
        $valueMatches = [regex]::Matches($valuesBlock, '["''](?<val>[^"'']+)["'']')
        $values = @()
        foreach ($vm in $valueMatches) {
            $values += $vm.Groups['val'].Value
        }
        if ($values.Count -gt 0) {
            if (-not $enumMap.ContainsKey($name)) {
                $enumMap[$name] = $values
            }
        }
    }
}

$lines = @()
$lines += "-- Auto-generated enum creation script"
$lines += "BEGIN;"
foreach ($name in $enumMap.Keys | Sort-Object) {
    $values = $enumMap[$name] | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }
    $valuesSql = $values -join ", "
    $lines += "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN CREATE TYPE ${name} AS ENUM (${valuesSql}); END IF; END `$`$;"
}
$lines += "COMMIT;"

Set-Content -Path $sqlPath -Value $lines -Encoding UTF8

Write-Host "Generated $sqlPath with $($enumMap.Keys.Count) enum types." -ForegroundColor Green
Write-Host "Applying to Docker DB..." -ForegroundColor Cyan

Get-Content $sqlPath | docker exec -i -u postgres unioneyes-db psql -d unioneyes