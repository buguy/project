@echo off
echo Starting Bug Record System...
echo.
echo Starting backend server on port 5000...
start "Backend Server" cmd /k "cd /d %~dp0 && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting frontend client on port 3000...
start "Frontend Client" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo Both servers should be starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo Frontend will proxy API requests to backend at port 5000
echo.
pause