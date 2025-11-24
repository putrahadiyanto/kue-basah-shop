@echo off
echo ==========================================
echo Kue Basah Shop - Setup Script
echo ==========================================

echo.
echo [1/3] Checking Python environment...
python --version
if %errorlevel% neq 0 (
    echo Python is not installed! Please install Python 3.10+
    pause
    exit /b
)

echo.
echo [2/3] Installing Backend dependencies...
cd Backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies!
    pause
    exit /b
)
cd ..

echo.
echo [3/3] Installing Frontend dependencies...
cd Frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies!
    pause
    exit /b
)
cd ..

echo.
echo ==========================================
echo Setup Complete!
echo You can now run the app using 'run.bat'
echo ==========================================
pause
