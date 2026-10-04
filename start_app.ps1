# GPS Map Camera - PowerShell Launcher
$Host.UI.RawUI.WindowTitle = "GPS Map Camera - AI Launcher"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      GPS MAP CAMERA - AI VISION & GEOTAGGING           " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$VenvPython = Join-Path $PSScriptRoot "backend\venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    Write-Host "[*] Launching with Virtual Environment..." -ForegroundColor Yellow
    & $VenvPython (Join-Path $PSScriptRoot "run.py")
} else {
    Write-Host "[*] Launching with System Python..." -ForegroundColor Yellow
    python (Join-Path $PSScriptRoot "run.py")
}
