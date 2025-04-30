@echo off
echo RecThink - Installing Dependencies
echo ================================
echo.

echo [1/2] Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir --force-reinstall

echo.
echo [2/2] Installing Frontend dependencies...
cd frontend
call