#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Provision or reuse a Neon PostgreSQL database and apply FreightPilot migrations.

.DESCRIPTION
    This script intentionally stops at the database boundary. It creates/reuses a
    Neon project, checks connectivity, and runs `alembic upgrade head`.

    It does NOT write secrets to disk, rotate provider-key encryption secrets, or
    deploy Vercel/Cloudflare resources. Provider-key encryption rotation requires a
    separate re-encryption migration; rotating it here would make stored BYOK keys
    unreadable.

.EXAMPLE
    $env:NEON_API_KEY = 'napi_...'
    ./scripts/setup_neon_production.ps1 -DryRun
    ./scripts/setup_neon_production.ps1
#>
[CmdletBinding()]
param(
    [string]$NeonApiKey = $env:NEON_API_KEY,
    [string]$ProjectName = 'freightpilot-prod',
    [string]$RegionId = 'aws-eu-west-2',
    [string]$OrgId = '',
    [string]$PythonExe = '',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot 'apps/platform-api'
$neonDir = Join-Path $env:TEMP 'neon-cli'

function Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Ok([string]$text) { Write-Host "  [ok] $text" -ForegroundColor Green }
function Warn2([string]$text) { Write-Host "  [!!] $text" -ForegroundColor Yellow }
function Die([string]$text) { Write-Host "  [xx] $text" -ForegroundColor Red; throw $text }

if (-not $NeonApiKey) {
    Die 'Set $env:NEON_API_KEY or pass -NeonApiKey. The key is passed to neonctl through the environment, never on the command line.'
}
$env:NEON_API_KEY = $NeonApiKey
try {

if (-not $PythonExe) {
    foreach ($candidate in @(
        (Join-Path $apiDir '.venv/Scripts/python.exe'),
        (Join-Path $repoRoot '.venv/Scripts/python.exe'),
        (Join-Path $apiDir '.venv/bin/python'),
        (Join-Path $repoRoot '.venv/bin/python')
    )) {
        if (Test-Path $candidate) { $PythonExe = $candidate; break }
    }
    if (-not $PythonExe) { $PythonExe = 'python' }
}

$neon = Join-Path $neonDir 'node_modules/.bin/neonctl.cmd'
if (-not (Test-Path $neon)) {
    Warn2 'neonctl not found locally; installing an isolated CLI copy'
    New-Item -ItemType Directory -Force -Path $neonDir | Out-Null
    if (-not (Test-Path (Join-Path $neonDir 'package.json'))) {
        '{"name":"neon-cli-holder","private":true}' | Set-Content (Join-Path $neonDir 'package.json')
    }
    Push-Location $neonDir
    try { & npm install --silent neonctl | Out-Null } finally { Pop-Location }
    if (-not (Test-Path $neon)) { Die 'neonctl installation failed' }
}

if (-not $OrgId) {
    $orgs = (& $neon orgs list --output json 2>&1 | Out-String) | ConvertFrom-Json
    if (-not $orgs) { Die 'No Neon organization is visible for this API key.' }
    $OrgId = @($orgs)[0].id
    if (@($orgs).Count -gt 1) {
        Warn2 "Multiple Neon organizations are visible; using $OrgId. Pass -OrgId to choose another."
    }
}
Ok "organization: $OrgId"

$projects = (& $neon projects list --org-id $OrgId --output json 2>&1 | Out-String) | ConvertFrom-Json
$project = @($projects) | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1

if ($DryRun) {
    Step 'Dry run'
    if ($project) {
        Write-Host "  Would reuse Neon project '$ProjectName' ($($project.id))."
    } else {
        Write-Host "  Would create Neon project '$ProjectName' in $RegionId."
    }
    Write-Host '  Would verify connectivity and run alembic upgrade head.'
    Write-Host '  Would NOT rotate secrets or deploy any frontend/API.'
    return
}

if ($project) {
    Ok "reusing project $($project.id)"
} else {
    Step "Creating Neon project '$ProjectName'"
    $created = (& $neon projects create --name $ProjectName --region-id $RegionId --org-id $OrgId --output json 2>&1 | Out-String) | ConvertFrom-Json
    $project = $created.project
    if (-not $project) { Die 'Neon project creation returned no project.' }
    Ok "created project $($project.id)"
}

$rawUrl = (& $neon connection-string --project-id $project.id --org-id $OrgId --pooled 2>&1 | Out-String)
$pgUrl = ($rawUrl -split "`n" | Where-Object { $_ -match '^postgres' } | Select-Object -First 1)
if (-not $pgUrl) { Die 'Could not read a pooled PostgreSQL URL from neonctl.' }
$databaseUrl = $pgUrl.Trim() -replace '^postgres(ql)?://', 'postgresql+psycopg://'

Step 'Applying migrations'
Push-Location $apiDir
try {
    $env:DATABASE_URL = $databaseUrl
    & $PythonExe -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { Die 'alembic upgrade failed; nothing was deployed.' }
    $revision = (& $PythonExe -m alembic current 2>&1 | Out-String).Trim()
    Ok "revision: $revision"
} finally {
    Pop-Location
}

Step 'Next steps'
Write-Host '  Set Cloudflare Worker secrets separately with wrangler secret put.'
Write-Host '  Do not rotate PROVIDER_KEY_ENCRYPTION_SECRET without first re-encrypting stored keys.'
Write-Host '  Deploy only after /health reports schema=current and the expected revision.'
Write-Host "`nNeon database is ready: $($project.id)" -ForegroundColor Green
} finally {
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\NEON_API_KEY -ErrorAction SilentlyContinue
}
