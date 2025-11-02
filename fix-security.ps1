# Security Fix Script
# MongoDB Credentials Security Fix

param(
    [switch]$VerifyOnly = $false,
    [switch]$CleanGitHistory = $false
)

$ErrorActionPreference = "Stop"
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor $Cyan
    Write-Host $Text -ForegroundColor $Cyan
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor $Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "SUCCESS: $Text" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "ERROR: $Text" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "WARNING: $Text" -ForegroundColor $Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "INFO: $Text" -ForegroundColor $Cyan
}

Write-Header "MongoDB Security Fix Tool"

$projectRoot = "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"
Set-Location $projectRoot

Write-Info "Project path: $projectRoot"
Write-Info ""

# 1. Verify .gitignore
Write-Header "1. Checking .gitignore"

$gitignorePath = Join-Path $projectRoot ".gitignore"

if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
    
    if ($gitignoreContent -match "\.env" -and $gitignoreContent -match "scripts/") {
        Write-Success ".gitignore is configured correctly"
    } else {
        Write-Warning ".gitignore needs updates"
    }
} else {
    Write-Error ".gitignore not found!"
}

Write-Info ""

# 2. Check .env.example safety
Write-Header "2. Checking .env.example security"

$envExamplePath = Join-Path $projectRoot ".env.example"

if (Test-Path $envExamplePath) {
    $envContent = Get-Content $envExamplePath -Raw
    
    if ($envContent -match "mongodb\+srv://[^y]") {
        Write-Error "WARNING: Real credentials detected in .env.example"
    } else {
        Write-Success ".env.example is safe - no real credentials"
    }
} else {
    Write-Error ".env.example not found!"
}

Write-Info ""

# 3. Search for sensitive data
Write-Header "3. Searching for sensitive data in files"

$filesToCheck = Get-ChildItem -Path $projectRoot -Recurse -Include *.js,*.ts,*.json -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next|test-results" }

$foundProblems = @()

foreach ($file in $filesToCheck) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        if ($content -match "mongodb\+srv://[a-zA-Z0-9]") {
            $foundProblems += $file.FullName
            Write-Warning "Found possible credentials in: $($file.Name)"
        }
    } catch {
        # Skip files that can't be read
    }
}

if ($foundProblems.Count -eq 0) {
    Write-Success "No sensitive credentials found in source files"
} else {
    Write-Error "Found $($foundProblems.Count) files with possible credentials:"
    $foundProblems | ForEach-Object { Write-Host "  - $_" -ForegroundColor $Red }
}

Write-Info ""

# 4. Check Git status
Write-Header "4. Git Status"

$gitStatus = & git status --short 2>$null

if ($gitStatus) {
    Write-Warning "Pending changes in Git:"
    $gitStatus | Write-Host -ForegroundColor $Yellow
} else {
    Write-Success "All changes committed in Git"
}

# Check for .env files tracked
$envTracked = & git ls-files 2>$null | Select-String "\.env" | Select-Object -ExpandProperty Line

if ($envTracked) {
    Write-Error "WARNING: .env files are tracked in Git:"
    $envTracked | Write-Host -ForegroundColor $Red
    Write-Warning "Remove them: git rm --cached .env*"
} else {
    Write-Success ".env files are not tracked in Git"
}

Write-Info ""

# 5. Git History Check
Write-Header "5. Checking Git History"

$seedFileInHistory = & git log --all --full-history --name-only -- scripts/seed.js 2>$null

if ($seedFileInHistory) {
    Write-Error "WARNING: scripts/seed.js is in Git history!"
    Write-Warning "Must be removed with git filter-branch"
} else {
    Write-Success "scripts/seed.js is NOT in Git history"
}

Write-Info ""

# 6. Final Report
Write-Header "Final Security Report"

Write-Host ""
Write-Host "REQUIRED STEPS:" -ForegroundColor $Green
Write-Host ""
Write-Host "1. MongoDB Atlas:" -ForegroundColor $Cyan
Write-Host "   - Revoke old credentials (Delete/Change password)" -ForegroundColor $Yellow
Write-Host "   - Create new database user" -ForegroundColor $Yellow
Write-Host "   - Get new connection string" -ForegroundColor $Yellow
Write-Host ""
Write-Host "2. Update Environment:" -ForegroundColor $Cyan
Write-Host "   - Update .env.local with new credentials" -ForegroundColor $Yellow
Write-Host "   - Update .env.production with new credentials" -ForegroundColor $Yellow
Write-Host ""
Write-Host "3. Vercel Deployment:" -ForegroundColor $Cyan
Write-Host "   - Update Environment Variables with new MONGODB_URI" -ForegroundColor $Yellow
Write-Host "   - Redeploy the project" -ForegroundColor $Yellow
Write-Host ""
Write-Host "4. GitHub Cleanup:" -ForegroundColor $Cyan
Write-Host "   - Remove scripts/seed.js from Git history" -ForegroundColor $Yellow
Write-Host "   - Force push changes: git push --force --all" -ForegroundColor $Yellow
Write-Host ""

Write-Info "For full details read: SECURITY_FIX_GUIDE.md"
Write-Info "For checklist read: SECURITY_CHECKLIST.md"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Success "Security check completed"
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host ""