@echo off
echo ==========================================
echo Kue Basah Shop - Run App
echo ==========================================

echo.
echo Starting Backend (Port 8000)...
start "Kue Basah Backend" cmd /k "cd Backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo Starting Frontend (Port 3000)...
start "Kue Basah Frontend" cmd /k "cd Frontend && npm run dev"

echo.
echo ==========================================
echo Servers are running!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo To connect from other devices, find your IP using:
echo python Backend/check_ip.py
echo ==========================================
