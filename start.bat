@echo off
echo ====================================
echo AI Task Scheduling Agent
echo ====================================
echo.
echo Starting Backend and Frontend...
echo.

start "Backend Server" cmd /k "cd backend && python -m uvicorn app.main:app --reload"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all servers...
pause > nul
taskkill /FI "WindowTitle eq Backend Server*" /T /F
taskkill /FI "WindowTitle eq Frontend Server*" /T /F
