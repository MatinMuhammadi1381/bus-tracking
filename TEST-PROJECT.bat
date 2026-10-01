@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
goto :MAIN

:RUN_CHECK
set CHECK_NAME=%~1
set CHECK_CMD=%~2
set CHECK_DIR=%~3
if "%CHECK_DIR%"=="" set CHECK_DIR=%PROJECT_ROOT%
echo [TEST-RUNNER] Running check: %CHECK_NAME% >> "%LOG_FILE%"
echo [TEST-RUNNER] Command: %CHECK_CMD% >> "%LOG_FILE%"
echo [TEST-RUNNER] Working dir: %CHECK_DIR% >> "%LOG_FILE%"
if "!FIRST_CHECK!"=="1" (
    set FIRST_CHECK=0
) else (
    echo     , >> "%SUMMARY_FILE%"
)
cd /d "%CHECK_DIR%"
call %CHECK_CMD% >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%ERRORLEVEL%
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto :CHECK_FAIL
echo [TEST-RUNNER] PASS: %CHECK_NAME% >> "%LOG_FILE%"
echo     { "name": "%CHECK_NAME%", "status": "PASS", "exitCode": 0 } >> "%SUMMARY_FILE%"
set /a PASS_COUNT+=1
goto :CHECK_DONE

:CHECK_FAIL
echo [TEST-RUNNER] FAIL: %CHECK_NAME% (exit code !EXIT_CODE!) >> "%LOG_FILE%"
echo     { "name": "%CHECK_NAME%", "status": "FAIL", "exitCode": !EXIT_CODE! } >> "%SUMMARY_FILE%"
set /a FAIL_COUNT+=1

:CHECK_DONE
echo. >> "%LOG_FILE%"
goto :EOF

:MAIN

:: ==========================================
:: Bus Tracking System - Central Test Runner
:: ==========================================

set PROJECT_ROOT=%~dp0
set TIMESTAMP=%DATE:~-4,4%-%DATE:~-7,2%-%DATE:~-10,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TIMESTAMP=!TIMESTAMP: =0!
set LOG_DIR=%PROJECT_ROOT%test-results
set LOG_FILE=%LOG_DIR%\latest.log
set SUMMARY_FILE=%LOG_DIR%\latest-summary.json

:: Create test-results directory
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Initialize log
echo [TEST-RUNNER] Starting test run at %DATE% %TIME% > "%LOG_FILE%"
echo [TEST-RUNNER] Project root: %PROJECT_ROOT% >> "%LOG_FILE%"
echo [TEST-RUNNER] Log file: %LOG_FILE% >> "%LOG_FILE%"
echo [TEST-RUNNER] Summary file: %SUMMARY_FILE% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: Initialize summary JSON
echo { > "%SUMMARY_FILE%"
echo   "timestamp": "%DATE% %TIME%", >> "%SUMMARY_FILE%"
echo   "project": "bus-tracking", >> "%SUMMARY_FILE%"
echo   "checks": [ >> "%SUMMARY_FILE%"

:: Helper function to run a check
:: Usage: CALL :RUN_CHECK "Check Name" "command" "working_dir"
set PASS_COUNT=0
set FAIL_COUNT=0
set SKIP_COUNT=0
set FIRST_CHECK=1
:: ==========================================
:: RUN CHECKS
:: ==========================================

echo ==========================================
echo Bus Tracking System - Test Runner
echo ==========================================
echo.

:: 1. Check Node.js version
echo Checking Node.js version...
node --version
CALL :RUN_CHECK "Node.js Version" "node --version"

:: 2. Check pnpm version
echo Checking pnpm version...
call pnpm --version
CALL :RUN_CHECK "pnpm Version" "pnpm --version"

:: 3. Check Turborepo
echo Checking Turborepo...
call npx turbo --version
CALL :RUN_CHECK "Turborepo Version" "npx turbo --version"

:: 4. Install dependencies
echo Installing dependencies...
call pnpm install --frozen-lockfile
CALL :RUN_CHECK "Dependency Install" "pnpm install --frozen-lockfile"

:: 5. Format check
echo Running format check...
call pnpm format:check
CALL :RUN_CHECK "Format Check" "pnpm format:check"

:: 6. Lint
echo Running lint...
call pnpm lint
CALL :RUN_CHECK "Lint" "pnpm lint"

:: 7. Typecheck
echo Running typecheck...
call pnpm typecheck
CALL :RUN_CHECK "Typecheck" "pnpm typecheck"

:: 8. Build
echo Running build...
call pnpm build
CALL :RUN_CHECK "Build" "pnpm build"

:: 9. Test (if available)
echo Running tests...
call pnpm test
CALL :RUN_CHECK "Unit Tests" "pnpm test"

:: ==========================================
:: FINALIZE SUMMARY
:: ==========================================

echo   ], >> "%SUMMARY_FILE%"
set /a TOTAL_COUNT=PASS_COUNT+FAIL_COUNT+SKIP_COUNT
echo   "summary": { >> "%SUMMARY_FILE%"
echo     "total": %TOTAL_COUNT%, >> "%SUMMARY_FILE%"
echo     "passed": %PASS_COUNT%, >> "%SUMMARY_FILE%"
echo     "failed": %FAIL_COUNT%, >> "%SUMMARY_FILE%"
echo     "skipped": %SKIP_COUNT% >> "%SUMMARY_FILE%"
echo   } >> "%SUMMARY_FILE%"
echo } >> "%SUMMARY_FILE%"

:: ==========================================
:: PRINT RESULTS
:: ==========================================

echo.
echo ==========================================
echo TEST RESULTS SUMMARY
echo ==========================================
echo Passed: %PASS_COUNT%
echo Failed: %FAIL_COUNT%
echo Skipped: %SKIP_COUNT%
echo Total: %TOTAL_COUNT%
echo ==========================================
echo Log: %LOG_FILE%
echo Summary: %SUMMARY_FILE%
echo ==========================================

:: Exit with error code if any failed
if %FAIL_COUNT% GTR 0 (
    echo [TEST-RUNNER] Some checks failed. Exiting with code 1. >> "%LOG_FILE%"
    exit /b 1
) else (
    echo [TEST-RUNNER] All checks passed. >> "%LOG_FILE%"
    exit /b 0
)
