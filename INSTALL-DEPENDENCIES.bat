@echo off
setlocal
chcp 65001 >nul

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ================================================
echo Bus Tracking - dependency setup
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 20 or newer from https://nodejs.org/
  exit /b 1
)

for /f %%a in ('node -p "process.versions.node.split('.')[0]"') do (
  set "NODE_MAJOR=%%a"
)
if not defined NODE_MAJOR (
  echo ERROR: Could not determine the Node.js version.
  exit /b 1
)
if %NODE_MAJOR% LSS 20 (
  echo ERROR: Node.js 20 or newer is required.
  node --version
  exit /b 1
)

where corepack >nul 2>nul
if errorlevel 1 (
  echo ERROR: Corepack was not found. Reinstall Node.js 20 or newer.
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo Edit DATABASE_URL and JWT secrets before starting the services.
)

echo Installing locked dependencies for all workspace apps...
call corepack pnpm install --frozen-lockfile
if errorlevel 1 exit /b 1

echo Generating the Prisma client...
cd /d "%PROJECT_ROOT%apps\api"
call corepack pnpm exec prisma generate --schema prisma/schema.prisma
if errorlevel 1 exit /b 1

echo.
echo Dependency setup completed.
echo PostgreSQL must be installed and running separately.
echo Apply the checked-in migration with:
echo   cd apps\api
echo   corepack pnpm exec prisma migrate deploy --schema prisma/schema.prisma
echo.
echo Start development services from the project root with:
echo   corepack pnpm dev
echo.
if /i not "%CI%"=="true" pause
exit /b 0
