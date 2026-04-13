@echo off
REM Cargo [build] rustc-wrapper: delega en Node para acortar --check-cfg del crate `windows`.
set "SCRIPT=%~dp0rustc-shrink-checkcfg.mjs"
node "%SCRIPT%" %*
