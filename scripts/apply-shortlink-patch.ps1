# ============================================================
# apply-shortlink-patch.ps1
# Windows-Version des shortLink-Patches
# Usage: .\scripts\apply-shortlink-patch.ps1
# ============================================================

$mcp = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $mcp) { $mcp = (Get-Location).Path }

Write-Host "=== Applying shortLink patch (Windows) ===" -ForegroundColor Cyan

# validation.ts
$f = "$mcp\src\utils\validation.ts"
if (Test-Path $f) {
    $c = Get-Content $f -Raw
    $c = $c -replace "z\.string\(\)\.regex\(/\^\[a-f0-9\]\{24\}\$/i, 'Must be a valid 24-character Trello ID'\)", "z.string().min(1, 'ID must not be empty')"
    Set-Content $f -Value $c -NoNewline
    Write-Host "[OK] validation.ts" -ForegroundColor Green
}

# Alle Tool-Dateien
foreach ($file in @("cards.ts", "boards.ts", "lists.ts", "search.ts", "advanced.ts")) {
    $f = "$mcp\src\tools\$file"
    if (Test-Path $f) {
        $c = Get-Content $f -Raw
        $c = $c -replace [regex]::Escape('^[a-f0-9]{24}$'), '^[a-zA-Z0-9]{1,24}$'
        $c = $c -replace "z\.string\(\)\.regex\(/\^\[a-f0-9\]\{24\}\$/, 'Invalid list ID format'\)", "z.string().min(1, 'Invalid list ID format')"
        $c = $c -replace "z\.string\(\)\.regex\(/\^\[a-f0-9\]\{24\}\$/, 'Invalid board ID format'\)", "z.string().min(1, 'Invalid board ID format')"
        $c = $c -replace "z\.string\(\)\.regex\(/\^\[a-f0-9\]\{24\}\$/, 'Invalid card ID format'\)", "z.string().min(1, 'Invalid card ID format')"
        Set-Content $f -Value $c -NoNewline
        Write-Host "[OK] $file" -ForegroundColor Green
    }
}

Write-Host "`n=== Patch applied. Run 'npm run build' to compile. ===" -ForegroundColor Cyan
