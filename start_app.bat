@echo off
chcp 65001 > nul
title GPS Map Camera - AI Launcher
cd /d "%~dp0"

echo ========================================================
echo       GPS MAP CAMERA - AI VISION ^& SMART GEOTAGGING
echo ========================================================
echo.

IF EXIST "backend\venv\Scripts\python.exe" (
    echo [*] Starting with virtual environment Python...
    "backend\venv\Scripts\python.exe" run.py
) ELSE (
    echo [*] Starting with system Python...
    python run.py
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Server exited with an issue. Please read above message.
    echo.
)

pause
