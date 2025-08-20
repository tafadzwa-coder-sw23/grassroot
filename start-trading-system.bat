@echo off
echo Starting Insight Trader Tool - ML Trading System
echo ================================================
echo.

echo Starting ML Backend Server...
start "ML Backend" cmd /k "cd server && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting Frontend Application...
start "Trading Frontend" cmd /k "npm run dev"

echo.
echo ================================================
echo Trading System Starting...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8080
echo WebSocket: ws://localhost:8081
echo.
echo Press any key to open the application...
pause > nul

start http://localhost:8080

echo.
echo Trading system is now running!
echo Keep both terminal windows open.
echo.
pause
