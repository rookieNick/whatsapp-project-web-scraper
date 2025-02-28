@echo off
:: Check for admin privileges
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%0' -Verb RunAs"
    exit /b
)

:: Ensure the script is running in the right directory
cd /d "%~dp0"

:: Keep the window open for debugging
::pause

:: Start MySQL service
echo Starting MySQL80 service...
NET START MySQL80

:: Wait for a moment to ensure MySQL starts
timeout /t 5 /nobreak > nul

:: Check if port 8000 is in use and kill the process
::FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr :8000') DO (
::    echo Killing process on port 8000 (PID: %%P)...
::    taskkill /PID %%P /F
::)

:: Start the Node.js server
echo Starting Node.js server...
node server.js

:: Keep the window open after execution
pause
