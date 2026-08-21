@echo off
setlocal EnableExtensions

rem Manufacture Flow local launcher.
rem Starts one PostgreSQL server with separate Live and Demo databases,
rem the same backend code in both runtimes, and one frontend.
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
echo [2/4] Waiting until PostgreSQL passes its health check...
docker compose up -d --wait --wait-timeout 90 db
if errorlevel 1 (
  echo [ERROR] PostgreSQL did not become healthy within 90 seconds.
  echo         Run "docker compose logs db" for the database startup log.
  pause
  exit /b 1
)

echo [3/4] Creating Demo database and applying one migration lineage...
call npm.cmd run db:create:demo
if errorlevel 1 (
  echo [ERROR] Isolated Demo database creation failed.
  pause
  exit /b 1
)
call npm.cmd run db:migrate:all
if errorlevel 1 (
  echo [ERROR] Live/Demo migration failed. Check Docker Desktop and retry.
  pause
  exit /b 1
)
call npm.cmd run db:seed
if errorlevel 1 (
  echo [ERROR] Live seed failed.
  pause
  exit /b 1
)
call npm.cmd --prefix backend run db:seed:demo
if errorlevel 1 (
  echo [ERROR] Demo seed safety check failed.
  pause
  exit /b 1
)
call npm.cmd run db:parity
if errorlevel 1 (
  echo [ERROR] Live and Demo database structures do not match.
  pause
  exit /b 1
)
call npm.cmd run validate:health:live
if errorlevel 1 (
  echo [ERROR] Live runtime cannot connect to its configured database.
  pause
  exit /b 1
)
call npm.cmd run validate:health:demo
if errorlevel 1 (
  echo [ERROR] Demo runtime cannot connect to its isolated database.
  pause
  exit /b 1
)

echo [4/4] Starting Live API, Demo API, and frontend...
start "Manufacture Flow LIVE API (localhost:3001)" /D "%PROJECT%backend" cmd /k "npm.cmd run dev:live"
start "Manufacture Flow DEMO API (localhost:3002)" /D "%PROJECT%backend" cmd /k "npm.cmd run dev:demo"
start "Manufacture Flow Frontend (localhost:3000)" /D "%PROJECT%frontend" cmd /k "npm.cmd run dev"

echo.
echo Frontend: http://localhost:3000
echo Live API: http://localhost:3001/api/health
echo Demo API: http://localhost:3002/api/health
echo.
echo Keep all three opened terminal windows running.

endlocal
