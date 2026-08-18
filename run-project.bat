@echo off
setlocal EnableExtensions

rem Machine Overwatch local launcher.
rem This file starts PostgreSQL, migrates and seeds the backend, then opens
rem the separate backend API and frontend development servers.
rem
rem Run from PowerShell or Command Prompt:
rem   .\run-project.bat
rem Or double-click this file after starting Docker Desktop.

set "PROJECT=%~dp0"
cd /d "%PROJECT%"

echo.
echo ================================================
echo   Starting frontend_next_duplicate
echo ================================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker was not found on PATH. Start Docker Desktop and try again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found on PATH. Install Node.js and try again.
  pause
  exit /b 1
)

echo [1/4] Starting PostgreSQL container on port 5434...
docker compose up -d db
if errorlevel 1 (
  echo [ERROR] PostgreSQL container failed to start.
  pause
  exit /b 1
)

echo [2/4] Waiting for PostgreSQL...
timeout /t 5 /nobreak >nul

echo [3/4] Applying migrations and demo seed...
npm.cmd run db:migrate
if errorlevel 1 (
  echo [ERROR] Database migration failed. Check Docker Desktop and retry.
  pause
  exit /b 1
)
npm.cmd run db:seed
if errorlevel 1 (
  echo [ERROR] Database seed failed.
  pause
  exit /b 1
)

echo [4/4] Starting separate services...
start "Machine Overwatch API (localhost:3001)" cmd /k "cd /d "%PROJECT%" && npm.cmd run dev:backend"
start "Machine Overwatch Frontend (localhost:3000)" cmd /k "cd /d "%PROJECT%" && npm.cmd run dev:frontend"

echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001/api/health
echo.
echo Keep both opened terminal windows running.

endlocal
