@echo off
setlocal
cd /d "%~dp0"

echo Put your own VisionFakerz full audio files here first:
echo assets\music\source_tracks
echo.
set /p SNIPPETS_PER_TRACK=How many 15s snippets per track? [1]: 
if "%SNIPPETS_PER_TRACK%"=="" set SNIPPETS_PER_TRACK=1
set /p START_AT=Start at which second? [20]: 
if "%START_AT%"=="" set START_AT=20

echo.
echo Creating music snippets...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\create-music-snippets.ps1" -SnippetsPerTrack %SNIPPETS_PER_TRACK% -StartAt %START_AT%
echo.
if errorlevel 1 (
  echo Something went wrong.
) else (
  echo Done. Snippets are in assets\music\snippets.
)
echo.
pause

