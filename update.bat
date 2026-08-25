@echo off
title Seal Web App -- Updater
color 0B
set "PROJECT_DIR="

echo =====================================================
echo   Seal Web App -- Updater
echo   https://github.com/Nadeesha-chathuranga/Seal-Web-App
echo =====================================================
echo.

REM --- Find project directory ---
set "PROJECT_DIR="

if exist "package.json" (
    set "PROJECT_DIR=%CD%"
    goto :found
)

if exist "%USERPROFILE%\Documents\GitHub\Seal-Web-App\package.json" (
    set "PROJECT_DIR=%USERPROFILE%\Documents\GitHub\Seal-Web-App"
    goto :found
)

REM Check if install-info exists in script dir
if exist "%~dp0.install-info" (
    for /f "tokens=2 delims==" %%a in ('findstr "PROJECT_DIR=" "%~dp0.install-info"') do (
        if exist "%%a\package.json" (
            set "PROJECT_DIR=%%a"
            goto :found
        )
    )
)

echo [FAIL] Could not find Seal Web App.
echo        Please run install.ps1 first.
echo.
pause
exit /b 1

:found
echo [OK] Found project at: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"
echo.

REM --- Update 1: Git pull ---
echo [..] Updating code (git pull)...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Git not found. Please install Git first.
    echo        winget install Git.Git
    pause
    exit /b 1
)
git pull
if %errorlevel%==0 (
    echo [OK] Code updated
) else (
    echo [FAIL] git pull failed. Check your internet connection.
)
echo.

REM --- Update 2: Remove unused node-pty from package.json ---
echo [..] Checking package.json...
powershell -NoProfile -Command "$f='package.json'; if(Test-Path $f){$j=Get-Content $f -Raw|ConvertFrom-Json; $p=$false; if($j.PSObject.Properties['dependencies'] -and $j.dependencies.PSObject.Properties['node-pty']){$j.dependencies.PSObject.Properties.Remove('node-pty'); $p=$true}; if($j.PSObject.Properties['allowScripts']){$j.PSObject.Properties.Remove('allowScripts'); $p=$true}; if($p){[System.IO.File]::WriteAllText($f, ($j|ConvertTo-Json -Depth 10)); echo [OK] package.json patched (removed node-pty)} else {echo [OK] package.json already clean}} else {echo [WARN] package.json not found}"
echo.

REM --- Update 3: Patch source files for custom ports ---
echo [..] Patching source files...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0patch-sources.ps1" -ProjectDir "%CD%"
echo.

REM --- Update 4: npm install (root + client) ---
echo [..] Updating root dependencies...
call npm install
if %errorlevel%==0 (
    echo [OK] Root dependencies updated
) else (
    echo [FAIL] Root npm install had issues
)
echo.

echo [..] Updating client dependencies...
cd client
npm install
if %errorlevel%==0 (
    echo [OK] Client dependencies updated
) else (
    echo [FAIL] Client npm install had issues
)
cd ..
echo.

REM --- Update 5: yt-dlp ---
echo [..] Updating yt-dlp...
winget upgrade yt-dlp --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
if %errorlevel%==0 (
    echo [OK] yt-dlp is up to date -- https://github.com/yt-dlp/yt-dlp
) else (
    echo [..] yt-dlp already up to date or winget unavailable
)
echo.

REM --- Update 6: ffmpeg ---
echo [..] Updating ffmpeg...
winget upgrade Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
if %errorlevel%==0 (
    echo [OK] ffmpeg is up to date -- https://ffmpeg.org
) else (
    echo [..] ffmpeg already up to date or winget unavailable
)
echo.

REM --- Done ---
echo =====================================================
echo   All updated!
echo   Latest code: https://github.com/Nadeesha-chathuranga/Seal-Web-App
echo   Run start.bat to launch the app.
echo =====================================================
echo.
echo   Developed by: https://github.com/sh13y
echo   Repo: https://github.com/Nadeesha-chathuranga/Seal-Web-App
echo =====================================================
echo.
pause
