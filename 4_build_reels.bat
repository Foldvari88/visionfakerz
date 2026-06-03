@echo off
setlocal
cd /d "%~dp0"

if not exist "assets\music\track.mp3" (
  echo Missing music file:
  echo assets\music\track.mp3
  echo.
  echo Copy your music file there and name it track.mp3.
  echo.
  pause
  exit /b 1
)

echo Rendering reels...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\build-reels.ps1"
echo.
if errorlevel 1 (
  echo Something went wrong.
) else (
  echo Done. Finished videos are in output.
)
echo.
pause

