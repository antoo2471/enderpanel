@echo off
title EnderPanel - Development Mode
color 0B
echo.
echo   ====================================
echo          ENDERPANEL - Dev Mode
echo   ====================================
echo.

echo [1/2] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend npm install failed
    pause
    exit /b 1
)

echo.
echo [2/2] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend npm install failed
    pause
    exit /b 1
)

echo.
echo Starting EnderPanel development servers...
echo   Backend  : http://127.0.0.1:31357
echo   Frontend : http://localhost:9172
echo   SFTP     : port 8382
echo   Login    : admin / admin
echo.

start "EnderPanel Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"
timeout /t 2 /nobreak >nul
start "EnderPanel Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Press any key to stop all servers...
pause >nul

taskkill /F /IM node.exe /T >nul 2>&1
echo Servers stopped.
