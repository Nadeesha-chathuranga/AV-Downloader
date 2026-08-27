param([string]$ProjectDir)

if (-not $ProjectDir -or -not (Test-Path $ProjectDir)) {
    Write-Host "[WARN] Project directory not found, skipping patches" -ForegroundColor Yellow
    exit 0
}

$patches = @(
    @{
        File  = Join-Path $ProjectDir "server\index.js"
        Find  = "    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],"
        Replace = "    origin: process.env.NODE_ENV === 'production' ? false : [process.env.CLIENT_ORIGIN || 'http://localhost:3000'],"
    },
    @{
        File  = Join-Path $ProjectDir "client\src\contexts\SocketContext.tsx"
        Find  = "      : 'http://localhost:5000';"
        Replace = "      : process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';"
    },
    @{
        File  = Join-Path $ProjectDir "client\src\components\DownloadForm.tsx"
        Find  = "    : 'http://localhost:5000/api';"
        Replace = "    : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;"
    },
    @{
        File  = Join-Path $ProjectDir "client\src\components\DownloadHistory.tsx"
        Find  = "    : 'http://localhost:5000/api';"
        Replace = "    : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;"
    },
    @{
        File  = Join-Path $ProjectDir "client\src\components\Header.tsx"
        Find  = "        const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';"
        Replace = "        const apiUrl = process.env.NODE_ENV === 'production' ? '/api' : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;"
    }
)

$count = 0
foreach ($p in $patches) {
    if (Test-Path $p.File) {
        $content = [System.IO.File]::ReadAllText($p.File)
        if ($content.Contains($p.Find)) {
            $content = $content.Replace($p.Find, $p.Replace)
            [System.IO.File]::WriteAllText($p.File, $content)
            $count++
        }
    }
}

if ($count -gt 0) {
    Write-Host "[OK] Patched $count source files" -ForegroundColor Green
} else {
    Write-Host "[OK] Source files already patched" -ForegroundColor Green
}
