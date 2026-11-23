param(
  [string]$OutputFile = "backup.sql"
)

$ErrorActionPreference = "Stop"
$pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$pgDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "supply_chain" }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is not installed or not in PATH."
}

Write-Host "Creating PostgreSQL backup to $OutputFile ..."
$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputFile)
$tempOutput = "$resolvedOutput.partial.$PID"
$process = Start-Process -FilePath docker `
  -ArgumentList @('compose','exec','-T','postgres','pg_dump','-U',$pgUser,'-d',$pgDb,'--no-owner','--no-privileges') `
  -RedirectStandardOutput $tempOutput `
  -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) {
  Remove-Item $tempOutput -Force -ErrorAction SilentlyContinue
  throw "pg_dump failed with exit code $($process.ExitCode)."
}
Move-Item -Force $tempOutput $resolvedOutput
Write-Host "Backup completed: $OutputFile"
