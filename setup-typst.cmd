@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-typst.ps1" %*
exit /b %errorlevel%
