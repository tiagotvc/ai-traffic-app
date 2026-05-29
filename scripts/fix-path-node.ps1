# Adiciona Node.js ao PATH do usuario (persistente). Execute uma vez como usuario normal.
$nodeDir = "${env:ProgramFiles}\nodejs"
$pnpmDir = Join-Path $env:LOCALAPPDATA "pnpm"

if (-not (Test-Path $nodeDir)) {
  Write-Error "Node.js nao encontrado em $nodeDir. Instale: https://nodejs.org/"
  exit 1
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = $userPath -split ";" | Where-Object { $_ -ne "" }

foreach ($dir in @($nodeDir, $pnpmDir)) {
  if ((Test-Path $dir) -and ($parts -notcontains $dir)) {
    $parts = @($dir) + $parts
    Write-Host "Adicionado ao PATH: $dir"
  }
}

[Environment]::SetEnvironmentVariable("Path", ($parts -join ";"), "User")
Write-Host ""
Write-Host "Feche e reabra o terminal (ou o Cursor). Depois teste:"
Write-Host "  node -v"
Write-Host "  pnpm -v"
