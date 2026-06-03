@echo off
setlocal
cd /d "%~dp0"
echo Generating CSV files from data\captions.txt...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\new-reels-csv.ps1"
echo.
if errorlevel 1 (
  echo Something went wrong.
) else (
  echo Done.
)
echo.
pause

