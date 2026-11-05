@echo off
setlocal
where.exe /q node.exe
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 18 or newer, then run "%~dp0setup-typst.cmd". 1>&2
  exit /b 1
)
if not exist "%~dp0node_modules\@xmldom\xmldom\package.json" (
  echo Run "%~dp0setup-typst.cmd" once before converting. 1>&2
  exit /b 1
)
node.exe "%~dp0export-typst.mjs" %*
exit /b %errorlevel%
