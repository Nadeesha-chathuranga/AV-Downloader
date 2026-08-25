@echo off
title Seal Web App
color 0B
set "PROJECT_DIR="
set "CONTINUE="
set "PORT_IN_USE="

echo =====================================================
echo   Seal Web App
echo   https://github.com/Nadeesha-chathuranga/Seal-Web-App
echo   Developed by: https://github.com/sh13y
echo =====================================================
echo.

REM --- Find project directory ---

REM Check if we're already in the project directory
if exist "package.json" (
    set "PROJECT_DIR=%CD%"
    goto :found
)

REM Check default install location
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
echo        Please run install.ps1 first, or place this script in the project folder.
echo.
pause
exit /b 1

:found
echo [OK] Found project at: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"
echo.

REM --- Find free ports ---
set BACKEND_PORT=14723
set FRONTEND_PORT=18934

:check_backend
netstat -an | findstr ":%BACKEND_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    set /a BACKEND_PORT+=1
    goto :check_backend
)

:check_frontend
netstat -an | findstr ":%FRONTEND_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    set /a FRONTEND_PORT+=1
    goto :check_frontend
)

REM --- Display info ---
echo =====================================================
echo   Starting servers...
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Press Ctrl+C to stop both windows.
echo =====================================================
echo.

REM --- Start backend (its own window, its own PORT) ---
cd /d "%PROJECT_DIR%"
start "Seal Backend - %BACKEND_PORT%" cmd /c "set PORT=%BACKEND_PORT% && npm run server:dev"

REM --- Wait for backend to start, then start frontend ---
echo [..] Starting backend on port %BACKEND_PORT%...
timeout /t 3 /nobreak >nul

REM --- Write client .env with actual backend port ---
echo REACT_APP_SERVER_URL=http://localhost:%BACKEND_PORT%> "%PROJECT_DIR%\client\.env"

cd /d "%PROJECT_DIR%\client"
start /min "Seal Frontend - %FRONTEND_PORT%" cmd /c "set PORT=%FRONTEND_PORT% && npm start"
echo [..] Starting frontend on port %FRONTEND_PORT%...

echo.
echo =====================================================
echo   Both servers started in separate windows.
echo   Close those windows or press Ctrl+C here to stop.
echo =====================================================
echo.
pause
