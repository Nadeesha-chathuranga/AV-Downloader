# ============================================================
# Seal Web App -- Windows Installer
# https://github.com/Nadeesha-chathuranga/Seal-Web-App
# ============================================================
# Powered by:
#   yt-dlp   -- https://github.com/yt-dlp/yt-dlp
#   ffmpeg   -- https://ffmpeg.org
#   Node.js  -- https://nodejs.org
# ============================================================
# Usage:
#   .\install.ps1                  Interactive (prompts for choices)
#   .\install.ps1 -Auto            Fully automated (all defaults)
#   .\install.ps1 -Path "C:\MyDir" Custom install location
#   .\install.ps1 -NoShortcut      Skip desktop shortcut
#   .\install.ps1 -Auto -Path "C:\MyDir" -NoShortcut  Combined
# ============================================================

[CmdletBinding()]
param(
    [switch]$Auto,
    [string]$Path,
    [switch]$NoShortcut
)

# --- Self-bypass execution policy ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting administrator privileges..." -ForegroundColor Yellow
    $elevateArgs = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($Auto) { $elevateArgs += " -Auto" }
    if ($NoShortcut) { $elevateArgs += " -NoShortcut" }
    if ($Path) { $elevateArgs += " -Path `"$Path`"" }
    Start-Process powershell.exe -ArgumentList $elevateArgs -Verb RunAs
    exit
}

# --- Helpers ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ScriptDir) { $ScriptDir = Split-Path -Parent $PSCommandPath }
$LogFile = Join-Path $ScriptDir "install.log"
$DefaultInstallDir = Join-Path $env:USERPROFILE "Documents\GitHub"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
    Write-Host $Message -ForegroundColor $Color
}

function Test-Command {
    param([string]$Cmd)
    $null -ne (Get-Command $Cmd -ErrorAction SilentlyContinue)
}

function Get-CommandVersion {
    param([string]$Cmd, [string]$Arg = "--version")
    try {
        $output = & $Cmd $Arg 2>&1 | Select-Object -First 1
        return $output.ToString().Trim()
    } catch {
        return "unknown"
    }
}

function Write-Banner {
    param([string]$Mode = "Interactive")
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  Seal Web App -- Windows Installer" -ForegroundColor Cyan
    Write-Host "  https://github.com/Nadeesha-chathuranga/Seal-Web-App" -ForegroundColor Cyan
    Write-Host "  Mode: $Mode" -ForegroundColor DarkGray
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  Powered by:" -ForegroundColor DarkGray
    Write-Host "    yt-dlp   -- https://github.com/yt-dlp/yt-dlp" -ForegroundColor DarkGray
    Write-Host "    ffmpeg   -- https://ffmpeg.org" -ForegroundColor DarkGray
    Write-Host "    Node.js  -- https://nodejs.org" -ForegroundColor DarkGray
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[..] $Message" -ForegroundColor Yellow
}

function Write-OK {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

# --- Initialize log ---
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Seal Web App Installer Started" | Out-File -FilePath $LogFile -Encoding utf8

# --- Banner ---
if ($Auto) {
    Write-Banner -Mode "Auto (fully automated)"
} else {
    Write-Banner -Mode "Interactive"
}

# ============================================================
# Step 1: Check winget
# ============================================================
Write-Step "Checking for winget..."
if (-not (Test-Command "winget")) {
    Write-Fail "winget not found. Please install App Installer from Microsoft Store."
    Write-Log "[FAIL] winget not found" "Red"
    pause
    exit 1
}
$wingetVer = Get-CommandVersion "winget"
Write-OK "winget found ($wingetVer)"

# ============================================================
# Step 2: Install Git
# ============================================================
Write-Step "Checking for Git..."
if (Test-Command "git") {
    $gitVer = Get-CommandVersion "git"
    Write-OK "Git already installed ($gitVer)"
} else {
    Write-Host "       Installing Git via winget..." -ForegroundColor Yellow
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    # Refresh PATH
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
    if (Test-Command "git") {
        $gitVer = Get-CommandVersion "git"
        Write-OK "Git installed ($gitVer) -- https://git-scm.com"
    } else {
        Write-Fail "Git installation failed. Please install manually: https://git-scm.com"
        Write-Log "[FAIL] Git install failed" "Red"
        pause
        exit 1
    }
}

# ============================================================
# Step 3: Install Node.js
# ============================================================
Write-Step "Checking for Node.js..."
if (Test-Command "node") {
    $nodeVer = Get-CommandVersion "node" "-v"
    Write-OK "Node.js already installed ($nodeVer)"
} else {
    Write-Host "       Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    # Refresh PATH
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
    if (Test-Command "node") {
        $nodeVer = Get-CommandVersion "node" "-v"
        Write-OK "Node.js installed ($nodeVer) -- https://nodejs.org"
    } else {
        Write-Fail "Node.js installation failed. Please install manually: https://nodejs.org"
        Write-Log "[FAIL] Node.js install failed" "Red"
        pause
        exit 1
    }
}

# Check Node version >= 16
try {
    $nodeVersionNum = (Get-CommandVersion "node" "-v") -replace 'v','' -split '\.' | Select-Object -First 1
    if ([int]$nodeVersionNum -lt 16) {
        Write-Host "       WARNING: Node.js v16+ required. Current version may not work." -ForegroundColor Yellow
        Write-Log "[WARN] Node.js version < 16" "Yellow"
    }
} catch {
    Write-Host "       WARNING: Could not verify Node.js version." -ForegroundColor Yellow
    Write-Log "[WARN] Could not verify Node.js version" "Yellow"
}

# ============================================================
# Step 4: Install yt-dlp
# ============================================================
Write-Step "Checking for yt-dlp..."
if (Test-Command "yt-dlp") {
    $ytdlpVer = Get-CommandVersion "yt-dlp"
    Write-OK "yt-dlp already installed ($ytdlpVer)"
} else {
    Write-Host "       Installing yt-dlp via winget..." -ForegroundColor Yellow
    winget install yt-dlp --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    # Refresh PATH
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
    if (Test-Command "yt-dlp") {
        $ytdlpVer = Get-CommandVersion "yt-dlp"
        Write-OK "yt-dlp installed ($ytdlpVer) -- https://github.com/yt-dlp/yt-dlp"
    } else {
        Write-Fail "yt-dlp installation failed. Please install manually: https://github.com/yt-dlp/yt-dlp"
        Write-Log "[FAIL] yt-dlp install failed" "Red"
        pause
        exit 1
    }
}

# ============================================================
# Step 5: Install ffmpeg
# ============================================================
Write-Step "Checking for ffmpeg..."
if (Test-Command "ffmpeg") {
    $ffmpegVer = Get-CommandVersion "ffmpeg" "-version"
    Write-OK "ffmpeg already installed ($ffmpegVer)"
} else {
    Write-Host "       Installing ffmpeg via winget..." -ForegroundColor Yellow
    winget install Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    # Refresh PATH
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
    if (Test-Command "ffmpeg") {
        $ffmpegVer = Get-CommandVersion "ffmpeg" "-version"
        Write-OK "ffmpeg installed ($ffmpegVer) -- https://ffmpeg.org"
    } else {
        Write-Fail "ffmpeg installation failed. Please install manually: https://ffmpeg.org"
        Write-Log "[FAIL] ffmpeg install failed" "Red"
        pause
        exit 1
    }
}

# ============================================================
# Step 6: Version Summary Table
# ============================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Dependency Summary" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ("  {0,-15} {1,-10} {2}" -f "Dependency", "Status", "Version") -ForegroundColor White
Write-Host "  ---------------------------------------------------" -ForegroundColor DarkGray
Write-Host ("  {0,-15} {1,-10} {2}" -f "Git", "OK", (Get-CommandVersion "git")) -ForegroundColor Green
Write-Host ("  {0,-15} {1,-10} {2}" -f "Node.js", "OK", (Get-CommandVersion "node" "-v")) -ForegroundColor Green
Write-Host ("  {0,-15} {1,-10} {2}" -f "yt-dlp", "OK", (Get-CommandVersion "yt-dlp")) -ForegroundColor Green
Write-Host ("  {0,-15} {1,-10} {2}" -f "ffmpeg", "OK", (Get-CommandVersion "ffmpeg" "-version")) -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan

# ============================================================
# Step 7: Choose install location
# ============================================================
if ($Path) {
    # Custom path provided via parameter
    $installDir = $Path
    Write-Host ""
    Write-Host "  Install location: $installDir (from -Path parameter)" -ForegroundColor White
} elseif ($Auto) {
    # Auto mode -- use default
    $installDir = $DefaultInstallDir
    Write-Host ""
    Write-Host "  Install location: $installDir (default)" -ForegroundColor White
} else {
    # Interactive -- ask user
    Write-Host ""
    Write-Host "  Install location:" -ForegroundColor White
    Write-Host "    Default: $DefaultInstallDir" -ForegroundColor DarkGray
    Write-Host ""
    $useDefault = Read-Host "  Install to default location? [Y/n]"

    if ($useDefault -eq "n" -or $useDefault -eq "N") {
        $installDir = Read-Host "  Enter full path to install"
        if (-not $installDir) {
            Write-Fail "No path entered. Using default."
            $installDir = $DefaultInstallDir
        }
    } else {
        $installDir = $DefaultInstallDir
    }
}

$projectDir = Join-Path $installDir "Seal-Web-App"

# ============================================================
# Step 8: Clone or Update repo
# ============================================================
Write-Step "Preparing Seal Web App..."

# Check internet connectivity
Write-Host "       Checking internet connection..." -ForegroundColor Yellow
$online = Test-Connection -ComputerName "github.com" -Count 1 -Quiet -ErrorAction SilentlyContinue
if (-not $online) {
    Write-Fail "No internet connection. Please connect to the internet and try again."
    Write-Log "[FAIL] No internet connection" "Red"
    pause
    exit 1
}

if (Test-Path "$projectDir\.git") {
    Write-Host "       Repository already exists. Pulling latest changes..." -ForegroundColor Yellow
    Push-Location $projectDir
    git pull 2>&1 | Out-Null
    Pop-Location
    Write-OK "Repository updated to latest version"
} else {
    Write-Host "       Cloning Seal Web App..." -ForegroundColor Yellow
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    }
    git clone https://github.com/Nadeesha-chathuranga/Seal-Web-App.git $projectDir 2>&1 | Out-Null
    if (-not (Test-Path $projectDir)) {
        Write-Fail "Failed to clone repository. Check your internet connection."
        Write-Log "[FAIL] git clone failed" "Red"
        pause
        exit 1
    }
    Write-OK "Repository cloned to $projectDir"
}

# ============================================================
# Step 9: Patch package.json and install dependencies
# ============================================================
Write-Step "Configuring package.json..."

# Remove node-pty (unused, breaks on Node.js v24) and allowScripts
$pkgJsonFile = Join-Path $projectDir "package.json"
if (Test-Path $pkgJsonFile) {
    $pkgJson = Get-Content $pkgJsonFile -Raw | ConvertFrom-Json
    $patched = $false
    if ($pkgJson.PSObject.Properties['dependencies'] -and $pkgJson.dependencies.PSObject.Properties['node-pty']) {
        $pkgJson.dependencies.PSObject.Properties.Remove('node-pty')
        $patched = $true
    }
    if ($pkgJson.PSObject.Properties['allowScripts']) {
        $pkgJson.PSObject.Properties.Remove('allowScripts')
        $patched = $true
    }
    if ($patched) {
        [System.IO.File]::WriteAllText($pkgJsonFile, ($pkgJson | ConvertTo-Json -Depth 10))
        Write-OK "package.json patched (removed unused node-pty)"
    } else {
        Write-OK "package.json already clean"
    }
} else {
    Write-Log "[WARN] package.json not found, skipping patch" "Yellow"
}

Write-Step "Installing dependencies (this may take a few minutes)..."
Push-Location $projectDir

Write-Host ""
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install failed. Check your internet connection."
    Write-Log "[FAIL] npm install failed (exit code $LASTEXITCODE)" "Red"
    Pop-Location
    pause
    exit 1
}
Write-OK "Root dependencies installed"

Write-Host ""
$clientDir = Join-Path $projectDir "client"
Push-Location $clientDir
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Client npm install failed."
    Write-Log "[FAIL] Client npm install failed (exit code $LASTEXITCODE)" "Red"
    Pop-Location
    Pop-Location
    pause
    exit 1
}
Pop-Location
Write-OK "Client dependencies installed"

Pop-Location

# ============================================================
# Step 10: Patch source files for custom ports
# ============================================================
Write-Step "Patching source files for custom ports..."

$patchScript = Join-Path $ScriptDir "patch-sources.ps1"
if (Test-Path $patchScript) {
    & $patchScript -ProjectDir $projectDir
} else {
    Write-Log "[WARN] patch-sources.ps1 not found, skipping" "Yellow"
}

# ============================================================
# Step 11: Create .env files
# ============================================================
Write-Step "Creating .env configuration..."

$envFile = Join-Path $projectDir ".env"
@"
PORT=14723
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:18934
"@ | Out-File -FilePath $envFile -Encoding ascii
Write-OK ".env created (backend: 14723, frontend: 18934)"

$clientEnvFile = Join-Path $projectDir "client\.env"
@"
REACT_APP_SERVER_URL=http://localhost:14723
"@ | Out-File -FilePath $clientEnvFile -Encoding ascii
Write-OK "client/.env created"

# ============================================================
# Step 12: Create Desktop Shortcut
# ============================================================
$createShortcutChoice = $true

if ($NoShortcut) {
    $createShortcutChoice = $false
} elseif (-not $Auto) {
    # Interactive -- ask user
    Write-Host ""
    $createShortcut = Read-Host "  Create Desktop shortcut? [Y/n]"
    if ($createShortcut -eq "n" -or $createShortcut -eq "N") {
        $createShortcutChoice = $false
    }
}
# Auto mode -- default is yes (skip prompt)

if ($createShortcutChoice) {
    $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Seal Web App.bat"
    @"
@echo off
cd /d "$projectDir"
call start.bat
"@ | Out-File -FilePath $shortcutPath -Encoding ascii
    Write-OK "Desktop shortcut created: Seal Web App.bat"
}

# ============================================================
# Step 13: Copy scripts to project
# ============================================================
Write-Step "Setting up launcher scripts..."

$startBatSource = Join-Path $ScriptDir "start.bat"
$updateBatSource = Join-Path $ScriptDir "update.bat"
$uninstallBatSource = Join-Path $ScriptDir "uninstall.bat"
$installBatSource = Join-Path $ScriptDir "install.bat"
$patchSrc = Join-Path $ScriptDir "patch-sources.ps1"

$startBatDest = Join-Path $projectDir "start.bat"
$updateBatDest = Join-Path $projectDir "update.bat"
$uninstallBatDest = Join-Path $projectDir "uninstall.bat"
$installBatDest = Join-Path $projectDir "install.bat"
$patchSrcDest = Join-Path $projectDir "patch-sources.ps1"

if (Test-Path $startBatSource) {
    Copy-Item $startBatSource $startBatDest -Force
    Write-OK "start.bat copied to project"
}
if (Test-Path $updateBatSource) {
    Copy-Item $updateBatSource $updateBatDest -Force
    Write-OK "update.bat copied to project"
}
if (Test-Path $uninstallBatSource) {
    Copy-Item $uninstallBatSource $uninstallBatDest -Force
    Write-OK "uninstall.bat copied to project"
}
if (Test-Path $installBatSource) {
    Copy-Item $installBatSource $installBatDest -Force
    Write-OK "install.bat copied to project"
}
if (Test-Path $patchSrc) {
    Copy-Item $patchSrc $patchSrcDest -Force
    Write-OK "patch-sources.ps1 copied to project"
}

# ============================================================
# Step 13: Save install location for other scripts
# ============================================================
$installInfoFile = Join-Path $projectDir ".install-info"
@"
INSTALL_DIR=$installDir
PROJECT_DIR=$projectDir
INSTALL_DATE=$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Out-File -FilePath $installInfoFile -Encoding utf8

# ============================================================
# Done!
# ============================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Installed to: $projectDir" -ForegroundColor White
Write-Host "  Install log:  $LogFile" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To launch:    start.bat" -ForegroundColor Cyan
Write-Host "  To update:    update.bat" -ForegroundColor Cyan
Write-Host "  To uninstall: uninstall.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Developed by: https://github.com/Nadeesha-chathuranga" -ForegroundColor DarkGray
Write-Host "  Repo:         https://github.com/Nadeesha-chathuranga/Seal-Web-App" -ForegroundColor DarkGray
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Log "Installation completed successfully to $projectDir" "Green"
if (-not $Auto) {
    pause
}
