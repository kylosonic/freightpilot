#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Rotate the Worker JWT secret and optionally deploy the Cloudflare API.

.DESCRIPTION
    Safe replacement for the retired Vercel rotation script.

    - DATABASE_URL is provided by the Hyperdrive binding, not a Worker secret.
    - PROVIDER_KEY_ENCRYPTION_SECRET is never rotated here. Rotating it without
      first re-encrypting stored BYOK keys would make every key unreadable.
    - Secrets are sent to `wrangler secret put` through an in-memory stdin pipe;
      no plaintext secret file is created.
    - Deployment is opt-in with -Deploy.

.EXAMPLE
    ./scripts/rotate_and_deploy.ps1 -DryRun
    ./scripts/rotate_and_deploy.ps1 -RotateJwt -Deploy
#>
[CmdletBinding()]
param(
    [switch]$RotateJwt,
    [switch]$Deploy,
    [switch]$DryRun,
    [string]$WorkerName = 'freightpilot-api',
    [string]$WranglerConfig = 'infra/cloudflare/freightpilot-api/wrangler.jsonc',
    [string]$HealthUrl = 'https://freightpilot-api.freightpilot.workers.dev/health',
    [string]$PythonExe = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoRoot $WranglerConfig

function Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Ok([string]$text) { Write-Host "  [ok] $text" -ForegroundColor Green }
function Warn2([string]$text) { Write-Host "  [!!] $text" -ForegroundColor Yellow }
function Die([string]$text) { Write-Host "  [xx] $text" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $configPath)) { Die "Wrangler config not found: $configPath" }
if (-not $PythonExe) {
    foreach ($candidate in @(
        (Join-Path $repoRoot 'apps/platform-api/.venv/Scripts/python.exe'),
        (Join-Path $repoRoot '.venv/Scripts/python.exe'),
        (Join-Path $repoRoot 'apps/platform-api/.venv/bin/python'),
        (Join-Path $repoRoot '.venv/bin/python')
    )) {
        if (Test-Path $candidate) { $PythonExe = $candidate; break }
    }
    if (-not $PythonExe) { $PythonExe = 'python' }
}

function Set-WorkerSecret([string]$name, [string]$value) {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $isWindowsHost = $IsWindows -or $env:OS -eq 'Windows_NT'
    if ($isWindowsHost) {
        $psi.FileName = if ($env:ComSpec) { $env:ComSpec } else { 'cmd.exe' }
        $psi.ArgumentList.Add('/d')
        $psi.ArgumentList.Add('/s')
        $psi.ArgumentList.Add('/c')
        $psi.ArgumentList.Add('npx.cmd')
    } else {
        $psi.FileName = 'npx'
    }
    $psi.ArgumentList.Add('wrangler')
    $psi.ArgumentList.Add('secret')
    $psi.ArgumentList.Add('put')
    $psi.ArgumentList.Add($name)
    $psi.ArgumentList.Add('--name')
    $psi.ArgumentList.Add($WorkerName)
    $psi.ArgumentList.Add('--config')
    $psi.ArgumentList.Add($configPath)
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.WorkingDirectory = $repoRoot

    $process = [System.Diagnostics.Process]::Start($psi)
    $process.StandardInput.WriteLine($value)
    $process.StandardInput.Close()
    # Drain both streams concurrently. Reading one to completion before the
    # other can deadlock when wrangler fills the unread pipe.
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    if ($process.ExitCode -ne 0) {
        Die "wrangler secret put $name failed:`n$stdout`n$stderr"
    }
    Ok "updated Worker secret $name"
}

Step 'Secret safety check'
Ok 'DATABASE_URL comes from Hyperdrive; no Worker database secret will be written.'
Warn2 'PROVIDER_KEY_ENCRYPTION_SECRET is not rotated. Use the documented MultiFernet re-encryption migration first.'

if (-not $RotateJwt -and -not $Deploy) {
    Write-Host 'Nothing requested. Pass -RotateJwt and/or -Deploy.'
    exit 0
}

if ($DryRun) {
    Step 'Dry run'
    if ($RotateJwt) { Write-Host '  Would rotate JWT_SECRET_KEY (all existing sessions would be invalidated).' }
    if ($Deploy) { Write-Host '  Would deploy the Cloudflare API Worker.' }
    exit 0
}

if ($RotateJwt) {
    Step 'Rotating JWT secret'
    $jwt = (& $PythonExe -c 'import secrets; print(secrets.token_urlsafe(48))').Trim()
    if ($jwt.Length -lt 32) { Die 'JWT secret generation returned a short value.' }
    Set-WorkerSecret 'JWT_SECRET_KEY' $jwt
    Warn2 'Existing sessions are now invalid by design.'
}

if ($Deploy) {
    Step 'Deploying Cloudflare API'
    Push-Location $repoRoot
    try {
        & npm run cloudflare:deploy:api
        if ($LASTEXITCODE -ne 0) { Die 'Cloudflare API deployment failed.' }
    } finally { Pop-Location }

    Step 'Verifying health'
    $health = $null
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        Start-Sleep -Seconds 10
        try {
            $health = (Invoke-WebRequest -Uri $HealthUrl -TimeoutSec 90 -UseBasicParsing).Content
            Write-Host "  attempt ${attempt}: $health"
            if ($health -match '"status"\s*:\s*"ok"') { break }
        } catch {
            Write-Host "  attempt ${attempt}: $($_.Exception.Message)"
        }
    }
    if ($health -notmatch '"status"\s*:\s*"ok"') { Die 'Health did not become ready.' }
    Ok 'API health is ready.'
}

Write-Host "`nDone." -ForegroundColor Green
