# Wrapper: usa pnpm do Corepack (Node) sem precisar de npm no PATH.
$nodeRoot = ${env:ProgramFiles} + "\nodejs"
$pnpm = Join-Path $nodeRoot "node_modules\corepack\shims\pnpm.cmd"

if (-not (Test-Path $pnpm)) {
  Write-Error "pnpm nao encontrado. Instale Node.js LTS e rode: corepack prepare pnpm@9.15.4 --activate"
  exit 1
}

& $pnpm @args
exit $LASTEXITCODE
