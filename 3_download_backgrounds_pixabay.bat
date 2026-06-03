@echo off
setlocal
cd /d "%~dp0"

if "%PIXABAY_API_KEY%"=="" (
  echo PIXABAY_API_KEY is not set.
  echo.
  echo Paste your Pixabay API key below, then press Enter.
  echo You can get one here: https://pixabay.com/api/docs/
  echo.
  set /p PIXABAY_API_KEY=Pixabay API key: 
)

echo.
set /p MAX_DOWNLOADS=How many background videos should I download? [25]: 
if "%MAX_DOWNLOADS%"=="" set MAX_DOWNLOADS=25

echo.
echo Downloading %MAX_DOWNLOADS% Pixabay background videos...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\download-backgrounds.ps1" -Provider pixabay -MaxDownloads %MAX_DOWNLOADS%
echo.
if errorlevel 1 (
  echo Something went wrong.
) else (
  echo Done. Backgrounds are in assets\backgrounds.
)
echo.
pause

