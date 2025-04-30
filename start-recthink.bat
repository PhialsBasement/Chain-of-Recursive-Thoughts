@echo off
echo Starting RecThink Web Application...
echo.

echo Checking for required Python packages...
pip install -r requirements.txt --no-cache-dir

echo.
echo [1/2] Starting Backend API Server...
start cmd /k "python recthink_web.py"

echo [2/2] Starting Frontend Development Server...
cd frontend
IF NOT EXIST node_modules (
    echo Installing frontend dependencies...
    npm install
)
start cmd /k "npm start"

echo.
echo RecThink should now be available at:
echo - Backend API: http://localhost:8000
echo - Frontend UI: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul
