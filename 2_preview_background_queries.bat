@echo off
setlocal
cd /d "%~dp0"
echo Previewing background search queries...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\download-backgrounds.ps1" -ListQueriesOnly
echo.
if errorlevel 1 (
  echo Something went wrong.
) else (
  echo Done. This did not download anything.
)
echo.
pause

