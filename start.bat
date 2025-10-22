@echo off
echo ========================================
echo    Bug Record System Startup
echo ========================================
echo.

echo Checking prerequisites...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist "%~dp0package.json" (
    echo ERROR: package.json not found
    echo Please make sure you're in the correct directory
    pause
    exit /b 1
)

:: Check if client directory exists
if not exist "%~dp0client" (
    echo ERROR: client directory not found
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "%~dp0node_modules" (
    echo WARNING: node_modules not found
    echo Running npm install for backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
)

:: Check if client node_modules exists
if not exist "%~dp0client\node_modules" (
    echo WARNING: client/node_modules not found
    echo Running npm install for frontend dependencies...
    cd /d "%~dp0client"
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

:: Check if .env file exists
if not exist "%~dp0.env" (
    echo WARNING: .env file not found
    echo Some features like Google Sheets import may not work
    echo Please copy .env.example to .env and configure your settings
    echo.
)

:: Check if MongoDB is accessible (optional check)
echo Checking MongoDB connection...
node -e "require('mongoose').connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker').then(() => {console.log('MongoDB accessible'); process.exit(0);}).catch(() => {console.log('MongoDB not accessible - check if MongoDB is running'); process.exit(0);});" 2>nul

echo Node.js version:
node --version
echo.

echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Waiting for processes to close...
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo    System Started Successfully!
echo ========================================
echo.
echo Services:
echo   Backend API:  http://localhost:5001
echo   Frontend App: http://localhost:3000
echo.
echo The frontend will automatically proxy API requests to backend
echo.
echo Environment: Development Mode
echo Database: MongoDB (localhost:27017/bugtracker)
echo.
echo Key Features:
echo   - JWT Authentication with 24-hour expiration
echo   - Google Sheets integration (requires .env configuration)
echo   - Operation logging with automatic cleanup
echo   - Comprehensive bug tracking with validation
echo.
echo ====================================
echo Starting Both Servers...
echo ====================================
echo.
echo Starting Backend Server (Port 5001)...
cd /d %~dp0
start /B node server.js

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Client (Port 3000)...
cd /d %~dp0\client
npm start

echo.
echo.
echo ========================================
echo Both servers have stopped.
echo To restart, run start.bat again
echo ========================================
pause