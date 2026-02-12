Write-Host "Test script running" -ForegroundColor Green

function Test-Simple {
    $arr = @(
        "item1",
        "item2"
    )
    
    foreach ($item in $arr) {
        Write-Host "Item: $item"
    }
    
    return "Done"
}

$result = Test-Simple
Write-Host "Result: $result"
