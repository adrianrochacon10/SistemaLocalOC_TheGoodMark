@echo off
REM OBSOLETO: cmd.exe limita la linea ~8191 chars; el crate `windows` la supera.
REM Usa el .exe:  node "%~dp0ensure-rustc-tgm-wrap.mjs" --print   ^>^> define RUSTC_WRAPPER
echo ERROR: No uses rustc-wrapper-tauri.cmd. Ejecuta desde la raiz del repo:
echo   npm run build:installer
echo o define RUSTC_WRAPPER con la salida de:
echo   node scripts\ensure-rustc-tgm-wrap.mjs --print
exit /b 1
