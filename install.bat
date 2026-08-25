@echo off
title Seal Web App -- Quick Installer
color 0B

set "SHORTCUT_FLAG="

echo =====================================================
echo   Seal Web App -- Quick Installer
echo   https://github.com/sh13y/Seal-Web-App
echo =====================================================
echo.
echo   This will automatically install everything you need:
echo     - Git
echo     - Node.js
echo     - yt-dlp
echo     - ffmpeg
echo     - Seal Web App
echo.
echo   Default location: %USERPROFILE%\Documents\GitHub\Seal-Web-App
echo.
echo =====================================================
echo.

set /p CREATE_SHORTCUT="  Create Desktop shortcut? [Y/n]: "
if /i "%CREATE_SHORTCUT%"=="n" (
    set "SHORTCUT_FLAG=-NoShortcut"
)

echo.
REM --- Run the PowerShell installer in auto mode ---
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Auto %SHORTCUT_FLAG%
if %errorlevel% neq 0 (
    echo.
    echo [FAIL] Installer encountered errors. Check the output above.
)

echo.
echo =====================================================
echo   Installer finished.
echo =====================================================
pause
