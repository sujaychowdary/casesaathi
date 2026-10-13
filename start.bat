@echo off
title CaseSaathi AI Web Server
echo ========================================================
echo   Starting CaseSaathi AI Legal Companion Web Application
echo ========================================================
echo.
echo [1/2] Launching FastAPI Web Server on http://localhost:8000...
start "" ".\.venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8000

timeout /t 2 >nul

echo [2/2] Launching Public Tunnel...
start "" ".\bore.exe" local 8000 --to bore.pub

echo.
echo ========================================================
echo  CaseSaathi AI is live!
echo  Local URL:  http://localhost:8000
echo ========================================================
echo.
pause
