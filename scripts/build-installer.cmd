@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
set "ROOT=%CD%"

where node >nul 2>&1 || (echo ERROR: No esta "node" en PATH. & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: No esta "npm" en PATH. & exit /b 1)
where rustc >nul 2>&1 || (echo ERROR: No esta "rustc" en PATH. Instala Rust desde https://rustup.rs & exit /b 1)

if not exist "%ROOT%\backend\.env" (
  echo ERROR: Falta "%ROOT%\backend\.env" ^(requerido para el bundle Tauri^).
  exit /b 1
)

for /f "usebackq delims=" %%A in (`node "%~dp0ensure-rustc-tgm-wrap.mjs" --print`) do set "RUSTC_WRAPPER=%%A"
if not defined RUSTC_WRAPPER (
  echo ERROR: No se pudo generar rustc-tgm-wrap.exe. Ejecuta: node scripts\ensure-rustc-tgm-wrap.mjs --print
  exit /b 1
)

if not defined CARGO_TARGET_DIR set "CARGO_TARGET_DIR=%USERPROFILE%\.cargo-target-tgm"
if not defined RUST_MIN_STACK set "RUST_MIN_STACK=67108864"
if not defined CARGO_BUILD_JOBS set "CARGO_BUILD_JOBS=1"
set "TGM_LOW_MEM_BUILD=1"

echo.
echo === Build instalador ===
echo ROOT=%ROOT%
echo CARGO_TARGET_DIR=%CARGO_TARGET_DIR%
echo RUSTC_WRAPPER=%RUSTC_WRAPPER%
echo CARGO_BUILD_JOBS=%CARGO_BUILD_JOBS%
echo.

echo Comprobando .env ^(Supabase en raiz + backend^)...
node "%~dp0check-installer-prereqs.mjs"
if errorlevel 1 exit /b 1

if not exist "%ROOT%\node_modules\" (
  echo Ejecutando npm install...
  call npm install
  if errorlevel 1 exit /b 1
)

node "%~dp0tauri-build.mjs"
exit /b %ERRORLEVEL%
