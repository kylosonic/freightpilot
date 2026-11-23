param(
  [Parameter(Mandatory = $true)]
  [string]$InputFile
)

$ErrorActionPreference = "Stop"
$pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$pgDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "supply_chain" }

if (-not (Test-Path $InputFile)) {
  throw "Input file not found: $InputFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is not installed or not in PATH."
}

Write-Host "Restoring PostgreSQL backup from $InputFile ..."
$resolvedInput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InputFile)
$process = Start-Process -FilePath docker `
  -ArgumentList @('compose','exec','-T','postgres','psql','-v','ON_ERROR_STOP=1','--single-transaction','-U',$pgUser,'-d',$pgDb) `
  -RedirectStandardInput $resolvedInput `
  -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "psql restore failed with exit code $($process.ExitCode)."
}
Write-Host "Restore completed."
