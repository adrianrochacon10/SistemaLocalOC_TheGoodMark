#Requires -Version 5.1
<#
.SYNOPSIS
  Genera el instalador Tauri (NSIS, nombre "The Good Mark SL") y lo copia a installer/.
  Ajusta variables de entorno para evitar fallos típicos en Windows (rustc/windows crate, RAM).

.USAGE
  Desde la raíz del repo:
    npm run build:installer
  O directamente:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-installer.ps1
#>
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Test-Cmd($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

foreach ($exe in @("node", "npm", "rustc")) {
  if (-not (Test-Cmd $exe)) {
    throw "No se encontró '$exe' en PATH. Instala Node.js LTS y Rust con rustup (https://rustup.rs), y las Build Tools de Visual Studio C++."
  }
}

if (-not (Test-Path (Join-Path $RepoRoot "backend\.env"))) {
  throw "Falta backend\.env (lo exige prepare-tauri-bundle). Crea el archivo con PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc."
}

$env:RUSTC_WRAPPER = (node (Join-Path $PSScriptRoot "ensure-rustc-tgm-wrap.mjs") --print).Trim()
if ($LASTEXITCODE -ne 0 -or -not $env:RUSTC_WRAPPER) {
  throw "No se pudo preparar scripts/rustc-tgm-wrap (ejecuta: node scripts/ensure-rustc-tgm-wrap.mjs --print)"
}

if (-not $env:CARGO_TARGET_DIR) {
  $env:CARGO_TARGET_DIR = Join-Path $env:USERPROFILE ".cargo-target-tgm"
}
if (-not $env:RUST_MIN_STACK) {
  $env:RUST_MIN_STACK = "67108864"
}
if (-not $env:CARGO_BUILD_JOBS) {
  $env:CARGO_BUILD_JOBS = "1"
}
$env:TGM_LOW_MEM_BUILD = "1"

Write-Host ""
Write-Host "=== Build instalador TheGoodMark ===" -ForegroundColor Cyan
Write-Host "Repo:           $RepoRoot"
Write-Host "CARGO_TARGET_DIR: $($env:CARGO_TARGET_DIR)"
Write-Host "RUSTC_WRAPPER:    $($env:RUSTC_WRAPPER)"
Write-Host "CARGO_BUILD_JOBS: $($env:CARGO_BUILD_JOBS)"
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
  Write-Host "Ejecutando npm install..." -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Comprobando .env (Supabase en raíz + backend)..." -ForegroundColor Yellow
node (Join-Path $PSScriptRoot "check-installer-prereqs.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Compilando (varios minutos la primera vez)..." -ForegroundColor Yellow
Write-Host ""

node (Join-Path $PSScriptRoot "tauri-build.mjs")
exit $LASTEXITCODE
