@echo off
title Seal Web App -- Uninstaller
color 0C
set "PROJECT_DIR="
set "CONFIRM="
set "UNINSTALL_TOOLS="

echo =====================================================
echo   Seal Web App -- Uninstaller
echo   https://github.com/sh13y/Seal-Web-App
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

echo [FAIL] Could not find Seal Web App installation.
echo.
pause
exit /b 1

:found
echo [OK] Found project at: %PROJECT_DIR%
echo.

REM --- Confirm uninstall ---
echo WARNING: This will remove the Seal Web App and all its files.
echo.
set /p CONFIRM="Are you sure you want to uninstall? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo Uninstall cancelled.
    pause
    exit /b 0
)
echo.

REM --- Remove desktop shortcut ---
echo [..] Removing desktop shortcut...
if exist "%USERPROFILE%\Desktop\Seal Web App.bat" (
    del "%USERPROFILE%\Desktop\Seal Web App.bat"
    echo [OK] Desktop shortcut removed
) else (
    echo [..] No desktop shortcut found, skipping
)
echo.

REM --- Remove project folder ---
echo [..] Removing project folder...
if exist "%PROJECT_DIR%" (
    cd /d "%TEMP%"
    rmdir /s /q "%PROJECT_DIR%"
    if not exist "%PROJECT_DIR%" (
        echo [OK] Project folder removed
    ) else (
        echo [FAIL] Could not remove project folder. Try deleting manually.
    )
) else (
    echo [..] Project folder not found, skipping
)
echo.

REM --- Ask to uninstall tools ---
echo =====================================================
echo   The following tools were installed for Seal Web App:
echo     - yt-dlp
echo     - ffmpeg
echo     - Node.js
echo     - Git
echo.
echo   Other applications may also use these tools.
echo =====================================================
echo.
set /p UNINSTALL_TOOLS="Do you want to uninstall these tools? [y/N]: "
echo.

if /i "%UNINSTALL_TOOLS%"=="y" (
    echo [..] Uninstalling yt-dlp...
    winget uninstall yt-dlp --silent --accept-source-agreements >nul 2>&1
    if %errorlevel%==0 (
        echo [OK] yt-dlp removed
    ) else (
        echo [..] yt-dlp not found or already removed
    )

    echo [..] Uninstalling ffmpeg...
    winget uninstall Gyan.FFmpeg --silent --accept-source-agreements >nul 2>&1
    if %errorlevel%==0 (
        echo [OK] ffmpeg removed
    ) else (
        echo [..] ffmpeg not found or already removed
    )

    echo [..] Uninstalling Node.js...
    winget uninstall OpenJS.NodeJS.LTS --silent --accept-source-agreements >nul 2>&1
    if %errorlevel%==0 (
        echo [OK] Node.js removed
    ) else (
        echo [..] Node.js not found or already removed
    )

    echo [..] Uninstalling Git...
    winget uninstall Git.Git --silent --accept-source-agreements >nul 2>&1
    if %errorlevel%==0 (
        echo [OK] Git removed
    ) else (
        echo [..] Git not found or already removed
    )
) else (
    echo [..] Keeping tools -- they may be used by other applications.
)
echo.

REM --- Done ---
echo =====================================================
echo   Uninstall complete!
echo =====================================================
echo.
echo   Thank you for using Seal Web App.
echo   Developed by: https://github.com/sh13y
echo   Repo: https://github.com/sh13y/Seal-Web-App
echo.
echo   If you enjoyed the app, consider giving a star:
echo   https://github.com/sh13y/Seal-Web-App
echo =====================================================
echo.
pause
