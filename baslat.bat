@echo off
cd /d "%~dp0"
echo VHEORA Server baslatiliyor...
echo Site: http://localhost:3001
echo Admin: http://localhost:3001/admin/
echo.
node server\server.js
pause
